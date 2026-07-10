"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Trash2,
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
  Eye,
  Database,
  Loader2,
  FileJson,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

export default function AdminArchivesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ["admin-archives"],
    queryFn: async () => {
      const res = await fetch("/api/admin/archives");
      if (!res.ok) throw new Error("Failed to fetch archives");
      return res.json();
    },
  });

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
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-archives"] });
    },
    onError: () => toast.error("Failed to process request"),
  });

  const archives = data?.data || [];

  // Filtering Logic
  const filteredArchives = useMemo(() => {
    return archives.filter((item: any) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.labName?.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "ALL" || item.type === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [archives, search, categoryFilter]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="h-8 w-8 text-rose-600" /> Platform Recycle Bin
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Omniscient view of all soft-deleted records. Restore data or purge
            it permanently.
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50/50 p-4 border-b border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by ID, Name, or Lab..."
              className="pl-9 rounded-xl bg-card border-border focus:border-rose-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-xl bg-card border-border">
              <div className="flex items-center gap-2 font-bold text-muted-foreground">
                <Database className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="LAB">Labs</SelectItem>
              <SelectItem value="BRANCH">Branches</SelectItem>
              <SelectItem value="PATIENT">Patients</SelectItem>
              <SelectItem value="STAFF">Lab Staff</SelectItem>
              <SelectItem value="DOCTOR">Doctors</SelectItem>
              <SelectItem value="AGENCY">Agencies</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                  Entity Type
                </TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                  Identity / Name
                </TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                  Tenant Lab
                </TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                  Deleted At
                </TableHead>
                <TableHead className="text-right font-bold text-muted-foreground uppercase tracking-widest text-xs">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                    Scanning database archives...
                  </TableCell>
                </TableRow>
              ) : filteredArchives.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground font-medium">
                    No soft-deleted records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArchives.map((item: any) => (
                  <TableRow
                    key={`${item.type}-${item.id}`}
                    className="hover:bg-muted/50/50 transition-colors">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-black uppercase tracking-widest text-[10px]
                        ${
                          item.type === "LAB"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : item.type === "PATIENT"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : item.type === "STAFF"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-muted text-foreground/80 border-border"
                        }`}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                        {item.id}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-foreground/80 bg-muted px-2.5 py-1 rounded-md">
                        {item.labName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-800">
                        {format(new Date(item.deletedAt), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-rose-500 font-medium mt-0.5">
                        {format(new Date(item.deletedAt), "hh:mm a")}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* VIEW DETAILS DIALOG */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded-lg">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-card rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-800">
                                <FileJson className="w-5 h-5 text-indigo-500" />{" "}
                                Raw Database Record
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh] w-full rounded-xl bg-slate-950 p-4 mt-2">
                              <pre className="text-[11px] font-mono text-emerald-400">
                                {JSON.stringify(item.raw, null, 2)}
                              </pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>

                        {/* RESTORE ACTION */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          onClick={() =>
                            actionMutation.mutate({
                              id: item.id,
                              type: item.type,
                              action: "RESTORE",
                            })
                          }
                          disabled={actionMutation.isPending}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>

                        {/* PURGE ACTION */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          onClick={() => {
                            if (
                              window.confirm(
                                `WARNING: This will permanently purge the ${item.type} from the database. This action cannot be undone.`,
                              )
                            ) {
                              actionMutation.mutate({
                                id: item.id,
                                type: item.type,
                                action: "PURGE",
                              });
                            }
                          }}
                          disabled={actionMutation.isPending}>
                          <ShieldAlert className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
