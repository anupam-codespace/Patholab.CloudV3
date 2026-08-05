"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Database,
  Workflow,
  Link2,
  Zap,
  RefreshCcw,
  XCircle,
  CheckCircle2,
  Activity,
  Binary,
  ArrowRight,
  ShieldCheck,
  Undo2,
} from "lucide-react";

type DbParameter = { id: string; name: string; testName: string };
type QueueItem = {
  sampleId: string;
  analyzerId: string;
  analyzerName: string;
  machineCodes: string[];
};

export default function VisualMapper({
  queueData,
  saveMappingAction,
}: {
  queueData: QueueItem[];
  saveMappingAction: (data: any) => Promise<boolean>;
}) {
  const router = useRouter();

  /** 🔒 RULE 1: PRESERVE ALL LOGIC */
  const [activeQueue, setActiveQueue] = useState<QueueItem | null>(null);
  const [dbParams, setDbParams] = useState<DbParameter[]>([]);
  const [pendingCodes, setPendingCodes] = useState<string[]>([]);
  const [selectedMachineCode, setSelectedMachineCode] = useState<string | null>(
    null,
  );
  const [selectedDbParam, setSelectedDbParam] = useState<DbParameter | null>(
    null,
  );
  const [establishedLinks, setEstablishedLinks] = useState<
    { machineCode: string; dbParam: DbParameter }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingParams, setIsLoadingParams] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchParameters = async (sampleId: string) => {
    setIsLoadingParams(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/workspace/samples/${sampleId}/parameters`);
      const data = await res.json();
      if (res.ok && data.parameters) {
        const mappedDbIds = establishedLinks.map((link) => link.dbParam.id);
        const availableParams = data.parameters.filter(
          (p: DbParameter) => !mappedDbIds.includes(p.id),
        );
        setDbParams(availableParams);
      } else {
        setErrorMessage(
          "Technical Fault: Could not fetch destination parameters.",
        );
      }
    } catch (err) {
      setErrorMessage("Network interface timeout while fetching parameters.");
    } finally {
      setIsLoadingParams(false);
    }
  };

  const selectQueueItem = (item: QueueItem) => {
    setActiveQueue(item);
    setPendingCodes(item.machineCodes);
    setEstablishedLinks([]);
    setSelectedMachineCode(null);
    setSelectedDbParam(null);
    fetchParameters(item.sampleId);
  };

  const handleSelectMachineCode = (code: string) => {
    if (selectedDbParam) {
      makeConnection(code, selectedDbParam);
    } else {
      setSelectedMachineCode(code === selectedMachineCode ? null : code);
    }
  };

  const handleSelectDbParam = (param: DbParameter) => {
    if (selectedMachineCode) {
      makeConnection(selectedMachineCode, param);
    } else {
      setSelectedDbParam(param.id === selectedDbParam?.id ? null : param);
    }
  };

  const makeConnection = (code: string, param: DbParameter) => {
    setEstablishedLinks([
      { machineCode: code, dbParam: param },
      ...establishedLinks,
    ]);
    setPendingCodes((prev) => prev.filter((c) => c !== code));
    setDbParams((prev) => prev.filter((p) => p.id !== param.id));
    setSelectedMachineCode(null);
    setSelectedDbParam(null);
  };

  const removeConnection = (indexToRemove: number) => {
    const link = establishedLinks[indexToRemove];
    setPendingCodes([...pendingCodes, link.machineCode]);
    setDbParams([...dbParams, link.dbParam]);
    setEstablishedLinks((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSave = async () => {
    if (!activeQueue || establishedLinks.length === 0) return;
    setIsSaving(true);
    setErrorMessage(null);
    const payload = establishedLinks.map((link) => ({
      labAnalyzerId: activeQueue.analyzerId,
      sampleId: activeQueue.sampleId,
      machineCode: link.machineCode,
      parameterName: link.dbParam.name,
    }));
    const success = await saveMappingAction(payload);
    if (success) {
      router.refresh();
      setActiveQueue(null);
      setEstablishedLinks([]);
    } else {
      setErrorMessage("Database write-error: Failed to save mappings.");
    }
    setIsSaving(false);
  };

  /** 🎨 RULE 2: REIMAGINED UI */
  if (queueData.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-[32px] p-20 text-center shadow-sm">
        <div className="w-24 h-24 bg-card dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-8 border border-emerald-100 dark:border-emerald-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-foreground dark:text-primary-foreground uppercase">
          Sync Status: Optimal
        </h2>
        <p className="mt-4 text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
          Zero unmapped codes in the buffer. Your hardware interface is running
          at 100% recognition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 font-bold shadow-sm animate-in fade-in slide-in-from-top-2">
          <XCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs uppercase tracking-wider">
            {errorMessage}
          </span>
        </div>
      )}

      {!activeQueue ? (
        <div className="bg-card dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="bg-slate-900 p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500 rounded-2xl">
                <Activity className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="font-black text-white text-xl uppercase tracking-tight">
                  Technical Queue
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  Incoming Machine Handshakes
                </p>
              </div>
            </div>
            <Badge className="bg-slate-800 text-muted-foreground/70 border-none font-black text-xs px-4 py-1.5 rounded-full">
              {queueData.length} UNMAPPED PACKETS
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-muted-foreground/70 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Packet ID</th>
                  <th className="px-8 py-5">Origin Node</th>
                  <th className="px-8 py-5">Unrecognized Codes</th>
                  <th className="px-8 py-5 text-right">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-sm">
                {queueData.map((item) => (
                  <tr
                    key={item.sampleId}
                    className="group hover:bg-muted/30 dark:hover:bg-slate-800/40 transition-all">
                    <td className="px-8 py-6 font-mono font-black text-foreground dark:text-primary-foreground">
                      {item.sampleId}
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-primary dark:text-indigo-400 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 font-black text-[10px] uppercase tracking-widest">
                        <Cpu className="w-3.5 h-3.5" /> {item.analyzerName}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {item.machineCodes.map((c) => (
                          <span
                            key={c}
                            className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500 border border-amber-100 dark:border-amber-900 px-2 py-0.5 rounded font-mono font-bold text-[11px] uppercase tracking-tighter">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Button
                        onClick={() => selectQueueItem(item)}
                        className="h-10 px-6 bg-slate-900 hover:bg-black text-primary-foreground rounded-xl font-bold transition-all active:scale-95 group/btn shadow-lg shadow-slate-200 dark:shadow-none">
                        Link Data{" "}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-[0_40px_100px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
          {/* Workspace Cockpit */}
          <div className="bg-slate-900 p-8 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Workflow className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
                  Mapping Session
                </p>
                <div className="h-1 w-1 rounded-full bg-indigo-400 animate-ping" />
              </div>
              <h2 className="font-black text-3xl text-white tracking-tighter flex items-center gap-4">
                {activeQueue.sampleId}
                <span className="text-xs font-bold text-muted-foreground/70 bg-card/5 px-4 py-1.5 rounded-2xl border border-white/10 uppercase tracking-widest">
                  Node: {activeQueue.analyzerName}
                </span>
              </h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => setActiveQueue(null)}
              className="h-12 px-6 rounded-2xl text-muted-foreground/70 hover:text-white hover:bg-card/5 font-black uppercase text-[10px] tracking-widest transition-all">
              Abort Bridge
            </Button>
          </div>

          <div className="p-10 bg-slate-50/50 dark:bg-slate-950/20 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
              {/* LEFT: SOURCE HARDWARE */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-[20px] bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap className="w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground dark:text-primary-foreground uppercase tracking-widest text-sm">
                      Source: Hardware Codes
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">
                      Raw Data Output from Analyzer
                    </p>
                  </div>
                </div>

                <div className="bg-card dark:bg-slate-900 rounded-[32px] p-4 min-h-[340px] flex flex-col gap-4 shadow-sm border border-slate-100 dark:border-slate-800">
                  {pendingCodes.length === 0 ? (
                    <div className="m-auto text-center space-y-2">
                      <div className="p-4 bg-emerald-50 rounded-full inline-block">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-xs font-black uppercase text-muted-foreground/70 tracking-widest">
                        Source Buffer Empty
                      </p>
                    </div>
                  ) : (
                    pendingCodes.map((code) => {
                      const isActive = selectedMachineCode === code;
                      return (
                        <button
                          key={code}
                          onClick={() => handleSelectMachineCode(code)}
                          className={`group relative flex justify-between items-center w-full px-6 py-5 rounded-[22px] border-2 transition-all duration-300 text-left ${isActive ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 scale-[1.03] shadow-xl" : "border-transparent bg-muted/30 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-200"}`}>
                          <span
                            className={`font-mono font-black text-xl tracking-tighter ${isActive ? "text-amber-700 dark:text-amber-400" : "text-foreground/80 dark:text-slate-300"}`}>
                            {code}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border-4 transition-all ${isActive ? "bg-amber-500 border-white dark:border-slate-900 scale-125 animate-pulse" : "bg-slate-200 dark:bg-slate-700 border-transparent"}`}
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT: DESTINATION LIMS */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[20px] bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-indigo-600/20">
                      <Database className="w-6 h-6 fill-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-foreground dark:text-primary-foreground uppercase tracking-widest text-sm">
                        Destination: LIMS Database
                      </h3>
                      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">
                        Recognized Parameters in Registry
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => fetchParameters(activeQueue.sampleId)}
                    disabled={isLoadingParams}
                    variant="outline"
                    className="h-10 rounded-xl border-border dark:border-slate-800 bg-card dark:bg-slate-900 hover:text-primary active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest">
                    <RefreshCcw
                      className={`w-3.5 h-3.5 mr-2 ${isLoadingParams ? "animate-spin" : ""}`}
                    />{" "}
                    Sync Registry
                  </Button>
                </div>

                <div className="bg-card dark:bg-slate-900 rounded-[32px] p-4 min-h-[340px] max-h-[500px] overflow-y-auto custom-scrollbar flex flex-col gap-4 shadow-sm border border-slate-100 dark:border-slate-800 relative">
                  {isLoadingParams && (
                    <div className="absolute inset-0 bg-card/80 dark:bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 rounded-[32px]">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">
                        Accessing Dictionary...
                      </p>
                    </div>
                  )}
                  {dbParams.length === 0 && !isLoadingParams && (
                    <div className="m-auto text-center opacity-40 grayscale space-y-2">
                      <Binary className="w-10 h-10 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        No target parameters found
                      </p>
                    </div>
                  )}
                  {dbParams.map((param) => {
                    const isActive = selectedDbParam?.id === param.id;
                    return (
                      <button
                        key={param.id}
                        onClick={() => handleSelectDbParam(param)}
                        className={`group relative flex justify-between items-center w-full px-6 py-4 rounded-[22px] border-2 transition-all duration-300 text-left ${isActive ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.03] shadow-xl" : "border-transparent bg-muted/30 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-200"}`}>
                        <div
                          className={`w-5 h-5 rounded-full border-4 transition-all mr-4 ${isActive ? "bg-primary border-white dark:border-slate-900 scale-125 animate-pulse" : "bg-slate-200 dark:bg-slate-700 border-transparent"}`}
                        />
                        <div className="flex-1 truncate">
                          <p
                            className={`font-black text-base tracking-tight truncate ${isActive ? "text-indigo-800 dark:text-indigo-400" : "text-foreground dark:text-slate-200"}`}>
                            {param.name}
                          </p>
                          <p
                            className={`text-[10px] mt-0.5 uppercase tracking-widest font-black ${isActive ? "text-indigo-400" : "text-slate-400"}`}>
                            {param.testName}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ESTABLISHED LINKS (The Bottom Deck) */}
          <div className="bg-slate-900 border-t border-white/5 p-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-10">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-black text-white text-xl uppercase tracking-tighter">
                    Established Connections
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  Verify the virtual wiring before activating automation
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || establishedLinks.length === 0}
                className={`h-16 px-10 rounded-[22px] font-black text-lg uppercase tracking-tight transition-all shadow-2xl ${establishedLinks.length > 0 ? "bg-emerald-500 hover:bg-emerald-400 text-foreground shadow-emerald-500/30 active:scale-95" : "bg-slate-800 text-muted-foreground opacity-50 cursor-not-allowed"}`}>
                {isSaving ? (
                  <>
                    <RefreshCcw className="w-6 h-6 animate-spin mr-3" />{" "}
                    Committing...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6 mr-3 fill-slate-900" /> Save &
                    Activate Bridge
                  </>
                )}
              </Button>
            </div>

            {establishedLinks.length === 0 ? (
              <div className="bg-black/20 border-2 border-slate-800 border-dashed rounded-[32px] py-16 text-center">
                <Link2 className="w-12 h-12 text-foreground mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-700">
                  No active links in buffer
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {establishedLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/80 border border-white/5 p-6 rounded-[24px] flex items-center gap-5 group transition-all hover:bg-slate-800">
                    <div className="bg-slate-900 h-12 px-4 rounded-xl flex items-center justify-center text-amber-500 font-mono font-black text-sm border border-slate-700 shadow-inner shrink-0 uppercase tracking-tighter">
                      {link.machineCode}
                    </div>

                    <div className="flex-1 flex flex-col justify-center relative min-w-[20px]">
                      <div className="h-[2px] w-full bg-slate-700 rounded-full" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_15px_#6366f1]" />
                    </div>

                    <div className="flex-1 truncate">
                      <p
                        className="font-black text-indigo-400 text-sm truncate uppercase tracking-tighter"
                        title={link.dbParam.name}>
                        {link.dbParam.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate">
                        {link.dbParam.testName}
                      </p>
                    </div>

                    <button
                      onClick={() => removeConnection(idx)}
                      className="w-10 h-10 rounded-xl bg-slate-700/50 text-muted-foreground/70 flex items-center justify-center hover:bg-rose-500 hover:text-primary-foreground transition-all opacity-0 group-hover:opacity-100 active:scale-90">
                      <Undo2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
