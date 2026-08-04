"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, CalendarRange, Clock, MapPin, Building2, ChevronRight, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function HomeVisitFinder() {
  const [activeTab, setActiveTab] = useState<"book" | "track">("book");
  const [pincode, setPincode] = useState("");
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Track state
  const [appointmentId, setAppointmentId] = useState("");
  const [phone, setPhone] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  const handleSearch = async () => {
    if (pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }
    setLoading(true);
    setLabs([]);
    try {
      const res = await fetch(`/api/public/find-labs?pincode=${pincode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search labs");
      setLabs(data.labs || []);
      if (data.labs?.length === 0) {
        toast.error("No service providers found for this pincode.");
      } else {
        toast.success(`Found ${data.labs.length} laboratories!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId.trim() || !phone.trim()) {
      setTrackError("Reference ID and Phone Number are required.");
      return;
    }
    setTrackLoading(true);
    setTrackError("");
    try {
      const res = await fetch(`/api/public/track-booking?appointmentId=${encodeURIComponent(appointmentId.trim())}&phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to locate booking.");
      }

      toast.success("Booking located! Redirecting to tracking status page...");
      router.push(`/book/${data.portalSlug}/status/${appointmentId.trim()}?phone=${encodeURIComponent(phone.trim())}`);
    } catch (err: any) {
      setTrackError(err.message || "An unexpected error occurred.");
      toast.error("Unable to locate booking.");
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 border border-slate-200/50 max-w-md mx-auto shadow-sm">
        <button
          onClick={() => setActiveTab("book")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-extrabold rounded-xl transition-all duration-300 ${
            activeTab === "book"
              ? "bg-white text-indigo-600 shadow-md scale-100"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          Book Visit
        </button>
        <button
          onClick={() => setActiveTab("track")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-extrabold rounded-xl transition-all duration-300 ${
            activeTab === "track"
              ? "bg-white text-indigo-600 shadow-md scale-100"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          Track Status
        </button>
      </div>

      {/* Booking Form View */}
      {activeTab === "book" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto bg-white p-2 rounded-2xl shadow-md border border-slate-100">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                className="w-full pl-11 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-sm font-semibold text-slate-800"
                placeholder="Enter 6-digit Pincode (e.g. 781001)"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="bg-indigo-600 text-white hover:bg-indigo-700 h-12 px-6 rounded-xl font-bold shadow-sm flex items-center gap-2 shrink-0 transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Find Laboratories
            </Button>
          </div>

          {/* Service Results List */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {labs.length > 0 ? (
              labs.map((lab) => (
                <div
                  key={lab.id}
                  className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top indicator bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 group-hover:bg-indigo-500 transition-colors duration-300" />
                  
                  <div className="space-y-2 mt-2">
                    <h3 className="font-black text-lg text-slate-900 group-hover:text-indigo-950 transition-colors flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                      {lab.name}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {lab.address}
                    </p>
                  </div>

                  <Button
                    className="w-full mt-5 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl h-11 flex items-center justify-center gap-1.5 transition-all duration-300 hover:shadow-sm"
                    onClick={() => router.push(`/book/${lab.portalSlug}`)}
                  >
                    Book Diagnostic Visit
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              !loading && (
                <div className="col-span-2 text-center py-10 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200/60 text-slate-400">
                  <p className="font-semibold text-sm">Enter your area pincode above to discover diagnostic providers.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Tracking Form View */}
      {activeTab === "track" && (
        <form onSubmit={handleTrack} className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Booking Reference ID
            </label>
            <Input
              required
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-sm font-semibold font-mono"
              placeholder="e.g. 1980bb74-b3d7-4b1f-b8fb..."
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Registered Phone Number
            </label>
            <Input
              required
              type="tel"
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white text-sm font-semibold"
              placeholder="Enter patient phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {trackError && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
              {trackError}
            </div>
          )}

          <Button
            type="submit"
            disabled={trackLoading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all duration-300"
          >
            {trackLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Finding Booking...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Track Booking Status
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            Check your confirmation auto-message/details for the Reference ID.
          </p>
        </form>
      )}
    </div>
  );
}
