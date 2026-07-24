import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Clock,
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

export default async function AdminDeductionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  // --- PAGINATION SETUP ---
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 20; // Exact limit requested
  const skip = (currentPage - 1) * limit;

  const whereClause = { type: { in: ["DEDUCTION", "SETUP_FEE"] } };

  // Fetch paginated transactions, total count, and all-time total burned concurrently
  const [transactions, totalCount, aggregate] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        wallet: {
          include: { lab: { select: { name: true } } },
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
  const totalBurned = Number(aggregate._sum.amount || 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowUpRight className="h-8 w-8 text-rose-600" /> Usage Deductions
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Real-time firehose of clinical operations burning platform credits.
          </p>
        </div>
        <Button
          variant="outline"
          className="text-slate-700 rounded-xl shadow-sm font-bold border-slate-200">
          <Download className="w-4 h-4 mr-2" /> Export Ledger
        </Button>
      </div>

      {/* KPI METRIC */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500 to-rose-700 text-white relative overflow-hidden rounded-2xl w-full md:w-1/3">
        <div className="absolute top-0 right-0 p-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl" />
        <CardContent className="p-6 relative z-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2 opacity-90">
            <p className="text-sm font-bold uppercase tracking-wider">
              Total Burned (All Time)
            </p>
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-4xl font-black tracking-tighter">
            {formatCurrency(totalBurned)}
          </h3>
        </CardContent>
      </Card>

      {/* DEDUCTIONS TABLE */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-600" /> Live Burn Firehose
          </CardTitle>
          <CardDescription>
            Chronological list of all Pay-As-You-Go deductions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
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
                    className="p-12 text-center text-slate-500 font-medium">
                    No deductions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg border border-slate-200">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {tx.wallet.lab?.name || "Unknown Lab"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />{" "}
                        {format(new Date(tx.createdAt), "hh:mm:ss a")}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        {format(new Date(tx.createdAt), "dd MMM yyyy")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700 truncate max-w-[300px]">
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