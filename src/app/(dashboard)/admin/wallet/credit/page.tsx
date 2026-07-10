"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Wallet,
  Building2,
  IndianRupee,
  CreditCard,
  FileText,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Type definition for our Lab dropdown
interface Lab {
  id: string;
  name: string;
  walletBalance: number;
}

export default function AdminWalletCreditPage() {
  const router = useRouter();

  const [labs, setLabs] = useState<Lab[]>([]);
  const [isFetchingLabs, setIsFetchingLabs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedLabId, setSelectedLabId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch labs when page loads
  useEffect(() => {
    const fetchLabs = async () => {
      try {
        // Adjust this endpoint to match your actual API route that returns all labs
        const res = await fetch("/api/admin/labs");
        if (res.ok) {
          const data = await res.json();
          setLabs(data.labs || []);
        } else {
          toast.error("Failed to load labs");
        }
      } catch (error) {
        toast.error("Network error while loading labs");
      } finally {
        setIsFetchingLabs(false);
      }
    };

    fetchLabs();
  }, []);

  const selectedLab = labs.find((l) => l.id === selectedLabId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLabId) return toast.error("Please select a lab.");
    if (!amount || Number(amount) <= 0)
      return toast.error("Please enter a valid amount.");

    setIsSubmitting(true);

    try {
      // The secure Super Admin API endpoint
      const response = await fetch("/api/admin/wallet/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId: selectedLabId,
          amount: Number(amount),
          paymentMethod,
          reference,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Successfully credited ₹${amount} to ${selectedLab?.name}`,
        );
        router.push("/admin/wallet"); // Redirect back to admin wallet overview
      } else {
        toast.error(data.message || "Failed to credit wallet.");
      }
    } catch (error) {
      toast.error("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/admin/wallet"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Wallet Management
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Credit Lab Wallet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manually add funds to a client's pay-as-you-go wallet.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* 1. Lab Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Select Target Lab
            </label>
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium text-foreground focus:border-indigo-500 focus:bg-card focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none"
              disabled={isFetchingLabs}>
              <option value="" disabled>
                {isFetchingLabs ? "Loading labs..." : "Select a lab..."}
              </option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name} (Current Bal: ₹{lab.walletBalance || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 2. Amount */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-slate-400" />
                Credit Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full h-11 rounded-xl border border-border bg-muted/30 pl-8 pr-4 text-sm font-bold text-foreground focus:border-indigo-500 focus:bg-card focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" />
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium text-foreground focus:border-indigo-500 focus:bg-card focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none">
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="PROMO">Promotional Credit</option>
              </select>
            </div>
          </div>

          {/* 4. Reference Number */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Reference / UTR Number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR1234567890"
              className="w-full h-11 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium text-foreground focus:border-indigo-500 focus:bg-card focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
            <p className="text-[11px] text-muted-foreground font-medium">
              Important for auditing and matching with your bank statement.
            </p>
          </div>

          {/* 5. Admin Notes */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Admin Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal notes here..."
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/30 p-4 text-sm font-medium text-foreground focus:border-indigo-500 focus:bg-card focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link href="/admin/wallet">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-11 px-6">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedLabId}
              className="rounded-xl h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Credit Wallet
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
