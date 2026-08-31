"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, Circle, MapPin, Calendar, User, Search, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function TrackPage() {
  const params = useParams();
  const trackId = params.trackId as string;
  const [inputTrackId, setInputTrackId] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["track", trackId],
    queryFn: async () => {
      const res = await fetch(`/api/track/${trackId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!trackId,
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tracking ID Not Found</h2>
          <p className="text-sm text-muted-foreground">Please check your tracking ID and try again.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Track Your Booking</h1>
          <p className="text-sm text-muted-foreground mt-1">Track ID: <span className="font-mono font-bold text-primary">{data?.trackId}</span></p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground uppercase">Patient</p><p className="font-bold">{data?.patientName}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase">Lab</p><p className="font-bold">{data?.labName}</p><p className="text-xs text-muted-foreground">{data?.labCity}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase">Tests</p><p className="font-medium text-sm">{data?.testName}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase">Collection Mode</p><Badge variant="outline">{data?.collectionMode}</Badge></div>
              <div><p className="text-xs text-muted-foreground uppercase">Date</p><p className="font-medium text-sm">{data?.appointmentDate}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase">Time Slot</p><p className="font-medium text-sm">{data?.timeSlot || "—"}</p></div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div><p className="text-xs text-muted-foreground uppercase">Amount</p><p className="font-bold text-lg">₹{Number(data?.amount || 0).toFixed(2)}</p></div>
                <Badge variant="outline" className={data?.paymentVerified ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}>
                  {data?.paymentVerified ? "Payment Verified" : "Payment Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {data?.timeline?.map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  {step.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground/30 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    {step.timestamp && <p className="text-xs text-muted-foreground">{step.timestamp}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
