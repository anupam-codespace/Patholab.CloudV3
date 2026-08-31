"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MapPin, Calendar, CheckCircle2, Clock, Truck, User, Phone, Search, Navigation } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatIST } from "@/lib/timezone";

export default function HomeCollectionPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["home-collection"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/home-collection");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await fetch(`/api/workspace/appointments/${appointmentId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Payment verified! Track ID: ${data.trackId}`);
      queryClient.invalidateQueries({ queryKey: ["home-collection"] });
    },
    onError: () => toast.error("Verification failed"),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const appointments = data?.appointments || [];
  const filtered = appointments.filter((a: any) =>
    !search || a.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.patient?.phone?.includes(search) ||
    a.trackId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Home Collection</h1>
          <p className="text-sm text-muted-foreground">Manage home sample collection bookings</p>
        </div>
        <Link href="/workspace/logistics">
          <Button>
            <Navigation className="h-4 w-4 mr-2" /> Go to Dispatch Control
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><Clock className="h-5 w-5 text-orange-500" /><span className="text-2xl font-bold">{appointments.filter((a: any) => !a.paymentVerified).length}</span></div><p className="text-xs text-muted-foreground mt-1">Pending Payment</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">{appointments.filter((a: any) => a.paymentVerified).length}</span></div><p className="text-xs text-muted-foreground mt-1">Confirmed</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><Truck className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">{appointments.filter((a: any) => a.collectionMode === "HOME_COLLECTION").length}</span></div><p className="text-xs text-muted-foreground mt-1">Home Visits</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><Calendar className="h-5 w-5 text-purple-500" /><span className="text-2xl font-bold">{appointments.length}</span></div><p className="text-xs text-muted-foreground mt-1">Total Bookings</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Online Bookings</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, phone, track ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Track ID</TableHead><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Date / Time</TableHead>
                <TableHead className="text-xs">Mode</TableHead><TableHead className="text-xs">Payment</TableHead><TableHead className="text-xs text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No bookings found.</TableCell></TableRow>
                ) : (
                  filtered.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-mono">{a.trackId || "—"}</TableCell>
                      <TableCell><div className="font-medium text-sm">{a.patient?.name}</div><div className="text-xs text-muted-foreground">{a.patient?.phone}</div></TableCell>
                      <TableCell className="text-xs">{formatIST(a.appointmentDate)}<br /><span className="text-muted-foreground">{a.timeSlot || "—"}</span></TableCell>
                      <TableCell><Badge variant="outline" className={a.collectionMode === "HOME_COLLECTION" ? "bg-blue-50 text-blue-700" : "bg-slate-50"}>{a.collectionMode}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={a.paymentVerified ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}>{a.paymentVerified ? "Verified" : "Pending"}</Badge></TableCell>
                      <TableCell className="text-right">
                        {!a.paymentVerified ? (
                          <Button size="sm" onClick={() => verifyMutation.mutate(a.id)} disabled={verifyMutation.isPending}>Verify Payment</Button>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => window.open(`/track/${a.trackId}`, "_blank")}>Track</Button>
                            <Link href="/workspace/logistics">
                              <Button size="sm"><Truck className="h-3 w-3 mr-1" /> Assign Staff</Button>
                            </Link>
                          </div>
                        )}
                      </TableCell>
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

