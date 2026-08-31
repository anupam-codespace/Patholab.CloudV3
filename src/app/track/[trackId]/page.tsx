"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle2, Clock, Circle, MapPin, Calendar, User, Search,
  Truck, Building2, Phone, QrCode, FileText, FlaskConical, CreditCard,
  Navigation, ShieldCheck,
} from "lucide-react";

export default function TrackPage() {
  const params = useParams();
  const trackId = params.trackId as string;

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

  const isHomeCollection = data?.collectionMode === "HOME_COLLECTION";

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Track Your Booking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track ID: <span className="font-mono font-bold text-primary">{data?.trackId}</span>
          </p>
        </div>

        {/* Lab + Status Summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {data?.labLogo ? (
                <img src={data.labLogo} alt={data.labName} className="h-14 w-auto object-contain" />
              ) : (
                <div className="h-14 w-14 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">
                  {data?.labName?.charAt(0) || "L"}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-bold">{data?.labName}</h2>
                {data?.labAddress && <p className="text-xs text-muted-foreground">{data.labAddress}</p>}
                {data?.labCity && <p className="text-xs text-muted-foreground">{data.labCity}</p>}
                {data?.labPhone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" /> {data.labPhone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="outline" className={
                  data?.status === "CONFIRMED" ? "bg-green-50 text-green-700" :
                  data?.status === "PENDING_PAYMENT" ? "bg-amber-50 text-amber-700" :
                  data?.status === "SAMPLE_COLLECTED" ? "bg-blue-50 text-blue-700" :
                  "bg-slate-50"
                }>
                  {data?.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient + Appointment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Patient</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Name" value={data?.patientName} />
              {data?.patientId && <Row label="Patient ID" value={data.patientId} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Appointment</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Date" value={data?.appointmentDate} icon={<Calendar className="h-3 w-3" />} />
              <Row label="Time Slot" value={data?.timeSlot || "—"} icon={<Clock className="h-3 w-3" />} />
              <Row label="Mode" value={isHomeCollection ? "Home Collection" : "Lab Visit"} icon={isHomeCollection ? <Truck className="h-3 w-3" /> : <Building2 className="h-3 w-3" />} />
              {isHomeCollection && data?.collectionAddress && (
                <Row label="Address" value={data.collectionAddress} icon={<MapPin className="h-3 w-3" />} />
              )}
              {isHomeCollection && data?.pincode && (
                <Row label="Pincode" value={data.pincode} />
              )}
              {!isHomeCollection && data?.branchName && (
                <>
                  <Row label="Branch" value={data.branchName} icon={<Building2 className="h-3 w-3" />} />
                  {data?.branchAddress && <Row label="Branch Address" value={`${data.branchAddress}, ${data.branchCity || ""}`} />}
                  {data?.branchPhone && <Row label="Branch Phone" value={data.branchPhone} icon={<Phone className="h-3 w-3" />} />}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tests Breakdown */}
        {data?.testDetails?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4" /> Tests ({data.testDetails.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase">
                    <tr>
                      <th className="text-left p-3">Test</th>
                      <th className="text-left p-3">Code</th>
                      <th className="text-left p-3">Sample</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.testDetails.map((t: any) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-3 font-medium">{t.name}</td>
                        <td className="p-3 font-mono text-xs">{t.code || "—"}</td>
                        <td className="p-3 text-xs">
                          {t.sample ? (
                            <span>
                              <span className="font-mono">{t.sample.sampleId}</span>
                              <span className="text-muted-foreground ml-1">({t.sample.status})</span>
                              {t.sample.collectedAt && (
                                <div className="text-[10px] text-muted-foreground">{t.sample.collectedAt}</div>
                              )}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{t.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Subtotal</p>
                <p className="font-medium">₹{Number(data?.subtotal || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Discount</p>
                <p className="font-medium">₹{Number(data?.discountAmount || 0).toFixed(2)}</p>
              </div>
              <div className="col-span-2 border-t pt-2">
                <p className="text-xs text-muted-foreground uppercase">Total Payable</p>
                <p className="font-bold text-lg text-primary">₹{Number(data?.amount || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Payment Status</p>
                <Badge variant="outline" className={data?.paymentVerified ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}>
                  {data?.paymentVerified ? (
                    <><ShieldCheck className="w-3 h-3 mr-1" /> Verified</>
                  ) : (
                    <><Clock className="w-3 h-3 mr-1" /> Pending Verification</>
                  )}
                </Badge>
              </div>
              {data?.transactionId && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase">Transaction ID</p>
                  <p className="font-mono text-xs">{data.transactionId}</p>
                  <p className="text-[10px] text-muted-foreground">{data.paymentMode || "UPI"}</p>
                </div>
              )}
            </div>
            {data?.invoiceNumber && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                Invoice: <span className="font-mono">{data.invoiceNumber}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Home Collection Trip Status (only for home collection) */}
        {isHomeCollection && data?.trip && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> Collection Trip
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Phlebotomist</p>
                  <p className="font-medium">{data.trip.phlebotomist?.name || "Not assigned"}</p>
                </div>
                {data.trip.phlebotomist?.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Phone</p>
                    <p className="font-medium">{data.trip.phlebotomist.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Scheduled</p>
                  <p className="font-medium">{data.trip.scheduledDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Trip Status</p>
                  <Badge variant="outline" className={
                    data.trip.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                    data.trip.status === "STARTED" || data.trip.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700" :
                    "bg-slate-50"
                  }>
                    {data.trip.status}
                  </Badge>
                </div>
              </div>
              {data.trip.startedAt && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground uppercase">Started At</p>
                  <p className="text-sm">{data.trip.startedAt}</p>
                </div>
              )}
              {data.trip.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Completed At</p>
                  <p className="text-sm">{data.trip.completedAt}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {data?.timeline?.map((step: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  {step.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground/30 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-muted-foreground">{step.timestamp}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-xs text-center text-muted-foreground">
          This page auto-refreshes every 30 seconds. For queries, contact {data?.labName} at {data?.labPhone || "the lab"}.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value?: any; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-muted-foreground uppercase flex items-center gap-1">
        {icon}{label}
      </span>
      <span className="font-medium text-right text-sm">{value || "—"}</span>
    </div>
  );
}
