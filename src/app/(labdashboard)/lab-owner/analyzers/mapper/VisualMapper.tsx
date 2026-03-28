"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  // 1. Fetch DB Parameters (Includes Refresh capability)
  const fetchParameters = async (sampleId: string) => {
    setIsLoadingParams(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/lab-owner/samples/${sampleId}/parameters`);
      const data = await res.json();

      if (res.ok && data.parameters) {
        // Filter out params that are already mapped in the current session
        const mappedDbIds = establishedLinks.map((link) => link.dbParam.id);
        const availableParams = data.parameters.filter(
          (p: DbParameter) => !mappedDbIds.includes(p.id),
        );
        setDbParams(availableParams);
      } else {
        setErrorMessage(
          "Could not load parameters. Ensure this barcode has tests assigned.",
        );
      }
    } catch (err) {
      setErrorMessage("Network error while fetching parameters.");
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

  // 2. Node Connection Logic (Auto-snaps when both are selected)
  const handleSelectMachineCode = (code: string) => {
    if (selectedDbParam) {
      // If right side is already selected, connect them instantly
      makeConnection(code, selectedDbParam);
    } else {
      // Otherwise, just highlight it
      setSelectedMachineCode(code === selectedMachineCode ? null : code);
    }
  };

  const handleSelectDbParam = (param: DbParameter) => {
    if (selectedMachineCode) {
      // If left side is already selected, connect them instantly
      makeConnection(selectedMachineCode, param);
    } else {
      // Otherwise, just highlight it
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

  // 3. Undo Connection
  const removeConnection = (indexToRemove: number) => {
    const link = establishedLinks[indexToRemove];
    setPendingCodes([...pendingCodes, link.machineCode]);
    setDbParams([...dbParams, link.dbParam]);
    setEstablishedLinks((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // 4. Save to Database
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
      setErrorMessage("Failed to save mappings to database.");
    }
    setIsSaving(false);
  };

  // --- RENDER ALL CLEAR ---
  if (queueData.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-16 text-center text-emerald-800 shadow-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h2 className="text-3xl font-black tracking-tight">System All Clear</h2>
        <p className="mt-3 text-emerald-600 font-medium max-w-md mx-auto">
          No unmapped machine codes detected. Your LIMS webhook is processing
          hardware data perfectly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium flex items-center gap-3 shadow-sm">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          {errorMessage}
        </div>
      )}

      {/* STEP 1: QUEUE SELECTION */}
      {!activeQueue && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-white tracking-wide flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
              Action Required: Unmapped Data
            </h2>
            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
              {queueData.length} Pending
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Sample Barcode</th>
                <th className="px-6 py-4 font-bold">Hardware Source</th>
                <th className="px-6 py-4 font-bold">Unrecognized Codes</th>
                <th className="px-6 py-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {queueData.map((item) => (
                <tr
                  key={item.sampleId}
                  className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 font-mono font-bold text-slate-800">
                    {item.sampleId}
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded border border-indigo-100 font-medium text-xs">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                      </svg>
                      {item.analyzerName}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {item.machineCodes.map((c) => (
                        <span
                          key={c}
                          className="bg-amber-100/50 text-amber-800 border border-amber-200 px-2 py-1 rounded text-xs font-mono font-bold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => selectQueueItem(item)}
                      className="bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-600 hover:shadow-blue-500/20 transition-all group-hover:scale-105">
                      Link Data &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* STEP 2: VISUAL PATCH PANEL WORKSPACE */}
      {activeQueue && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
          {/* Workspace Header */}
          <div className="bg-slate-900 px-6 py-5 flex justify-between items-center z-10 relative shadow-md">
            <div>
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                Live Mapping Session
              </p>
              <h2 className="font-bold text-2xl text-white tracking-tight flex items-center gap-3">
                {activeQueue.sampleId}
                <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  via {activeQueue.analyzerName}
                </span>
              </h2>
            </div>
            <button
              onClick={() => setActiveQueue(null)}
              className="text-slate-400 hover:text-white text-sm font-bold px-4 py-2 bg-slate-800 rounded-xl transition-colors">
              Abort Session
            </button>
          </div>

          <div className="p-6 md:p-8 bg-slate-50 relative">
            {/* Visual Background Guide Lines */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <svg
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    id="grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse">
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative z-10">
              {/* LEFT COLUMN: Machine Outputs (Hardware) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 tracking-tight text-lg">
                      Machine Outputs
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Select a raw code to link
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 min-h-[300px] flex flex-col gap-3">
                  {pendingCodes.length === 0 && (
                    <div className="m-auto text-center text-slate-400 text-sm font-medium">
                      All codes linked!
                    </div>
                  )}
                  {pendingCodes.map((code) => {
                    const isActive = selectedMachineCode === code;
                    return (
                      <button
                        key={code}
                        onClick={() => handleSelectMachineCode(code)}
                        className={`group relative flex justify-between items-center w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          isActive
                            ? "border-amber-400 bg-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.2)] scale-[1.02]"
                            : "border-slate-100 bg-white hover:border-amber-200 hover:bg-slate-50"
                        }`}>
                        <span
                          className={`font-mono font-bold text-lg ${isActive ? "text-amber-700" : "text-slate-700"}`}>
                          {code}
                        </span>
                        {/* Fake "Node" Port */}
                        <div
                          className={`w-4 h-4 rounded-full border-4 ${isActive ? "bg-amber-400 border-amber-200 animate-pulse" : "bg-slate-200 border-slate-100 group-hover:bg-amber-200"}`}></div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: Database Inputs (Software) */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s-8-1.79-8-4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 tracking-tight text-lg">
                        Database Parameters
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Select destination
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchParameters(activeQueue.sampleId)}
                    disabled={isLoadingParams}
                    className="text-[10px] uppercase font-bold tracking-wider text-slate-500 hover:text-blue-600 flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all">
                    <svg
                      className={`w-3.5 h-3.5 ${isLoadingParams ? "animate-spin" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {isLoadingParams ? "Syncing..." : "Sync Live"}
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 min-h-[300px] max-h-[500px] overflow-y-auto flex flex-col gap-3 relative">
                  {isLoadingParams && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {dbParams.length === 0 && !isLoadingParams && (
                    <div className="m-auto text-center text-slate-400 text-sm font-medium">
                      No pending parameters found.
                    </div>
                  )}
                  {dbParams.map((param) => {
                    const isActive = selectedDbParam?.id === param.id;
                    return (
                      <button
                        key={param.id}
                        onClick={() => handleSelectDbParam(param)}
                        className={`group relative flex justify-between items-center w-full p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                          isActive
                            ? "border-blue-400 bg-blue-50 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-[1.02]"
                            : "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50"
                        }`}>
                        {/* Fake "Node" Port */}
                        <div
                          className={`w-4 h-4 rounded-full border-4 mr-3 ${isActive ? "bg-blue-400 border-blue-200 animate-pulse" : "bg-slate-200 border-slate-100 group-hover:bg-blue-200"}`}></div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-bold truncate text-sm md:text-base ${isActive ? "text-blue-800" : "text-slate-700"}`}>
                            {param.name}
                          </p>
                          <p
                            className={`text-[10px] mt-0.5 truncate uppercase tracking-widest font-semibold ${isActive ? "text-blue-400" : "text-slate-400"}`}>
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

          {/* STEP 3: ESTABLISHED LINKS BOARD */}
          <div className="bg-slate-900 border-t border-slate-800 p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
              <div>
                <h3 className="font-bold text-white text-xl flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                  </svg>
                  Established Connections
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Review your wiring before committing permanently to the
                  database.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || establishedLinks.length === 0}
                className={`px-8 py-3.5 rounded-xl font-bold shadow-xl transition-all flex items-center gap-2 ${
                  establishedLinks.length > 0
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-500/20 active:scale-95"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}>
                {isSaving ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Committing to Server...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"></path>
                    </svg>
                    Save & Activate Rules
                  </>
                )}
              </button>
            </div>

            {establishedLinks.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/50 border-dashed rounded-2xl p-8 text-center text-slate-500 text-sm font-medium">
                No connections made yet. Select a machine output and a database
                parameter to link them.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {establishedLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-inner flex items-center gap-4 group">
                    <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 text-amber-400 font-mono font-bold text-sm shadow-sm">
                      {link.machineCode}
                    </div>

                    <div className="flex-1 flex flex-col justify-center relative">
                      <div className="h-0.5 w-full bg-slate-600 rounded"></div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
                    </div>

                    <div className="flex-1 truncate">
                      <p
                        className="font-bold text-blue-400 text-sm truncate"
                        title={link.dbParam.name}>
                        {link.dbParam.name}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">
                        {link.dbParam.testName}
                      </p>
                    </div>

                    <button
                      onClick={() => removeConnection(idx)}
                      className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      title="Undo Connection">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
