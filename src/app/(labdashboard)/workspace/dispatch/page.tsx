"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Truck, MapPin, Clock, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";

export default function DispatchDashboard() {
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [selectedPhlebotomist, setSelectedPhlebotomist] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);

  // Fetch Pending Data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-dispatch"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/trips/pending");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const pendingAppointments = data?.pendingAppointments || [];
  const phlebotomists = data?.phlebotomists || [];

  // Handle Checkbox Toggle
  const toggleSelection = (id: string) => {
    setSelectedAppointments(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  // Submit the Trip
  const handleDispatch = async () => {
    if (selectedAppointments.length === 0) return toast.error("Select at least one appointment.");
    if (!selectedPhlebotomist) return toast.error("Please select a phlebotomist.");

    const selectedAppointmentRecords = pendingAppointments.filter((appointment: any) =>
      selectedAppointments.includes(appointment.id),
    );
    const scheduledDates = new Set(
      selectedAppointmentRecords.map((appointment: any) =>
        new Date(appointment.appointmentDate).toISOString().slice(0, 10),
      ),
    );

    if (scheduledDates.size !== 1) {
      return toast.error("Select appointments scheduled for the same date.");
    }

    setIsDispatching(true);
    const toastId = toast.loading("Creating Trip Route...");

    try {
      const res = await fetch("/api/workspace/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phlebotomistId: selectedPhlebotomist,
          scheduledDate: selectedAppointmentRecords[0].appointmentDate,
          appointmentIds: selectedAppointments,
          startLocation: "Main Lab",
        }),
      });

      if (!res.ok) throw new Error("Failed to dispatch trip");

      toast.success("Trip successfully dispatched!", { id: toastId });
      setSelectedAppointments([]);
      setSelectedPhlebotomist("");
      refetch(); // Reload the table to remove assigned patients

    } catch (error) {
      toast.error("Error dispatching trip", { id: toastId });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
          <Truck className="w-8 h-8 text-indigo-600" /> Dispatch Control Center
        </h1>
        <p className="text-slate-500 font-medium">Assign pending home collections to your field staff.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: The Pending Table */}
        <div className="lg:col-span-3">
          <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-bold text-slate-700 flex justify-between">
              <span>Pending Collections ({pendingAppointments.length})</span>
            </div>
            
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading queue...
              </div>
            ) : pendingAppointments.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 font-medium">
                No pending home collections.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingAppointments.map((apt: any) => (
                  <div 
                    key={apt.id} 
                    className={`p-4 flex items-start gap-4 transition-colors hover:bg-slate-50 ${selectedAppointments.includes(apt.id) ? "bg-indigo-50/50" : ""}`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedAppointments.includes(apt.id)}
                      onChange={() => toggleSelection(apt.id)}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 text-lg">{apt.patient.name}</p>
                          <p className="text-sm text-slate-500 font-mono">{apt.patient.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-700">
                            {format(new Date(apt.appointmentDate), "MMM dd, yyyy")}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded mt-1">
                            <Clock className="w-3 h-3" /> {apt.timeSlot}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-start gap-1.5 text-sm text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{apt.collectionAddress} - <span className="font-bold">{apt.pincode}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: The Dispatch Action Box */}
        <div className="lg:col-span-1">
          <Card className="rounded-xl shadow-sm border-slate-200 p-5 sticky top-6">
            <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" /> Assign Trip
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Selected Patients
                </label>
                <div className="text-2xl font-black text-indigo-600">
                  {selectedAppointments.length}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Select Phlebotomist
                </label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedPhlebotomist}
                  onChange={(e) => setSelectedPhlebotomist(e.target.value)}
                >
                  <option value="">-- Choose Staff --</option>
                  {phlebotomists.map((staff: any) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>

              <Button 
                onClick={handleDispatch}
                disabled={isDispatching || selectedAppointments.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-sm mt-4"
              >
                {isDispatching ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Dispatch Route Now"}
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
