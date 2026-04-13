import prisma from "@/lib/prisma";
import {
  Activity,
  Building2,
  CreditCard,
  Microscope,
  ArrowUpRight,
  Clock,
  Ticket,
  Zap,
  TrendingUp,
  HardDrive,
  Wallet,
  PieChart,
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
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- 1. MASSIVE DATA FETCHING (SERVER-SIDE) ---
async function getDashboardMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // We run all count queries in parallel. Prisma handles this extremely efficiently.
  const [
    // 1. SaaS & Tenant Counts
    activeLabsCount,
    trialLabsCount,
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
    subscriptions,
    monthlyPayments,
    plansWithStats,
    platformUsage,
  ] = await Promise.all([
    // SaaS
    prisma.lab.count({ where: { isActive: true, deletedAt: null } }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.branch.count({ where: { deletedAt: null } }),
    prisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),

    // Medical Volume
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.test.count({ where: { deletedAt: null } }),
    prisma.report.count({ where: { deletedAt: null } }),
    prisma.sample.count({ where: { deletedAt: null } }),

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
        subscription: {
          select: { status: true, plan: { select: { name: true } } },
        },
      },
    }),
    prisma.activityLog.findMany({
      take: 12, // Increased for a taller scrollable feed
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, role: true } } },
    }),

    // Financials
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", createdAt: { gte: startOfMonth } },
    }),
    prisma.plan.findMany({
      include: {
        _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.currentUsage.aggregate({ _sum: { storageUsedGB: true } }),
  ]);

  // Calculations
  const mrr = subscriptions.reduce(
    (acc, sub) => acc + Number(sub.plan.price),
    0,
  );
  const actualRevenue = Number(monthlyPayments._sum.amount || 0);

  const activePlans = plansWithStats
    .filter((p) => p._count.subscriptions > 0)
    .map((p) => ({
      name: p.name,
      users: p._count.subscriptions,
      revenue: p._count.subscriptions * Number(p.price),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    saas: {
      activeLabsCount,
      trialLabsCount,
      totalBranches,
      openTicketsCount,
      mrr,
      actualRevenue,
      activePlans,
      bestPlan: activePlans[0],
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
    storage: platformUsage._sum.storageUsedGB || 0,
  };
}

// --- 2. MINI STAT COMPONENT ---
function MiniStat({
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
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
      <div className={`p-2 rounded-md ${colorClass} bg-opacity-10`}>
        <Icon className={`h-4 w-4 ${colorClass.replace("bg-", "text-")}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        <p className="text-lg font-bold text-slate-800 leading-none mt-0.5">
          {new Intl.NumberFormat("en-IN").format(value)}
        </p>
      </div>
    </div>
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
    <div className="space-y-6 pb-12">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            God Mode Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Omniscient view of Patholab Cloud's financial, operational, and
            architectural scale.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-white px-3 py-1.5 text-slate-600 border-slate-200 shadow-sm">
            <HardDrive className="h-3.5 w-3.5 text-blue-500 mr-2" />
            {m.storage.toFixed(1)} GB Storage Used
          </Badge>
          <Badge
            variant="outline"
            className="bg-white px-3 py-1.5 text-slate-600 border-slate-200 shadow-sm">
            <Network className="h-3.5 w-3.5 text-indigo-500 mr-2" />
            {m.saas.totalBranches} Active Branches
          </Badge>
        </div>
      </div>

      {/* --- ROW 1: PRIMARY FINANCIALS (4 Cards) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between opacity-80 mb-2">
              <p className="text-xs font-bold uppercase tracking-wider">
                Platform MRR
              </p>
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-3xl font-bold">{formatCurrency(m.saas.mrr)}</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Cash Collected (MTD)
            </p>
            <h3 className="text-3xl font-bold text-slate-900">
              {formatCurrency(m.saas.actualRevenue)}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Paying Labs
              </p>
              <h3 className="text-3xl font-bold text-slate-900">
                {m.saas.activeLabsCount}
              </h3>
            </div>
            <Building2 className="h-8 w-8 text-indigo-100" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                In Trial Pipeline
              </p>
              <h3 className="text-3xl font-bold text-slate-900">
                {m.saas.trialLabsCount}
              </h3>
            </div>
            <Zap className="h-8 w-8 text-orange-100" />
          </CardContent>
        </Card>
      </div>

      {/* --- ROW 2: PLATFORM SCALE (Hyper Dense Grid) --- */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" /> Platform Medical Volume
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MiniStat
            title="Patients"
            value={m.volume.totalPatients}
            icon={Users}
            colorClass="bg-blue-500"
          />
          <MiniStat
            title="Tests Processed"
            value={m.volume.totalTests}
            icon={Microscope}
            colorClass="bg-purple-500"
          />
          <MiniStat
            title="Samples"
            value={m.volume.totalSamples}
            icon={TestTube}
            colorClass="bg-rose-500"
          />
          <MiniStat
            title="Reports Gen."
            value={m.volume.totalReports}
            icon={FileText}
            colorClass="bg-emerald-500"
          />
          <MiniStat
            title="Ref. Doctors"
            value={m.network.totalDoctors}
            icon={Stethoscope}
            colorClass="bg-cyan-500"
          />
          <MiniStat
            title="Ref. Agencies"
            value={m.network.totalAgencies}
            icon={Briefcase}
            colorClass="bg-amber-500"
          />
          <MiniStat
            title="IoT Analyzers"
            value={m.network.totalIoTAnalyzers}
            icon={Cpu}
            colorClass="bg-slate-700"
          />
        </div>
      </div>

      {/* --- ROW 3: TEST ENGINE CONFIGURATION (Hyper Dense Grid) --- */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" /> Test Engine
          Architecture
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MiniStat
            title="Global Tests"
            value={m.engine.globalTests}
            icon={Globe}
            colorClass="bg-blue-600"
          />
          <MiniStat
            title="Private Tests"
            value={m.engine.privateTests}
            icon={Lock}
            colorClass="bg-slate-600"
          />
          <MiniStat
            title="Parameters"
            value={m.engine.totalParameters}
            icon={Activity}
            colorClass="bg-indigo-500"
          />
          <MiniStat
            title="Sample Types"
            value={m.engine.sampleTypes}
            icon={Beaker}
            colorClass="bg-pink-500"
          />
          <MiniStat
            title="Containers"
            value={m.engine.containerTypes}
            icon={TestTube}
            colorClass="bg-orange-500"
          />
          <MiniStat
            title="Departments"
            value={m.engine.departments}
            icon={Building2}
            colorClass="bg-teal-500"
          />
        </div>
      </div>

      {/* --- ROW 4: BOTTOM THREE COLUMNS (Plans | Tenant Pipeline | Activity Feed) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Plan Distribution */}
        <Card className="border-none shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-500" /> Subscription
              Dist.
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {m.saas.bestPlan && (
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-4">
                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest mb-1">
                  Top Earner
                </p>
                <div className="flex justify-between items-end">
                  <h4 className="text-sm font-bold text-slate-900">
                    {m.saas.bestPlan.name}
                  </h4>
                  <p className="text-xs font-bold text-slate-700">
                    {formatCurrency(m.saas.bestPlan.revenue)}/mo
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {m.saas.activePlans.map((plan, idx) => {
                const percentage = Math.round(
                  (plan.users / m.saas.activeLabsCount) * 100,
                );
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {plan.name}
                      </span>
                      <span className="text-slate-500">
                        {plan.users} labs ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Col 2: Tenant Pipeline */}
        <Card className="border-none shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              Recent Tenants
            </CardTitle>
            <Link
              href="/admin/labs"
              className="text-[10px] text-blue-600 font-bold uppercase hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-400 font-bold uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-2">Lab Name</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {m.feeds.recentLabs.map((lab) => (
                  <tr
                    key={lab.id}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 truncate max-w-[120px]">
                      {lab.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lab.subscription?.plan?.name || "None"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lab.subscription?.status === "ACTIVE" ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                          Active
                        </span>
                      ) : lab.subscription?.status === "TRIAL" ? (
                        <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">
                          Trial
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          Setup
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Col 3: Live Omniscient Feed */}
        <Card className="border-none shadow-sm flex flex-col h-[350px]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" /> Platform Feed
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
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-500">
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
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                            {log.action}
                          </span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">
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
