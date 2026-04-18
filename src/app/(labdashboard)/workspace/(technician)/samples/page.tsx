"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  ScanBarcode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FlaskConical,
  ThermometerSnowflake,
  User,
  MapPin,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

// --- API FETCHERS ---
const fetchIncomingSamples = async () => {
  // Replace with your actual endpoint to fetch samples that are COLLECTED or IN_TRANSIT
  const res = await fetch(`/api/technician/samples?status=pending`);
  if (!res.ok) throw new Error("Failed to fetch samples");
  return res.json();
};

export default function SampleAccessioningPage() {
  const queryClient = useQueryClient();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the barcode scanner input so the tech doesn't have to click it
  useEffect(() => {
    barcodeInputRef.current?.focus();
    const handleKeyDown = () => barcodeInputRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: samples = [], isLoading } = useQuery({
    queryKey: ["incoming-samples"],
    queryFn: fetchIncomingSamples,
    refetchInterval: 10000, // Auto-refresh for new samples from phlebotomists
  });

  // --- MUTATIONS ---
  const updateSampleStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => {
      const res = await fetch(`/api/technician/samples/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.status === "RECEIVED")
        toast.success("Sample Accepted & Received!");
      if (variables.status === "REJECTED") toast.error("Sample Rejected!");
      queryClient.invalidateQueries({ queryKey: ["incoming-samples"] });
      setBarcodeInput(""); // Clear scanner input
    },
    onError: () => toast.error("Action failed. Try again."),
  });

  // --- BARCODE SCAN HANDLER ---
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedSample = samples.find(
      (s: any) => s.sampleId === barcodeInput.trim(),
    );

    if (matchedSample) {
      updateSampleStatus.mutate({ id: matchedSample.id, status: "RECEIVED" });
    } else {
      toast.error(`Sample ID ${barcodeInput} not found in pending list!`, {
        icon: "⚠️",
      });
      setBarcodeInput("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 font-sans relative overflow-hidden selection:bg-indigo-100">
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 z-10 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* --- HEADER & BARCODE SCANNER --- */}
        <div className="flex-none mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ScanBarcode className="h-7 w-7 text-indigo-600" />
              Sample Accessioning
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Scan vials to mark them as received in the laboratory.
            </p>
          </div>

          <Card className="bg-slate-900 border-none shadow-xl flex flex-col justify-center p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
              <ScanBarcode className="h-32 w-32 text-white" />
            </div>
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
              Ready to Scan
            </p>
            <form onSubmit={handleBarcodeScan} className="relative z-10">
              <Input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode here..."
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-400/30 text-lg tracking-widest font-mono rounded-xl"
                autoFocus
              />
              <Button type="submit" className="hidden">
                Submit
              </Button>
            </form>
          </Card>
        </div>

        {/* --- MAIN DATA TABLE --- */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200/80 overflow-hidden rounded-2xl bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-slate-400" />
              Incoming Samples ({samples.length})
            </h3>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200">
                Awaiting Arrival
              </Badge>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200">
                In Transit
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-auto relative custom-scrollbar p-2">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                <span className="text-xs font-medium uppercase tracking-widest animate-pulse">
                  Loading Samples...
                </span>
              </div>
            ) : samples.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
                <p className="font-bold text-slate-600 text-lg">
                  All Caught Up!
                </p>
                <p className="text-sm">
                  No incoming samples are pending verification.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-2">
                {samples.map((sample: any) => (
                  <Card
                    key={sample.id}
                    className="p-4 border-slate-200 shadow-sm hover:border-indigo-300 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-mono font-bold text-lg text-slate-800 tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                          {sample.sampleId}
                        </span>
                        <p className="text-xs text-slate-500 mt-1 font-bold">
                          {sample.sampleType} • {sample.containerType}
                        </p>
                      </div>
                      <Badge
                        className={
                          sample.status === "IN_TRANSIT"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }>
                        {sample.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-700 truncate">
                          {sample.patient?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600 truncate">
                          {sample.collectionMode.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          Collected:{" "}
                          {format(
                            new Date(sample.collectedAt),
                            "dd MMM, hh:mm a",
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => {
                          const reason = prompt(
                            "Enter rejection reason (e.g. Hemolyzed, Leaked):",
                          );
                          if (reason)
                            updateSampleStatus.mutate({
                              id: sample.id,
                              status: "REJECTED",
                              reason,
                            });
                        }}>
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() =>
                          updateSampleStatus.mutate({
                            id: sample.id,
                            status: "RECEIVED",
                          })
                        }>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Receive
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
