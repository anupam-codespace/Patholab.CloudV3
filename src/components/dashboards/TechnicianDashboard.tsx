"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TestTube, CheckCircle2, Clock, FlaskConical, AlertTriangle, ArrowRight, ScanBarcode } from "lucide-react";

export function TechnicianDashboard() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["technician-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/technician-dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const { stats, worklist, lowStock } = data || {};

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Technician Dashboard</h1>
          <p className="text-sm text-muted-foreground">Lab operations overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/workspace/samples")}><ScanBarcode className="h-4 w-4 mr-2" />Sample Accession</Button>
          <Button onClick={() => router.push("/workspace/results")}><TestTube className="h-4 w-4 mr-2" />Worklist & Results</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><Clock className="h-5 w-5 text-orange-500" /><span className="text-2xl font-bold">{stats?.pendingTests || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Pending Tests</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><FlaskConical className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">{stats?.processingTests || 0}</span></div><p className="text-xs text-muted-foreground mt-1">In Progress</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">{stats?.completedToday || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Completed Today</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><CheckCircle2 className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{stats?.approvedToday || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Approved Today</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><ScanBarcode className="h-5 w-5 text-purple-500" /><span className="text-2xl font-bold">{stats?.pendingSamples || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Pending Samples</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><TestTube className="h-5 w-5 text-slate-400" /><span className="text-2xl font-bold">{stats?.totalTests || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Total Tests</p></CardContent></Card>
      </div>

      {/* Low Stock Alert */}
      {lowStock && lowStock.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2 text-orange-700"><AlertTriangle className="h-4 w-4" /> Low Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {lowStock.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="font-medium">{item.name} ({item.sku || '—'})</span>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700">{item.totalStock} {item.unit} left (min: {item.minStockLevel})</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TestTube className="h-5 w-5 text-primary" /> Active Worklist</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Test #</TableHead><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Test Name</TableHead>
                <TableHead className="text-xs">Sample</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">Checked By</TableHead><TableHead className="text-xs">Approved By</TableHead><TableHead className="text-xs text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {worklist?.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No active tests.</TableCell></TableRow>
                ) : (
                  worklist?.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-mono">{t.testNumber}</TableCell>
                      <TableCell><div className="font-medium text-sm">{t.patient?.name}</div><div className="text-xs text-muted-foreground">{t.patient?.patientId} • {t.patient?.age}Y / {t.patient?.gender}</div></TableCell>
                      <TableCell className="text-sm font-medium">{t.testName}</TableCell>
                      <TableCell className="text-xs">{t.sample?.sampleId || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={t.status === 'APPROVED' ? 'bg-green-50 text-green-700' : t.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}>{t.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.checkedBy ? `${t.checkedBy}` : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.approvedBy ? `${t.approvedBy}` : '—'}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => router.push(`/workspace/results`)}><ArrowRight className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
