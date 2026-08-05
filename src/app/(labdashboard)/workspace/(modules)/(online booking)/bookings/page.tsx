import Link from "next/link";
import {
  Settings,
  ExternalLink,
  Activity,
  CalendarCheck,
  Clock,
} from "lucide-react";
import OnlineBookingsTable from "./OnlineBookingsTable";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
// Import your auth helper - adjust path as needed
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export default async function BookingsDashboardPage() {
  // 1. Authenticate user and get Lab ID
  const token = cookies().get("token")?.value;
  if (!token) return null;
  const user = await verifyToken(token); // Replace with your actual auth logic

  // 2. Fetch Lab to get the portalSlug for the "View Live Portal" button
  const lab = await prisma.lab.findUnique({
    where: { id: user.labId },
    select: { portalSlug: true },
  });

  // 3. Quick Stats Calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalPending, totalToday] = await Promise.all([
    prisma.appointment.count({
      where: {
        labId: user.labId,
        source: "ONLINE_PORTAL",
        status: "SCHEDULED",
      },
    }),
    prisma.appointment.count({
      where: {
        labId: user.labId,
        source: "ONLINE_PORTAL",
        createdAt: { gte: today },
      },
    }),
  ]);

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Online Bookings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage B2B2C patient appointments and home collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lab?.portalSlug ? (
            <Link
              href={`/book/${lab.portalSlug}`}
              target="_blank"
              className="flex items-center gap-2 bg-card border border-border text-foreground/80 hover:bg-muted/30 px-4 py-2 rounded-lg font-medium transition-colors text-sm">
              <ExternalLink className="w-4 h-4" /> View Live Portal
            </Link>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              Portal Offline
            </span>
          )}

          <Link
            href="/workspace/bookings/settings"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors text-sm">
            <Settings className="w-4 h-4" /> Portal Settings
          </Link>
        </div>
      </div>

      {/* --- QUICK STATS WIDGETS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg text-primary">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              New Bookings Today
            </p>
            <h3 className="text-2xl font-bold text-foreground">{totalToday}</h3>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pending Action</p>
            <h3 className="text-2xl font-bold text-foreground">
              {totalPending}
            </h3>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Revenue (Online)
            </p>
            <h3 className="text-2xl font-bold text-foreground">
              Auto-Calculated
            </h3>
          </div>
        </div>
      </div>

      {/* --- CLIENT TABLE COMPONENT --- */}
      <OnlineBookingsTable />
    </div>
  );
}
