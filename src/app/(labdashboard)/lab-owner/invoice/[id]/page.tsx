"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  Loader2,
  Printer,
  Download,
  ArrowLeft,
  Mail,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import toast from "react-hot-toast";

export default function InvoicePage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 1. Fetch Invoice Data
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/lab-owner/subscription/invoice/${id}`);
        if (!res.ok) throw new Error("Invoice not found");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading Invoice...</p>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="bg-red-100 p-4 rounded-full text-red-600">
          <Mail className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Invoice Not Found</h2>
        <Link href="/lab-owner/subscription">
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    );
  }

  // Calculations
  const subTotal = data.amount / 1.18;
  const taxAmount = data.amount - subTotal;
  const provider = data.providerDetails || {}; // Your System Config

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center print:bg-white print:p-0">
      {/* --- ACTION BAR (Hidden on Print) --- */}
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center print:hidden">
        <Link
          href="/lab-owner/subscription"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="bg-white hover:bg-slate-50">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* --- INVOICE PAPER --- */}
      <Card className="w-full max-w-4xl bg-white shadow-xl print:shadow-none print:border-none overflow-hidden">
        {/* Header Ribbon (Uses System Primary Color if available, else fallback) */}
        <div
          className="h-2 w-full print:bg-slate-900"
          style={{
            background: provider.primaryColor
              ? `linear-gradient(to right, ${provider.primaryColor}, ${provider.secondaryColor})`
              : "linear-gradient(to right, #2563eb, #7c3aed)",
          }}
        />

        <div className="p-8 md:p-12">
          {/* Header Section */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
            {/* LEFT: BILL FROM (Your SaaS Details) */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {provider.systemLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={provider.systemLogo}
                    alt="Logo"
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {provider.systemName ? provider.systemName[0] : "S"}
                  </div>
                )}
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {provider.systemName || "SaaS Provider"}
                </h1>
              </div>

              <div className="text-sm text-slate-500 leading-relaxed space-y-1">
                <p>{provider.systemAddress || "Address Not Configured"}</p>
                {provider.systemEmail && <p>Email: {provider.systemEmail}</p>}
                {provider.systemPhone && <p>Phone: {provider.systemPhone}</p>}
                {provider.gstNumber && (
                  <p className="font-medium text-slate-700">
                    GSTIN: {provider.gstNumber}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: INVOICE META */}
            <div className="text-right">
              <h2 className="text-4xl font-light text-slate-300 uppercase tracking-widest mb-2">
                Invoice
              </h2>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">
                  Invoice #{" "}
                  <span className="font-mono font-medium text-slate-900">
                    {data.invoiceNumber || data.id.slice(-8).toUpperCase()}
                  </span>
                </p>
                <p className="text-sm text-slate-500">
                  Date:{" "}
                  <span className="font-medium text-slate-900">
                    {format(
                      new Date(data.invoiceDate || data.createdAt),
                      "dd MMM, yyyy",
                    )}
                  </span>
                </p>
                <div className="mt-2">
                  <Badge
                    variant={
                      data.status === "SUCCESS" ? "default" : "destructive"
                    }
                    className={
                      data.status === "SUCCESS"
                        ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                        : ""
                    }>
                    {data.status === "SUCCESS" ? "PAID" : data.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* BILL TO SECTION (Lab Details) */}
          <div className="mb-10 bg-slate-50/50 p-6 rounded-lg border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Bill To
            </h3>
            <div className="text-slate-800">
              <p className="font-bold text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                {data.billingSnapshot?.labName ||
                  data.subscription?.lab?.name ||
                  "Valued Customer"}
              </p>
              <div className="text-sm text-slate-600 mt-2 space-y-1">
                <p>
                  {data.billingSnapshot?.billingAddress ||
                    data.subscription?.lab?.address ||
                    "Address not provided"}
                </p>
                <p>
                  {data.billingSnapshot?.state || data.subscription?.lab?.state}{" "}
                  -{" "}
                  {data.billingSnapshot?.pincode ||
                    data.subscription?.lab?.pincode}
                </p>
                {data.billingSnapshot?.gstNumber && (
                  <p className="font-medium text-slate-700 mt-2">
                    GSTIN: {data.billingSnapshot.gstNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="rounded-lg border border-slate-200 overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">Cycle</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Taxable Value
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">
                      {data.billingSnapshot?.planName ||
                        data.subscription?.plan?.displayName ||
                        "Subscription Plan"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      SaaS Subscription Services
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {data.billingSnapshot?.billingCycle ||
                      data.subscription?.plan?.billingCycle ||
                      "Monthly"}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {provider.currencySymbol || "₹"}
                    {subTotal.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {provider.currencySymbol || "₹"}
                    {subTotal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div className="flex justify-end mb-12">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Taxable Amount</span>
                <span>
                  {provider.currencySymbol || "₹"}
                  {subTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>GST ({provider.taxRate || 18}%)</span>
                <span>
                  {provider.currencySymbol || "₹"}
                  {taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-slate-200 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">
                  {provider.currencySymbol || "₹"}
                  {data.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 print:bg-transparent print:border-none print:p-0">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">
              Terms & Notes
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              This is a computer-generated invoice and does not require a
              signature. Payment ID: {data.razorpayPaymentId || "N/A"}.
              {provider.systemEmail
                ? `For billing support, contact ${provider.systemEmail}.`
                : ""}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
