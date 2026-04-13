import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 });
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);

  try {
    // ==========================================
    // 1. OPTIMIZED PARALLEL DATA FETCHING
    // ==========================================
    
    // Step A: Fetch basic lab data & simple counts (No heavy nested arrays)
    const labsPromise = prisma.lab.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { name: true, email: true, phone: true } },
        subscription: { include: { plan: true } },
        _count: {
          select: {
            branches: { where: { deletedAt: null } },
            staff: { where: { isActive: true } },
            analyzers: { where: { isActive: true } },
            customTestTemplates: true,
            patients: { where: { createdAt: { gte: from, lte: to }, deletedAt: null } },
            tests: { where: { createdAt: { gte: from, lte: to }, deletedAt: null } },
            samples: { where: { createdAt: { gte: from, lte: to }, deletedAt: null } },
            invoices: { where: { createdAt: { gte: from, lte: to }, deletedAt: null } },
          }
        }
      }
    });

    // Step B: Ask PostgreSQL to calculate invoice totals per lab (Lightning Fast)
    const invoiceTotalsPromise = prisma.invoice.groupBy({
      by: ['labId', 'status'],
      _sum: { grandTotal: true },
      where: { createdAt: { gte: from, lte: to }, deletedAt: null }
    });

    // Step C: Ask PostgreSQL to count rejected samples per lab
    const rejectedSamplesPromise = prisma.sample.groupBy({
      by: ['labId'],
      _count: { id: true },
      where: { status: 'REJECTED', createdAt: { gte: from, lte: to }, deletedAt: null }
    });

    // Execute all queries concurrently
    const [labs, invoiceTotals, rejectedSamples] = await Promise.all([
      labsPromise,
      invoiceTotalsPromise,
      rejectedSamplesPromise
    ]);

    // ==========================================
    // 2. DATA TRANSFORMATION FOR EXCEL SHEETS
    // ==========================================
    
    const overviewData: any[] = [];
    const performanceData: any[] = [];
    const configData: any[] = [];

    labs.forEach((lab) => {
      // --- Match aggregated financial data to this lab ---
      const labInvoices = invoiceTotals.filter(inv => inv.labId === lab.id);
      const totalInvoiced = labInvoices.reduce((sum, inv) => sum + Number(inv._sum.grandTotal || 0), 0);
      const paidRevenue = labInvoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + Number(inv._sum.grandTotal || 0), 0);

      // --- Match aggregated operational data to this lab ---
      const rejectedData = rejectedSamples.find(s => s.labId === lab.id);
      const rejectedSamplesCount = rejectedData?._count.id || 0;
      
      const totalSamples = lab._count.samples;
      const rejectionRate = totalSamples > 0 
        ? ((rejectedSamplesCount / totalSamples) * 100).toFixed(2) + '%' 
        : '0%';

      // SHEET 1: Master Overview & Subscriptions
      overviewData.push({
        'Lab ID': lab.id,
        'Lab Name': lab.name,
        'License Number': lab.licenseNumber || 'N/A',
        'Owner Name': lab.owner?.name || 'N/A',
        'Owner Email': lab.owner?.email || 'N/A',
        'Owner Phone': lab.owner?.phone || lab.phone || 'N/A',
        'City': lab.city,
        'State': lab.state,
        'Joined Date': lab.createdAt.toLocaleDateString('en-IN'),
        'Account Status': lab.isActive ? 'Active' : 'Inactive',
        'Subscription Plan': lab.subscription?.plan?.name || 'No Plan',
        'Subscription Status': lab.subscription?.status || 'PENDING',
        'MRR (₹)': Number(lab.subscription?.plan?.price || 0)
      });

      // SHEET 2: Medical & Financial Performance (Period Specific)
      performanceData.push({
        'Lab Name': lab.name,
        'New Patients': lab._count.patients,
        'Tests Processed': lab._count.tests,
        'Samples Collected': totalSamples,
        'Samples Rejected': rejectedSamplesCount,
        'Rejection Rate': rejectionRate,
        'Invoices Generated': lab._count.invoices,
        'Total Billed (₹)': totalInvoiced,
        'Revenue Collected (₹)': paidRevenue,
        'Pending/Overdue (₹)': totalInvoiced - paidRevenue
      });

      // SHEET 3: Architecture & System Settings
      configData.push({
        'Lab Name': lab.name,
        'Active Branches': lab._count.branches,
        'Active Staff': lab._count.staff,
        'IoT Analyzers Linked': lab._count.analyzers,
        'Custom Tests Created': lab._count.customTestTemplates,
        'Default Doctor Comm. (%)': Number(lab.defaultDoctorCommission || 0),
        'Default Agency Comm. (%)': Number(lab.defaultAgencyCommission || 0),
        'Commission Type': lab.commissionType || 'PERCENTAGE',
        'GST Number': lab.gstNumber || 'Not Provided',
        'PAN Number': lab.panNumber || 'Not Provided'
      });
    });

    // ==========================================
    // 3. WORKBOOK GENERATION
    // ==========================================
    const workbook = XLSX.utils.book_new();

    const wsOverview = XLSX.utils.json_to_sheet(overviewData);
    const wsPerformance = XLSX.utils.json_to_sheet(performanceData);
    const wsConfig = XLSX.utils.json_to_sheet(configData);

    // Auto-size columns for better readability
    const setColWidths = (ws: XLSX.WorkSheet, data: any[]) => {
      if (data.length === 0) return;
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map(key => ({ wch: Math.max(key.length + 5, 15) })); // Added +5 padding
    };
    
    setColWidths(wsOverview, overviewData);
    setColWidths(wsPerformance, performanceData);
    setColWidths(wsConfig, configData);

    XLSX.utils.book_append_sheet(workbook, wsOverview, 'Master Overview');
    XLSX.utils.book_append_sheet(workbook, wsPerformance, 'Period Performance');
    XLSX.utils.book_append_sheet(workbook, wsConfig, 'System Configs');

    // Convert to Buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Patholab_GodMode_Export_${Date.now()}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error: any) {
    console.error('Super Admin Excel Export Error:', error);
    
    // Send a cleaner error message back to the frontend
    return NextResponse.json(
      { error: error.message || 'Database query failed during Excel generation' }, 
      { status: 500 }
    );
  }
}