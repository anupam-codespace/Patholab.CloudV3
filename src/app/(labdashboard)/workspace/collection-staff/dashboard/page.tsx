"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Truck,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  PlayCircle,
  StopCircle,
  Navigation,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const STATUS_BADGES: Record<string, any> = {
  SCHEDULED: { variant: "outline", className: "bg-blue-50 text-blue-700" },
  STARTED: { variant: "outline", className: "bg-amber-50 text-amber-700" },
  IN_PROGRESS: { variant: "outline", className: "bg-orange-50 text-orange-700" },
  COMPLETED: { variant: "outline", className: "bg-green-50 text-green-700" },
};

export default function CollectionStaffDashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["collection-staff-trips", "today"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/collection-staff/trips?filter=today");
      if (!res.ok) throw new Error("Failed to load trips");
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const updateTripStatus = useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: string }) => {
      const res = await fetch(`/api/workspace/collection-staff/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update trip status");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      const msg =
        variables.status === "STARTED" ? "Trip started" :
        variables.status === "IN_PROGRESS" ? "Marked as in progress" :
        variables.status === "COMPLETED" ? "Trip completed! Samples collected." :
        "Status updated";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["collection-staff-trips"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const trips = data?.trips || [];
  const stats = data?.stats || { totalToday: 0, totalCompleted: 0, totalPending: 0, totalInProgress: 0 };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Collection Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your assigned sample collection trips for today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalToday}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Today's Trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Truck className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{stats.totalInProgress}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.totalCompleted}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Navigation className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats.totalPending}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Trips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" /> Today's Collection Trips
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trips.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No trips assigned for today</p>
              <p className="text-sm">New assignments will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Scheduled</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Patient & Address</TableHead>
                    <TableHead className="text-xs">Tests</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip: any) => (
                    <>
                      <TableRow key={trip.id} className="bg-slate-50/50">
                        <TableCell className="text-xs font-mono">
                          <div className="font-bold">{trip.scheduledTime}</div>
                          <div className="text-muted-foreground">{trip.scheduledDate}</div>
                        </TableCell>
                        <TableCell>
                          <Badge {...(STATUS_BADGES[trip.status] || { variant: "outline" })}>
                            {trip.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{trip.phlebotomist?.name || "Unassigned"}</div>
                          <div className="text-muted-foreground">{trip.appointments.length} stops</div>
                        </TableCell>
                        <TableCell colSpan={3} className="text-right">
                          {trip.status === "SCHEDULED" && (
                            <Button
                              size="sm"
                              onClick={() => updateTripStatus.mutate({ tripId: trip.id, status: "STARTED" })}
                              disabled={updateTripStatus.isPending}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" /> Start Trip
                            </Button>
                          )}
                          {(trip.status === "STARTED" || trip.status === "IN_PROGRESS") && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateTripStatus.mutate({ tripId: trip.id, status: "COMPLETED" })}
                              disabled={updateTripStatus.isPending}
                            >
                              <StopCircle className="h-4 w-4 mr-1" /> Complete & Collect Samples
                            </Button>
                          )}
                          {trip.status === "COMPLETED" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {/* Patient stops under each trip */}
                      {trip.appointments.map((appt: any, idx: number) => (
                        <TableRow key={appt.id} className="bg-white">
                          <TableCell className="text-xs text-muted-foreground">
                            Stop #{idx + 1}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="bg-slate-50">
                              {appt.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium flex items-center gap-1">
                              <User className="h-3 w-3" /> {appt.patient?.name}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" /> {appt.patient?.phone}
                            </div>
                            {appt.patient?.address && (
                              <div className="text-muted-foreground flex items-start gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 mt-0.5" /> {appt.patient.address}
                                {appt.patient?.pincode && ` - ${appt.patient.pincode}`}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">
                              {appt.tests?.length || 0} test(s)
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              {appt.tests?.map((t: any) => t.testName).join(", ")}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {appt.invoice ? (
                              <>
                                <div className="font-medium">₹{Number(appt.invoice.grandTotal).toFixed(2)}</div>
                                <Badge variant="outline" className={
                                  appt.invoice.paymentStatus === "PAID"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-orange-50 text-orange-700"
                                }>
                                  {appt.invoice.paymentStatus}
                                </Badge>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/track/${appt.trackId}`} target="_blank">
                              <Button size="sm" variant="ghost">View Track</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
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
