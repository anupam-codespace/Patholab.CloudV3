'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ExpenseCategory } from '@prisma/client';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function getExpenseDashboardData(month: number, year: number) {
  const labId = await getLabId();

  // Calculate Date Range for the selected month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // 1. Fetch Manual Operational Expenses
  const manualExpenses = await prisma.expense.findMany({
    where: { labId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'desc' }
  });

  // 2. Fetch Settled Commissions (Payouts to Doctors/Agencies)
  const commissions = await prisma.commission.findMany({
    where: { test: { labId }, status: 'PAID', paidAt: { gte: startDate, lte: endDate } },
    include: { doctor: true, agency: true, test: true }
  });

  // 3. Fetch Inventory Purchases (New Batches created THIS month)
  const inventoryPurchases = await prisma.inventoryBatch.findMany({
    where: { labId, createdAt: { gte: startDate, lte: endDate } },
    include: { item: true }
  });

  // --- MAP INVENTORY DATA (STRICT COST LOGIC) ---
  // ✅ FIX: We ONLY look at the Batch. No more transaction double-counting.
  // ✅ FIX: We ONLY use costPrice. MRP and Quantity are completely ignored for math.
  const mappedBatches = inventoryPurchases.map(i => {
     const exactTotalPaid = toNumber(i.costPrice);
      const qty = i.initialQuantity || 1;
      
      return {
        id: i.id, 
        title: `New Stock: ${i.item.name} (Batch ${i.batchNumber})`, 
        category: 'REAGENTS', 
        amount: exactTotalPaid, 
        date: i.createdAt, 
        type: 'INVENTORY', 
        ref: `${qty} ${i.item.usageUnit}` 
      };
  });

  // --- UNIFY DATA FOR THE LEDGER ---
  const unifiedLedger = [
    ...manualExpenses.map(e => ({
      id: e.id, title: e.title, category: e.category, amount: toNumber(e.amount), date: e.date, 
      type: 'OPERATIONAL', ref: e.referenceNo || '-'
    })),
    ...commissions.map(c => ({
      id: c.id, title: `Payout: ${c.doctor?.name || c.agency?.agencyName || 'Referral'}`, 
      category: 'COMMISSIONS', amount: toNumber(c.amount), date: c.paidAt || c.createdAt, 
      type: 'COMMISSION', ref: c.test?.testNumber || 'Auto'
    })),
    ...mappedBatches
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // --- CALCULATE AGGREGATES FOR CHARTS ---
  let totalExpenses = 0;
  let totalOperational = 0;
  let totalCommissions = 0;
  let totalInventory = 0;
  const categoryTotals: Record<string, number> = {};

  unifiedLedger.forEach(item => {
      totalExpenses += item.amount;
      
      if (item.type === 'OPERATIONAL') totalOperational += item.amount;
      if (item.type === 'COMMISSION') totalCommissions += item.amount;
      if (item.type === 'INVENTORY') totalInventory += item.amount;

      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
  });

  // Format Category Data for Donut Chart
  const pieChartData = Object.keys(categoryTotals)
    .filter(key => categoryTotals[key] > 0)
    .map(key => ({
      name: key.replace('_', ' '),
      value: categoryTotals[key]
    })).sort((a, b) => b.value - a.value);

  // Format Daily Trend Data for Bar Chart
  const dailyTrend: Record<string, number> = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for(let i=1; i<=daysInMonth; i++) {
      dailyTrend[i.toString().padStart(2, '0')] = 0;
  }

  unifiedLedger.forEach(item => {
      const day = item.date.getDate().toString().padStart(2, '0');
      dailyTrend[day] += item.amount;
  });

  const maxDailyExpense = Math.max(...Object.values(dailyTrend), 1);

  const barChartData = Object.keys(dailyTrend).sort().map(day => ({
      day: day,
      amount: dailyTrend[day],
      heightPercent: (dailyTrend[day] / maxDailyExpense) * 100
  }));

  return {
      totalExpenses, totalOperational, totalCommissions, totalInventory,
      pieChartData, barChartData, unifiedLedger, maxDailyExpense
  };
}

export async function addManualExpense(data: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    paymentMode: string;
    date: Date;
    referenceNo?: string;
    notes?: string;
}) {
    const labId = await getLabId();
    await prisma.expense.create({
        data: { ...data, labId }
    });
    revalidatePath('/workspace/expenses');
    return { success: true };
}

export async function deleteManualExpense(id: string) {
    const labId = await getLabId();
    await prisma.expense.delete({
        where: { id, labId }
    });
    revalidatePath('/workspace/expenses');
    return { success: true };
}