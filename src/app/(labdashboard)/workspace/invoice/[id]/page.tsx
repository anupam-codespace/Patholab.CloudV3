"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  Loader2,
  Printer,
  ArrowLeft,
  Mail,
  Building2,
  CheckCircle2,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InvoicePage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 1. Fetch Invoice Data
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/workspace/subscription/invoice/${id}`);
        if (!res.ok) throw new Error("Invoice not found");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Invoice Fetch Error:", e);
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-zinc-400 tracking-widest uppercase animate-pulse">
          Retrieving Document...
        </p>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200/50 flex flex-col items-center max-w-md text-center border border-zinc-100">
          <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-2">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
            Invoice Not Found
          </h2>
          <p className="text-zinc-500 text-sm mt-2 mb-6">
            We couldn't locate this billing document. It may have been removed
            or the link is invalid.
          </p>
          <Link href="/workspace/subscription" className="w-full">
            <Button className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold">
              Return to Billing
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // FIX: Safe Number Conversions for Prisma Decimals
  // ==========================================
  const provider = data.providerDetails || {};

  // Force Prisma string decimals into standard JS Numbers
  const totalAmount = Number(data.amount) || 0;
  const taxRatePercentage = Number(provider.taxRate) || 18; // Default 18% GST

  // Math: Total = SubTotal + (SubTotal * TaxRate)  =>  SubTotal = Total / (1 + TaxRate/100)
  const subTotal = totalAmount / (1 + taxRatePercentage / 100);
  const taxAmount = totalAmount - subTotal;

  // Safe Date Fallback
  const invoiceDate = data.invoiceDate
    ? new Date(data.invoiceDate)
    : data.createdAt
      ? new Date(data.createdAt)
      : new Date();

  return (
    <div className="min-h-screen bg-zinc-50/80 py-8 px-4 md:py-12 md:px-8 flex flex-col items-center print:bg-white print:p-0 print:block">
      {/* --- ACTION BAR (Hidden on Print) --- */}
      <div className="w-full max-w-4xl mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 print:hidden animate-in fade-in slide-in-from-top-4 duration-500">
        <Link
          href="/workspace/subscription"
          className="text-zinc-500 hover:text-zinc-900 flex items-center gap-2 text-sm font-bold transition-colors group bg-white border border-zinc-200 px-4 py-2.5 rounded-xl shadow-sm w-fit">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Return to Subscriptions
        </Link>
        <Button
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-500 text-white h-11 px-8 rounded-xl shadow-lg shadow-indigo-900/20 transition-all hover:-translate-y-0.5 font-bold w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" /> Print Document
        </Button>
      </div>

      {/* --- INVOICE PAPER --- */}
      <div className="w-full max-w-4xl bg-white shadow-2xl shadow-zinc-300/50 md:rounded-3xl border border-zinc-200 overflow-hidden print:shadow-none print:border-none print:rounded-none animate-in fade-in slide-in-from-bottom-8 duration-700 mx-auto">
        {/* Accent Top Bar */}
        <div
          className="h-3 w-full print:bg-zinc-900"
          style={{
            background: provider.primaryColor
              ? `linear-gradient(to right, ${provider.primaryColor}, ${provider.secondaryColor || provider.primaryColor})`
              : "linear-gradient(to right, #4f46e5, #312e81)",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        />

        <div className="p-6 sm:p-10 md:p-16">
          {/* HEADER ROW */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-zinc-100 pb-10 mb-10">
            {/* LEFT: Provider Details */}
            <div className="w-full md:w-1/2">
              <div className="flex items-center gap-4 mb-6">
                {provider.systemLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={provider.systemLogo}
                    alt="Logo"
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-inner">
                    {provider.systemName ? provider.systemName[0] : "S"}
                  </div>
                )}
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                  {provider.systemName || "SaaS Provider"}
                </h1>
              </div>

              <div className="text-sm text-zinc-500 leading-relaxed space-y-1.5 font-medium">
                <p className="max-w-xs">
                  {provider.systemAddress || "Address Not Configured"}
                </p>
                {provider.systemEmail && <p>{provider.systemEmail}</p>}
                {provider.systemPhone && <p>{provider.systemPhone}</p>}
                {provider.gstNumber && (
                  <p className="font-bold text-zinc-800 mt-2">
                    GSTIN: {provider.gstNumber}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: Invoice Meta */}
            <div className="w-full md:w-1/2 md:text-right flex flex-col md:items-end">
              <h2 className="text-4xl font-black text-zinc-200 uppercase tracking-widest mb-4">
                Invoice
              </h2>

              <div className="grid grid-cols-2 md:flex md:flex-col gap-4 md:gap-2 w-full md:w-auto text-left md:text-right">
                <div>
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-0.5">
                    Invoice Number
                  </p>
                  <p className="font-mono font-bold text-zinc-900">
                    {data.invoiceNumber ||
                      String(data.id).slice(-8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-0.5">
                    Date of Issue
                  </p>
                  <p className="font-bold text-zinc-900">
                    {format(invoiceDate, "dd MMM, yyyy")}
                  </p>
                </div>
                <div className="col-span-2 md:mt-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                      data.status === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                    style={{
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}>
                    {data.status === "SUCCESS" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    {data.status === "SUCCESS" ? "PAID" : data.status}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BILL TO SECTION */}
          <div
            className="mb-12 p-6 rounded-2xl bg-zinc-50 border border-zinc-100"
            style={{
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">
              Billed To
            </p>
            <div className="text-zinc-900">
              <p className="font-black text-xl flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-zinc-400" />
                {data.billingSnapshot?.billing?.company ||
                  data.subscription?.lab?.name ||
                  "Valued Customer"}
              </p>
              <div className="text-sm text-zinc-500 space-y-1 font-medium pl-7 max-w-sm">
                <p>
                  {data.billingSnapshot?.billing?.address_1 ||
                    data.subscription?.lab?.address ||
                    "Address not provided"}
                </p>
                <p>
                  {data.billingSnapshot?.billing?.state ||
                    data.subscription?.lab?.state}{" "}
                  -{" "}
                  {data.billingSnapshot?.billing?.postcode ||
                    data.subscription?.lab?.pincode}
                </p>
                {data.billingSnapshot?.meta_data?.find(
                  (m: any) => m.key === "gst_number",
                )?.value && (
                  <p className="font-bold text-zinc-800 pt-1">
                    GSTIN:{" "}
                    {
                      data.billingSnapshot.meta_data.find(
                        (m: any) => m.key === "gst_number",
                      ).value
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* LINE ITEMS TABLE */}
          <div className="mb-10 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="border-b-2 border-zinc-900">
                <tr>
                  <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Description
                  </th>
                  <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                    Billing Cycle
                  </th>
                  <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">
                    Taxable Value
                  </th>
                  <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="py-6 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0"
                        style={{
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}>
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 text-base">
                          {data.billingSnapshot?.line_items?.[0]?.name ||
                            data.subscription?.plan?.displayName ||
                            "Subscription Plan"}
                        </p>
                        <p className="text-xs font-medium text-zinc-500 mt-0.5">
                          SaaS Cloud Subscription License
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 text-center text-sm font-bold text-zinc-600">
                    {data.subscription?.plan?.billingCycle || "Monthly"}
                  </td>
                  <td className="py-6 text-right text-sm font-bold text-zinc-600">
                    <span className="text-zinc-400 font-normal mr-1">
                      {provider.currencySymbol || "₹"}
                    </span>
                    {subTotal.toFixed(2)}
                  </td>
                  <td className="py-6 text-right text-base font-black text-zinc-900">
                    <span className="text-zinc-400 font-normal mr-1">
                      {provider.currencySymbol || "₹"}
                    </span>
                    {subTotal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTALS COMPUTATION */}
          <div className="flex flex-col items-end mb-16">
            <div className="w-full sm:w-80 space-y-4">
              <div className="flex justify-between text-sm font-medium text-zinc-500">
                <span>Taxable Amount</span>
                <span className="font-bold text-zinc-800">
                  {provider.currencySymbol || "₹"} {subTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium text-zinc-500">
                <span>GST ({taxRatePercentage}%)</span>
                <span className="font-bold text-zinc-800">
                  {provider.currencySymbol || "₹"} {taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="h-0.5 w-full bg-zinc-100 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  Total Amount
                </span>
                <span className="text-3xl font-black text-indigo-600 tracking-tight">
                  <span className="text-xl text-indigo-400 font-bold mr-1">
                    {provider.currencySymbol || "₹"}
                  </span>
                  {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-8 pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">
                Transaction ID
              </p>
              <p className="text-xs font-mono font-bold text-zinc-600">
                {data.razorpayPaymentId ||
                  data.billingSnapshot?.transaction_id ||
                  "N/A"}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs font-bold text-zinc-500 italic">
                This is a computer-generated document. No signature required.
              </p>
              {provider.systemEmail && (
                <p className="text-xs font-medium text-zinc-400 mt-1">
                  Billing support:{" "}
                  <a
                    href={`mailto:${provider.systemEmail}`}
                    className="text-indigo-500 hover:underline">
                    {provider.systemEmail}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
