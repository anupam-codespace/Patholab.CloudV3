"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Truck,
  MapPin,
  Phone,
  User,
  Search,
  CheckCircle2,
  Clock,
  Navigation,
  Users,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatIST } from "@/lib/timezone";
import Link from "next/link";

export default function LogisticsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAppts, setSelectedAppts] = useState<Set<string>>(new Set());
  const [assignedPhleb, setAssignedPhleb] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["logistics"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/logistics");
      if (!res.ok) throw new Error("Failed to load logistics data");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const assignTripMutation = useMutation({
    mutationFn: async () => {
      if (!assignedPhleb) throw new Error("Select a phlebotomist first");
      if (selectedAppts.size === 0) throw new Error("Select at least one appointment");
      const res = await fetch("/api/workspace/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phlebotomistId: assignedPhleb,
          appointmentIds: Array.from(selectedAppts),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign trip");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Trip created! ${selectedAppts.size} stops assigned.`);
      setSelectedAppts(new Set());
      setAssignedPhleb("");
      queryClient.invalidateQueries({ queryKey: ["logistics"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedAppts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAppts(next);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-rose-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p className="font-bold">Failed to load dispatch data.</p>
      </div>
    );
  }

  const { fleet = [], tasks = [], trips = [], stats = {} } = data || {};

  const filteredTasks = tasks.filter((t: any) =>
    !search ||
    t.patient?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search) ||
    t.trackId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Navigation className="h-6 w-6 text-primary" /> Dispatch Control
        </h1>
        <p className="text-sm text-muted-foreground">
          Assign phlebotomists to home collection appointments and track active trips.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalFleet || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.availableFleet || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{stats.unassignedTasks || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending Assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Truck className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.activeTrips || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active Trips</p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Collection Staff (Fleet)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fleet.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No collection staff found. Add staff with role PHLEBOTOMIST or position containing "Collection/Rider" to see them here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Active Trips</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fleet.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-xs">{f.phone}</TableCell>
                      <TableCell className="text-xs">{f.position}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          f.status === "AVAILABLE" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        }>
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{f.activeTrips || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Tasks + Assignment Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Pending Home Collection Assignments
              <Badge variant="outline" className="ml-1">{filteredTasks.length}</Badge>
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient/phone/track ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={assignedPhleb} onValueChange={setAssignedPhleb}>
                <SelectTrigger className="h-9 w-full md:w-56">
                  <SelectValue placeholder="Assign to phlebotomist..." />
                </SelectTrigger>
                <SelectContent>
                  {fleet.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.activeTrips || 0} active)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => assignTripMutation.mutate()}
                disabled={assignTripMutation.isPending || !assignedPhleb || selectedAppts.size === 0}
                className="h-9"
              >
                {assignTripMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4 mr-1" />
                )}
                Create Trip ({selectedAppts.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-60" />
              <p className="font-medium">All home collection appointments are assigned!</p>
              <p className="text-xs">New online bookings with verified payment will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedAppts.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAppts(new Set(filteredTasks.map((t: any) => t.id)));
                          } else {
                            setSelectedAppts(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="text-xs">Patient</TableHead>
                    <TableHead className="text-xs">Track ID</TableHead>
                    <TableHead className="text-xs">Date / Time</TableHead>
                    <TableHead className="text-xs">Address</TableHead>
                    <TableHead className="text-xs">Tests</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((t: any) => (
                    <TableRow key={t.id} className={selectedAppts.has(t.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selectedAppts.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium flex items-center gap-1">
                          <User className="h-3 w-3" /> {t.patient}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {t.phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{t.trackId || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div>{t.appointmentDate}</div>
                        <div className="text-muted-foreground">{t.timeSlot} • {t.appointmentTime}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                          <div>
                            <div>{t.address}</div>
                            <div className="text-muted-foreground">PIN: {t.pincode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{t.testsCount} test(s)</div>
                        <div className="text-muted-foreground text-[10px]">{t.testNames}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.invoice ? (
                          <>
                            <div className="font-medium">₹{Number(t.invoice.grandTotal).toFixed(2)}</div>
                            <Badge variant="outline" className={
                              t.invoice.paymentStatus === "PAID"
                                ? "bg-green-50 text-green-700"
                                : "bg-orange-50 text-orange-700"
                            }>
                              {t.invoice.paymentStatus}
                            </Badge>
                          </>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Trips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" /> Active Trips
            <Badge variant="outline" className="ml-1">{trips.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trips.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No active trips</p>
              <p className="text-xs">Assign pending appointments to create trips.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Scheduled</TableHead>
                    <TableHead className="text-xs">Phlebotomist</TableHead>
                    <TableHead className="text-xs">Stops</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Started</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip: any) => (
                    <TableRow key={trip.id}>
                      <TableCell className="text-xs">
                        <div className="font-bold">{trip.scheduledTime}</div>
                        <div className="text-muted-foreground">{trip.scheduledDate}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{trip.phlebotomist?.name}</div>
                        <div className="text-muted-foreground">{trip.phlebotomist?.phone}</div>
                      </TableCell>
                      <TableCell className="text-xs">{trip.stopsCount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          trip.status === "SCHEDULED" ? "bg-blue-50 text-blue-700" :
                          trip.status === "STARTED" ? "bg-amber-50 text-amber-700" :
                          trip.status === "IN_PROGRESS" ? "bg-orange-50 text-orange-700" :
                          "bg-green-50 text-green-700"
                        }>
                          {trip.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{trip.startedAt || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link href="/workspace/collection-staff/dashboard">
                          <Button size="sm" variant="ghost">View in Staff Dashboard</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
