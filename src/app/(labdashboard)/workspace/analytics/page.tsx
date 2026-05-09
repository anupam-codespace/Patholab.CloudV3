import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Receipt,
  Wallet,
  Percent,
  FileText,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FinancialAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || !user.labId) redirect("/login");

  // Ensure only authorized roles can view financial data
  if (
    user.role !== "LAB_OWNER" &&
    user.role !== "LAB_MANAGER" &&
    user.role !== "SUPER_ADMIN"
  ) {
    redirect("/dashboard");
  }

  const labId = user.labId;

  // ==========================================
  // 1. MASSIVE FINANCIAL AGGREGATION
  // ==========================================
  const [
    revenueAgg,
    expenseAgg,
    pendingInvoicesAgg,
    taxAndDiscountAgg,
    recentInvoices,
    recentExpenses,
  ] = await Promise.all([
    // Total Revenue (Paid + Pending, excluding Cancelled)
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { labId, status: { not: "CANCELLED" } },
    }),

    // Total Expenses
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { labId },
    }),

    // Pending Collections (Money owed to the lab)
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { labId, status: "PENDING" },
    }),

    // Breakdown of Subtotals, Discounts, and Taxes (GST)
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

    // Latest 10 Invoices for the ledger
    prisma.invoice.findMany({
      where: { labId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { name: true } },
        agency: { select: { agencyName: true } },
      },
    }),

    // Latest 10 Expenses for the ledger
    prisma.expense.findMany({
      where: { labId },
      take: 10,
      orderBy: { date: "desc" },
    }),
  ]);

  // ==========================================
  // 2. CALCULATE METRICS
  // ==========================================
  const totalRevenue = Number(revenueAgg._sum.grandTotal || 0);
  const totalExpense = Number(expenseAgg._sum.amount || 0);
  const netProfit = totalRevenue - totalExpense;
  const pendingCollections = Number(pendingInvoicesAgg._sum.grandTotal || 0);

  const grossBilling = Number(taxAndDiscountAgg._sum.subtotal || 0);
  const totalDiscounts = Number(taxAndDiscountAgg._sum.discount || 0);
  const totalTaxCollected = Number(taxAndDiscountAgg._sum.totalTax || 0);

  // Format currency helper
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Financial Analytics
          </h1>
          <p className="text-slate-500 mt-1">
            Comprehensive overview of your lab's financial health and ledger.
          </p>
        </div>
      </div>

      {/* TOP ROW: PRIMARY KPIs */}
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

      {/* MIDDLE ROW: FINANCIAL BREAKDOWN */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Gross Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(grossBilling)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total value of tests before discounts and tax.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-rose-500" /> Discounts Given
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(totalDiscounts)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {grossBilling > 0
                ? ((totalDiscounts / grossBilling) * 100).toFixed(1)
                : 0}
              % of gross billing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> Tax Liability
              (GST)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(totalTaxCollected)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total tax collected to be remitted to the government.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM ROW: LEDGERS */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* INVOICE LEDGER */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-blue-600" /> Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Billed To</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500">
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-blue-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {inv.isB2B
                            ? inv.agency?.agencyName
                            : inv.patient?.name}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatINR(Number(inv.grandTotal))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              inv.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : inv.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* EXPENSE LEDGER */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-rose-600" /> Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Title / Category</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500">
                        No expenses recorded.
                      </td>
                    </tr>
                  ) : (
                    recentExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(exp.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {exp.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {exp.category}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {exp.paymentMode}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600">
                          -{formatINR(Number(exp.amount))}
                        </td>
                      </tr>
                    ))
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

// --- REUSABLE STAT CARD COMPONENT ---
function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}
