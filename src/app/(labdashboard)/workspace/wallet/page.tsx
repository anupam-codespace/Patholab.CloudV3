"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Search,
  Calendar,
  Clock,
  FileText,
  ShieldCheck,
  Receipt,
  CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// --- Formatter Utilities ---
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

const extractPaymentId = (description: string) => {
  const match = description.match(/Payment ID:\s*([^)]+)/);
  return match ? match[1] : "N/A";
};

export default function WalletDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // --- Fetch Wallet & Transactions ---
  const { data, isLoading } = useQuery({
    queryKey: ["lab-wallet-history"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/wallet/details");
      if (!res.ok) throw new Error("Failed to load wallet data");
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  if (isLoading) return <WalletSkeleton />;

  const { wallet, transactions = [] } = data || { wallet: {}, transactions: [] };
  const currentBalance = transactions.reduce((acc: number, tx: any) => {
   return tx.type === "RECHARGE"
     ? acc + Number(tx.amount)
     : acc - Number(tx.amount);
 }, 0);

 const minRecharge = Number(wallet?.minimumRecharge ?? 100);
 const feePerPatient = Number(wallet?.perPatientFee ?? 2.5);

  // --- Calculations ---
  const totalRecharged = transactions
    .filter((tx: any) => tx.type === "RECHARGE")
    .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

  const totalSpent = transactions
    .filter((tx: any) => tx.type === "DEDUCTION")
    .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

  // --- Filtering ---
  const filteredTransactions = transactions.filter((tx: any) => {
    const matchesTab = activeTab === "ALL" || tx.type === activeTab;
    const matchesSearch = tx.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // --- Download PDF Action ---
  const handleDownloadInvoice = (txId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("Generating Invoice PDF...");
    // Redirects to your backend PDF generator route
    window.open(`/api/workspace/wallet/invoice/${txId}`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-indigo-600" /> Wallet & Billing
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your pay-as-you-go clinical credits and invoices.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => router.push("/workspace/wallet/recharge")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl">
          <Plus className="h-5 w-5 mr-2" /> Recharge Wallet
        </Button>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 text-white overflow-hidden relative rounded-2xl">
          <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl" />
          <CardContent className="p-6 md:p-8 relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider">
                  Available Credits
                </p>
                <h2 className="text-5xl font-black tracking-tighter text-emerald-400">
                  {formatCurrency(currentBalance)}
                </h2>
              </div>
              <ShieldCheck className="h-8 w-8 text-indigo-300 opacity-50" />
            </div>

            <div className="pt-4 border-t border-indigo-500/30 flex justify-between items-end">
              <div>
                <p className="text-xs text-indigo-300 mb-1">Validity Ends On</p>
                <p className="font-medium text-sm text-indigo-100">
                  {wallet?.validityEndDate
                    ? format(new Date(wallet.validityEndDate), "dd MMM yyyy")
                    : "N/A"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-300 mb-1">Current Rate</p>
                <p className="font-medium text-sm text-indigo-100">
                  ₹{feePerPatient} / Patient
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Recharged */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-6 md:p-8 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <ArrowDownRight className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Total Recharged
              </p>
            </div>
            <h3 className="text-3xl font-black text-slate-900">
              {formatCurrency(totalRecharged)}
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-2">
              Lifetime wallet additions
            </p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-6 md:p-8 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <ArrowUpRight className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Total Consumed
              </p>
            </div>
            <h3 className="text-3xl font-black text-slate-900">
              {formatCurrency(totalSpent)}
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-2">
              Spent on clinical operations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TRANSACTION HISTORY */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Ledger & History</CardTitle>
              <CardDescription>
                Click any transaction to view detailed receipt
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search transactions..."
                className="pl-9 rounded-full bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs
            defaultValue="ALL"
            className="w-full"
            onValueChange={setActiveTab}>
            <div className="px-6 pt-4 border-b border-slate-100">
              <TabsList className="bg-slate-100/80">
                <TabsTrigger value="ALL">All History</TabsTrigger>
                <TabsTrigger value="RECHARGE">Recharges Only</TabsTrigger>
                <TabsTrigger value="DEDUCTION">Deductions Only</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value={activeTab}
              className="p-0 m-0 border-none outline-none">
              {filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <Receipt className="h-12 w-12 text-slate-200 mb-3" />
                  <p>No transactions found for this filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="group flex flex-col md:flex-row md:items-center justify-between p-4 md:px-6 hover:bg-slate-50 cursor-pointer transition-colors">
                      {/* Left: Icon & Description */}
                      <div className="flex items-center gap-4 mb-3 md:mb-0">
                        <div
                          className={`p-3 rounded-full shrink-0 ${tx.type === "RECHARGE" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                          {tx.type === "RECHARGE" ? (
                            <ArrowDownRight className="h-5 w-5" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 line-clamp-1">
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />{" "}
                              {format(new Date(tx.createdAt), "dd MMM yyyy")}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />{" "}
                              {format(new Date(tx.createdAt), "hh:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-6 ml-12 md:ml-0">
                        <div className="text-right">
                          <p
                            className={`font-black ${tx.type === "RECHARGE" ? "text-emerald-600" : "text-rose-600"}`}>
                            {tx.type === "RECHARGE" ? "+" : "-"}
                            {formatCurrency(Number(tx.amount))}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                            Bal: {formatCurrency(Number(tx.closingBalance))}
                          </p>
                        </div>

                        {tx.type === "RECHARGE" && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shrink-0"
                            onClick={(e) => handleDownloadInvoice(tx.id, e)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* --- DETAILED TRANSACTION MODAL --- */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
          {selectedTx && (
            <>
              {/* Modal Header */}
              <div
                className={`p-6 text-white text-center ${selectedTx.type === "RECHARGE" ? "bg-emerald-600" : "bg-rose-600"}`}>
                <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  {selectedTx.type === "RECHARGE" ? (
                    <ArrowDownRight className="h-6 w-6 text-white" />
                  ) : (
                    <ArrowUpRight className="h-6 w-6 text-white" />
                  )}
                </div>
                <h2 className="text-3xl font-black tracking-tighter">
                  {selectedTx.type === "RECHARGE" ? "+" : "-"}
                  {formatCurrency(Number(selectedTx.amount))}
                </h2>
                <p className="text-white/80 text-sm font-medium mt-1 uppercase tracking-widest">
                  {selectedTx.type === "RECHARGE"
                    ? "Payment Received"
                    : "Wallet Deduction"}
                </p>
              </div>

              {/* Modal Body / Receipt */}
              <div className="p-6 space-y-6 bg-slate-50">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Date</span>
                    <span className="text-slate-900 font-semibold">
                      {format(new Date(selectedTx.createdAt), "dd MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Time</span>
                    <span className="text-slate-900 font-semibold">
                      {format(new Date(selectedTx.createdAt), "hh:mm:ss a")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">
                      Closing Balance
                    </span>
                    <span className="text-slate-900 font-bold">
                      {formatCurrency(Number(selectedTx.closingBalance))}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Description
                  </p>
                  <p className="text-sm font-medium text-slate-700 leading-snug">
                    {selectedTx.description}
                  </p>

                  {/* Extract Razorpay Mode details if it's a recharge */}
                  {selectedTx.type === "RECHARGE" && (
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium">
                        Gateway: Razorpay
                      </span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">
                        SUCCESS
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2">
                  {selectedTx.type === "RECHARGE" ? (
                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12"
                      onClick={(e) => handleDownloadInvoice(selectedTx.id, e)}>
                      <Download className="h-4 w-4 mr-2" /> Download Tax Invoice
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl h-12"
                      onClick={() => setSelectedTx(null)}>
                      Close Receipt
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <Skeleton className="h-96 rounded-2xl w-full" />
    </div>
  );
}
