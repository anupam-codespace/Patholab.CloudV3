"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Network,
  Save,
  Activity,
  MonitorPlay,
  Link as LinkIcon,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Plug,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function DicomSettingsPage() {
  const queryClient = useQueryClient();
  const [pacsStatus, setPacsStatus] = useState<
    "UNKNOWN" | "CONNECTED" | "FAILED"
  >("UNKNOWN");

  // Form State
  const [settings, setSettings] = useState({
    localAETitle: "",
    localPort: "",
    pacsAETitle: "",
    pacsIpAddress: "",
    pacsPort: "",
    enableMwl: true,
    mwlAETitle: "",
    mwlPort: "",
    viewerBaseUrl: "",
  });

  // 1. Fetch Existing Settings
  const { data, isLoading } = useQuery({
    queryKey: ["dicom-settings"],
    queryFn: async () => {
      const res = await fetch("/api/lab-owner/radiology/settings/dicom");
      if (!res.ok) throw new Error("Failed to load DICOM settings");
      return res.json();
    },
  });

  // Hydrate local state when data loads
  useEffect(() => {
    if (data) {
      setSettings({
        localAETitle: data.localAETitle || "",
        localPort: data.localPort?.toString() || "",
        pacsAETitle: data.pacsAETitle || "",
        pacsIpAddress: data.pacsIpAddress || "",
        pacsPort: data.pacsPort?.toString() || "",
        enableMwl: data.enableMwl ?? true,
        mwlAETitle: data.mwlAETitle || "",
        mwlPort: data.mwlPort?.toString() || "",
        viewerBaseUrl: data.viewerBaseUrl || "",
      });
    }
  }, [data]);

  // 2. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/lab-owner/radiology/settings/dicom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error);
      return responseData;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["dicom-settings"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 3. Ping C-ECHO Mutation
  const pingMutation = useMutation({
    mutationFn: async () => {
      setPacsStatus("UNKNOWN");
      const res = await fetch("/api/lab-owner/radiology/settings/dicom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: settings.pacsIpAddress,
          port: settings.pacsPort,
          aeTitle: settings.pacsAETitle,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error);
      return responseData;
    },
    onSuccess: (res) => {
      setPacsStatus("CONNECTED");
      toast.success(res.message);
    },
    onError: (err: any) => {
      setPacsStatus("FAILED");
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Loading Configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Network className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                DICOM & PACS Settings
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Configure networking for imaging modalities and archive routing.
              </p>
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending}
            className="w-full md:w-auto h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md shadow-indigo-500/25 font-bold transition-all duration-300 hover:-translate-y-0.5 shrink-0 px-8"
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saveMutation.isPending ? "Saving Config..." : "Save Configuration"}
          </Button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Main Configurations (Spans 8) */}
          <div className="lg:col-span-8 space-y-8">
            {/* SECTION 1: Local RIS Identity */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-slate-500" />
                  <h2 className="text-base font-bold text-slate-800">
                    Local RIS Node (This Server)
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-slate-500 border-none font-mono text-[10px] tracking-wider uppercase"
                >
                  Identity
                </Badge>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Local AE Title
                  </Label>
                  <Input
                    value={settings.localAETitle}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        localAETitle: e.target.value.toUpperCase(),
                      })
                    }
                    className="uppercase font-mono text-sm h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] font-medium text-slate-400 mt-1">
                    The Application Entity Title of this RIS software.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Listener Port
                  </Label>
                  <Input
                    type="number"
                    value={settings.localPort}
                    onChange={(e) =>
                      setSettings({ ...settings, localPort: e.target.value })
                    }
                    className="font-mono text-sm h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: PACS Server */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-base font-bold text-slate-800">
                    Primary PACS Archive
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-600 border-emerald-200 font-mono text-[10px] tracking-wider uppercase"
                >
                  Storage
                </Badge>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      PACS AE Title
                    </Label>
                    <Input
                      value={settings.pacsAETitle}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pacsAETitle: e.target.value.toUpperCase(),
                        })
                      }
                      className="uppercase font-mono text-sm h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      IP / Hostname
                    </Label>
                    <Input
                      value={settings.pacsIpAddress}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pacsIpAddress: e.target.value,
                        })
                      }
                      className="font-mono text-sm h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      PACS Port
                    </Label>
                    <Input
                      type="number"
                      value={settings.pacsPort}
                      onChange={(e) =>
                        setSettings({ ...settings, pacsPort: e.target.value })
                      }
                      className="font-mono text-sm h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* CONNECTION TESTER */}
                <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm transition-colors ${
                        pacsStatus === "CONNECTED"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : pacsStatus === "FAILED"
                            ? "bg-rose-50 border-rose-200 text-rose-600"
                            : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      {pingMutation.isPending ? (
                        <Activity className="h-6 w-6 animate-pulse text-indigo-500" />
                      ) : pacsStatus === "CONNECTED" ? (
                        <Wifi className="h-6 w-6" />
                      ) : pacsStatus === "FAILED" ? (
                        <WifiOff className="h-6 w-6" />
                      ) : (
                        <Plug className="h-6 w-6" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                        Connection Status
                      </p>
                      <p
                        className={`text-xs font-bold mt-0.5 truncate ${
                          pacsStatus === "CONNECTED"
                            ? "text-emerald-600"
                            : pacsStatus === "FAILED"
                              ? "text-rose-600"
                              : "text-slate-500"
                        }`}
                      >
                        {pingMutation.isPending
                          ? "Testing connection..."
                          : pacsStatus === "UNKNOWN"
                            ? "Not tested recently"
                            : pacsStatus === "CONNECTED"
                              ? "Online & Reachable (C-ECHO OK)"
                              : "Connection Failed (Check IP/Port)"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => pingMutation.mutate()}
                    disabled={pingMutation.isPending || !settings.pacsIpAddress}
                    className="w-full sm:w-auto bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:text-indigo-600 h-10 rounded-xl transition-colors shadow-sm shrink-0"
                  >
                    {pingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Activity className="h-4 w-4 mr-2" />
                    )}
                    {pingMutation.isPending ? "Pinging..." : "Test C-ECHO"}
                  </Button>
                </div>
              </div>
            </div>

            {/* SECTION 3: Web Viewer */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MonitorPlay className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-800">
                    Diagnostic Web Viewer (WADO)
                  </h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Viewer Base URL
                  </Label>
                  <div className="relative w-full">
                    <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={settings.viewerBaseUrl}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          viewerBaseUrl: e.target.value,
                        })
                      }
                      className="pl-10 font-mono text-sm text-indigo-600 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"
                      placeholder="http://192.168.1.100:8042/viewer?StudyInstanceUID="
                    />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-2">
                    Example format for Orthanc/Osimis:{" "}
                    <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[10px]">
                      http://192.168.1.100:8042/viewer?StudyInstanceUID=
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Modality Worklist (MWL) & Help (Spans 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
                settings.enableMwl
                  ? "border-indigo-200 shadow-indigo-500/10"
                  : "border-slate-200 opacity-80"
              }`}
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-800">
                  Modality Worklist
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${settings.enableMwl ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {settings.enableMwl ? "Active" : "Disabled"}
                  </span>
                  <div
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${settings.enableMwl ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`}
                  />
                </div>
              </div>

              <div className="p-5 space-y-5">
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  MWL allows your MRI and CT machines to automatically fetch
                  patient details from this RIS, eliminating manual data entry
                  by technicians.
                </p>

                <div
                  className={`space-y-4 transition-opacity ${settings.enableMwl ? "opacity-100" : "opacity-40 pointer-events-none"}`}
                >
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      MWL AE Title
                    </Label>
                    <Input
                      value={settings.mwlAETitle}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mwlAETitle: e.target.value.toUpperCase(),
                        })
                      }
                      className="uppercase font-mono text-sm h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300"
                      disabled={!settings.enableMwl}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      MWL Port
                    </Label>
                    <Input
                      type="number"
                      value={settings.mwlPort}
                      onChange={(e) =>
                        setSettings({ ...settings, mwlPort: e.target.value })
                      }
                      className="font-mono text-sm h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300"
                      disabled={!settings.enableMwl}
                    />
                  </div>
                </div>

                <Button
                  variant={settings.enableMwl ? "outline" : "default"}
                  className={`w-full h-11 rounded-xl font-bold transition-all ${
                    settings.enableMwl
                      ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/25 hover:-translate-y-0.5"
                  }`}
                  onClick={() =>
                    setSettings({ ...settings, enableMwl: !settings.enableMwl })
                  }
                >
                  {settings.enableMwl
                    ? "Disable MWL Service"
                    : "Enable MWL Service"}
                </Button>
              </div>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-indigo-600" /> Quick
                Terminology
              </h3>
              <ul className="text-xs font-medium text-indigo-800/80 space-y-3">
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="font-black text-indigo-400 mt-0.5">•</span>
                  <span>
                    <strong className="text-indigo-900">AE Title:</strong>{" "}
                    Application Entity Title. A unique identity string for a
                    DICOM node (no spaces allowed).
                  </span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="font-black text-indigo-400 mt-0.5">•</span>
                  <span>
                    <strong className="text-indigo-900">C-ECHO:</strong> A
                    standard "ping" used to verify if a DICOM node is online and
                    listening.
                  </span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="font-black text-indigo-400 mt-0.5">•</span>
                  <span>
                    <strong className="text-indigo-900">WADO:</strong> Web
                    Access to DICOM Objects. Used to securely view heavy medical
                    images via browser.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
