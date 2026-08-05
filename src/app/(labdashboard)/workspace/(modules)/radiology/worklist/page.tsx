"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ScanLine,
  Search,
  Clock,
  User,
  CheckCircle2,
  Activity,
  Radio,
  FileText,
  RefreshCw,
  ShieldAlert,
  Server,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export default function TechnicianWorklistPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModality, setActiveModality] = useState("ALL");

  // Safety Checklist Modal State
  const [activeScan, setActiveScan] = useState<any>(null);
  const [checklist, setChecklist] = useState({
    idVerified: false,
    safetyCleared: false,
    consentSigned: false,
  });

  // 1. Fetch Live Worklist
  const {
    data: worklist = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["technician-worklist"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/worklist");
      if (!res.ok) throw new Error("Failed to load worklist");
      return res.json();
    },
    refetchInterval: 15000, // High-frequency refresh for techs (15 seconds)
  });

  // 2. Action Mutation (Start / Complete Scan)
  const actionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/radiology/worklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      setActiveScan(null);
      queryClient.invalidateQueries({ queryKey: ["technician-worklist"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Derived Data & Filtering
  const uniqueModalityTypes = Array.from(
    new Set(worklist.map((item: any) => item.modality.type)),
  );

  const filteredList = worklist.filter((item: any) => {
    const matchesSearch =
      item.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.study?.accessionNumber || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesModality =
      activeModality === "ALL" || item.modality.type === activeModality;
    return matchesSearch && matchesModality;
  });

  // Handlers
  const handleStartClick = (item: any) => {
    setActiveScan(item);
    setChecklist({
      idVerified: false,
      safetyCleared: false,
      consentSigned: false,
    });
  };

  const confirmStartScan = () => {
    if (!checklist.idVerified || !checklist.safetyCleared) {
      return toast.error("Please complete mandatory safety checks.");
    }

    actionMutation.mutate({
      action: "START",
      appointmentId: activeScan.id,
      studyId: activeScan.study.id,
      safetyChecklist: checklist, // Saving this to DB for medico-legal compliance
    });
  };

  const handleCompleteScan = (appointmentId: string, studyId: string) => {
    actionMutation.mutate({
      action: "COMPLETE",
      appointmentId,
      studyId,
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" />
            Technician Worklist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live queue of arrived patients. Manage safety checks and scan
            execution.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 text-sm font-bold text-primary">
            <Activity className="h-4 w-4 animate-pulse" /> Live MWL Sync Active
          </div>
          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["technician-worklist"],
              })
            }
            disabled={isFetching}
            className="bg-card">
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />{" "}
            Sync
          </Button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-2 bg-muted p-1 rounded-lg overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveModality("ALL")}
            className={`px-6 py-1.5 text-sm font-bold rounded-md whitespace-nowrap transition-colors ${activeModality === "ALL" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-slate-200/50"}`}>
            ALL Rooms
          </button>
          {uniqueModalityTypes.map((mod: any) => (
            <button
              key={mod}
              onClick={() => setActiveModality(mod)}
              className={`px-6 py-1.5 text-sm font-bold rounded-md whitespace-nowrap transition-colors ${
                activeModality === mod
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-200/50"
              }`}>
              {mod} Room
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search accession or patient..."
            className="pl-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* QUEUE CARDS */}
      <div className="space-y-4 min-h-[400px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-16 text-center text-muted-foreground/70 shadow-sm">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-20 text-emerald-500" />
            <h3 className="text-xl font-bold text-muted-foreground">Queue is Clear</h3>
            <p className="text-sm mt-2 max-w-sm mx-auto">
              No arrived patients waiting for this modality. Take a break or
              check the scheduled list.
            </p>
          </div>
        ) : (
          filteredList.map((item: any) => (
            <div
              key={item.id}
              className={`bg-card rounded-xl border shadow-sm transition-all overflow-hidden flex flex-col md:flex-row ${
                item.status === "IN_PROGRESS"
                  ? "border-blue-400 shadow-blue-100 ring-1 ring-blue-400"
                  : "border-border hover:border-slate-300"
              }`}>
              {/* Left Color Bar & Time */}
              <div
                className={`w-full md:w-48 p-4 md:p-6 flex flex-row md:flex-col justify-between md:justify-center items-center md:border-r border-slate-100 ${
                  item.status === "IN_PROGRESS"
                    ? "bg-primary/10"
                    : item.status === "ARRIVED"
                      ? "bg-amber-50"
                      : "bg-muted/30"
                }`}>
                <div className="text-center">
                  <span className="block text-xl font-black text-slate-800">
                    {format(new Date(item.scheduledStart), "hh:mm a")}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-flex items-center gap-1 uppercase tracking-wider ${
                      item.status === "IN_PROGRESS"
                        ? "bg-blue-200 text-blue-800"
                        : item.status === "ARRIVED"
                          ? "bg-amber-200 text-amber-800"
                          : "bg-slate-200 text-muted-foreground"
                    }`}>
                    {item.status === "IN_PROGRESS" && (
                      <Activity className="h-3 w-3 animate-pulse" />
                    )}
                    {item.status === "ARRIVED" && <User className="h-3 w-3" />}
                    {item.status === "SCHEDULED" && (
                      <Clock className="h-3 w-3" />
                    )}
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Middle Content - Patient & Clinical Info */}
              <div className="flex-1 p-4 md:p-6 flex flex-col justify-center">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono border border-border">
                        {item.study?.accessionNumber || "NO-ACCESSION"}
                      </span>
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                        <Server className="h-3 w-3" /> MWL Linked
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      {item.patient.name}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({item.patient.age} {item.patient.ageUnit.charAt(0)} /{" "}
                        {item.patient.gender.charAt(0)})
                      </span>
                    </h2>
                    <p className="text-base font-bold text-primary mt-1 flex items-center gap-1.5">
                      <Radio className="h-4 w-4" /> {item.scanName}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      Machine: {item.modality.name}
                    </p>
                  </div>

                  {/* Clinical Notes & Safety */}
                  <div className="w-full md:w-72 space-y-2">
                    {item.notes && (
                      <div className="p-2.5 bg-muted/30 border border-slate-100 rounded-lg text-xs text-foreground/80 flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5" />
                        <p>
                          <span className="font-bold text-slate-800">
                            Desk Notes:
                          </span>{" "}
                          {item.notes}
                        </p>
                      </div>
                    )}
                    {item.scanName.toLowerCase().includes("contrast") && (
                      <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <p>
                          <span className="font-bold">ALERT:</span> Contrast
                          requires Creatinine & Consent check.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Content - Actions */}
              <div className="p-4 md:p-6 border-t md:border-t-0 md:border-l border-slate-100 flex flex-row md:flex-col justify-end items-center gap-3 bg-card w-full md:w-56">
                {item.status === "SCHEDULED" && (
                  <p className="text-xs font-bold text-muted-foreground/70 text-center w-full">
                    Waiting for Front Desk Check-in
                  </p>
                )}

                {item.status === "ARRIVED" && (
                  <Button
                    onClick={() => handleStartClick(item)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-12">
                    <ScanLine className="h-5 w-5 mr-2" /> Start Examination
                  </Button>
                )}

                {item.status === "IN_PROGRESS" && (
                  <div className="w-full flex flex-col gap-2">
                    <p className="text-xs font-bold text-primary text-center uppercase tracking-wider flex items-center justify-center gap-1 mb-1">
                      <Activity className="h-4 w-4 animate-pulse" /> Scanning...
                    </p>
                    <Button
                      onClick={() => handleCompleteScan(item.id, item.study.id)}
                      disabled={actionMutation.isPending}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-emerald-600/20 h-10">
                      {actionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark Completed
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* PRE-SCAN SAFETY CHECKLIST MODAL */}
      {activeScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-muted/30 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Pre-Scan Safety Verification
                </h2>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  Accession: {activeScan.study?.accessionNumber}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-primary/10 p-4 rounded-lg border border-blue-100 flex gap-3 items-start">
                <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 text-base">
                    {activeScan.patient.name}
                  </h4>
                  <p className="text-sm text-primary">{activeScan.scanName}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-foreground text-sm uppercase tracking-wider border-b pb-2">
                  Mandatory Checks
                </h4>

                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-primary rounded border-border focus:ring-blue-600"
                    checked={checklist.idVerified}
                    onChange={(e) =>
                      setChecklist({
                        ...checklist,
                        idVerified: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      Patient ID Verified
                    </p>
                    <p className="text-xs text-muted-foreground">
                      I have verbally confirmed the patient's name and DOB.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-primary rounded border-border focus:ring-blue-600"
                    checked={checklist.safetyCleared}
                    onChange={(e) =>
                      setChecklist({
                        ...checklist,
                        safetyCleared: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      Safety Screening Passed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Checked for metal implants, pacemakers, and pregnancy if
                      applicable.
                    </p>
                  </div>
                </label>

                {activeScan.scanName.toLowerCase().includes("contrast") && (
                  <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-primary rounded border-border focus:ring-blue-600"
                      checked={checklist.consentSigned}
                      onChange={(e) =>
                        setChecklist({
                          ...checklist,
                          consentSigned: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        Contrast Consent Signed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Renal function (Creatinine) verified and consent
                        obtained.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-muted/30 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setActiveScan(null)}
                className="text-muted-foreground">
                Cancel
              </Button>
              <Button
                onClick={confirmStartScan}
                disabled={
                  !checklist.idVerified ||
                  !checklist.safetyCleared ||
                  (activeScan.scanName.toLowerCase().includes("contrast") &&
                    !checklist.consentSigned) ||
                  actionMutation.isPending
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6">
                {actionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Proceed to Scan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
