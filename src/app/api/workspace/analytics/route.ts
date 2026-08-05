import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.labId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure only authorized high-level staff can view global financials
  if (
    user.role !== "LAB_OWNER" &&
    user.role !== "LAB_MANAGER" &&
    user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const labId = user.labId;

  // Execute all queries concurrently for performance
  const [
    revenueAgg,
    expenseAgg,
    pendingInvoicesAgg,
    taxAndDiscountAgg,
    recentInvoices,
    recentExpenses,
    invoicesCount,
    patientsCount,
  ] = await Promise.all([
    // Total Revenue (excluding cancelled)
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { labId, status: { not: "CANCELLED" } },
    }),

    // Total Expenses
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { labId },
    }),

    // Pending Collections
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { labId, status: "PENDING" },
    }),

    // GST / Discount breakdown
    prisma.invoice.aggregate({
      _sum: {
        subtotal: true,
        discount: true,
        totalTax: true,
        cgstAmount: true,
        sgstAmount: true,
      },
      where: { labId, status: { not: "CANCELLED" } },
    }),

    // Recent Invoices (Last 10)
    prisma.invoice.findMany({
      where: { labId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { name: true } },
        agency: { select: { agencyName: true } },
      },
    }),

    // Recent Expenses (Last 10)
    prisma.expense.findMany({
      where: { labId },
      take: 10,
      orderBy: { date: "desc" },
    }),

    // Total Invoices Count
    prisma.invoice.count({
      where: { labId },
    }),

    // Patients Count
    prisma.patient.count({
      where: { labId },
    }),
  ]);

  // Derived Metrics
  const totalRevenue = Number(revenueAgg._sum.grandTotal || 0);
  const totalExpense = Number(expenseAgg._sum.amount || 0);
  const netProfit = totalRevenue - totalExpense;
  const pendingCollections = Number(pendingInvoicesAgg._sum.grandTotal || 0);

  const grossBilling = Number(taxAndDiscountAgg._sum.subtotal || 0);
  const totalDiscounts = Number(taxAndDiscountAgg._sum.discount || 0);
  const totalCGST = Number(taxAndDiscountAgg._sum.cgstAmount || 0);
  const totalSGST = Number(taxAndDiscountAgg._sum.sgstAmount || 0);

  return NextResponse.json({
    totalRevenue,
    totalExpense,
    netProfit,
    pendingCollections,
    grossBilling,
    totalDiscounts,
    totalCGST,
    totalSGST,
    recentInvoices,
    recentExpenses,
    invoicesCount,
    patientsCount,
  });
}
