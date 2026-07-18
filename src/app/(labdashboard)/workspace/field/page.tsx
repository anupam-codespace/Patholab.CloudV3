"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, PhoneCall, Navigation, CheckCircle, Clock, Truck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

export default function PhlebotomistFieldApp() {
  const queryClient = useQueryClient();

  // 1. Fetch Field Tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["field-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/field/tasks");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.tasks;
    },
    refetchInterval: 15000 // Auto-refresh every 15 seconds so they see new dispatch assignments instantly
  });

  // 2. Status Update Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ appointmentId, newStatus }: { appointmentId: string, newStatus: string }) => {
      const res = await fetch("/api/workspace/field/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, newStatus })
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["field-tasks"] });
    },
    onError: () => toast.error("Error updating status. Check your connection.")
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center pb-20">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Route...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Mobile App Header */}
      <div className="bg-indigo-600 pt-12 pb-6 px-5 shadow-md sticky top-0 z-20">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Truck className="w-6 h-6" /> My Route Today
        </h1>
        <p className="text-indigo-100 text-sm font-medium mt-1">
          You have {tasks.length} active collection(s) assigned.
        </p>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm mt-10">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-slate-700">Route Complete!</h3>
            <p className="text-slate-500 text-sm mt-1">You have no active tasks left today.</p>
          </div>
        ) : (
          tasks.map((task: any) => (
            <TaskCard key={task.id} task={task} statusMutation={statusMutation} />
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Sub-Component: Individual Task Card (Mobile Optimized)
// ----------------------------------------------------
function TaskCard({ task, statusMutation }: { task: any, statusMutation: any }) {
  // Helper to determine what the "Next Action" button should say and do based on current status
  let actionText = "";
  let nextStatus = "";
  let actionColor = "";

  switch (task.status) {
    case "ASSIGNED":
      actionText = "Start Journey";
      nextStatus = "EN_ROUTE";
      actionColor = "bg-blue-600 hover:bg-blue-700";
      break;
    case "EN_ROUTE":
      actionText = "Mark Arrived";
      nextStatus = "ARRIVED";
      actionColor = "bg-amber-500 hover:bg-amber-600";
      break;
    case "ARRIVED":
      actionText = "Sample Collected";
      nextStatus = "SAMPLE_COLLECTED"; // Next step after this is delivering it to lab
      actionColor = "bg-emerald-600 hover:bg-emerald-700";
      break;
    default:
      actionText = "Processing...";
  }

  const handleAction = () => {
    if (!nextStatus) return;
    statusMutation.mutate({ appointmentId: task.id, newStatus: nextStatus });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Top Banner indicating status */}
      <div className={`px-4 py-2 text-xs font-black uppercase tracking-widest text-white flex justify-between items-center ${
        task.status === "ASSIGNED" ? "bg-slate-400" : 
        task.status === "EN_ROUTE" ? "bg-blue-500 animate-pulse" : 
        "bg-amber-500"
      }`}>
        <span>{task.status.replace("_", " ")}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.timeSlot}</span>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-black text-slate-900">{task.patient.name}</h2>
        <p className="text-slate-500 font-medium text-sm mt-1">{task.collectionAddress} - {task.pincode}</p>

        {/* Quick Action Buttons (Call / Map) */}
        <div className="flex gap-3 mt-5">
          <a 
            href={`tel:${task.patient.phone}`} 
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 h-12 rounded-xl font-bold transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-emerald-600" /> Call
          </a>
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.collectionAddress + " " + task.pincode)}`}
            target="_blank"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 h-12 rounded-xl font-bold transition-colors"
          >
            <Navigation className="w-4 h-4 text-blue-600" /> Map
          </a>
        </div>

        {/* Primary Status Update Button */}
        {nextStatus && (
          <Button 
            onClick={handleAction}
            disabled={statusMutation.isPending}
            className={`w-full mt-4 h-14 text-lg font-black text-white shadow-lg rounded-xl ${actionColor}`}
          >
            {statusMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : actionText}
          </Button>
        )}
      </div>
    </div>
  );
}