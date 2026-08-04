"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, subDays, isAfter } from "date-fns";
import toast from "react-hot-toast";
import {
  Trash2,
  Search,
  Database,
  Loader2,
  FileJson,
  HardDrive,
  Clock,
  AlertTriangle,
  UserX,
  History,
  ShieldAlert,
  RefreshCw,
  BarChart3,
  Network,
  CheckCircle2,
  Trash
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- HELPER FUNCTIONS ---
const RETENTION_DAYS = 30;

function getDaysLeft(deletedAt: string) {
  const daysPassed = differenceInDays(new Date(), new Date(deletedAt));
  return Math.max(0, RETENTION_DAYS - daysPassed);
}

export default function AdminArchivesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [quickFilter, setQuickFilter] = useState("ALL"); // ALL, TODAY, LAST_7, EXPIRING

  // Modal States
  const [restoreItem, setRestoreItem] = useState<any | null>(null);
  const [purgeItem, setPurgeItem] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ["admin-archives"],
    queryFn: async () => {
      const res = await fetch("/api/admin/archives");
      if (!res.ok) throw new Error("Failed to fetch archives");
      return res.json();
    },
  });

  const archives = data?.data || [];

  // Action Mutation (Restore / Purge)
  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      type,
      action,
    }: {
      id: string;
      type: string;
      action: "RESTORE" | "PURGE";
    }) => {
      const res = await fetch("/api/admin/archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.action === "RESTORE" ? "Record restored!" : "Record permanently purged!"
      );
      setRestoreItem(null);
      setPurgeItem(null);
      setDeleteConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["admin-archives"] });
    },
    onError: () => toast.error("Failed to process request"),
  });

  // --- COMPUTED METRICS & ANALYTICS ---
  const metrics = useMemo(() => {
    let expiringSoon = 0;
    const typeCounts: Record<string, number> = {};

    archives.forEach((item: any) => {
      if (getDaysLeft(item.deletedAt) <= 5) expiringSoon++;
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });

    const topDeleted = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3

    return {
      total: archives.length,
      expiringSoon,
      storageMB: (archives.length * 0.45).toFixed(1), // Mock storage calculation
      topDeleted,
    };
  }, [archives]);

  // --- FILTERING LOGIC ---
  const filteredArchives = useMemo(() => {
    const today = new Date();
    return archives.filter((item: any) => {
      // 1. Search
      const matchesSearch =
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.labName?.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase());

      // 2. Category
      const matchesCategory =
        categoryFilter === "ALL" || item.type === categoryFilter;

      // 3. Quick Date Filter
      let matchesDate = true;
      const delDate = new Date(item.deletedAt);
      if (quickFilter === "TODAY") {
        matchesDate = differenceInDays(today, delDate) === 0;
      } else if (quickFilter === "LAST_7") {
        matchesDate = isAfter(delDate, subDays(today, 7));
      } else if (quickFilter === "EXPIRING") {
        matchesDate = getDaysLeft(item.deletedAt) <= 5;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [archives, search, categoryFilter, quickFilter]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 p-4 md:p-8 bg-slate-50/50 min-h-screen">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <Trash2 className="h-8 w-8 text-rose-600" /> Platform Recycle Bin
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Review, restore, or permanently purge soft-deleted records. Items are auto-purged after {RETENTION_DAYS} days.
        </p>
      </div>

      {/* --- 1. SUMMARY & ANALYTICS SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* SUMMARY CARDS */}
        <div className="md:col-span-3 xl:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Deleted Records</p>
                <Database className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{metrics.total}</h3>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Restorable</p>
                <RefreshCw className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">{metrics.total}</h3>
            </CardContent>
          </Card>
          <Card className="border-rose-100 shadow-sm bg-rose-50/50">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Permanent Soon</p>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-3xl font-black text-rose-700 mt-2">{metrics.expiringSoon}</h3>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Storage Used</p>
                <HardDrive className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{metrics.storageMB} <span className="text-lg font-bold text-slate-400">MB</span></h3>
            </CardContent>
          </Card>
        </div>

        {/* ANALYTICS CARD */}
        <Card className="border-slate-200 shadow-sm md:col-span-1">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-3 h-3 text-blue-500" /> Most Deleted
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {metrics.topDeleted.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No data available.</p>
            ) : (
              metrics.topDeleted.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 capitalize">{type.toLowerCase()}s</span>
                  <Badge variant="secondary" className="bg-slate-100 font-bold">{count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- 2. MAIN DATA CARD --- */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        
        {/* QUICK FILTERS & SEARCH */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-4 border-b border-slate-100">
         <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setQuickFilter("ALL")} 
              className={`rounded-xl font-bold h-9 transition-all ${
                quickFilter === "ALL" 
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              All Time
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setQuickFilter("TODAY")} 
              className={`rounded-xl font-bold h-9 transition-all ${
                quickFilter === "TODAY" 
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Today
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setQuickFilter("LAST_7")} 
              className={`rounded-xl font-bold h-9 transition-all ${
                quickFilter === "LAST_7" 
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Last 7 Days
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setQuickFilter("EXPIRING")} 
              className={`rounded-xl font-bold h-9 transition-all ${
                quickFilter === "EXPIRING" 
                  ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700" 
                  : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
              }`}
            >
              <AlertTriangle className={`w-3 h-3 mr-2 ${quickFilter === "EXPIRING" ? "text-white" : "text-rose-600"}`} /> 
              Critical / Expiring
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search records..."
                className="pl-9 rounded-xl bg-slate-50 border-slate-200 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[160px] rounded-xl bg-slate-50 border-slate-200 h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Entities</SelectItem>
                <SelectItem value="LAB">Labs</SelectItem>
                <SelectItem value="PATIENT">Patients</SelectItem>
                <SelectItem value="INVOICE">Invoices</SelectItem>
                <SelectItem value="REPORT">Reports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto min-h-[400px]">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Entity</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Identity</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Deleted By</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-500 uppercase tracking-widest text-xs h-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-3" />
                    <p className="text-slate-500 font-bold text-sm">Scanning database archives...</p>
                  </TableCell>
                </TableRow>
              ) : filteredArchives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64">
                    {/* EMPTY STATE */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Trash className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900">Recycle Bin is Empty</h3>
                      <p className="text-sm text-slate-500 font-medium max-w-sm mt-1">
                        There are no soft-deleted records matching your criteria. Deleted items will appear here for {RETENTION_DAYS} days before permanent removal.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredArchives.map((item: any) => {
                  const daysLeft = getDaysLeft(item.deletedAt);
                  const isExpiring = daysLeft <= 5;

                  return (
                    <TableRow key={`${item.type}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell>
                        <Badge variant="outline" className={`font-black uppercase tracking-widest text-[10px] ${
                          item.type === "PATIENT" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {item.type}
                        </Badge>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider line-clamp-1">{item.labName}</p>
                      </TableCell>
                      
                      <TableCell>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.id}</p>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <UserX className="w-3 h-3 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{item.deletedBy || "System Admin"}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                              <History className="w-3 h-3" /> {format(new Date(item.deletedAt), "dd MMM, hh:mm a")}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {isExpiring ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold flex w-fit items-center gap-1.5 px-2.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Permanent in {daysLeft} Days
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold flex w-fit items-center gap-1.5 px-2.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Restorable ({daysLeft}d left)
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* RAW DATA VIEWER */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg h-8 w-8">
                                <FileJson className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl bg-slate-950 border-slate-800">
                              <DialogHeader>
                                <DialogTitle className="text-white">Raw JSON Record</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh] w-full mt-2">
                                <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                                  {JSON.stringify(item.raw || item, null, 2)}
                                </pre>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>

                          {/* TRIGGER RESTORE MODAL */}
                          <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => setRestoreItem(item)}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Restore
                          </Button>

                          {/* TRIGGER PURGE MODAL */}
                          <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => { setPurgeItem(item); setDeleteConfirmText(""); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* =========================================
          RESTORE DEPENDENCY MODAL
      ========================================= */}
      <Dialog open={!!restoreItem} onOpenChange={(open) => !open && setRestoreItem(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" /> Restore Record
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 pt-2">
              You are about to restore <span className="font-bold text-slate-800">{restoreItem?.name}</span>. This will also restore all connected dependencies.
            </DialogDescription>
          </DialogHeader>

          {/* Dependency Graph Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Will Restore</h4>
            <div className="font-mono text-sm font-bold text-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> 1 {restoreItem?.type} Record
              </div>
              
              {/* Mocking dependencies - In production, backend supplies this array */}
              <div className="pl-6 border-l-2 border-slate-200 ml-2 space-y-2 py-1">
                <div className="flex items-center gap-2 text-slate-600 before:content-['├─'] before:text-slate-300">
                  <FileJson className="w-3.5 h-3.5 text-slate-400" /> 12 Associated Reports
                </div>
                <div className="flex items-center gap-2 text-slate-600 before:content-['├─'] before:text-slate-300">
                  <Database className="w-3.5 h-3.5 text-slate-400" /> 3 Invoices
                </div>
                <div className="flex items-center gap-2 text-slate-600 before:content-['└─'] before:text-slate-300">
                  <Network className="w-3.5 h-3.5 text-slate-400" /> 2 Payments
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setRestoreItem(null)}>Cancel</Button>
            <Button 
              className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate({ id: restoreItem.id, type: restoreItem.type, action: "RESTORE" })}
            >
              {actionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirm Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================
          PERMANENT PURGE MODAL
      ========================================= */}
      <Dialog open={!!purgeItem} onOpenChange={(open) => !open && setPurgeItem(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-rose-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6" /> Permanent Deletion
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-700 pt-2">
              This action <span className="text-rose-600">cannot be undone</span>. This will permanently erase <span className="text-black">{purgeItem?.name}</span> and all related data from the database.
            </DialogDescription>
          </DialogHeader>

          {/* Dependency Warning */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 mt-2">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-2">Will be permanently erased:</h4>
            <ul className="text-sm font-bold text-rose-700/80 space-y-1 ml-4 list-disc marker:text-rose-300">
              <li>{purgeItem?.type} Profile</li>
              <li>All historical invoices & reports</li>
              <li>System audit logs linked to this ID</li>
            </ul>
          </div>

          <div className="space-y-3 mt-4">
            <p className="text-sm font-medium text-slate-600">
              Please type <strong className="text-slate-900 select-none">DELETE</strong> to confirm.
            </p>
            <Input 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="font-mono font-bold tracking-widest text-center h-12 rounded-xl"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setPurgeItem(null)}>Cancel</Button>
            <Button 
              variant="destructive"
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
              disabled={deleteConfirmText !== "DELETE" || actionMutation.isPending}
              onClick={() => actionMutation.mutate({ id: purgeItem.id, type: purgeItem.type, action: "PURGE" })}
            >
              {actionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Purge Data Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}