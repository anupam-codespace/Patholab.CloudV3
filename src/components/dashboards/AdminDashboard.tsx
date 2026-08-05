"use client";

import { Activity, Users, FileText, IndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AdminDashboard({
  labId,
  role,
}: {
  labId: string;
  role: string;
}) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Business Overview
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Welcome back. Here is your lab's performance today.
          </p>
        </div>
        <div className="text-xs font-bold bg-indigo-100 text-primary px-3 py-1 rounded-full uppercase tracking-wider">
          {role.replace("_", " ")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Revenue",
            value: "₹24,500",
            icon: IndianRupee,
            color: "text-primary",
            bg: "bg-emerald-50",
          },
          {
            label: "New Patients",
            value: "42",
            icon: Users,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Tests Processed",
            value: "128",
            icon: Activity,
            color: "text-primary",
            bg: "bg-indigo-50",
          },
          {
            label: "Pending Reports",
            value: "14",
            icon: FileText,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="p-5 border-border shadow-sm flex items-center gap-4 rounded-2xl">
            <div
              className={`h-12 w-12 rounded-full ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
