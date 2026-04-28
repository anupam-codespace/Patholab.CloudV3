"use client";

import { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";

type PricingModalProps = {
  test: any;
  onClose: () => void;
  onSuccess: () => void;
};

export default function PricingOverrideModal({
  test,
  onClose,
  onSuccess,
}: PricingModalProps) {
  const [price, setPrice] = useState(test.effectivePrice);
  const [b2bPrice, setB2BPrice] = useState(test.effectiveB2BPrice);
  const [tat, setTat] = useState(test.effectiveTat);
  const [isActive, setIsActive] = useState(test.isActive);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/workspace/tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testTemplateId: test.id,
          price,
          b2bPrice,
          tat,
          isActive,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to update pricing override.");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800">Manage Test Pricing</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {test.code} • {test.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {test.isGlobal && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-xs flex gap-2 items-start">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>
                This is a Global Master test. Changes made here will only apply
                to <strong>your lab</strong> and will not affect other labs on
                the platform.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Patient Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                B2B / Agency Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={b2bPrice}
                onChange={(e) => setB2BPrice(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Turnaround Time (TAT)
            </label>
            <input
              type="text"
              placeholder="e.g., 24 Hours, 2 Days"
              value={tat}
              onChange={(e) => setTat(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
            />
            <div>
              <div className="text-sm font-medium text-slate-800">
                Test is Active
              </div>
              <div className="text-xs text-slate-500">
                Uncheck to hide this test from your reception billing desk.
              </div>
            </div>
          </label>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all">
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save size={16} /> Save Pricing
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
