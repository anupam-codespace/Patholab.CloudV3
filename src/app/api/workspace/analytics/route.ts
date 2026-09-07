import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken, getCurrentUser } from "@/lib/auth";
import { ExpenseCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserAndLab(req: NextRequest) {
  const user = (await getDataFromToken(req)) || (await getCurrentUser());
  if (!user) return { user: null, labId: null };

  const userId = user.userId || (user as any).id;
  let labId = user.labId;

  // 1. Check if specific labId requested in query params
  try {
    const { searchParams } = new URL(req.url);
    const requestedLabId = searchParams.get("labId");
    if (requestedLabId && requestedLabId.trim().length > 0) {
      if (user.role === "SUPER_ADMIN") {
        labId = requestedLabId.trim();
      } else if (userId) {
        const hasAccess = await prisma.lab.findFirst({
          where: {
            id: requestedLabId.trim(),
            OR: [
              { ownerId: userId },
              { staff: { some: { userId, isActive: true } } },
            ],
          },
          select: { id: true },
        });
        if (hasAccess) labId = hasAccess.id;
      }
    }
  } catch (ignored) {}

  // 2. Fallback resolution if labId not determined yet
  if (!labId && userId) {
    const ownerLab = await prisma.lab.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (ownerLab) {
      labId = ownerLab.id;
    } else {
      const staffLab = await prisma.labStaff.findFirst({
        where: { userId, isActive: true },
        select: { labId: true },
      });
      if (staffLab) {
        labId = staffLab.labId;
      } else if (user.role === "SUPER_ADMIN") {
        const firstLab = await prisma.lab.findFirst({
          where: { isActive: true },
          select: { id: true },
        });
        if (firstLab) {
          labId = firstLab.id;
        }
      }
    }
  }

  return { user, labId };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Comprehensive Financial Analytics Data (with Timeframe Filter & Full Metrics)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { user, labId } = await getAuthenticatedUserAndLab(req);
    if (!user || !labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "all_time";

    // Calculate Date Range based on timeframe
    let startDate: Date | undefined = undefined;
    const now = new Date();
    if (timeframe === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (timeframe === "last_30_days") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const invoiceDateFilter = startDate ? { createdAt: { gte: startDate } } : {};
    const expenseDateFilter = startDate ? { date: { gte: startDate } } : {};

    // Concurrently execute analytics aggregations
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
        where: { labId, status: { not: "CANCELLED" }, ...invoiceDateFilter },
      }),

      // Total Expenses
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { labId, ...expenseDateFilter },
      }),

      // Pending Collections
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { labId, status: "PENDING", ...invoiceDateFilter },
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
        where: { labId, status: { not: "CANCELLED" }, ...invoiceDateFilter },
      }),

      // Recent Invoices (Last 15)
      prisma.invoice.findMany({
        where: { labId, ...invoiceDateFilter },
        take: 15,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { name: true, phone: true } },
          agency: { select: { agencyName: true } },
        },
      }),

      // Recent Expenses (Last 15)
      prisma.expense.findMany({
        where: { labId, ...expenseDateFilter },
        take: 15,
        orderBy: { date: "desc" },
      }),

      // Total Invoices Count
      prisma.invoice.count({
        where: { labId, ...invoiceDateFilter },
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
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const pendingCollections = Number(pendingInvoicesAgg._sum.grandTotal || 0);

    const grossBilling = Number(taxAndDiscountAgg._sum.subtotal || 0);
    const totalDiscounts = Number(taxAndDiscountAgg._sum.discount || 0);
    const discountPercentage = grossBilling > 0 ? (totalDiscounts / grossBilling) * 100 : 0;
    const totalCGST = Number(taxAndDiscountAgg._sum.cgstAmount || 0);
    const totalSGST = Number(taxAndDiscountAgg._sum.sgstAmount || 0);

    // Format Invoices for Mobile & Web consumption
    const formattedInvoices = recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      patientName: inv.patient?.name || (inv.agency?.agencyName ? inv.agency.agencyName : "Walk-in Patient"),
      patientPhone: inv.patient?.phone || "",
      isB2B: Boolean(inv.agencyId || inv.agency?.agencyName),
      agencyName: inv.agency?.agencyName || null,
      grandTotal: Number(inv.grandTotal),
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      status: inv.status,
      paymentStatus: inv.paymentStatus || inv.status,
      paymentMethod: inv.paymentMethod || "CASH",
      createdAt: inv.createdAt.toISOString(),
    }));

    // Format Expenses
    const formattedExpenses = recentExpenses.map((exp) => ({
      id: exp.id,
      title: exp.title,
      category: exp.category,
      amount: Number(exp.amount),
      paymentMode: exp.paymentMode || "CASH",
      referenceNo: exp.referenceNo || "",
      notes: exp.notes || "",
      date: exp.date.toISOString(),
    }));

    // Fetch User & Lab details for real-time client identity display
    const [dbUser, dbLab] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.userId || (user as any).id },
        select: { id: true, name: true, email: true, phone: true, role: true, avatar: true },
      }),
      prisma.lab.findUnique({
        where: { id: labId },
        select: { id: true, name: true, email: true, phone: true, portalSlug: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      user: dbUser,
      lab: dbLab,
      timeframe,
      totalRevenue,
      totalExpense,
      netProfit,
      profitMargin: Number(profitMargin.toFixed(1)),
      pendingCollections,
      grossBilling,
      totalDiscounts,
      discountPercentage: Number(discountPercentage.toFixed(1)),
      totalCGST,
      totalSGST,
      invoicesCount,
      patientsCount,
      recentInvoices: formattedInvoices,
      recentExpenses: formattedExpenses,
    });
  } catch (error: any) {
    console.error("Financial Analytics Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch analytics" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Record New Operational Expense (Real-Time Two-Way Sync)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { user, labId } = await getAuthenticatedUserAndLab(req);
    if (!user || !labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, category, amount, paymentMode, referenceNo, notes, date } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Expense title is required" }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Valid expense amount is required" }, { status: 400 });
    }

    // Validate category against ExpenseCategory enum
    let resolvedCategory: ExpenseCategory = ExpenseCategory.MISC;
    if (category && Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
      resolvedCategory = category as ExpenseCategory;
    }

    const expense = await prisma.expense.create({
      data: {
        labId,
        title: title.trim(),
        category: resolvedCategory,
        amount: numAmount,
        paymentMode: paymentMode || "CASH",
        referenceNo: referenceNo?.trim() || null,
        notes: notes?.trim() || null,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      expense: {
        id: expense.id,
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount),
        paymentMode: expense.paymentMode,
        date: expense.date.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Expense Creation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to record expense" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: Delete Operational Expense (Real-Time Two-Way Sync)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { user, labId } = await getAuthenticatedUserAndLab(req);
    if (!user || !labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get("id");

    if (!expenseId) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    // Ensure expense belongs to the current lab
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, labId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found or access denied" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (error: any) {
    console.error("Expense Deletion Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete expense" }, { status: 500 });
  }
}
