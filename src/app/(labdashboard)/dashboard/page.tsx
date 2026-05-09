import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  IndianRupee,
  Users,
  FlaskConical,
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock,
  Box,
  Receipt,
  TrendingDown,
  Briefcase,
  Stethoscope,
  FileText,
  UserCheck,
  ClipboardList,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// --- HELPER: Get Start and End of Today ---
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
};

// --- HELPER: Get Start and End of Current Month ---
const getMonthRange = () => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
};

export default async function MultiRoleDashboard() {
  const user = await getCurrentUser();
  if (!user || !user.labId) redirect("/login");

  const today = getTodayRange();
  const thisMonth = getMonthRange();
  const labId = user.labId;

  let stats: any = {};
  let recentActivity: any = [];

  // ==========================================
  // 1. LAB OWNER / MANAGER DASHBOARD
  // ==========================================
  if (user.role === "LAB_OWNER" || user.role === "LAB_MANAGER") {
    // Fire all database queries concurrently for maximum speed!
    const [
      revenueTodayAgg,
      revenueMonthAgg,
      expenseMonthAgg,
      unpaidInvoicesCount,
      testsTodayCount,
      pendingEntryCount,
      reportsReadyCount,
      lowStockCount,
      staffCount,
      doctorCount,
      agencyCount,
      patientsTodayCount,
    ] = await Promise.all([
      // Financials
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { labId, createdAt: today, status: { not: "CANCELLED" } },
      }),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { labId, createdAt: thisMonth, status: { not: "CANCELLED" } },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { labId, date: thisMonth },
      }),
      prisma.invoice.count({ where: { labId, status: "PENDING" } }),

      // Operations
      prisma.test.count({ where: { labId, createdAt: today } }),
      prisma.test.count({
        where: { labId, status: { in: ["IN_PROGRESS", "SAMPLE_COLLECTED"] } },
      }), // Waiting for entry
      prisma.report.count({
        where: { labId, status: { in: ["GENERATED", "APPROVED"] } },
      }), // Ready to dispatch
      prisma.inventoryBatch.count({
        where: { labId, currentQuantity: { lte: 10 } },
      }),

      // Network & HR
      prisma.labStaff.count({ where: { labId, isActive: true } }),
      prisma.doctor.count({ where: { labId, isActive: true } }),
      prisma.agency.count({ where: { labId, isActive: true } }),
      prisma.patient.count({ where: { labId, createdAt: today } }),
    ]);

    stats = {
      revenueToday: revenueTodayAgg._sum.grandTotal || 0,
      revenueMonth: revenueMonthAgg._sum.grandTotal || 0,
      expenseMonth: expenseMonthAgg._sum.amount || 0,
      unpaidInvoices: unpaidInvoicesCount,
      testsToday: testsTodayCount,
      pendingEntry: pendingEntryCount,
      reportsReady: reportsReadyCount,
      lowStock: lowStockCount,
      totalStaff: staffCount,
      totalDoctors: doctorCount,
      totalAgencies: agencyCount,
      patientsToday: patientsTodayCount,
    };

    recentActivity = await prisma.invoice.findMany({
      where: { labId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
  }

  // ==========================================
  // 2. RECEPTIONIST DASHBOARD
  // ==========================================
  else if (user.role === "RECEPTIONIST") {
    const [registrationsToday, pendingInvoices, homeCollections] =
      await Promise.all([
        prisma.patient.count({ where: { labId, createdAt: today } }),
        prisma.invoice.count({ where: { labId, status: "PENDING" } }),
        prisma.appointment.count({
          where: {
            patient: { labId },
            appointmentDate: today,
            status: "SCHEDULED",
          },
        }),
      ]);

    stats = { registrationsToday, pendingInvoices, homeCollections };
    recentActivity = await prisma.patient.findMany({
      where: { labId },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
  }

  // ==========================================
  // 3. TECHNICIAN DASHBOARD
  // ==========================================
  else if (user.role === "TECHNICIAN") {
    const [pendingSamples, testsToApprove, criticalResults] = await Promise.all(
      [
        prisma.sample.count({
          where: { labId, status: { in: ["COLLECTED", "RECEIVED"] } },
        }),
        prisma.test.count({ where: { labId, status: "COMPLETED" } }),
        prisma.testResultParameter.count({
          where: {
            test: { labId },
            isCritical: true,
            test: { status: "IN_PROGRESS" },
          },
        }),
      ],
    );

    stats = { pendingSamples, testsToApprove, criticalResults };
    recentActivity = await prisma.test.findMany({
      where: { labId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
  }

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome back, {user.name}
        </h1>
        <p className="text-slate-500 mt-1">
          Here is what is happening in your lab today.
        </p>
      </div>

      {/* 👑 OWNER SUPER-DASHBOARD */}
      {(user.role === "LAB_OWNER" || user.role === "LAB_MANAGER") && (
        <div className="space-y-8">
          {/* Section 1: Financial Health */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-600" /> Financial
              Health
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Today's Revenue"
                value={`₹${Number(stats.revenueToday).toLocaleString()}`}
                icon={IndianRupee}
                color="text-green-600"
                bg="bg-green-100"
              />
              <StatCard
                title="Monthly Revenue"
                value={`₹${Number(stats.revenueMonth).toLocaleString()}`}
                icon={Activity}
                color="text-emerald-600"
                bg="bg-emerald-100"
              />
              <StatCard
                title="Monthly Expenses"
                value={`₹${Number(stats.expenseMonth).toLocaleString()}`}
                icon={TrendingDown}
                color="text-rose-600"
                bg="bg-rose-100"
              />
              <StatCard
                title="Unpaid Invoices"
                value={stats.unpaidInvoices}
                icon={Receipt}
                color="text-amber-600"
                bg="bg-amber-100"
              />
            </div>
          </div>

          {/* Section 2: Clinical Operations */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-blue-600" /> Clinical
              Operations
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Tests (Today)"
                value={stats.testsToday}
                icon={ClipboardList}
                color="text-blue-600"
                bg="bg-blue-100"
              />
              <StatCard
                title="Pending Result Entry"
                value={stats.pendingEntry}
                icon={Clock}
                color="text-amber-600"
                bg="bg-amber-100"
              />
              <StatCard
                title="Reports Ready"
                value={stats.reportsReady}
                icon={Send}
                color="text-indigo-600"
                bg="bg-indigo-100"
              />
              <StatCard
                title="Low Stock Alerts"
                value={stats.lowStock}
                icon={Box}
                color="text-red-600"
                bg="bg-red-100"
              />
            </div>
          </div>

          {/* Section 3: Growth & Network */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" /> Growth & Network
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Patients Registered (Today)"
                value={stats.patientsToday}
                icon={Users}
                color="text-purple-600"
                bg="bg-purple-100"
              />
              <StatCard
                title="Active Staff"
                value={stats.totalStaff}
                icon={UserCheck}
                color="text-teal-600"
                bg="bg-teal-100"
              />
              <StatCard
                title="Referral Doctors"
                value={stats.totalDoctors}
                icon={Stethoscope}
                color="text-cyan-600"
                bg="bg-cyan-100"
              />
              <StatCard
                title="B2B Agencies"
                value={stats.totalAgencies}
                icon={Briefcase}
                color="text-sky-600"
                bg="bg-sky-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* 🛎️ RECEPTIONIST WIDGETS */}
      {user.role === "RECEPTIONIST" && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Registered Today"
            value={stats.registrationsToday}
            icon={Users}
            color="text-blue-600"
            bg="bg-blue-100"
          />
          <StatCard
            title="Pending Payments"
            value={stats.pendingInvoices}
            icon={Receipt}
            color="text-amber-600"
            bg="bg-amber-100"
          />
          <StatCard
            title="Home Collections"
            value={stats.homeCollections}
            icon={Clock}
            color="text-purple-600"
            bg="bg-purple-100"
          />
        </div>
      )}

      {/* 🔬 TECHNICIAN WIDGETS */}
      {user.role === "TECHNICIAN" && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Samples to Process"
            value={stats.pendingSamples}
            icon={FlaskConical}
            color="text-blue-600"
            bg="bg-blue-100"
          />
          <StatCard
            title="Needs Approval"
            value={stats.testsToApprove}
            icon={CheckCircle2}
            color="text-amber-600"
            bg="bg-amber-100"
          />
          <StatCard
            title="Critical Flags"
            value={stats.criticalResults}
            icon={AlertCircle}
            color="text-red-600"
            bg="bg-red-100"
          />
        </div>
      )}

      {/* --- DYNAMIC RECENT ACTIVITY SECTION --- */}
      <Card className="col-span-4 mt-8">
        <CardHeader>
          <CardTitle>
            {user.role === "LAB_OWNER"
              ? "Recent Financial Transactions"
              : user.role === "RECEPTIONIST"
                ? "Recent Registrations"
                : "Live Worklist Updates"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500">
                No recent activity to display.
              </p>
            ) : (
              recentActivity.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.patient?.name || item.name || item.invoiceNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.testName ||
                        item.phone ||
                        new Date(item.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {item.grandTotal ? (
                      `₹${Number(item.grandTotal).toLocaleString()}`
                    ) : item.status ? (
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs">
                        {item.status}
                      </span>
                    ) : (
                      "View"
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
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
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}
