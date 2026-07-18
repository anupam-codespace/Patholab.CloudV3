"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ScanLine, CheckCircle2, Loader2, User, Truck, Clock, 
  ArrowRight, FileText, CheckSquare, Send, Database, Calendar 
} from "lucide-react";
import toast from "react-hot-toast";

export default function SampleReceptionDesk() {
  const [barcode, setBarcode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReceived, setLastReceived] = useState<any>(null);
  
  // History log state
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/workspace/samples/receive");
      const data = await res.json();
      if (data.success) {
        setHistory(data.appointments || []);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    void fetchHistory();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setIsProcessing(true);
    const scannedId = barcode.trim();
    
    try {
      const res = await fetch("/api/workspace/samples/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: scannedId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success(data.message);
      setLastReceived({
        id: scannedId,
        patientName: data.data.patientName,
        phlebotomistName: data.data.phlebotomistName,
        time: new Date().toLocaleTimeString()
      });

      setBarcode("");
      inputRef.current?.focus();
      void fetchHistory(); // Refetch the received history list automatically!

    } catch (error: any) {
      toast.error(error.message);
      inputRef.current?.select(); 
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <ScanLine className="w-8 h-8 text-indigo-600 animate-pulse" />
          Accessioning & Reception Desk
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Officially receive home collection samples, track custody handover, and route them to processing.
        </p>
      </div>

      {/* ACCESSIONING INPUT & LAST SCAN DETAILS */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            Accessioning Input
          </h2>
          <form onSubmit={handleScan} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={isProcessing}
              placeholder="Scan vial barcode or enter Appointment ID..."
              className="w-full h-16 text-center text-lg font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-inner placeholder:text-slate-400"
              autoComplete="off"
            />
            <button 
              type="submit" 
              disabled={!barcode || isProcessing}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 flex justify-center items-center shadow-sm hover:scale-[1.01] active:scale-100 transition-all"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Accept Custody (Press Enter)"
              )}
            </button>
          </form>
        </div>

        {/* Last Processed Card */}
        {lastReceived && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl relative overflow-hidden shadow-sm">
              <CheckCircle2 className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-500 opacity-10" />
              
              <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Successfully Handed Over
              </h3>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1 mb-1">
                    <User className="w-3.5 h-3.5 shrink-0" /> Patient
                  </p>
                  <p className="text-base font-black text-emerald-950">{lastReceived.patientName}</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1 mb-1">
                    <Truck className="w-3.5 h-3.5 shrink-0" /> Phlebotomist
                  </p>
                  <p className="text-base font-black text-emerald-950">{lastReceived.phlebotomistName}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" /> Timestamp
                  </p>
                  <p className="text-base font-black text-emerald-950">{lastReceived.time}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-emerald-200/50 flex justify-between items-center text-xs font-mono text-emerald-700 font-bold">
                <span>Reference Uid: {lastReceived.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: PREVIOUS LOG / RECEIVED HISTORY DATA TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900">Home Collection Handover Log</h2>
            <p className="text-xs text-slate-500 font-medium">
              Historical record of all received sample bookings from the field.
            </p>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border">
            {history.length} Samples Received
          </div>
        </div>

        {historyLoading && history.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-indigo-600" />
            <span className="text-sm font-bold">Loading handover records...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
            <p className="font-bold text-sm">No received home collection samples found.</p>
            <p className="text-xs text-slate-400 mt-1">Start scanning collected samples above to log custody records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/20">
                  <th className="px-6 py-4">Reference / ID</th>
                  <th className="px-6 py-4">Patient details</th>
                  <th className="px-6 py-4">Visit Date & Slot</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Collected By</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Handover Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-bold">
                      {apt.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{apt.patient.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{apt.patient.phone} · {apt.patient.gender}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(apt.appointmentDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-0.5">{apt.timeSlot}</div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">
                      ₹{apt.invoice?.grandTotal || "0"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {apt.trip?.phlebotomist?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        apt.status === "COMPLETED"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : apt.status === "RESULT_ENTERED"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-blue-50 border-blue-200 text-blue-700"
                      }`}>
                        {apt.status === "RECEIVED_AT_LAB" ? "Accessioned" : apt.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                      {new Date(apt.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}