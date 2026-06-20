"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Wallet,
  Search,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Phone,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Formatter
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

export default function AdminWalletLedgerPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-wallet-ledger"],
    queryFn: async () => {
      const res = await fetch("/api/admin/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet ledger");
      return res.json();
    },
  });

  if (isLoading) return <WalletSkeleton />;

  const { stats, wallets = [] } = data || { stats: {}, wallets: [] };

  // Filter wallets by search
  const filteredWallets = wallets.filter(
    (w: any) =>
      w.labName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.phone.includes(searchTerm),
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-emerald-600" /> Platform Ledger
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Global view of all tenant wallets, balances, and platform liability.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-bold">
          Export Ledger (CSV)
        </Button>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 p-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl" />
          <CardContent className="p-6 relative z-10 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between mb-4 opacity-90">
              <p className="text-sm font-bold uppercase tracking-wider">
                Total Platform Liability
              </p>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-4xl font-black tracking-tighter">
              {formatCurrency(stats.totalLiability || 0)}
            </h3>
            <p className="text-xs font-medium text-emerald-100 mt-2">
              Sum of all unspent client funds
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Building2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Active Wallets
              </p>
            </div>
            <h3 className="text-4xl font-black text-slate-900">
              {stats.totalWallets || 0}
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-2">
              Labs currently on Pay-As-You-Go
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-rose-50/50 rounded-2xl">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-rose-600 uppercase tracking-wider">
                Low Balance Labs
              </p>
            </div>
            <h3 className="text-4xl font-black text-rose-700">
              {stats.lowBalanceCount || 0}
            </h3>
            <p className="text-xs font-medium text-rose-500 mt-2">
              Labs with &lt; ₹500 balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MASTER LEDGER TABLE */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                Tenant Wallet Master List
              </CardTitle>
              <CardDescription>
                View and manage all connected lab wallets
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search lab, email, or phone..."
                className="pl-9 rounded-xl bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Lab / Tenant</th>
                <th className="px-6 py-4 text-right">Current Balance</th>
                <th className="px-6 py-4 text-center">Deduction Rate</th>
                <th className="px-6 py-4">Validity / Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    No wallets found.
                  </td>
                </tr>
              ) : (
                filteredWallets.map((w: any) => (
                  <tr
                    key={w.id}
                    className="hover:bg-slate-50/50 transition-colors bg-white">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-base">
                        {w.labName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                        <span>{w.email}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" /> {w.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-black text-lg ${w.balance < 500 ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatCurrency(w.balance)}
                      </span>
                      {w.balance < 500 && (
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">
                          Low Balance
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-700 border-slate-200 font-bold">
                        ₹{w.perPatientFee} / Reg
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {w.isActive ? (
                        <div className="flex items-center text-emerald-600 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Active
                        </div>
                      ) : (
                        <div className="flex items-center text-rose-600 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 mr-1.5" /> Suspended
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Ends:{" "}
                        {w.validityEndDate
                          ? format(new Date(w.validityEndDate), "dd MMM yyyy")
                          : "N/A"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold rounded-lg">
                        <Link href={`/admin/labs/${w.labId}`}>
                          Manage <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Link>
                      </Button>
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

function WalletSkeleton() {
  return (
    <div className="space-y-6 pb-12 p-8">
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-40 rounded-2xl w-full" />
        <Skeleton className="h-40 rounded-2xl w-full" />
        <Skeleton className="h-40 rounded-2xl w-full" />
      </div>
      <Skeleton className="h-[500px] rounded-2xl w-full mt-6" />
    </div>
  );
}
