"use client";

import { UserPlus, Receipt, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ReceptionistDashboard({ labId }: { labId: string }) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          Front Desk
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Manage patient intake and billing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/workspace/registration">
          <Card className="p-6 border-border shadow-sm rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group">
            <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UserPlus className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              New Registration
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Register walk-in patients
            </p>
          </Card>
        </Link>

        <Link href="/workspace/billing">
          <Card className="p-6 border-border shadow-sm rounded-2xl hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group">
            <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Receipt className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Settle Dues</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Collect pending payments
            </p>
          </Card>
        </Link>

        <Link href="/workspace/appointments">
          <Card className="p-6 border-border shadow-sm rounded-2xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Appointments</h3>
            <p className="text-xs text-muted-foreground mt-1">
              View home collection schedules
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
