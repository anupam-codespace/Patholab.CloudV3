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
} from "lucide-react";
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
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Network className="h-6 w-6 text-blue-600" />
            DICOM & PACS Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure networking for imaging modalities and image archiving.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(settings)}
          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] shadow-md"
          disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saveMutation.isPending ? "Saving Config..." : "Save Configuration"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Main Configurations */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: Local RIS Identity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Server className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">
                Local RIS Node (Your Server)
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Local AE Title</Label>
                <Input
                  value={settings.localAETitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      localAETitle: e.target.value.toUpperCase(),
                    })
                  }
                  className="uppercase font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500">
                  The Application Entity Title of this RIS software.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Listener Port</Label>
                <Input
                  type="number"
                  value={settings.localPort}
                  onChange={(e) =>
                    setSettings({ ...settings, localPort: e.target.value })
                  }
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PACS Server */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-800">
                Primary PACS Archive
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>PACS AE Title</Label>
                  <Input
                    value={settings.pacsAETitle}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pacsAETitle: e.target.value.toUpperCase(),
                      })
                    }
                    className="uppercase font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP Address / Hostname</Label>
                  <Input
                    value={settings.pacsIpAddress}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pacsIpAddress: e.target.value,
                      })
                    }
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PACS Port</Label>
                  <Input
                    type="number"
                    value={settings.pacsPort}
                    onChange={(e) =>
                      setSettings({ ...settings, pacsPort: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* CONNECTION TESTER */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${pacsStatus === "CONNECTED" ? "bg-emerald-100 text-emerald-600" : pacsStatus === "FAILED" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"}`}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      Connection Status
                    </p>
                    <p
                      className={`text-xs font-medium ${pacsStatus === "CONNECTED" ? "text-emerald-600" : pacsStatus === "FAILED" ? "text-red-600" : "text-slate-500"}`}>
                      {pacsStatus === "UNKNOWN"
                        ? "Not tested recently"
                        : pacsStatus === "CONNECTED"
                          ? "Online & Reachable (C-ECHO OK)"
                          : "Connection Failed"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => pingMutation.mutate()}
                  disabled={pingMutation.isPending || !settings.pacsIpAddress}
                  className="bg-white shrink-0">
                  {pingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "Test C-ECHO"
                  )}
                  {pingMutation.isPending ? "Pinging..." : "Ping PACS"}
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 3: Web Viewer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-bold text-slate-800">
                Diagnostic Web Viewer (WADO)
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <Label>Viewer Base URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      value={settings.viewerBaseUrl}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          viewerBaseUrl: e.target.value,
                        })
                      }
                      className="pl-10 font-mono text-sm text-blue-600"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Example:{" "}
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                    http://192.168.1.100:8042/viewer?StudyInstanceUID=
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Modality Worklist (MWL) & Help */}
        <div className="space-y-6">
          <div
            className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${settings.enableMwl ? "border-slate-200" : "border-slate-200 opacity-80"}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                Modality Worklist (MWL)
              </h2>
              <div
                className={`h-3 w-3 rounded-full ${settings.enableMwl ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`}></div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                MWL allows your MRI and CT machines to automatically fetch
                patient details from this RIS, eliminating manual data entry by
                technicians.
              </p>

              <div className="space-y-2">
                <Label>MWL AE Title</Label>
                <Input
                  value={settings.mwlAETitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      mwlAETitle: e.target.value.toUpperCase(),
                    })
                  }
                  className="uppercase font-mono text-sm"
                  disabled={!settings.enableMwl}
                />
              </div>
              <div className="space-y-2">
                <Label>MWL Port</Label>
                <Input
                  type="number"
                  value={settings.mwlPort}
                  onChange={(e) =>
                    setSettings({ ...settings, mwlPort: e.target.value })
                  }
                  className="font-mono text-sm"
                  disabled={!settings.enableMwl}
                />
              </div>

              <Button
                variant={settings.enableMwl ? "destructive" : "default"}
                className="w-full mt-4"
                onClick={() =>
                  setSettings({ ...settings, enableMwl: !settings.enableMwl })
                }>
                {settings.enableMwl
                  ? "Disable MWL Service"
                  : "Enable MWL Service"}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Quick Terminology
            </h3>
            <ul className="text-xs text-blue-800 space-y-3">
              <li className="flex gap-2">
                <span className="font-black">•</span>{" "}
                <span>
                  <strong>AE Title:</strong> Application Entity Title. A unique
                  name for a DICOM node (no spaces allowed).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-black">•</span>{" "}
                <span>
                  <strong>C-ECHO:</strong> A standard "ping" used to verify if a
                  DICOM node is online.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-black">•</span>{" "}
                <span>
                  <strong>WADO:</strong> Web Access to DICOM Objects. Used by
                  the browser to view heavy images.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
