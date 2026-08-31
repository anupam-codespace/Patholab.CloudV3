"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
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
  Search,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Settings,
  Globe,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

interface OnlineBooking {
  id: string;
  trackId: string | null;
  status: string;
  collectionMode: string;
  appointmentDate: string;
  timeSlot: string | null;
  paymentVerified: boolean;
  paymentVerifiedAt: string | null;
  paymentVerifiedBy: string | null;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    phone: string | null;
    patientId: string | null;
  };
  tests: Array<{
    id: string;
    testName: string;
    testCode: string | null;
    status: string;
    finalPrice: number;
  }>;
  invoice: {
    id: string;
    grandTotal: number;
    paymentStatus: string;
    invoiceNumber: string;
  } | null;
  branch: { id: string; name: string } | null;
}

export default function OnlineBookingsManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "VERIFIED">("ALL");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [transactionInput, setTransactionInput] = useState<Record<string, string>>({});

  // ✅ v3.2.3: Fetch the lab's portalSlug so we can show the live public booking URL
  // at the top of the Online Bookings page (was previously hidden inside Settings → Branding).
  const { data: portalData } = useQuery<{ portalSlug: string | null }>({
    queryKey: ["lab-portal-slug"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/settings/portal");
      if (!res.ok) return { portalSlug: null };
      return res.json();
    },
  });
  const portalSlug = portalData?.portalSlug || null;
  const publicBookUrl = portalSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${portalSlug}`
    : null;

  const { data: bookings, isLoading } = useQuery<OnlineBooking[]>({
    queryKey: ["online-bookings-v2"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/appointments/online");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const verifyMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const txId = transactionInput[appointmentId]?.trim();
      const res = await fetch(`/api/workspace/appointments/${appointmentId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      return data;
    },
    onSuccess: (data, appointmentId) => {
      toast.success(
        `Payment verified! Tracking ID: ${data.trackId}`,
        { duration: 6000 }
      );
      // Clear the transaction input for this row
      setTransactionInput((prev) => {
        const next = { ...prev };
        delete next[appointmentId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["online-bookings-v2"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Verification failed");
    },
    onSettled: () => setVerifyingId(null),
  });

  const handleVerify = (appointmentId: string) => {
    setVerifyingId(appointmentId);
    verifyMutation.mutate(appointmentId);
  };

  // Filtering
  const filtered = (bookings || []).filter((b) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const matches =
        b.patient.name.toLowerCase().includes(q) ||
        (b.patient.phone || "").includes(q) ||
        (b.trackId || "").toLowerCase().includes(q) ||
        b.tests.some((t) => t.testName.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (statusFilter === "PENDING" && b.paymentVerified) return false;
    if (statusFilter === "VERIFIED" && !b.paymentVerified) return false;
    return true;
  });

  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter((b) => !b.paymentVerified).length || 0,
    verified: bookings?.filter((b) => b.paymentVerified).length || 0,
    revenue: bookings
      ?.filter((b) => b.paymentVerified)
      .reduce((sum, b) => sum + (b.invoice?.grandTotal || 0), 0),
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Online Bookings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verify patient payments and track booking lifecycle.
          </p>
        </div>

        {/* ✅ v3.2.3: Settings + Live URL shortcut */}
        <div className="flex items-center gap-2">
          <Link href="/workspace/bookings/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" /> Portal Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* ✅ v3.2.3: Live Public Booking URL banner — shows the lab's portalSlug
          so owners can copy/share it directly from here. */}
      {publicBookUrl ? (
        <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Your Public Booking URL is LIVE
              </p>
              <a
                href={publicBookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-primary hover:underline inline-flex items-center gap-1"
              >
                {publicBookUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(publicBookUrl);
              toast.success("Booking URL copied to clipboard!");
            }}
          >
            Copy URL
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Public Booking Portal is OFF
              </p>
              <p className="text-sm text-amber-800">
                Set your custom URL to start receiving online bookings.
              </p>
            </div>
          </div>
          <Link href="/workspace/bookings/settings">
            <Button size="sm">
              <Settings className="w-4 h-4 mr-1" /> Set Up Portal URL
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Bookings" value={String(stats.total)} icon={<Calendar className="w-4 h-4" />} />
        <StatCard
          label="Pending Verification"
          value={String(stats.pending)}
          icon={<AlertCircle className="w-4 h-4" />}
          tone="amber"
        />
        <StatCard
          label="Verified"
          value={String(stats.verified)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="green"
        />
        <StatCard
          label="Verified Revenue"
          value={`₹${(stats.revenue || 0).toLocaleString("en-IN")}`}
          icon={<ShieldCheck className="w-4 h-4" />}
          tone="primary"
        />
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, phone, track ID, or test…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Bookings</SelectItem>
              <SelectItem value="PENDING">Pending Verification</SelectItem>
              <SelectItem value="VERIFIED">Payment Verified</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No bookings match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="min-w-[140px]">Booked On</TableHead>
                    <TableHead className="min-w-[160px]">Patient</TableHead>
                    <TableHead className="min-w-[200px]">Tests</TableHead>
                    <TableHead className="min-w-[120px]">Amount</TableHead>
                    <TableHead className="min-w-[140px]">Payment</TableHead>
                    <TableHead className="min-w-[160px]">Tracking ID</TableHead>
                    <TableHead className="min-w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs">
                        <div>{format(new Date(b.createdAt), "dd MMM yyyy")}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(b.createdAt), "hh:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{b.patient.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.patient.phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {b.tests.map((t) => t.testName).join(", ") || "—"}
                        </div>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {b.collectionMode === "HOME_COLLECTION"
                            ? "Home Collection"
                            : "Lab Visit"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">
                          ₹{(b.invoice?.grandTotal || 0).toLocaleString("en-IN")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.invoice?.paymentStatus || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {b.paymentVerified ? (
                          <div>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                            {b.paymentVerifiedAt && (
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {format(new Date(b.paymentVerifiedAt), "dd MMM, hh:mm a")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <AlertCircle className="w-3 h-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {b.trackId ? (
                          <Link
                            href={`/track/${b.trackId}`}
                            target="_blank"
                            className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {b.trackId}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Will be generated on verify
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {b.paymentVerified ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <Link href={`/workspace/bookings/${b.id}`}>
                                  <FileText className="w-3 h-3 mr-1" /> View Detail
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                              >
                                <Link href={`/track/${b.trackId}`} target="_blank">
                                  <ExternalLink className="w-3 h-3 mr-1" /> Track
                                </Link>
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Input
                                placeholder="Transaction ID (optional)"
                                value={transactionInput[b.id] || ""}
                                onChange={(e) =>
                                  setTransactionInput((prev) => ({
                                    ...prev,
                                    [b.id]: e.target.value,
                                  }))
                                }
                                className="h-8 text-xs"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleVerify(b.id)}
                                  disabled={verifyingId === b.id}
                                >
                                  {verifyingId === b.id ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                  )}
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                >
                                  <Link href={`/workspace/bookings/${b.id}`}>
                                    <FileText className="w-3 h-3 mr-1" /> Detail
                                  </Link>
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
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

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "amber" | "green" | "primary";
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-card",
    amber: "bg-amber-50 border-amber-200",
    green: "bg-green-50 border-green-200",
    primary: "bg-primary/5 border-primary/20",
  };
  const iconTone: Record<string, string> = {
    default: "text-muted-foreground",
    amber: "text-amber-600",
    green: "text-green-600",
    primary: "text-primary",
  };
  return (
    <Card className={`${toneClasses[tone]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <span className={iconTone[tone]}>{icon}</span>
        </div>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
