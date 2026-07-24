import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import {
  Wallet,
  ArrowDownRight,
  Building2,
  Calendar,
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight,
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

export default async function AdminRechargesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  // --- PAGINATION SETUP ---
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 20; // Number of items per page
  const skip = (currentPage - 1) * limit;

  const whereClause = { type: { in: ["RECHARGE", "REFUND"] } };

  // Fetch paginated transactions, total count, and all-time total inflow concurrently
  const [transactions, totalCount, aggregate] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        wallet: {
          include: { lab: { select: { name: true, phone: true } } },
        },
      },
    }),
    prisma.walletTransaction.count({
      where: whereClause,
    }),
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const totalRecharged = Number(aggregate._sum.amount || 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowDownRight className="h-8 w-8 text-emerald-600" /> Recharge
            History
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Global inflow ledger tracking all wallet top-ups across the
            platform.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-bold">
          <Download className="w-4 h-4 mr-2" /> Export to CSV
        </Button>
      </div>

      {/* KPI METRIC */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white relative overflow-hidden rounded-2xl w-full md:w-1/3">
        <div className="absolute top-0 right-0 p-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl" />
        <CardContent className="p-6 relative z-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2 opacity-90">
            <p className="text-sm font-bold uppercase tracking-wider">
              Total Inflow (All Time)
            </p>
            <Wallet className="h-5 w-5" />
          </div>
          <h3 className="text-4xl font-black tracking-tighter">
            {formatCurrency(totalRecharged)}
          </h3>
        </CardContent>
      </Card>

      {/* RECHARGES TABLE */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" /> Platform Top-Ups
          </CardTitle>
          <CardDescription>
            Chronological list of all successful payments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Tenant Lab</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Gateway TXN Details</th>
                <th className="px-6 py-4 text-right">Amount Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-slate-500 font-medium">
                    No recharges found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {tx.wallet.lab?.name || "Unknown Lab"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {tx.wallet.labId.split("-")[0]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">
                        {format(new Date(tx.createdAt), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />{" "}
                        {format(new Date(tx.createdAt), "hh:mm a")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700 truncate max-w-[250px]">
                        {tx.description}
                      </p>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] uppercase mt-1">
                        {tx.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-lg text-emerald-600">
                        +{formatCurrency(Number(tx.amount))}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Bal: {formatCurrency(Number(tx.closingBalance))}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">
              Showing page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold h-9 bg-white"
                disabled={currentPage === 1}
                asChild={currentPage > 1}
              >
                {currentPage > 1 ? (
                  <Link href={`?page=${currentPage - 1}`}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Link>
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold h-9 bg-white"
                disabled={currentPage >= totalPages}
                asChild={currentPage < totalPages}
              >
                {currentPage < totalPages ? (
                  <Link href={`?page=${currentPage + 1}`}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                ) : (
                  <>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}