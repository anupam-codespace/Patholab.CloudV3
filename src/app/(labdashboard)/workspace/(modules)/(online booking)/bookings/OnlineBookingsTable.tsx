"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function OnlineBookingsTable() {
  const queryClient = useQueryClient();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // 1. Fetch Bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["online-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/appointments/online");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // 2. Mutation for Dispatch/Collect Actions
  const actionMutation = useMutation({
    mutationFn: async ({ appointmentId, action, phlebotomistId }: any) => {
      const res = await fetch("/api/workspace/appointments/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, action, phlebotomistId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online-bookings"] });
      toast.success("Action processed successfully!");
      setAssigningId(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
      setAssigningId(null);
    }
  });

  if (isLoading) return <div className="p-8 text-center flex items-center justify-center"><Loader2 className="animate-spin" /> Loading...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-lg">Online Appointments</h2>
        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
          {bookings?.length || 0} Total
        </span>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="p-4">Patient</th>
            <th className="p-4">Tests</th>
            <th className="p-4">Mode</th>
            <th className="p-4">Date</th>
            <th className="p-4">Status</th>
            <th className="p-4">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {bookings?.map((booking: any) => (
            <tr key={booking.id} className="hover:bg-gray-50">
              <td className="p-4">
                <p className="font-bold">{booking.patient.name}</p>
                <p className="text-xs text-gray-500">{booking.patient.phone}</p>
              </td>
              <td className="p-4">{booking.tests.map((t: any) => t.testName).join(", ")}</td>
              <td className="p-4">{booking.collectionMode.replace("_", " ")}</td>
              <td className="p-4">{format(new Date(booking.appointmentDate), "dd MMM")}</td>
              <td className="p-4">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  {booking.status.replace("_", " ")}
                </span>
              </td>
              <td className="p-4 space-x-2">
                {booking.status === "SCHEDULED" && booking.collectionMode === "HOME_COLLECTION" && (
                  <button 
                    onClick={() => {
                      const phlebId = prompt("Enter Phlebotomist ID:");
                      if (phlebId) {
                        setAssigningId(booking.id);
                        actionMutation.mutate({ appointmentId: booking.id, action: "APPROVE", phlebotomistId: phlebId });
                      }
                    }}
                    disabled={assigningId === booking.id}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {assigningId === booking.id ? "Assigning..." : "Assign Trip"}
                  </button>
                )}
                
                {booking.status === "SCHEDULED" && booking.collectionMode === "LAB_VISIT" && (
                  <button 
                    onClick={() => actionMutation.mutate({ appointmentId: booking.id, action: "COLLECT" })}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700"
                  >
                    Collect
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}