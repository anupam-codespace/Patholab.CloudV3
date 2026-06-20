import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import { Building2, Mail, Phone, MapPin, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Import the client-side action buttons
import InvoiceActions from "./InvoiceActions";

export const dynamic = "force-dynamic";

// --- Formatter Utilities ---
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

export default async function WalletInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  // 1. Secure Authentication & Data Fetching
  const user = await getCurrentUser();
  if (!user || !user.labId) redirect("/login");

  const tx = await prisma.walletTransaction.findUnique({
    where: {
      id: params.id,
      labId: user.labId, // Enforce row-level security
    },
    include: {
      wallet: {
        include: {
          lab: true,
        },
      },
    },
  });

  if (!tx) {
    redirect("/workspace/wallet");
  }

  const lab = tx.wallet.lab;
  const isRecharge = tx.type === "RECHARGE" || tx.type === "REFUND";

  // ============================================================================
  // INVOICE MATH (Forward Calculation)
  // ============================================================================
  const dbAmount = Number(tx.amount); // Usable Wallet Credit (Subtotal)
  const closingBalance = Number(tx.closingBalance);

  let subtotal = dbAmount;
  let cgst = 0;
  let sgst = 0;
  let totalPaid = dbAmount;

  if (isRecharge) {
    const taxRate = 0.18; // 18% Total GST
    const totalTax = subtotal * taxRate;
    cgst = totalTax / 2; // 9% CGST
    sgst = totalTax / 2; // 9% SGST
    totalPaid = subtotal + totalTax; // Total charged via Razorpay
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ACTION BAR (Client Component) */}
        <InvoiceActions txId={tx.id} />

        {/* INVOICE PAPER WRAPPER */}
        <div
          id="invoice-printable-area"
          className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
          {/* Top Decorative Border */}
          <div
            className={`h-3 w-full ${isRecharge ? "bg-emerald-500" : "bg-rose-500"}`}
          />

          <div className="p-8 md:p-12 space-y-12">
            {/* HEADER: BILLED BY vs BILLED TO */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              {/* BILLED TO (The Client Lab) */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Billed To
                </p>
                <div className="flex items-center gap-3">
                  {lab.logo ? (
                    <img
                      src={lab.logo}
                      alt="Lab Logo"
                      className="h-16 w-16 object-contain rounded-xl border border-slate-100"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                      <Building2 className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      {lab.name}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Platform Partner
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 font-medium">
                  {lab.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />{" "}
                      {lab.address}, {lab.city} {lab.pincode}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> {lab.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" /> {lab.email}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-500 uppercase">
                    GSTIN:{" "}
                    <span className="text-slate-800">
                      {lab.gstNumber || "UNREGISTERED"}
                    </span>
                  </p>
                </div>
              </div>

              {/* INVOICE DETAILS & BILLED BY (Patholab.cloud) */}
              <div className="text-left md:text-right space-y-2">
                <h2 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">
                  Tax Invoice
                </h2>
                <div className="space-y-1 mt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Transaction ID
                  </p>
                  <p className="text-sm font-mono text-slate-900 bg-slate-50 p-1.5 rounded-md inline-block">
                    {tx.id.split("-")[0].toUpperCase()}-
                    {tx.id.split("-")[4].toUpperCase()}
                  </p>
                </div>
                <div className="space-y-1 mt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Date & Time
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {format(new Date(tx.createdAt), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>

                {/* ✅ EXACT REAL DETAILS UPDATED HERE ✅ */}
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Billed By
                  </p>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    Globizhub India Pvt Ltd.
                  </p>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed mt-1">
                    1st Floor, No 59, Nayanpur Rd,
                    <br />
                    GMC Ward Number 44, Ganeshguri,
                    <br />
                    Guwahati, Assam 781006
                  </p>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                    GSTIN:{" "}
                    <span className="text-slate-800">18AAHCG6385Q1ZN</span>
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  <Badge
                    variant="outline"
                    className={`${isRecharge ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"} font-black px-3 py-1 text-xs uppercase tracking-widest`}>
                    {tx.type} • SUCCESS
                  </Badge>
                </div>
              </div>
            </div>

            {/* BILLING TABLE WITH GST BREAKDOWN */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-widest">
                    <th className="py-4 px-6 w-2/3">Description / Service</th>
                    <th className="py-4 px-6 text-right">SAC Code</th>
                    <th className="py-4 px-6 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="py-6 px-6">
                      <p className="font-bold text-slate-900 text-base">
                        {tx.description || `Wallet ${tx.type}`}
                      </p>
                      <p className="text-sm font-medium text-slate-500 mt-1">
                        {isRecharge
                          ? "Prepaid wallet recharge for clinical software services."
                          : "Pay-as-you-go deduction for software usage."}
                      </p>
                    </td>
                    <td className="py-6 px-6 text-right font-medium text-slate-500 text-sm">
                      998314
                    </td>
                    <td
                      className={`py-6 px-6 text-right font-bold text-lg text-slate-800`}>
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TOTALS & GST BLOCK */}
              <div className="bg-slate-50 p-6 border-t border-slate-200 flex flex-col items-end space-y-2 text-sm text-slate-600">
                <div className="flex justify-between w-full md:w-[60%] lg:w-1/2">
                  <span className="font-semibold">
                    Subtotal (Wallet Credit):
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {isRecharge && (
                  <>
                    <div className="flex justify-between w-full md:w-[60%] lg:w-1/2">
                      <span className="font-semibold">CGST (9%):</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(cgst)}
                      </span>
                    </div>
                    <div className="flex justify-between w-full md:w-[60%] lg:w-1/2">
                      <span className="font-semibold">SGST (9%):</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(sgst)}
                      </span>
                    </div>
                  </>
                )}

                <div className="w-full md:w-[60%] lg:w-1/2 border-t border-slate-200/80 my-2" />

                <div
                  className={`flex justify-between w-full md:w-[60%] lg:w-1/2 text-xl font-black ${isRecharge ? "text-emerald-600" : "text-rose-600"}`}>
                  <span className="uppercase tracking-tight">
                    {isRecharge ? "Total Amount Paid:" : "Total Deducted:"}
                  </span>
                  <span>
                    {isRecharge ? "+" : "-"}
                    {formatCurrency(totalPaid)}
                  </span>
                </div>

                {/* Closing Ledger Balance */}
                <div className="flex justify-between w-full md:w-[60%] lg:w-1/2 text-xs font-bold text-slate-400 mt-2">
                  <span className="uppercase tracking-widest">
                    New Wallet Balance:
                  </span>
                  <span>{formatCurrency(closingBalance)}</span>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left text-xs font-medium text-slate-500">
              <p className="flex items-center justify-center md:justify-start gap-2">
                <Receipt className="w-4 h-4" />
                Computer generated tax invoice. No signature required.
              </p>
              <p>
                Powered by{" "}
                <span className="font-black text-slate-900">
                  Patholab.cloud
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
