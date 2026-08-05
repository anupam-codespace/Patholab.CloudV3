import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Clock,
  Download,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

export default async function AdminDeductionsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  // Fetch all Deductions & Setup Fees across the platform
  const transactions = await prisma.walletTransaction.findMany({
    where: {
      type: { in: ["DEDUCTION", "SETUP_FEE"] },
    },
    orderBy: { createdAt: "desc" },
    take: 300, // Firehose view, grab latest 300
    include: {
      wallet: {
        include: { lab: { select: { name: true } } },
      },
    },
  });

  const totalBurned = transactions.reduce(
    (acc, tx) => acc + Number(tx.amount),
    0,
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ArrowUpRight className="h-8 w-8 text-rose-600" /> Usage Deductions
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Real-time firehose of clinical operations burning platform credits.
          </p>
        </div>
        <Button
          variant="outline"
          className="text-foreground/80 rounded-xl shadow-sm font-bold border-border">
          <Download className="w-4 h-4 mr-2" /> Export Ledger
        </Button>
      </div>

      {/* KPI METRIC */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500 to-rose-700 text-primary-foreground relative overflow-hidden rounded-2xl w-full md:w-1/3">
        <div className="absolute top-0 right-0 p-24 bg-card opacity-5 rounded-full -mr-10 -mt-10 blur-2xl" />
        <CardContent className="p-6 relative z-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2 opacity-90">
            <p className="text-sm font-bold uppercase tracking-wider">
              Total Burned (Latest 300)
            </p>
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-4xl font-black tracking-tighter">
            {formatCurrency(totalBurned)}
          </h3>
        </CardContent>
      </Card>

      {/* DEDUCTIONS TABLE */}
      <Card className="border-border shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-600" /> Live Burn Firehose
          </CardTitle>
          <CardDescription>
            Chronological list of all Pay-As-You-Go deductions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/30 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Tenant Lab</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Operation Trigger</th>
                <th className="px-6 py-4 text-right">Fee Deducted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-muted-foreground font-medium">
                    No deductions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-muted/30 transition-colors bg-card">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted text-muted-foreground rounded-lg border border-border">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            {tx.wallet.lab?.name || "Unknown Lab"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />{" "}
                        {format(new Date(tx.createdAt), "hh:mm:ss a")}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mt-0.5">
                        {format(new Date(tx.createdAt), "dd MMM yyyy")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground/80 truncate max-w-[300px]">
                        {tx.description}
                      </p>
                      <Badge
                        variant="outline"
                        className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] uppercase mt-1">
                        {tx.type.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-lg text-rose-600">
                        -{formatCurrency(Number(tx.amount))}
                      </span>
                      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mt-1">
                        Bal: {formatCurrency(Number(tx.closingBalance))}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
