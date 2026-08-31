"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, User, Phone, MapPin, Calendar, Clock, Stethoscope,
  Building2, Receipt, FlaskConical, Truck, CheckCircle2, AlertCircle,
  CreditCard, FileText, QrCode, ShieldCheck, UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const appointmentId = params.id as string;

  const [paymentMode, setPaymentMode] = useState("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [paymentCollected, setPaymentCollected] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["appointment-detail", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/appointments/${appointmentId}`);
      if (!res.ok) throw new Error("Failed to load appointment");
      return res.json();
    },
    enabled: !!appointmentId,
  });

  const appt = data?.appointment;

  // ✅ v3.2.4.3 FIX: Sync form state when data loads — must use useEffect,
  // not useState(() => {...}). The old code called setState during render,
  // which triggered "Too many re-renders. React limits the number of renders
  // to prevent an infinite loop." useState's initializer is for computing
  // initial state only, not for side effects.
  useEffect(() => {
    if (appt) {
      setPaymentMode(appt.paymentMode || "UPI");
      setTransactionId(appt.transactionId || "");
      setPaymentCollected(appt.paymentCollected ? String(appt.paymentCollected) : "");
    }
  }, [appt]);

  // Mutation: Update payment info
  const updatePaymentMutation = useMutation({
    mutationFn: async (markAsPaid: boolean) => {
      const res = await fetch(`/api/workspace/appointments/${appointmentId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMode,
          transactionId,
          paymentCollected: paymentCollected ? Number(paymentCollected) : undefined,
          markAsPaid,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update payment");
      }
      return res.json();
    },
    onSuccess: (data, markAsPaid) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["appointment-detail", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["online-bookings-v2"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation: Convert to patient
  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspace/appointments/${appointmentId}/convert-patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to convert");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["appointment-detail", appointmentId] });
      // Optionally navigate to the patient directory
      setTimeout(() => router.push("/workspace/patients"), 1500);
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

  if (!appt) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Appointment not found.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/workspace/bookings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Appointment Detail</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {appt.trackId || "No track ID yet"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {appt.trackId && (
            <Link href={`/track/${appt.trackId}`} target="_blank">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" /> View Public Track
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
          >
            {convertMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4 mr-1" />
            )}
            Convert to Patient
          </Button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={
          appt.status === "CONFIRMED" ? "bg-green-50 text-green-700" :
          appt.status === "PENDING_PAYMENT" ? "bg-amber-50 text-amber-700" :
          appt.status === "SAMPLE_COLLECTED" ? "bg-blue-50 text-blue-700" :
          "bg-slate-50"
        }>
          {appt.status}
        </Badge>
        <Badge variant="outline" className={
          appt.paymentVerified ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
        }>
          {appt.paymentVerified ? (
            <><CheckCircle2 className="w-3 h-3 mr-1" /> Payment Verified</>
          ) : (
            <><AlertCircle className="w-3 h-3 mr-1" /> Payment Pending</>
          )}
        </Badge>
        <Badge variant="outline" className={
          appt.collectionMode === "HOME_COLLECTION" ? "bg-blue-50 text-blue-700" : "bg-slate-50"
        }>
          {appt.collectionMode === "HOME_COLLECTION" ? (
            <><Truck className="w-3 h-3 mr-1" /> Home Collection</>
          ) : (
            <><Building2 className="w-3 h-3 mr-1" /> Lab Visit</>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={appt.patient?.name} />
            <Row label="Patient ID" value={appt.patient?.patientId || "Will be assigned on convert"} />
            <Row label="Phone" value={appt.patient?.phone} icon={<Phone className="h-3 w-3" />} />
            <Row label="Email" value={appt.patient?.email || "—"} />
            {appt.patient?.age != null && (
              <Row label="Age / Gender" value={`${appt.patient.age} ${appt.patient.ageUnit} / ${appt.patient.gender}`} />
            )}
            {appt.patient?.doctor && (
              <Row label="Ref. Doctor" value={appt.patient.doctor.name} icon={<Stethoscope className="h-3 w-3" />} />
            )}
            {appt.collectionMode === "HOME_COLLECTION" && (
              <>
                <Row label="Address" value={appt.collectionAddress || appt.patient?.address} icon={<MapPin className="h-3 w-3" />} />
                <Row label="Pincode" value={appt.pincode || appt.patient?.pincode} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Appointment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Date" value={appt.appointmentDate} icon={<Calendar className="h-3 w-3" />} />
            <Row label="Time Slot" value={appt.timeSlot || "—"} icon={<Clock className="h-3 w-3" />} />
            <Row label="Source" value={appt.source} />
            <Row label="Branch" value={appt.branch?.name || "—"} icon={<Building2 className="h-3 w-3" />} />
            {appt.branch?.address && (
              <Row label="Branch Address" value={`${appt.branch.address}, ${appt.branch.city || ""}`} />
            )}
            <Row label="Booked At" value={appt.createdAt} />
            {appt.paymentVerifiedAt && (
              <Row label="Verified At" value={appt.paymentVerifiedAt} icon={<ShieldCheck className="h-3 w-3" />} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Tests ({appt.tests?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Test Name</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Sample</th>
                </tr>
              </thead>
              <tbody>
                {appt.tests?.map((t: any) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3 font-medium">{t.testName}</td>
                    <td className="p-3 font-mono text-xs">{t.testCode || "—"}</td>
                    <td className="p-3 text-right">₹{Number(t.finalPrice || t.price || 0).toFixed(2)}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{t.status}</Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {t.sample ? (
                        <span className="font-mono">{t.sample.sampleId} ({t.sample.status})</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice */}
      {appt.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Invoice {appt.invoice.invoiceNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="font-medium">₹{appt.invoice.subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Discount</p>
                <p className="font-medium">₹{appt.invoice.discountAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tax</p>
                <p className="font-medium">₹{appt.invoice.totalTax.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Grand Total</p>
                <p className="font-bold text-primary">₹{appt.invoice.grandTotal.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-muted-foreground">Invoice Status</span>
              <Badge variant="outline" className={
                appt.invoice.paymentStatus === "PAID" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
              }>
                {appt.invoice.paymentStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* UPI info from lab */}
          {appt.lab?.upiId && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center gap-3">
              <QrCode className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Lab UPI ID</p>
                <p className="font-mono font-bold text-primary">{appt.lab.upiId}</p>
              </div>
              {appt.lab.upiQrCode && (
                <img src={appt.lab.upiQrCode} alt="UPI QR" className="h-16 w-16 ml-auto" />
              )}
            </div>
          )}

          {/* Patient-submitted payment reference (if any) */}
          {appt.transactionId && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700 font-bold uppercase">Patient-Submitted Payment Reference</p>
              <p className="font-mono text-sm mt-1">{appt.transactionId}</p>
              <p className="text-xs text-muted-foreground mt-1">Mode: {appt.paymentMode || "UPI"}</p>
            </div>
          )}

          {/* Lab owner payment form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="DUE">Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Transaction ID / UTR</Label>
              <Input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g., 4561238790"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Amount Received (₹)</Label>
              <Input
                type="number"
                value={paymentCollected}
                onChange={(e) => setPaymentCollected(e.target.value)}
                placeholder="0.00"
                className="h-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updatePaymentMutation.mutate(false)}
              disabled={updatePaymentMutation.isPending}
            >
              Save Payment Info
            </Button>
            {!appt.paymentVerified && (
              <Button
                size="sm"
                onClick={() => updatePaymentMutation.mutate(true)}
                disabled={updatePaymentMutation.isPending}
              >
                {updatePaymentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-1" />
                )}
                Verify & Generate Track ID
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Home Collection Trip (if any) */}
      {appt.trip && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Collection Trip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Phlebotomist" value={appt.trip.phlebotomist?.name} />
            <Row label="Phlebotomist Phone" value={appt.trip.phlebotomist?.phone} icon={<Phone className="h-3 w-3" />} />
            <Row label="Scheduled" value={appt.trip.scheduledDate} icon={<Calendar className="h-3 w-3" />} />
            <Row label="Started" value={appt.trip.startedAt || "Not started"} />
            <Row label="Completed" value={appt.trip.completedAt || "Not completed"} />
            <Row label="Trip Status" value={appt.trip.status} />
          </CardContent>
        </Card>
      )}
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
