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

  if (
    user.role !== "LAB_OWNER" &&
    user.role !== "LAB_MANAGER" &&
    user.role !== "SUPER_ADMIN"
  ) {
    redirect("/dashboard");
  }

  const labId = user.labId;

  const [
    revenueAgg,
    expenseAgg,
    pendingInvoicesAgg,
    taxAndDiscountAgg,
    recentInvoices,
    recentExpenses,
  ] = await Promise.all([
    // Total Revenue
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

    // GST / Discount breakdown – NOW ALL FIELDS EXIST
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

    // Recent Invoices
    prisma.invoice.findMany({
      where: { labId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { name: true } },
        Agency: { select: { name: true } }, // 👈 agency.name, not agencyName
      },
    }),

    // Recent Expenses
    prisma.expense.findMany({
      where: { labId },
      take: 10,
      orderBy: { date: "desc" },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.grandTotal || 0);
  const totalExpense = Number(expenseAgg._sum.amount || 0);
  const netProfit = totalRevenue - totalExpense;
  const pendingCollections = Number(pendingInvoicesAgg._sum.grandTotal || 0);

  const grossBilling = Number(taxAndDiscountAgg._sum.subtotal || 0);
  const totalDiscounts = Number(taxAndDiscountAgg._sum.discount || 0);
  const totalTaxCollected = Number(taxAndDiscountAgg._sum.totalTax || 0);
  const totalCGST = Number(taxAndDiscountAgg._sum.cgstAmount || 0);
  const totalSGST = Number(taxAndDiscountAgg._sum.sgstAmount || 0);

  const formatINR = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Financial Analytics
        </h1>
        <p className="text-slate-500 mt-1">
          Comprehensive overview of your lab's financial health.
        </p>
      </div>

      {/* KPIs */}
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

      {/* GST / Discount Breakdown */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Gross Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(grossBilling)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Subtotal before adjustments.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Discounts Given
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
              % of gross.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              CGST Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(totalCGST)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Central GST.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              SGST Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(totalSGST)}
            </div>
            <p className="text-xs text-slate-500 mt-1">State GST.</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledgers */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Invoices Ledger */}
        <Card>
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-blue-600" /> Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Billed To</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {inv.isB2B ? inv.agency?.name : inv.patient?.name}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
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
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Expenses Ledger */}
        <Card>
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-rose-600" /> Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Title / Category</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(exp.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {exp.title || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {exp.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {exp.paymentMode || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      -{formatINR(Number(exp.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card>
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
