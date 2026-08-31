"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { formatIST } from "@/lib/timezone";

const STATUS_BADGES: Record<string, any> = {
  SCHEDULED: { variant: "outline", className: "bg-blue-50 text-blue-700" },
  STARTED: { variant: "outline", className: "bg-amber-50 text-amber-700" },
  IN_PROGRESS: { variant: "outline", className: "bg-orange-50 text-orange-700" },
  COMPLETED: { variant: "outline", className: "bg-green-50 text-green-700" },
};

export default function CollectionStaffTrips() {
  const [filter, setFilter] = useState("today");

  const { data, isLoading } = useQuery({
    queryKey: ["collection-staff-trips", filter],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/collection-staff/trips?filter=${filter}`);
      if (!res.ok) throw new Error("Failed to load trips");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const trips = data?.trips || [];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Collection Trips</h1>
        <p className="text-sm text-muted-foreground">
          All sample collection trips assigned to you.
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {filter === "today" && "Today's Trips"}
                {filter === "upcoming" && "Upcoming Trips"}
                {filter === "completed" && "Completed Trips"}
                {filter === "all" && "All Trips"}
                <Badge variant="outline" className="ml-2">{trips.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {trips.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No trips found</p>
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
                              <Link href={`/workspace/collection-staff/dashboard`}>
                                <Button size="sm" variant="ghost">Manage in Dashboard</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
