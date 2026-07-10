"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Loader2, User, Microscope, Clock, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BookingForm({ selectedDate, patients, modalities, onClose, onSuccess }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    patientId: "", modalityId: "", scanName: "", timeStr: "09:00", notes: "",
  });

  const bookMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/radiology/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to book appointment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Appointment Booked Successfully!");
      queryClient.invalidateQueries({ queryKey: ["radiology-appointments"] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleBookSubmit = () => {
    if (!formData.patientId || !formData.modalityId || !formData.scanName) {
      return toast.error("Please fill all required fields.");
    }
    const [hours, minutes] = formData.timeStr.split(":");
    const scheduledStart = new Date(selectedDate);
    scheduledStart.setHours(parseInt(hours), parseInt(minutes), 0);
    const scheduledEnd = new Date(scheduledStart.getTime() + 30 * 60000);

    bookMutation.mutate({
      ...formData,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
    });
  };

  return (
    <div className="space-y-5">
      {/* Patient Selection */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-foreground/80 uppercase">Patient *</Label>
        <select className="flex h-11 w-full rounded-xl border bg-muted/30 pl-4 text-sm" value={formData.patientId} onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}>
          <option value="">-- Choose Patient --</option>
          {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground/80 uppercase">Modality *</Label>
          <select className="flex h-11 w-full rounded-xl border bg-muted/30 pl-4 text-sm" value={formData.modalityId} onChange={(e) => setFormData({ ...formData, modalityId: e.target.value })}>
            <option value="">-- Machine --</option>
            {modalities.map((m: any) => <option key={m.id} value={m.id}>{m.type} ({m.name})</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground/80 uppercase">Scan Name *</Label>
          <Input value={formData.scanName} onChange={(e) => setFormData({ ...formData, scanName: e.target.value })} />
        </div>
      </div>

      <Button onClick={handleBookSubmit} disabled={bookMutation.isPending} className="w-full bg-indigo-600">
        {bookMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Confirm Booking"}
      </Button>
    </div>
  );
}