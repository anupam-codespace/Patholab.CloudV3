"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, FlaskConical, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// Ensure you have a Badge component or replace it with a styled span
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${className}`}>{children}</span>
);

export default function ResultEntryPage() {
  const params = useParams();
  const router = useRouter();
  
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!params.appointmentId) return;

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/workspace/reports/entry/${params.appointmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setAppointment(data.appointment);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [params.appointmentId]);

  const handleSaveResults = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspace/reports/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          results: results,
        }),
      });

      if (!res.ok) throw new Error("Failed to save results");

      toast.success("Results saved successfully!");
      router.push("/workspace/samples/received");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></div>;
  if (!appointment) return <div className="p-10 text-center text-red-500">Appointment not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Patient Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xl">
            {appointment.patient?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{appointment.patient?.name || "Unknown Patient"}</h2>
            <p className="text-sm text-slate-500 font-mono">
              ID: {appointment.patient?.patientId} • Age: {appointment.patient?.age} • Gender: {appointment.patient?.gender}
            </p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-amber-100 text-amber-700">Processing</Badge>
        </div>
      </div>

      {/* Dynamic Test Parameters Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold flex items-center gap-2 text-slate-700">
          <FlaskConical className="w-5 h-5" /> Data Entry
        </div>
        
        <div className="p-6 space-y-8">
          {appointment.tests?.map((test: any) => (
            <div key={test.id} className="space-y-4">
              <h3 className="text-lg font-black text-indigo-900 border-b pb-2">{test.name}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {test.parameters?.map((param: any) => (
                  <div key={param.id} className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 flex justify-between">
                      <span>{param.name}</span>
                      <span className="text-xs text-slate-400 font-medium">Range: {param.normalRange} {param.unit}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter value..."
                        className="w-full h-11 border border-slate-200 rounded-lg px-3 focus:border-indigo-500 outline-none"
                        value={results[param.id] || ""}
                        onChange={(e) => setResults({ ...results, [param.id]: e.target.value })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                        {param.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={handleSaveResults}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
}