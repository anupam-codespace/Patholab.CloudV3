"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Printer, Thermometer } from "lucide-react";

export type InvoiceTemplateVariant =
  | "a4-full"
  | "a4-half"
  | "thermal"
  | "compact";

interface InvoiceTemplateProps {
  invoice: any;
  lab: any;
  patient: any;
  items: any[];
  tests?: any[];
}

const TEMPLATES: {
  id: InvoiceTemplateVariant;
  label: string;
  icon: any;
  pageSize: string;
}[] = [
  {
    id: "a4-full",
    label: "A4 Full",
    icon: FileText,
    pageSize: "A4 (210mm × 297mm)",
  },
  {
    id: "a4-half",
    label: "A4 Half",
    icon: Receipt,
    pageSize: "A4 Half (148mm × 210mm)",
  },
  {
    id: "thermal",
    label: "Thermal 80mm",
    icon: Thermometer,
    pageSize: "Thermal (80mm × 297mm)",
  },
  {
    id: "compact",
    label: "Compact",
    icon: Printer,
    pageSize: "Compact (80mm wide)",
  },
];

export function InvoiceTemplateSelector({
  invoice,
  lab,
  patient,
  items,
  tests,
}: InvoiceTemplateProps) {
  const [selected, setSelected] = useState<InvoiceTemplateVariant>("a4-full");

  return (
    <div>
      <div className="flex gap-2 mb-4 print:hidden flex-wrap">
        {TEMPLATES.map((t) => (
          <Button
            key={t.id}
            variant={selected === t.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelected(t.id)}
            className={selected === t.id ? "bg-primary" : ""}>
            <t.icon className="h-4 w-4 mr-1.5" />
            {t.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="ml-auto">
          <Printer className="h-4 w-4 mr-1.5" />
          Print
        </Button>
      </div>
      <div className="print:shadow-none">
        {selected === "a4-full" && (
          <A4FullTemplate
            invoice={invoice}
            lab={lab}
            patient={patient}
            items={items}
            tests={tests}
          />
        )}
        {selected === "a4-half" && (
          <A4HalfTemplate
            invoice={invoice}
            lab={lab}
            patient={patient}
            items={items}
            tests={tests}
          />
        )}
        {selected === "thermal" && (
          <ThermalTemplate
            invoice={invoice}
            lab={lab}
            patient={patient}
            items={items}
            tests={tests}
          />
        )}
        {selected === "compact" && (
          <CompactTemplate
            invoice={invoice}
            lab={lab}
            patient={patient}
            items={items}
            tests={tests}
          />
        )}
      </div>
    </div>
  );
}

const fmt = (n: any) => `₹${Number(n || 0).toFixed(2)}`;

function A4FullTemplate({
  invoice,
  lab,
  patient,
  items,
}: InvoiceTemplateProps) {
  return (
    <div
      className="bg-white shadow-lg mx-auto"
      style={{ width: "210mm", minHeight: "297mm", padding: "15mm" }}>
      <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
        <div className="flex items-start gap-4">
          {/* ✅ v3.2.3: Render lab logo if uploaded (Branding Settings → Logo) */}
          {lab?.logo ? (
            <img
              src={lab.logo}
              alt={lab?.name || "Lab Logo"}
              className="h-16 w-auto object-contain"
              style={{ maxHeight: 64 }}
              crossOrigin="anonymous"
            />
          ) : null}
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {lab?.name || "Laboratory"}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {lab?.address}{lab?.address && (lab?.city || lab?.state) ? ", " : ""}
              {lab?.city}{lab?.city && lab?.state ? ", " : ""}
              {lab?.state}
              {lab?.pincode ? ` - ${lab.pincode}` : ""}
            </p>
            <p className="text-xs text-slate-600">
              {lab?.phone ? `Phone: ${lab.phone}` : ""}
              {lab?.phone && lab?.email ? " | " : ""}
              {lab?.email ? `Email: ${lab.email}` : ""}
            </p>
            {lab?.licenseNumber && (
              <p className="text-xs text-slate-500">
                License: {lab.licenseNumber}
              </p>
            )}
            {lab?.gstNumber && (
              <p className="text-xs text-slate-500">GST: {lab.gstNumber}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-800">INVOICE</h2>
          <p className="text-sm font-mono text-slate-700">
            {invoice?.invoiceNumber}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(invoice?.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">
            Patient
          </h3>
          <p className="text-sm font-bold text-slate-800">{patient?.name}</p>
          <p className="text-xs text-slate-600">
            ID: {patient?.patientId} | {patient?.age} {patient?.ageUnit} /{" "}
            {patient?.gender}
          </p>
          {patient?.phone && (
            <p className="text-xs text-slate-600">Phone: {patient.phone}</p>
          )}
        </div>
        <div className="text-right">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">
            Payment
          </h3>
          <span
            className={`text-sm font-bold px-3 py-1 rounded ${invoice?.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
            {invoice?.paymentStatus}
          </span>
        </div>
      </div>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="bg-slate-100 border-y-2 border-slate-300">
            <th className="text-left p-2 font-bold">#</th>
            <th className="text-left p-2 font-bold">Test / Description</th>
            <th className="text-right p-2 font-bold">Price</th>
            <th className="text-right p-2 font-bold">Qty</th>
            <th className="text-right p-2 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="p-2 text-slate-500">{i + 1}</td>
              <td className="p-2 font-medium text-slate-800">
                {item.description}
              </td>
              <td className="p-2 text-right text-slate-700">
                {fmt(item.unitPrice)}
              </td>
              <td className="p-2 text-right text-slate-700">{item.quantity}</td>
              <td className="p-2 text-right font-bold text-slate-800">
                {fmt(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-medium">{fmt(invoice?.subtotal)}</span>
          </div>
          {Number(invoice?.discount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Discount:</span>
              <span className="font-medium text-red-600">
                - {fmt(invoice?.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax:</span>
            <span className="font-medium">{fmt(invoice?.totalTax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t-2 border-slate-300 pt-2">
            <span>Grand Total:</span>
            <span className="text-primary">{fmt(invoice?.grandTotal)}</span>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-4 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-500">
          This is a computer-generated invoice.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Thank you for choosing {lab?.name || "our laboratory"}
        </p>
      </div>
    </div>
  );
}

function A4HalfTemplate({
  invoice,
  lab,
  patient,
  items,
}: InvoiceTemplateProps) {
  return (
    <div
      className="bg-white shadow-lg mx-auto"
      style={{ width: "148mm", minHeight: "210mm", padding: "10mm" }}>
      <div className="text-center border-b border-primary pb-3 mb-4">
        {/* ✅ v3.2.3: Lab logo on A4 Half template */}
        {lab?.logo ? (
          <img
            src={lab.logo}
            alt={lab?.name || "Lab Logo"}
            className="h-12 w-auto object-contain mx-auto mb-2"
            crossOrigin="anonymous"
          />
        ) : null}
        <h1 className="text-xl font-bold text-primary">
          {lab?.name || "Laboratory"}
        </h1>
        <p className="text-[10px] text-slate-600">
          {lab?.address}{lab?.address && lab?.city ? ", " : ""}{lab?.city}{lab?.pincode ? ` - ${lab.pincode}` : ""}{lab?.phone ? ` | Ph: ${lab.phone}` : ""}
        </p>
      </div>
      <div className="flex justify-between text-xs mb-3">
        <div>
          <p className="font-bold">{patient?.name}</p>
          <p className="text-slate-500">
            ID: {patient?.patientId} | {patient?.age}Y / {patient?.gender}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold">{invoice?.invoiceNumber}</p>
          <p className="text-slate-500">
            {new Date(invoice?.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
      </div>
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="text-left p-1.5">Test</th>
            <th className="text-right p-1.5">Price</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item, i) => (
            <tr key={i} className="border-b border-slate-50">
              <td className="p-1.5">{item.description}</td>
              <td className="p-1.5 text-right">{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <div className="w-40 space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{fmt(invoice?.subtotal)}</span>
          </div>
          {Number(invoice?.discount) > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{fmt(invoice?.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1">
            <span>Total:</span>
            <span className="text-primary">{fmt(invoice?.grandTotal)}</span>
          </div>
        </div>
      </div>
      <div className="text-center text-[10px] text-slate-400 mt-8">
        Computer generated • {lab?.name}
      </div>
    </div>
  );
}

function ThermalTemplate({
  invoice,
  lab,
  patient,
  items,
}: InvoiceTemplateProps) {
  return (
    <div
      className="bg-white shadow-lg mx-auto font-mono"
      style={{ width: "80mm", padding: "5mm" }}>
      <div className="text-center mb-3">
        {/* ✅ v3.2.3: Lab logo on Thermal template */}
        {lab?.logo ? (
          <img
            src={lab.logo}
            alt={lab?.name || "Lab Logo"}
            className="h-10 w-auto object-contain mx-auto mb-1"
            crossOrigin="anonymous"
          />
        ) : null}
        <h1 className="text-base font-bold">{lab?.name || "Laboratory"}</h1>
        <p className="text-[9px] text-slate-600">
          {lab?.address}{lab?.address && lab?.city ? ", " : ""}{lab?.city}{lab?.pincode ? ` - ${lab.pincode}` : ""}
        </p>
        {lab?.phone ? <p className="text-[9px] text-slate-600">Ph: {lab.phone}</p> : null}
      </div>
      <div className="border-t border-b border-dashed border-slate-300 py-2 mb-2 text-[10px]">
        <div className="flex justify-between">
          <span>Invoice:</span>
          <span className="font-bold">{invoice?.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>
            {new Date(invoice?.createdAt).toLocaleDateString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Patient:</span>
          <span className="font-bold">{patient?.name}</span>
        </div>
        <div className="flex justify-between">
          <span>ID:</span>
          <span>{patient?.patientId}</span>
        </div>
      </div>
      <div className="text-[10px]">
        <div className="flex font-bold border-b border-dashed border-slate-300 pb-1 mb-1">
          <span className="flex-1">Test</span>
          <span className="text-right">Amount</span>
        </div>
        {items?.map((item, i) => (
          <div
            key={i}
            className="flex border-b border-dotted border-slate-100 py-0.5">
            <span className="flex-1 truncate">{item.description}</span>
            <span className="text-right">{fmt(item.total)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-slate-300 mt-2 pt-2 text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{fmt(invoice?.subtotal)}</span>
        </div>
        {Number(invoice?.discount) > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{fmt(invoice?.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>{fmt(invoice?.grandTotal)}</span>
        </div>
      </div>
      <div className="text-center text-[9px] text-slate-500 mt-4">
        <p>*** {invoice?.paymentStatus} ***</p>
        <p>Thank you!</p>
        <p>{lab?.name}</p>
      </div>
    </div>
  );
}

function CompactTemplate({
  invoice,
  lab,
  patient,
  items,
}: InvoiceTemplateProps) {
  return (
    <div
      className="bg-white shadow-lg mx-auto"
      style={{ width: "80mm", padding: "3mm" }}>
      <div className="text-center mb-2">
        {/* ✅ v3.2.3: Lab logo on Compact template */}
        {lab?.logo ? (
          <img
            src={lab.logo}
            alt={lab?.name || "Lab Logo"}
            className="h-8 w-auto object-contain mx-auto mb-1"
            crossOrigin="anonymous"
          />
        ) : null}
        <h1 className="text-sm font-bold text-primary">{lab?.name || "Lab"}</h1>
        <p className="text-[8px] text-slate-500">
          {lab?.phone ? lab.phone : ""}{lab?.phone && lab?.city ? " | " : ""}{lab?.city ? lab.city : ""}
        </p>
      </div>
      <div className="text-[10px] mb-2 flex justify-between">
        <span>{invoice?.invoiceNumber}</span>
        <span>{new Date(invoice?.createdAt).toLocaleDateString("en-IN")}</span>
      </div>
      <div className="text-[10px] mb-1">
        Patient: {patient?.name} ({patient?.patientId})
      </div>
      <div className="border-t border-slate-300 pt-1">
        {items?.map((item, i) => (
          <div key={i} className="flex text-[10px] justify-between py-0.5">
            <span className="truncate flex-1">{item.description}</span>
            <span>{fmt(item.total)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-300 mt-1 pt-1 text-[11px] font-bold flex justify-between">
        <span>TOTAL</span>
        <span className="text-primary">{fmt(invoice?.grandTotal)}</span>
      </div>
      <div className="text-center text-[8px] text-slate-400 mt-2">
        {invoice?.paymentStatus} • Thank you
      </div>
    </div>
  );
}
