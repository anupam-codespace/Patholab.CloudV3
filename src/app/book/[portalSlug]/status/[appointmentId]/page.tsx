"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { MessageSquare, PhoneCall, CheckCircle, Clock, MapPin, Calendar, Receipt } from "lucide-react";

const labels: Record<string, string> = {
  PENDING_PAYMENT: "Payment pending",
  SCHEDULED: "Request received — awaiting approval",
  ASSIGNED: "Approved — phlebotomist assigned",
  EN_ROUTE: "Phlebotomist is on the way",
  ARRIVED: "Phlebotomist has arrived",
  SAMPLE_COLLECTED: "Sample collected",
  COMPLETED: "Collection completed",
  CANCELLED: "Request cancelled",
};

export default function BookingStatusPage() {
  const { portalSlug, appointmentId } = useParams<{ portalSlug: string; appointmentId: string }>();
  const query = useSearchParams();
  const [phone, setPhone] = useState(query.get("phone") || "");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const res = await fetch(`/api/public/${portalSlug}/appointments/${appointmentId}?phone=${encodeURIComponent(phone)}`);
    const json = await res.json();
    if (!res.ok) return setError(json.error || "Unable to load booking.");
    setData(json.appointment);
  };

  useEffect(() => {
    if (!phone) return;
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, [phone, portalSlug, appointmentId]);

  // Construct WhatsApp URL with auto-generated message
  const whatsappPhone = data?.lab?.phone?.replace(/\D/g, "") || "";
  const appointmentDateFormatted = data?.appointmentDate
    ? new Date(data.appointmentDate).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  
  const autoMessage = `Hello ${data?.lab?.name || "Lab Admin"},

I have booked a home collection appointment and completed the payment. Please verify and confirm my booking.

Booking Details:
• Appointment Reference: ${data?.id}
• Patient Name: ${data?.patient?.name}
• Patient Phone: ${data?.patient?.phone || phone}
• Date of Visit: ${appointmentDateFormatted} (${data?.timeSlot || ""})
• Amount Paid: Rs. ${data?.invoice?.grandTotal || "N/A"}
• Transaction ID / UTR: ${data?.transactionId || "N/A"}

Please let me know once verified. Thank you!`;

  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(autoMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(autoMessage)}`;

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <Receipt className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-black text-slate-900">Home Collection Status</h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex gap-2">
          <input 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            required 
            placeholder="Registered phone number" 
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 focus:bg-white transition-all" 
          />
          <button className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white text-sm hover:bg-indigo-700 transition-colors shadow-sm">
            Track Status
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        {data && (
          <section className="space-y-5 animate-in fade-in duration-300">
            {/* Patient Header */}
            <div>
              <p className="text-lg font-black text-slate-900">Hello, {data.patient.name}</p>
              <p className="text-xs font-mono text-slate-400">Ref: {data.id}</p>
            </div>

            {/* Status Card */}
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 space-y-1">
              <p className="font-black text-indigo-900 text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                {labels[data.status] || data.status}
              </p>
              <p className="text-xs text-indigo-600 font-medium">
                Last updated: {new Date(data.updatedAt).toLocaleString()}
              </p>
            </div>

            {/* Visit Details */}
            <div className="grid gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-700">Scheduled Date & Time</span>
                  <span className="text-slate-500 font-medium">{appointmentDateFormatted} · {data.timeSlot}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-700">Collection Address</span>
                  <span className="text-slate-500 font-medium">{data.collectionAddress}, {data.pincode}</span>
                </div>
              </div>

              {data.trip?.phlebotomist && (
                <div className="flex items-start gap-3 border-t pt-3">
                  <PhoneCall className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-emerald-800">Assigned Phlebotomist</span>
                    <span className="text-slate-500 font-medium">
                      {data.trip.phlebotomist.name} ({data.trip.phlebotomist.phone})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* UPI Payment Receipt Details */}
            {data.collectionMode === "HOME_COLLECTION" && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-4">
                <div>
                  <h3 className="font-black text-emerald-950 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    UPI Payment Receipt
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Your payment details registered under this appointment.
                  </p>
                </div>

                <div className="bg-white border border-emerald-100/80 rounded-xl p-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Paid</span>
                    <span className="font-black text-slate-900">₹{data.invoice?.grandTotal || "0"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction ID / UTR</span>
                    <span className="font-mono font-bold text-slate-800 break-all">{data.transactionId || "Pending / Not Available"}</span>
                  </div>
                </div>

                {/* WhatsApp Support Share Option */}
                <div className="pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Share Receipt on WhatsApp
                  </a>
                  <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
                    Facing any issue with your payment? Click to automatically notify our team on WhatsApp.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
