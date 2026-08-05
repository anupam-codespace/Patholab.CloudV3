"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, Receipt, Clock, IndianRupee, FileText, UserPlus, CalendarDays } from "lucide-react";

export function ReceptionistDashboard() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["receptionist-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/receptionist-dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const { stats, recentPatients, appointments } = data || {};

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receptionist Dashboard</h1>
          <p className="text-sm text-muted-foreground">Front desk overview</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/workspace/registration")}><UserPlus className="h-4 w-4 mr-2" />New Registration</Button>
          <Button variant="outline" onClick={() => router.push("/workspace/patients")}><Users className="h-4 w-4 mr-2" />Patient Directory</Button>
          <Button variant="outline" onClick={() => router.push("/workspace/billing")}><Receipt className="h-4 w-4 mr-2" />Billing</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><UserPlus className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{stats?.todayPatients || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Today's Patients</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><Receipt className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">{stats?.todayInvoices || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Today's Invoices</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><Clock className="h-5 w-5 text-orange-500" /><span className="text-2xl font-bold">{stats?.pendingPayments || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Pending Payments</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><IndianRupee className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</span></div><p className="text-xs text-muted-foreground mt-1">Today's Revenue</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><FileText className="h-5 w-5 text-purple-500" /><span className="text-2xl font-bold">{stats?.pendingReports || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Pending Reports</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><Users className="h-5 w-5 text-slate-400" /><span className="text-2xl font-bold">{stats?.totalPatients || 0}</span></div><p className="text-xs text-muted-foreground mt-1">Total Patients</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Recent Patients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Test</TableHead><TableHead className="text-xs">Invoice</TableHead><TableHead className="text-xs text-right">Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {recentPatients?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No patients yet.</TableCell></TableRow>
                  ) : (
                    recentPatients?.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell><div className="font-medium text-sm">{p.name}</div><div className="text-xs text-muted-foreground">{p.patientId} • {p.phone || 'No phone'}</div></TableCell>
                        <TableCell className="text-xs">{p.tests?.[0]?.testName || '—'}</TableCell>
                        <TableCell className="text-xs">{p.invoices?.[0] ? `₹${Number(p.invoices[0].grandTotal).toFixed(0)} (${p.invoices[0].paymentStatus})` : '—'}</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => router.push(`/workspace/accession?patientId=${p.id}&isNewVisit=true`)}>New Visit</Button></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Time</TableHead><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Mode</TableHead><TableHead className="text-xs">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {appointments?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No appointments today.</TableCell></TableRow>
                  ) : (
                    appointments?.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs font-mono">{a.timeSlot || new Date(a.appointmentDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell><div className="font-medium text-sm">{a.patient?.name}</div><div className="text-xs text-muted-foreground">{a.patient?.phone}</div></TableCell>
                        <TableCell className="text-xs">{a.collectionMode}</TableCell>
                        <TableCell><Badge variant="outline" className={a.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}>{a.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
