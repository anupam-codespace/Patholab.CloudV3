"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Navigation, CheckCircle2, XCircle, Search, MapPin, 
  Calendar, Clock, User, Phone, Loader2, AlertCircle, Eye 
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function HomeCollectionRequestsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [approveModal, setApproveModal] = useState<{ isOpen: boolean; request: any }>({ isOpen: false, request: null });
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; request: any }>({ isOpen: false, request: null });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  
  // Form state
  const [selectedPhlebotomist, setSelectedPhlebotomist] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // 1. FETCH PENDING REQUESTS
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["home-collection-requests"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/appointments/home-collection");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      // Only show requests that haven't been assigned to a trip yet, and aren't cancelled
      return json.appointments.filter((apt: any) => apt.tripId === null && apt.status !== "CANCELLED");
    }
  });

  // 2. FETCH AVAILABLE PHLEBOTOMISTS (For the Approval Dropdown)
  const { data: staff = [] } = useQuery({
    queryKey: ["available-phlebotomists"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/staff"); // Your existing staff API
      if (!res.ok) return [];
      const data = await res.json();
      // Filter strictly for active Phlebotomists
      return data.filter((s: any) => s.user.role === "PHLEBOTOMIST" && s.isActive);
    }
  });

  // 3. ACTION MUTATION (Hits the new Action API we built)
  const actionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/appointments/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error || "Action failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setApproveModal({ isOpen: false, request: null });
      setRejectModal({ isOpen: false, request: null });
      setSelectedPhlebotomist("");
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["home-collection-requests"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Filtering
  const filteredRequests = requests.filter((r: any) => 
    r.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.patient.phone.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Navigation className="w-8 h-8 text-indigo-600" /> 
            Collection Approvals
            <Badge className="ml-2 bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">
              {filteredRequests.length} Pending
            </Badge>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Review online bookings, assign field staff, or reject requests.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search patient name or phone..." 
            className="pl-9 bg-white shadow-sm rounded-xl border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* REQUESTS LIST */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
          <p className="font-bold tracking-widest uppercase text-xs">Loading Queue...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-bold text-slate-700">All Caught Up!</h3>
          <p className="text-slate-500 text-sm mt-1">There are no pending home collection requests.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((req: any) => (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-indigo-200 transition-colors">
              
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" /> {req.patient.name}
                    </h3>
                    <p className="text-sm font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                      <Phone className="w-3.5 h-3.5" /> {req.patient.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold uppercase text-[10px] tracking-wider">
                      {req.status === "PENDING_PAYMENT" ? "Payment Proof" : "Awaiting Approval"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      aria-label={`View ${req.patient.name}'s details`}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold">{format(new Date(req.appointmentDate), "MMM dd, yyyy")}</span>
                      <span className="text-slate-500 text-xs">{req.timeSlot}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block line-clamp-1 font-medium">{req.collectionAddress}</span>
                      <span className="text-slate-500 text-xs font-bold">PIN: {req.pincode}</span>
                    </div>
                  </div>
                </div>
                {req.transactionId && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Payment Submitted</p>
                        <p className="font-bold text-slate-900">UTR: {req.transactionId}</p>
                        {req.invoice?.grandTotal && (
                          <p className="text-xs font-medium text-slate-600">Amount: Rs. {Number(req.invoice.grandTotal)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full md:w-auto flex-row md:flex-col gap-2 shrink-0 md:pl-6 md:border-l border-slate-100">
                <Button 
                  onClick={() => setApproveModal({ isOpen: true, request: req })}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve & Assign
                </Button>
                <Button 
                  onClick={() => setRejectModal({ isOpen: true, request: req })}
                  variant="outline" 
                  className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl font-bold"
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject Request
                </Button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL: APPROVE & DISPATCH */}
      <Dialog open={approveModal.isOpen} onOpenChange={(val) => !val && setApproveModal({ isOpen: false, request: null })}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-emerald-500 p-6 text-white">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 opacity-80" /> Approve & Dispatch
            </DialogTitle>
            <DialogDescription className="text-emerald-50 mt-1 font-medium">
              Select an available Phlebotomist for {approveModal.request?.patient.name}'s visit.
            </DialogDescription>
          </div>
          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To Field Staff</label>
              <select 
                className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                value={selectedPhlebotomist}
                onChange={(e) => setSelectedPhlebotomist(e.target.value)}
              >
                <option value="">-- Select Phlebotomist --</option>
                {staff.map((s: any) => (
                  <option key={s.id} value={s.user.id}>{s.user.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setApproveModal({ isOpen: false, request: null })} className="rounded-xl">Cancel</Button>
              <Button 
                onClick={() => actionMutation.mutate({ 
                  action: "APPROVE", 
                  appointmentId: approveModal.request.id,
                  phlebotomistId: selectedPhlebotomist 
                })}
                disabled={!selectedPhlebotomist || actionMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 font-bold"
              >
                {actionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Dispatch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: REJECT & REFUND */}
      <Dialog open={rejectModal.isOpen} onOpenChange={(val) => !val && setRejectModal({ isOpen: false, request: null })}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-rose-500 p-6 text-white">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <AlertCircle className="w-6 h-6 opacity-80" /> Reject Request
            </DialogTitle>
            <DialogDescription className="text-rose-50 mt-1 font-medium">
              This will cancel the booking. Process any payment-gateway refund separately.
            </DialogDescription>
          </div>
          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Rejection</label>
              <Input 
                placeholder="e.g. Out of service area, No slots left..." 
                className="h-11 rounded-xl"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setRejectModal({ isOpen: false, request: null })} className="rounded-xl">Cancel</Button>
              <Button 
                onClick={() => actionMutation.mutate({ 
                  action: "REJECT", 
                  appointmentId: rejectModal.request.id,
                  rejectReason: rejectReason 
                })}
                disabled={!rejectReason || actionMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6 font-bold"
              >
                {actionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: PATIENT DETAILS */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg p-0 rounded-3xl overflow-hidden border-0 shadow-2xl">
          <div className="bg-slate-900 p-6 text-white">
            <DialogTitle className="text-xl font-black">Patient Profile</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Full details for this home collection request
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-black">
                {selectedRequest?.patient?.name?.charAt(0) || "P"}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedRequest?.patient?.name}</h3>
                <p className="text-sm text-slate-500 font-medium">Phone: {selectedRequest?.patient?.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gender</p>
                <p className="font-bold text-slate-900">{selectedRequest?.patient?.gender || "N/A"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pincode</p>
                <p className="font-bold text-slate-900">{selectedRequest?.pincode || selectedRequest?.patient?.pincode || "N/A"}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collection Address</p>
              <p className="font-medium text-slate-700 mt-1">
                {selectedRequest?.collectionAddress || selectedRequest?.patient?.address || "No address provided"}
              </p>
            </div>

            <Button onClick={() => setSelectedRequest(null)} className="w-full h-12 rounded-xl bg-slate-900 font-bold">
              Close View
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
