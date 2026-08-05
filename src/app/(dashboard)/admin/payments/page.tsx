"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CreditCard,
  Database,
  Building2,
  Users,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  IndianRupee,
} from "lucide-react";

export default function AdminPaymentsAndAddons() {
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [editingSub, setEditingSub] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, subRes] = await Promise.all([
        fetch("/api/admin/payments"),
        fetch("/api/admin/subscriptions"),
      ]);
      if (payRes.ok) setPayments((await payRes.json()).payments);
      if (subRes.ok) setSubscriptions((await subRes.json()).subscriptions);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateAddons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;

    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: editingSub.id,
          unlockedFeatures: editingSub.unlockedFeatures,
          boosterBranches: editingSub.boosterBranches,
          boosterStaff: editingSub.boosterStaff,
          boosterStorage: editingSub.boosterStorage,
        }),
      });

      if (res.ok) {
        alert("Add-ons updated successfully!");
        setEditingSub(null);
        fetchData();
      } else {
        alert("Failed to update add-ons.");
      }
    } catch (error) {
      alert("Network error.");
    }
  };

  const toggleFeature = (featureSku: string) => {
    setEditingSub((prev: any) => {
      const features = prev.unlockedFeatures || [];
      const isUnlocked = features.includes(featureSku);
      return {
        ...prev,
        unlockedFeatures: isUnlocked
          ? features.filter((f: string) => f !== featureSku)
          : [...features, featureSku],
      };
    });
  };

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center animate-pulse">
        Loading finance data...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* 1. PAYMENTS LEDGER */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="text-primary" /> Revenue Ledger
          </h2>
          <button
            onClick={fetchData}
            className="p-2 bg-card border rounded-md hover:bg-muted/30">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Invoice / Txn</th>
                <th className="p-4">Lab details</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    {format(new Date(pay.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="p-4 font-mono text-xs">
                    {pay.invoiceNumber || pay.id}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold">
                      {pay.subscription?.lab?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pay.subscription?.lab?.owner?.email}
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-green-700 flex items-center">
                    <IndianRupee size={14} /> {pay.amount}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      SUCCESS
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. ADD-ON MANAGER */}
      <section>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
          <Database className="text-purple-600" /> Subscription & Add-on Manager
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="bg-card p-5 rounded-xl shadow-sm border border-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{sub.lab.name}</h3>
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {sub.lab.labCode}
                  </span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-semibold">
                  {sub.plan.name}
                </span>
              </div>

              <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                <p>
                  <strong>Features Unlocked:</strong>{" "}
                  {sub.unlockedFeatures?.length || 0}
                </p>
                <div className="flex gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1">
                    <Building2 size={14} /> +{sub.boosterBranches} Branches
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> +{sub.boosterStaff} Staff
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive size={14} /> +{sub.boosterStorage}GB
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingSub(sub)}
                className="w-full mt-5 py-2 bg-slate-900 text-primary-foreground rounded-lg text-sm hover:bg-slate-800 transition">
                Manage Add-ons
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* EDIT MODAL */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
              <h3 className="font-bold">
                Manage Add-ons: {editingSub.lab.name}
              </h3>
              <button
                onClick={() => setEditingSub(null)}
                className="text-muted-foreground/70 hover:text-red-500">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAddons} className="p-6 space-y-6">
              {/* Feature Toggles */}
              <div>
                <label className="font-semibold text-sm mb-3 block">
                  Feature Modules
                </label>
                <div className="space-y-3">
                  {[
                    {
                      sku: "ADDON_INVENTORY",
                      label: "Smart Inventory & Reagents",
                    },
                    { sku: "ADDON_RADIOLOGY", label: "Radiology / RIS Module" },
                    { sku: "ADDON_IOT", label: "IoT Machine Integration" },
                    { sku: "ADDON_B2B", label: "B2B Agency Portal" },
                  ].map((feature) => (
                    <label
                      key={feature.sku}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                      <input
                        type="checkbox"
                        checked={(editingSub.unlockedFeatures || []).includes(
                          feature.sku,
                        )}
                        onChange={() => toggleFeature(feature.sku)}
                        className="w-5 h-5 rounded text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">
                        {feature.label}
                      </span>
                      {(editingSub.unlockedFeatures || []).includes(
                        feature.sku,
                      ) && (
                        <ShieldCheck
                          size={16}
                          className="text-green-500 ml-auto"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Capacity Boosters */}
              <div>
                <label className="font-semibold text-sm mb-3 block">
                  Capacity Boosters
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Extra Branches
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingSub.boosterBranches}
                      onChange={(e) =>
                        setEditingSub({
                          ...editingSub,
                          boosterBranches: e.target.value,
                        })
                      }
                      className="w-full mt-1 border rounded p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Extra Staff
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingSub.boosterStaff}
                      onChange={(e) =>
                        setEditingSub({
                          ...editingSub,
                          boosterStaff: e.target.value,
                        })
                      }
                      className="w-full mt-1 border rounded p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Extra Storage (GB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingSub.boosterStorage}
                      onChange={(e) =>
                        setEditingSub({
                          ...editingSub,
                          boosterStorage: e.target.value,
                        })
                      }
                      className="w-full mt-1 border rounded p-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-muted/30">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Save Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
