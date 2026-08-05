import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getCurrentUser } from '@/lib/auth';
import { format } from 'date-fns';

export async function GET(request: Request) {
  try {
    // 1. Secure Authentication: Ensure only Super Admin can export platform data
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    // ==========================================
    // 1. OPTIMIZED PARALLEL DATA FETCHING (Wallet-Centric)
    // ==========================================
    const [labs, transactions] = await Promise.all([
      prisma.lab.findMany({
        where: { deletedAt: null },
        include: {
          wallet: {
            include: {
              transactions: { where: { createdAt: { gte: from, lte: to } } }
            }
          },
          _count: {
            select: {
              patients: { where: { createdAt: { gte: from, lte: to }, deletedAt: null } },
              tests: { where: { createdAt: { gte: from, lte: to } } },
              samples: { where: { createdAt: { gte: from, lte: to } } },
            }
          }
        }
      }),
      prisma.walletTransaction.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { wallet: { include: { lab: { select: { name: true } } } } }
      })
    ]);

    // ==========================================
    // 2. DATA TRANSFORMATION FOR EXCEL SHEETS
    // ==========================================
    const walletData: any[] = [];
    const operationalData: any[] = [];
    const transactionLedger: any[] = [];

    labs.forEach((lab) => {
      const balance = lab.wallet ? Number(lab.wallet.balance) : 0;
      const recharges = lab.wallet?.transactions.filter(t => t.type === 'RECHARGE').reduce((s, t) => s + Number(t.amount), 0) || 0;
      const deductions = lab.wallet?.transactions.filter(t => t.type === 'DEDUCTION').reduce((s, t) => s + Number(t.amount), 0) || 0;

      // SHEET 1: Master Wallet Overview
      walletData.push({
        'Lab Name': lab.name,
        'Wallet Status': lab.wallet?.isActive ? 'Active' : 'Suspended',
        'Current Balance (₹)': balance,
        'Total Recharges (Period)': recharges,
        'Total Consumption (Period)': deductions,
        'Per Patient Fee (₹)': lab.wallet ? Number(lab.wallet.perPatientFee) : 'N/A'
      });

      // SHEET 2: Operational Volume
      operationalData.push({
        'Lab Name': lab.name,
        'Patients Registered': lab._count.patients,
        'Tests Conducted': lab._count.tests,
        'Samples Collected': lab._count.samples,
        'Platform Contribution (₹)': deductions // Deductions are effectively the platform's revenue
      });
    });

    // SHEET 3: Full Transaction Ledger
    transactions.forEach((tx) => {
      transactionLedger.push({
        'Date': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm'),
        'Lab Name': tx.wallet.lab?.name || 'Unknown',
        'Type': tx.type,
        'Description': tx.description,
        'Amount (₹)': Number(tx.amount),
        'Closing Balance (₹)': Number(tx.closingBalance)
      });
    });

    // ==========================================
    // 3. WORKBOOK GENERATION
    // ==========================================
    const workbook = XLSX.utils.book_new();

    const wsWallet = XLSX.utils.json_to_sheet(walletData);
    const wsOps = XLSX.utils.json_to_sheet(operationalData);
    const wsLedger = XLSX.utils.json_to_sheet(transactionLedger);

    XLSX.utils.book_append_sheet(workbook, wsWallet, 'Wallet Overview');
    XLSX.utils.book_append_sheet(workbook, wsOps, 'Operational Volume');
    XLSX.utils.book_append_sheet(workbook, wsLedger, 'Full Transaction Ledger');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Patholab_Wallet_Audit_${Date.now()}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error: any) {
    console.error('Admin Excel Export Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}