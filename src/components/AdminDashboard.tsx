import { prisma } from "@/lib/prisma";
import {
  Activity,
  Building2,
  Microscope,
  TrendingUp,
  HardDrive,
  Users,
  FileText,
  Stethoscope,
  Briefcase,
  Cpu,
  Globe,
  Lock,
  TestTube,
  Beaker,
  Layers,
  Network,
  Clock,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export const dynamic = "force-dynamic";

// --- 1. MASSIVE DATA FETCHING (SERVER-SIDE) ---
async function getDashboardMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Previous Month Boundaries
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // We run all count queries in parallel to ensure lightning-fast dashboard loads
  const [
    // 1. Tenant & Wallet Counts
    activeLabsCount,
    lowBalanceLabsCount, // Replaces Trial Labs - Shows labs at risk of service pause
    totalBranches,
    openTicketsCount,

    // 2. Medical Volume Counts
    totalPatients,
    totalTests,
    totalReports,
    totalSamples,

    // 3. Network Size
    totalDoctors,
    totalAgencies,
    totalIoTAnalyzers,

    // 4. Test Engine & Catalog Counts
    globalTests,
    privateTests,
    totalParameters,
    sampleTypes,
    containerTypes,
    departments,

    // 5. Feeds & Lists
    recentLabs,
    recentActivity,

    // 6. Financials (Wallet Pivot)
    rechargesMTD,
    deductionsMTD,
    platformLiability, // Total sum of all unspent wallet balances across all labs
  ] = await Promise.all([
    // SaaS / Tenants
    prisma.lab.count({ where: { isActive: true, deletedAt: null } }),
    prisma.labWallet.count({ where: { balance: { lt: 500 } } }), // Labs with < 500 Rs
    prisma.branch.count({ where: { deletedAt: null } }),
    prisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),

    // Medical Volume
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.test.count(), // Immutability applied in schema
    prisma.report.count(),
    prisma.sample.count(),

    // Network
    prisma.doctor.count(),
    prisma.agency.count(),
    prisma.labAnalyzer.count({ where: { isActive: true } }),

    // Test Engine Config
    prisma.testTemplate.count({ where: { isGlobal: true } }),
    prisma.testTemplate.count({ where: { isGlobal: false } }),
    prisma.labTestParameter.count(),
    prisma.sampleType.count(),
    prisma.containerType.count(),
    prisma.department.count(),

    // Feeds
    prisma.lab.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        wallet: {
          select: { balance: true, isActive: true },
        },
      },
    }),
    prisma.activityLog.findMany({
      take: 12, // Increased for a taller scrollable feed
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, role: true } } },
    }),

    // Financials (Wallet Model)
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "RECHARGE", createdAt: { gte: startOfMonth } },
    }),
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "DEDUCTION", createdAt: { gte: startOfMonth } },
    }),
    prisma.labWallet.aggregate({
      _sum: { balance: true },
    }),
  ]);

  return {
    saas: {
      activeLabsCount,
      lowBalanceLabsCount,
      totalBranches,
      openTicketsCount,
    },
    financials: {
      rechargesMTD: Number(rechargesMTD._sum.amount || 0),
      deductionsMTD: Number(deductionsMTD._sum.amount || 0),
      platformLiability: Number(platformLiability._sum.balance || 0),
    },
    volume: { totalPatients, totalTests, totalReports, totalSamples },
    network: { totalDoctors, totalAgencies, totalIoTAnalyzers },
    engine: {
      globalTests,
      privateTests,
      totalParameters,
      sampleTypes,
      containerTypes,
      departments,
    },
    feeds: { recentLabs, recentActivity },
  };
}

// --- 2. ANALYTICS CARD COMPONENT ---
function AnalyticsCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number;
  icon: any;
  colorClass: string;
}) {
  // Safely extract text color from background color class
  const textColor = colorClass.replace("bg-", "text-");

  return (
    <Card className="relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white group">
      {/* Top color accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colorClass}`} />
      
      <CardContent className="p-4 sm:p-5 flex flex-col justify-center h-full">
        {/* Icon and Title placed side-by-side */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-slate-100 transition-all duration-300">
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
          <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
            {title}
          </p>
        </div>
        
        {/* Value placed below them */}
        <div>
          <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">
            {new Intl.NumberFormat("en-IN").format(value)}
          </h4>
        </div>
      </CardContent>
    </Card>
  );
}

// --- 3. MAIN PAGE COMPONENT ---
export default async function SuperAdminDashboard() {
  const m = await getDashboardMetrics();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            God Mode Command Center
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Omniscient view of Patholab Cloud's Pay-As-You-Go ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-white px-3 py-1.5 text-slate-600 border-slate-200 shadow-sm font-bold uppercase tracking-widest text-[10px]">
            <Network className="h-3 w-3 text-indigo-500 mr-2" />
            {m.saas.totalBranches} Active Branches
          </Badge>
        </div>
      </div>

      {/* --- ROW 1: PRIMARY FINANCIALS (WALLET PIVOT) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between opacity-80 mb-2">
              <p className="text-xs font-bold uppercase tracking-wider">
                Recharges (MTD)
              </p>
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-3xl font-black">
              {formatCurrency(m.financials.rechargesMTD)}
            </h3>
            <p className="text-xs font-medium text-emerald-100 mt-2">
              Cash collected this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Consumed (MTD)
              </p>
              <Activity className="h-4 w-4 text-indigo-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-900">
              {formatCurrency(m.financials.deductionsMTD)}
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-2">
              Platform usage revenue burned
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex justify-between items-center h-full">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Active Tenants
              </p>
              <h3 className="text-3xl font-black text-slate-900">
                {m.saas.activeLabsCount}
              </h3>
            </div>
            <Building2 className="h-8 w-8 text-blue-100" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-rose-50/50">
          <CardContent className="p-5 flex justify-between items-center h-full">
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">
                Low Balance Labs
              </p>
              <h3 className="text-3xl font-black text-rose-700">
                {m.saas.lowBalanceLabsCount}
              </h3>
            </div>
            <AlertTriangle className="h-8 w-8 text-rose-200" />
          </CardContent>
        </Card>
      </div>

      
     {/* --- ROW 2: PLATFORM SCALE (Card Grid) --- */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" /> Platform Medical Volume
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <AnalyticsCard
            title="Patients"
            value={m.volume.totalPatients}
            icon={Users}
            colorClass="bg-blue-500"
          />
          <AnalyticsCard
            title="Tests Run"
            value={m.volume.totalTests}
            icon={Microscope}
            colorClass="bg-purple-500"
          />
          <AnalyticsCard
            title="Samples"
            value={m.volume.totalSamples}
            icon={TestTube}
            colorClass="bg-rose-500"
          />
          <AnalyticsCard
            title="Reports"
            value={m.volume.totalReports}
            icon={FileText}
            colorClass="bg-emerald-500"
          />
          <AnalyticsCard
            title="Doctors"
            value={m.network.totalDoctors}
            icon={Stethoscope}
            colorClass="bg-cyan-500"
          />
          <AnalyticsCard
            title="Agencies"
            value={m.network.totalAgencies}
            icon={Briefcase}
            colorClass="bg-amber-500"
          />
          <AnalyticsCard
            title="Analyzers"
            value={m.network.totalIoTAnalyzers}
            icon={Cpu}
            colorClass="bg-slate-700"
          />
        </div>
      </div>

      {/* --- ROW 3: TEST ENGINE CONFIGURATION (Card Grid) --- */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" /> Catalog Engine & Parameters
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <AnalyticsCard
            title="Global Tests"
            value={m.engine.globalTests}
            icon={Globe}
            colorClass="bg-blue-600"
          />
          <AnalyticsCard
            title="Local Tests"
            value={m.engine.privateTests}
            icon={Lock}
            colorClass="bg-slate-600"
          />
          <AnalyticsCard
            title="Parameters"
            value={m.engine.totalParameters}
            icon={Activity}
            colorClass="bg-indigo-500"
          />
          <AnalyticsCard
            title="Sample Types"
            value={m.engine.sampleTypes}
            icon={Beaker}
            colorClass="bg-pink-500"
          />
          <AnalyticsCard
            title="Containers"
            value={m.engine.containerTypes}
            icon={TestTube}
            colorClass="bg-orange-500"
          />
          <AnalyticsCard
            title="Departments"
            value={m.engine.departments}
            icon={Building2}
            colorClass="bg-teal-500"
          />
        </div>
      </div>

     

      {/* --- ROW 4: BOTTOM THREE COLUMNS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: System Liability & Economics */}
        <Card className="border-slate-200 shadow-sm flex flex-col bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-500" /> Platform Economics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                Total Unspent Wallet Credits
              </p>
              <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
                {formatCurrency(m.financials.platformLiability)}
              </h4>
              <p className="text-xs font-medium text-slate-500 leading-snug">
                This represents prepaid balances held across all active client
                lab wallets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <ArrowDownRight className="w-5 h-5 text-emerald-600 mb-1" />
                <p className="text-[10px] font-bold text-emerald-600/80 uppercase">
                  Inflow (MTD)
                </p>
                <p className="text-sm font-black text-emerald-700">
                  {formatCurrency(m.financials.rechargesMTD)}
                </p>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                <ArrowUpRight className="w-5 h-5 text-rose-600 mb-1" />
                <p className="text-[10px] font-bold text-rose-600/80 uppercase">
                  Burn (MTD)
                </p>
                <p className="text-sm font-black text-rose-700">
                  {formatCurrency(m.financials.deductionsMTD)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Col 2: Tenant Pipeline */}
        <Card className="border-slate-200 shadow-sm flex flex-col bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800">
              Recent Deployments
            </CardTitle>
            <Link
              href="/admin/labs"
              className="text-[10px] text-blue-600 font-bold uppercase hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-400 font-bold uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Lab Name</th>
                  <th className="px-4 py-3 text-right">Wallet Bal.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {m.feeds.recentLabs.map((lab) => (
                  <tr
                    key={lab.id}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 truncate max-w-[150px]">
                        {lab.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(lab.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lab.wallet ? (
                        <span className="font-black text-slate-700">
                          {formatCurrency(Number(lab.wallet.balance))}
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] uppercase">
                          No Wallet
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Col 3: Live Omniscient Feed */}
        <Card className="border-slate-200 shadow-sm flex flex-col h-[350px] bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" /> Live Audit Log
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Live
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[290px]">
              <div className="divide-y divide-slate-100">
                {m.feeds.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex gap-3">
                      <div className="h-7 w-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <span className="text-[10px] font-black text-slate-500">
                          {log.user?.name.charAt(0) || "S"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-800 leading-tight">
                          <span className="font-bold">
                            {log.user?.name || "System"}
                          </span>{" "}
                          {log.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                            {log.action}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(log.createdAt).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
