"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Loader2, Filter } from "lucide-react";
import toast from "react-hot-toast";

interface CSVExportButtonProps {
  resource: string;
  label?: string;
  filters?: { statuses?: string[]; roles?: string[] };
}

export function CSVExportButton({ resource, label = "Export CSV", filters = {} }: CSVExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ resource });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status) params.set('status', status);
      if (role) params.set('role', role);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/export-csv?${params.toString()}`);
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Export failed"); }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || `${resource}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Filter className="h-4 w-4" /> Export Filters</div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">From Date</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">To Date</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs" /></div>
          </div>
          {filters.statuses && filters.statuses.length > 0 && (
            <div><Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent><SelectItem value="">All</SelectItem>{filters.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {filters.roles && filters.roles.length > 0 && (
            <div><Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent><SelectItem value="">All</SelectItem>{filters.roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label className="text-xs">Search (name, email, phone)</Label><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-8 text-xs" /></div>
          <Button onClick={handleExport} disabled={loading} className="w-full bg-primary">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Download CSV
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
