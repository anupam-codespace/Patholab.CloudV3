export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAnalyticsData } from '@/lib/analytics-service';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import ExcelJS from 'exceljs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'Date range required' }, { status: 400 });
    }

    // 1. Fetch Data
    const data = await getAnalyticsData(
      startOfDay(parseISO(from)),
      endOfDay(parseISO(to))
    );

    // 2. Create Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Patholab System';
    workbook.lastModifiedBy = 'Admin';
    workbook.created = new Date();

    // --- SHEET 1: SUMMARY ---
    const summarySheet = workbook.addWorksheet('Executive Summary');
    
    // Styling Helper
    const headerStyle = { font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } } } as any;

    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    
    // Apply Header Style
    summarySheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    summarySheet.addRows([
      { metric: 'Report Generated', value: new Date().toLocaleString() },
      { metric: 'Date Range From', value: from },
      { metric: 'Date Range To', value: to },
      { metric: '', value: '' }, // Spacer
      { metric: 'Total Revenue Generated', value: data.kpi.revenue },
      { metric: 'Total Tests Processed', value: data.kpi.tests },
      { metric: 'Active Laboratories', value: data.kpi.activeLabs },
    ]);

    // Format Currency Cell
    summarySheet.getCell('B5').numFmt = '₹#,##0.00';

    // --- SHEET 2: TOP LABS ---
    const labsSheet = workbook.addWorksheet('Lab Performance');
    labsSheet.columns = [
      { header: 'Lab Name', key: 'name', width: 30 },
      { header: 'Owner', key: 'owner', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Tests Run', key: 'tests', width: 15 },
      { header: 'Revenue Contributed', key: 'revenue', width: 20 },
    ];
    labsSheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    data.topLabs.forEach(lab => {
      labsSheet.addRow({
        name: lab.name,
        owner: lab.owner,
        email: lab.email,
        location: `${lab.city}, ${lab.state}`,
        tests: lab.tests,
        revenue: lab.revenue
      });
    });
    labsSheet.getColumn('revenue').numFmt = '₹#,##0.00';

    // --- SHEET 3: REVENUE LOGS ---
    const revSheet = workbook.addWorksheet('Revenue Logs');
    revSheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Transaction ID', key: 'id', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
    ];
    revSheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    data.revenueList.forEach(log => {
      revSheet.addRow(log);
    });
    revSheet.getColumn('amount').numFmt = '₹#,##0.00';

    // 3. Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 4. Return Response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="analytics_report_${from}_${to}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}