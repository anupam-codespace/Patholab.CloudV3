"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCommissionDashboardData,
  markCommissionAsPaid,
} from "@/actions/commission-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Stethoscope,
  Building2,
  CheckCircle2,
  Receipt,
  FileText,
  TrendingUp,
  Users,
  Wallet,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";

export default function CommissionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("doctors");

  // Settlement Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [transactionRef, setTransactionRef] = useState("");

  // Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ["commissions"],
    queryFn: async () => await getCommissionDashboardData(),
  });

  // Settle Mutation
  const settleMutation = useMutation({
    mutationFn: async (payload: { ids: string[]; ref: string }) => {
      await markCommissionAsPaid(payload.ids, payload.ref);
    },
    onSuccess: () => {
      toast.success("Commissions marked as PAID successfully!");
      setIsSettleModalOpen(false);
      setTransactionRef("");
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: () => toast.error("Failed to settle commissions."),
  });

  const handleOpenSettle = (entity: any) => {
    setSelectedEntity(entity);
    setIsSettleModalOpen(true);
  };

  const handleSettleSubmit = () => {
    if (!selectedEntity) return;
    const pendingIds = selectedEntity.recentCommissions
      .filter((c: any) => c.status === "PENDING")
      .map((c: any) => c.id);

    if (pendingIds.length === 0)
      return toast.error("No pending commissions to settle.");

    settleMutation.mutate({
      ids: pendingIds,
      ref: transactionRef || "Cash Settlement",
    });
  };

  const displayList = activeTab === "doctors" ? data?.doctors : data?.agencies;
  const filteredList =
    displayList?.filter((item: any) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  // ==========================================
  // ADVANCED STATISTICS CALCULATIONS
  // ==========================================
  const stats = useMemo(() => {
    const docs = data?.doctors || [];
    const ags = data?.agencies || [];
    const allPartners = [...docs, ...ags].map((p) => ({
      ...p,
      totalGenerated: p.totalPaid + p.totalPending,
    }));

    const totalDocPending = docs.reduce((acc, d) => acc + d.totalPending, 0);
    const totalDocPaid = docs.reduce((acc, d) => acc + d.totalPaid, 0);
    const totalAgPending = ags.reduce((acc, a) => acc + a.totalPending, 0);
    const totalAgPaid = ags.reduce((acc, a) => acc + a.totalPaid, 0);

    const globalPending = totalDocPending + totalAgPending;
    const globalPaid = totalDocPaid + totalAgPaid;
    const globalGenerated = globalPending + globalPaid;

    const activePartnersCount = allPartners.filter(
      (p) => p.totalGenerated > 0,
    ).length;

    // Top 5 Referrers by Total Generated
    const topPerformers = [...allPartners]
      .filter((p) => p.totalGenerated > 0)
      .sort((a, b) => b.totalGenerated - a.totalGenerated)
      .slice(0, 5);

    const maxPerformerValue = topPerformers[0]?.totalGenerated || 1;

    // Split Percentages
    const docGenerated = totalDocPending + totalDocPaid;
    const agGenerated = totalAgPending + totalAgPaid;
    const docPercent =
      globalGenerated > 0
        ? Math.round((docGenerated / globalGenerated) * 100)
        : 0;
    const agPercent =
      globalGenerated > 0
        ? Math.round((agGenerated / globalGenerated) * 100)
        : 0;

    return {
      globalPending,
      globalPaid,
      globalGenerated,
      activePartnersCount,
      topPerformers,
      maxPerformerValue,
      docGenerated,
      agGenerated,
      docPercent,
      agPercent,
    };
  }, [data]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Commissions Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track payouts, analyze top referrers, and settle accounts.
          </p>
        </div>
      </div>

      {/* 1. FOUR KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Generated
            </p>
            <h2 className="text-2xl font-black text-slate-900">
              ₹{stats.globalGenerated.toLocaleString()}
            </h2>
          </div>
          <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-emerald-50 w-20 h-20 rounded-full opacity-50"></div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
              Settled (Paid)
            </p>
            <h2 className="text-2xl font-black text-emerald-900">
              ₹{stats.globalPaid.toLocaleString()}
            </h2>
          </div>
          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center z-10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-orange-50 w-20 h-20 rounded-full opacity-50"></div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-1">
              Unpaid (Pending)
            </p>
            <h2 className="text-2xl font-black text-orange-900">
              ₹{stats.globalPending.toLocaleString()}
            </h2>
          </div>
          <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center z-10">
            <Receipt className="h-5 w-5 text-orange-600" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Active Partners
            </p>
            <h2 className="text-2xl font-black text-slate-900">
              {stats.activePartnersCount}
            </h2>
          </div>
          <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* 2. CHARTS & INSIGHTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers Bar Chart (Custom CSS) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Top 5 Referrers
          </h3>

          {stats.topPerformers.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              No commissions generated yet.
            </div>
          ) : (
            <div className="space-y-4">
              {stats.topPerformers.map((partner, idx) => {
                const totalPercent =
                  (partner.totalGenerated / stats.maxPerformerValue) * 100;
                const paidPercent =
                  (partner.totalPaid / partner.totalGenerated) * 100;
                const pendingPercent =
                  (partner.totalPending / partner.totalGenerated) * 100;

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        {partner.type === "DOCTOR" ? (
                          <Stethoscope className="w-3 h-3 text-indigo-500" />
                        ) : (
                          <Building2 className="w-3 h-3 text-teal-500" />
                        )}
                        {partner.name}
                      </span>
                      <span>₹{partner.totalGenerated.toLocaleString()}</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full flex"
                        style={{ width: `${totalPercent}%` }}>
                        {/* The colored bar splits into Paid (Green) and Pending (Orange) */}
                        <div
                          style={{ width: `${paidPercent}%` }}
                          className="bg-emerald-500 h-full border-r border-white/20"
                          title={`Paid: ₹${partner.totalPaid}`}></div>
                        <div
                          style={{ width: `${pendingPercent}%` }}
                          className="bg-orange-400 h-full"
                          title={`Pending: ₹${partner.totalPending}`}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 mt-4 pt-4 border-t">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                  Paid
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>{" "}
                  Pending
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Distribution Donut Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-600" /> Revenue Split
          </h3>

          {stats.globalGenerated === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              No data available
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* CSS Donut Chart */}
              <div
                className="relative w-32 h-32 rounded-full mb-6"
                style={{
                  background: `conic-gradient(#6366f1 0% ${stats.docPercent}%, #14b8a6 ${stats.docPercent}% 100%)`,
                }}>
                <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Total
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    ₹{(stats.globalGenerated / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <div className="w-3 h-3 rounded bg-indigo-500"></div>{" "}
                    Doctors ({stats.docPercent}%)
                  </div>
                  <span className="font-bold">
                    ₹{stats.docGenerated.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <div className="w-3 h-3 rounded bg-teal-500"></div> Agencies
                    ({stats.agPercent}%)
                  </div>
                  <span className="font-bold">
                    ₹{stats.agGenerated.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. TABS & DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <Tabs
          defaultValue="doctors"
          onValueChange={setActiveTab}
          className="w-full">
          <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <TabsList className="bg-slate-200/60 p-1">
              <TabsTrigger value="doctors" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" /> Doctors
              </TabsTrigger>
              <TabsTrigger value="agencies" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Agencies
              </TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">
                    Referrer Name
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Commission Rule
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">
                    Pending Amount
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">
                    Lifetime Paid
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-500">
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-500">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((item: any) => {
                    const totalGen = item.totalPending + item.totalPaid;
                    const progress =
                      totalGen > 0 ? (item.totalPaid / totalGen) * 100 : 0;

                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50/50 group">
                        <TableCell>
                          <div className="font-bold text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.contact || "No contact info"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-600">
                            {item.commissionRule}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold text-orange-600 text-base">
                            ₹{item.totalPending.toLocaleString()}
                          </div>
                          {item.pendingCount > 0 && (
                            <div className="text-[10px] text-orange-500 font-medium">
                              {item.pendingCount} unpaid tests
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium text-slate-700 mb-1">
                            ₹{item.totalPaid.toLocaleString()}
                          </div>
                          {totalGen > 0 && (
                            <div
                              className="w-24 h-1.5 bg-slate-100 rounded-full ml-auto overflow-hidden"
                              title={`${Math.round(progress)}% Paid`}>
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${progress}%` }}></div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={
                              item.totalPending > 0 ? "default" : "outline"
                            }
                            className={
                              item.totalPending > 0
                                ? "bg-primary hover:bg-primary/90"
                                : ""
                            }
                            disabled={item.totalPending === 0}
                            onClick={() => handleOpenSettle(item)}>
                            {item.totalPending > 0
                              ? "Settle Payout"
                              : "All Settled"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </div>

      {/* SETTLEMENT MODAL */}
      <Dialog open={isSettleModalOpen} onOpenChange={setIsSettleModalOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Settle Commissions: {selectedEntity?.name}
            </DialogTitle>
            <DialogDescription>
              Review the pending tests before marking them as Paid.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-orange-600 uppercase">
                  Amount to Pay
                </p>
                <p className="text-3xl font-black text-orange-700">
                  ₹{selectedEntity?.totalPending.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Payment Ref / Note
                </p>
                <Input
                  placeholder="e.g. UPI-123456789"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="mt-1 h-8 bg-white text-xs w-48"
                />
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Pending Ledger
              </h4>
              <div className="border rounded-lg max-h-[250px] overflow-y-auto bg-slate-50">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                    <TableRow className="h-8">
                      <TableHead className="text-xs font-bold">Date</TableHead>
                      <TableHead className="text-xs font-bold">
                        Patient & Test
                      </TableHead>
                      <TableHead className="text-xs font-bold text-right">
                        Commission
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntity?.recentCommissions
                      .filter((c: any) => c.status === "PENDING")
                      .map((comm: any) => (
                        <TableRow
                          key={comm.id}
                          className="h-10 border-b-slate-100 bg-white">
                          <TableCell className="text-[11px] text-slate-500">
                            {new Date(comm.test.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-bold text-slate-800">
                              {comm.test?.patient?.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {comm.test?.testName} ({comm.test?.testNumber})
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-orange-600">
                            ₹{Number(comm.amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="ghost" onClick={() => setIsSettleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSettleSubmit}
              disabled={
                settleMutation.isPending || selectedEntity?.totalPending === 0
              }
              className="bg-green-600 hover:bg-green-700 text-primary-foreground shadow-md">
              {settleMutation.isPending ? "Processing..." : "Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
