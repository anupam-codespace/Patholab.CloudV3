"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Eye,
  Database,
  UserCog,
  FileJson,
  Loader2,
  Clock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminActivityLogsPage() {
  const [activeTab, setActiveTab] = useState("TENANT");
  const [search, setSearch] = useState("");
  const [labId, setLabId] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [actionType, setActionType] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-activity",
      activeTab,
      search,
      labId,
      category,
      actionType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: activeTab,
        search,
        labId,
        category,
        action: actionType,
      });
      const res = await fetch(`/api/admin/activity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const logs = data?.data || [];
  const labs = data?.filters?.labs || [];

  // Reset filters when switching tabs
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setLabId("ALL");
    setCategory("ALL");
    setActionType("ALL");
    setSearch("");
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-emerald-600" /> Platform Audit
            Logs
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Global monitoring of all user and system operations.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6">
        <TabsList className="bg-slate-200/50 p-1 rounded-xl">
          <TabsTrigger
            value="TENANT"
            className="rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
            <Building2 className="w-4 h-4 mr-2" /> Tenant Activity
          </TabsTrigger>
          <TabsTrigger
            value="ADMIN"
            className="rounded-lg font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md">
            <ShieldCheck className="w-4 h-4 mr-2" /> Super Admin Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-0">
          <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden">
            {/* ADVANCED FILTERS */}
            <div className="flex flex-wrap gap-4 items-center bg-slate-50/50 p-4 border-b border-slate-100">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search description or user..."
                  className="pl-9 rounded-xl bg-card border-border focus:border-emerald-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Lab Filter (Only visible in Tenant Tab) */}
              {activeTab === "TENANT" && (
                <Select value={labId} onValueChange={setLabId}>
                  <SelectTrigger className="w-full sm:w-[200px] rounded-xl bg-card border-border font-medium">
                    <Building2 className="h-4 w-4 text-muted-foreground/70 mr-2" />
                    <SelectValue placeholder="All Labs" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Client Labs</SelectItem>
                    {labs.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Category Filter */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[160px] rounded-xl bg-card border-border font-medium">
                  <Database className="h-4 w-4 text-muted-foreground/70 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="PATIENT">Patient</SelectItem>
                  <SelectItem value="TEST">Test/Catalog</SelectItem>
                  <SelectItem value="WALLET">Wallet</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="SETTINGS">Settings</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>

              {/* Action Filter */}
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="w-full sm:w-[150px] rounded-xl bg-card border-border font-medium">
                  <Filter className="h-4 w-4 text-muted-foreground/70 mr-2" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AUDIT TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">User Identity</th>
                    {activeTab === "TENANT" && (
                      <th className="px-6 py-4">Tenant Lab</th>
                    )}
                    <th className="px-6 py-4">Module & Action</th>
                    <th className="px-6 py-4 w-1/3">Description</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                        Fetching secure logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground font-medium">
                        No logs match your current filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log: any) => (
                      <tr
                        key={log.id}
                        className="hover:bg-muted/50/50 transition-colors bg-card">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                              {activeTab === "ADMIN" ? (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <UserCog className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">
                                {log.user?.name || "System"}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                                {log.user?.role.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                        </td>

                        {activeTab === "TENANT" && (
                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {log.lab?.name || "Global"}
                          </td>
                        )}

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`font-black uppercase tracking-widest text-[9px] border-0
                              ${
                                log.action === "CREATE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : log.action === "UPDATE"
                                    ? "bg-blue-100 text-primary"
                                    : log.action === "DELETE"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-muted text-slate-700"
                              }`}>
                              {log.action}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-muted/30 text-muted-foreground border-border font-bold uppercase tracking-widest text-[9px]">
                              {log.entity || "SYSTEM"}
                            </Badge>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-foreground/80 truncate max-w-[300px]">
                            {log.description}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />{" "}
                            {format(new Date(log.createdAt), "hh:mm:ss a")}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mt-0.5">
                            {format(new Date(log.createdAt), "dd MMM yyyy")}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground/70 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                <Eye className="w-4 h-4 mr-1.5" /> View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl bg-muted/30 rounded-3xl p-6 border-border shadow-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-800">
                                  <FileJson className="w-5 h-5 text-emerald-600" />{" "}
                                  Log Metadata Payload
                                </DialogTitle>
                              </DialogHeader>

                              <div className="grid grid-cols-2 gap-4 mt-4 mb-2">
                                <div className="bg-card p-3 rounded-xl border border-border">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest">
                                    Performed By
                                  </p>
                                  <p className="font-bold text-foreground mt-0.5">
                                    {log.user?.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {log.user?.email}
                                  </p>
                                </div>
                                <div className="bg-card p-3 rounded-xl border border-border">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest">
                                    Time & Date
                                  </p>
                                  <p className="font-bold text-foreground mt-0.5">
                                    {format(
                                      new Date(log.createdAt),
                                      "hh:mm:ss a",
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(log.createdAt),
                                      "dd MMM yyyy",
                                    )}
                                  </p>
                                </div>
                              </div>

                              <p className="text-sm font-semibold text-foreground/80 bg-card p-3 rounded-xl border border-border my-2">
                                {log.description}
                              </p>

                              <ScrollArea className="max-h-[50vh] w-full rounded-xl bg-slate-950 p-4 border border-slate-800 mt-2 shadow-inner">
                                <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                                  {log.metadata
                                    ? JSON.stringify(
                                        JSON.parse(log.metadata),
                                        null,
                                        2,
                                      )
                                    : "No detailed metadata provided."}
                                </pre>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
