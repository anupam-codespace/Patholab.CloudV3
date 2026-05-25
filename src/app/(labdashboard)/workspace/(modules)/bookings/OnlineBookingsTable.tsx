"use client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function OnlineBookingsTable() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["online-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/appointments/online");
      return res.json();
    },
  });

  if (isLoading) return <div>Loading bookings...</div>;

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
            <th className="p-4">Tests Ordered</th>
            <th className="p-4">Type</th>
            <th className="p-4">Schedule</th>
            <th className="p-4">Payment</th>
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
              <td className="p-4">
                {booking.tests.map((t: any) => t.testName).join(", ")}
              </td>
              <td className="p-4">
                {booking.collectionMode === "HOME_COLLECTION" ? (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    Home Collection
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                    Lab Visit
                  </span>
                )}
              </td>
              <td className="p-4">
                <p>
                  {format(new Date(booking.appointmentDate), "dd MMM yyyy")}
                </p>
                <p className="text-xs text-gray-500">{booking.timeSlot}</p>
              </td>
              <td className="p-4">
                <p className="font-medium">₹{booking.invoice?.grandTotal}</p>
                <p
                  className={`text-xs font-bold ${booking.invoice?.paymentStatus === "PAID" ? "text-green-600" : "text-orange-500"}`}>
                  {booking.invoice?.paymentStatus}
                </p>
              </td>
              <td className="p-4">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs">
                  {booking.status.replace("_", " ")}
                </span>
              </td>
              <td className="p-4">
                {/* Action Buttons based on status */}
                {booking.status === "SCHEDULED" &&
                  booking.collectionMode === "HOME_COLLECTION" && (
                    <button className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">
                      Assign Trip
                    </button>
                  )}
                {booking.status === "SCHEDULED" &&
                  booking.collectionMode === "LAB_VISIT" && (
                    <button className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                      Collect Sample
                    </button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {bookings?.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No online bookings yet.
        </div>
      )}
    </div>
  );
}
