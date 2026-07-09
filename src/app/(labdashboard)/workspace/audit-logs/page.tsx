"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  ShieldAlert,
  Clock,
  User,
  Database,
  FileJson,
  Filter,
  Loader2,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
} from "@/components/ui/dialog";

// --- TYPES ---
interface AuditLog {
  id: string;
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  oldData: any | null;
  newData: any | null;
  ipAddress: string | null;
  createdAt: string;
}

// --- FETCHER ---
const fetchAuditLogs = async (entity: string, action: string) => {
  const query = new URLSearchParams();
  if (entity !== "ALL") query.append("entity", entity);
  if (action !== "ALL") query.append("action", action);

  const res = await fetch(`/api/workspace/audit-logs?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch logs");
  const data = await res.json();
  return data.logs as AuditLog[];
};

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter, actionFilter],
    queryFn: () => fetchAuditLogs(entityFilter, actionFilter),
  });

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
  // --- UI HELPERS ---
  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
            CREATE
          </Badge>
        );
      case "UPDATE":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
            UPDATE
          </Badge>
        );
      case "DELETE":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
            DELETE
          </Badge>
        );
      case "SIGN":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
            SIGN
          </Badge>
        );
      case "AMEND":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
            AMEND
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            title={action}
            className="
        max-w-[180px]
        truncate
        overflow-hidden
        whitespace-nowrap
        text-ellipsis
        text-slate-600
      "
          >
            {formatAction(action)}
          </Badge>
        );
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex-1 space-y-6 p-6 pt-6 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-indigo-600" /> System Audit
            Logs
          </h1>
          <p className="text-base text-slate-500 mt-1 max-w-2xl">
            Immutable compliance records. Track every creation, modification,
            and deletion event across the laboratory system to comply with NABL
            and ISO 15189 standards.
          </p>
        </div>
      </div>

      {/* FILTERS & CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 shrink-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="Search by Entity ID or User ID..."
            className="pl-10 focus-visible:ring-indigo-500 border-slate-300 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 shrink-0">
            <Filter size={16} /> Filters:
          </div>

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[160px] border-slate-300">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Entities</SelectItem>
              <SelectItem value="REPORT">Reports</SelectItem>
              <SelectItem value="TEST_RESULT">Test Results</SelectItem>
              <SelectItem value="PATIENT">Patients</SelectItem>
              <SelectItem value="INVOICE">Invoices</SelectItem>
              <SelectItem value="INVENTORY">Inventory</SelectItem>
              <SelectItem value="SETTINGS">Settings</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[160px] border-slate-300">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="SIGN">Sign (Approve)</SelectItem>
              <SelectItem value="AMEND">Amend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-600 w-[200px]">
                Timestamp
              </TableHead>
              <TableHead className="font-semibold text-slate-600 w-[120px]">
                Action
              </TableHead>
              <TableHead className="font-semibold text-slate-600 w-[150px]">
                Entity
              </TableHead>
              <TableHead className="font-semibold text-slate-600 w-[200px]">
                Entity ID
              </TableHead>
              <TableHead className="font-semibold text-slate-600">
                User ID & IP
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-600">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center h-48 text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                    Fetching secure logs...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center h-48 text-slate-500"
                >
                  No audit logs found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Timestamp */}
                  <TableCell className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm:ss")}
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell>{getActionBadge(log.action)}</TableCell>

                  {/* Entity Type */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Database className="h-4 w-4 text-slate-400" />
                      {log.entity}
                    </div>
                  </TableCell>

                  {/* Entity ID */}
                  <TableCell className="font-mono text-xs text-slate-500">
                    {log.entityId}
                  </TableCell>

                  {/* User & IP */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                        <User className="h-3.5 w-3.5" /> {log.userId}
                      </div>
                      <div className="text-[10px] text-slate-400 ml-5 font-mono">
                        IP: {log.ipAddress || "System"}
                      </div>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold text-xs"
                      onClick={() => setSelectedLog(log)}
                    >
                      <FileJson className="h-4 w-4 mr-1.5" /> Inspect Data
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ============================================================== */}
      {/* DATA INSPECTOR MODAL (COMPARE OLD VS NEW JSON)                  */}
      {/* ============================================================== */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50">
          <DialogHeader className="p-6 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <ShieldAlert className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  Audit Trail Snapshot
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Log ID:{" "}
                  <span className="font-mono text-slate-500">
                    {selectedLog?.id}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Context Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Action
                </p>

                <div className="max-w-full overflow-hidden">
                  {selectedLog && getActionBadge(selectedLog.action)}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Entity
                </p>
                <p className="font-bold text-sm text-slate-800">
                  {selectedLog?.entity}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Record ID
                </p>
                <p className="font-mono text-xs font-semibold text-slate-600">
                  {selectedLog?.entityId}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Timestamp
                </p>
                <p className="text-xs font-bold text-slate-600">
                  {selectedLog &&
                    format(
                      new Date(selectedLog.createdAt),
                      "dd MMM yyyy, HH:mm:ss",
                    )}
                </p>
              </div>
            </div>

            {/* DIFF VIEWER (Side-by-Side JSON) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OLD DATA */}
              <div className="flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-800">
                <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                    Previous State
                  </span>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-slate-300">
                    {selectedLog?.oldData ? (
                      JSON.stringify(selectedLog.oldData, null, 2)
                    ) : (
                      <span className="text-slate-600 italic">
                        No previous data (New Record)
                      </span>
                    )}
                  </pre>
                </div>
              </div>

              {/* NEW DATA */}
              <div className="flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-800 relative">
                {/* Arrow pointing from Old to New (Hidden on mobile) */}
                <div className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 bg-indigo-500 rounded-full p-1 z-10 border-4 border-slate-50">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>

                <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    New State / Payload
                  </span>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-slate-300">
                    {selectedLog?.newData ? (
                      JSON.stringify(selectedLog.newData, null, 2)
                    ) : (
                      <span className="text-slate-600 italic">
                        No new data (Record Deleted)
                      </span>
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
            <Button
              variant="outline"
              onClick={() => setSelectedLog(null)}
              className="font-bold"
            >
              Close Inspector
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
