import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Receipt,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function FinancialAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || !user.labId) redirect("/login");

  // Ensure only authorized high-level staff can view global financials
  if (
    user.role !== "LAB_OWNER" &&
    user.role !== "LAB_MANAGER" &&
    user.role !== "SUPER_ADMIN"
  ) {
    redirect("/dashboard");
  }

  const labId = user.labId;

  // Execute all aggregations concurrently for massive performance gains
  const [
    revenueAgg,
    expenseAgg,
    pendingInvoicesAgg,
    taxAndDiscountAgg,
    recentInvoices,
    recentExpenses,
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
        // FIXED: Using 'agencyName' instead of 'name' based on your Prisma schema
        agency: { select: { agencyName: true } },
      },
    }),

    // Recent Expenses (Last 10)
    prisma.expense.findMany({
      where: { labId },
      take: 10,
      orderBy: { date: "desc" },
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

  // Formatting Helper
  const formatINR = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Financial Analytics
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Comprehensive overview of your enterprise's financial health.
          </p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-3 border border-emerald-100">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
            Wallet Era
          </span>
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 text-sm font-bold border-0">
            Pay-As-You-Go Active
          </Badge>
        </div>
      </div>

      {/* === TOP-LEVEL KPIs === */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatINR(totalRevenue)}
          icon={IndianRupee}
          color="text-emerald-600"
          bg="bg-emerald-100"
        />
        <StatCard
          title="Total Expenses"
          value={formatINR(totalExpense)}
          icon={TrendingDown}
          color="text-rose-600"
          bg="bg-rose-100"
        />
        <StatCard
          title="Net Profit"
          value={formatINR(netProfit)}
          icon={TrendingUp}
          color="text-blue-600"
          bg="bg-blue-100"
        />
        <StatCard
          title="Pending Collections"
          value={formatINR(pendingCollections)}
          icon={AlertCircle}
          color="text-amber-600"
          bg="bg-amber-100"
        />
      </div>

      {/* === GST / DISCOUNT BREAKDOWN === */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Gross Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(grossBilling)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Subtotal before adjustments.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Discounts Given
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(totalDiscounts)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {grossBilling > 0
                ? ((totalDiscounts / grossBilling) * 100).toFixed(1)
                : 0}
              % of gross revenue.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              CGST Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(totalCGST)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Central GST.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              SGST Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(totalSGST)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              State GST.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === DETAILED LEDGERS === */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoices Ledger */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-800">
              <Receipt className="w-5 h-5 text-blue-600" /> Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Billed To</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                    <th className="px-5 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentInvoices.map((inv: any) => {
                    // FIXED: Properly querying inv.agency.agencyName
                    const entityName = inv.isB2B
                      ? inv.agency?.agencyName || "Unknown Agency"
                      : inv.patient?.name || "Unknown Patient";

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-blue-600 whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-5 py-4 text-slate-700 font-medium">
                          {entityName}
                          {inv.isB2B && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold uppercase">
                              B2B
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatINR(Number(inv.grandTotal))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-700"
                                : inv.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-slate-400 font-medium">
                        No recent invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Ledger */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-800">
              <Wallet className="w-5 h-5 text-rose-600" /> Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Mode</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentExpenses.map((exp: any) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {exp.title || "—"}
                        </div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-0.5">
                          {exp.category}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                          {exp.paymentMode || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-rose-600 whitespace-nowrap">
                        -{formatINR(Number(exp.amount))}
                      </td>
                    </tr>
                  ))}
                  {recentExpenses.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-slate-400 font-medium">
                        No recent expenses recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable KPI Card Component
function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {title}
        </CardTitle>
        <div className={`p-2.5 rounded-xl ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} strokeWidth={2.5} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
