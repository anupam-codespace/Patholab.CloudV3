"use client";

import { useEffect, useState } from "react";
import {
  Puzzle,
  Package,
  ShieldCheck,
  Database,
  Server,
  Activity,
  Users,
  Building2,
  HardDrive,
  Edit3,
  X,
} from "lucide-react";

type Subscription = {
  id: string;
  unlockedFeatures: string[];
  boosterBranches: number;
  boosterStaff: number;
  boosterStorage: number;
  lab: { id: string; name: string; labCode: string };
  plan: { name: string; displayName: string };
};

// The Master Catalog (Mapped to WooCommerce SKUs)
const ADDON_CATALOG = [
  {
    sku: "ADDON_INVENTORY",
    name: "Smart Inventory",
    icon: Package,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  {
    sku: "ADDON_RADIOLOGY",
    name: "Radiology / RIS",
    icon: Activity,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    sku: "ADDON_IOT",
    name: "Machine IoT Sync",
    icon: Server,
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
  {
    sku: "ADDON_B2B",
    name: "B2B Agency Portal",
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  {
    sku: "ADDON_AI",
    name: "AI Diagnostics",
    icon: Database,
    color: "text-rose-600",
    bg: "bg-rose-100",
  },
];

export default function AdminAddonsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleUpdateAddons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setIsSaving(true);

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
        setEditingSub(null);
        fetchSubscriptions(); // Refresh data
      } else {
        alert("Failed to update add-ons.");
      }
    } catch (error) {
      alert("Network error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeature = (featureSku: string) => {
    setEditingSub((prev: any) => {
      if (!prev) return prev;
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

  // Calculate Metrics
  const getFeatureCount = (sku: string) => {
    return subscriptions.filter((sub) =>
      (sub.unlockedFeatures || []).includes(sku),
    ).length;
  };

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center animate-pulse text-slate-500">
        Loading module distribution...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Puzzle className="text-blue-600" /> Module & Add-on Intelligence
        </h1>
        <p className="text-slate-500 mt-1">
          Monitor feature adoption and manually provision modules for specific
          labs.
        </p>
      </div>

      {/* 1. Add-on Metrics / Catalog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ADDON_CATALOG.map((addon) => {
          const activeCount = getFeatureCount(addon.sku);
          const Icon = addon.icon;
          return (
            <div
              key={addon.sku}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center transition hover:shadow-md">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${addon.bg} ${addon.color}`}>
                <Icon size={24} />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">
                {addon.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {addon.sku}
              </p>
              <div className="mt-4 py-1.5 px-3 bg-slate-50 rounded-lg w-full">
                <span className="text-lg font-bold text-slate-800">
                  {activeCount}
                </span>
                <span className="text-xs text-slate-500 ml-1">Active Labs</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Lab Assignment Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">
            Add-on Distribution Matrix
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-4 bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                  Laboratory
                </th>
                <th className="p-4">Base Plan</th>
                <th className="p-4">Unlocked Modules</th>
                <th className="p-4">Capacity Boosters</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="p-4 bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    <div className="font-semibold text-sm text-slate-800">
                      {sub.lab.name}
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      {sub.lab.labCode}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-semibold">
                      {sub.plan.displayName.replace("Patholab Cloud - ", "")}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(sub.unlockedFeatures || []).length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          None
                        </span>
                      ) : (
                        (sub.unlockedFeatures || []).map((sku) => {
                          const catalogItem = ADDON_CATALOG.find(
                            (c) => c.sku === sku,
                          );
                          return (
                            <span
                              key={sku}
                              title={sku}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catalogItem ? `${catalogItem.bg} ${catalogItem.color}` : "bg-gray-100 text-gray-600"}`}>
                              {catalogItem ? catalogItem.name : sku}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-3 text-xs text-slate-600">
                      {sub.boosterBranches > 0 && (
                        <span
                          className="flex items-center gap-1"
                          title="Extra Branches">
                          <Building2 size={12} /> +{sub.boosterBranches}
                        </span>
                      )}
                      {sub.boosterStaff > 0 && (
                        <span
                          className="flex items-center gap-1"
                          title="Extra Staff">
                          <Users size={12} /> +{sub.boosterStaff}
                        </span>
                      )}
                      {sub.boosterStorage > 0 && (
                        <span
                          className="flex items-center gap-1"
                          title="Extra Storage">
                          <HardDrive size={12} /> +{sub.boosterStorage}GB
                        </span>
                      )}
                      {sub.boosterBranches === 0 &&
                        sub.boosterStaff === 0 &&
                        sub.boosterStorage === 0 && (
                          <span className="text-slate-400 italic">
                            Standard Limits
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setEditingSub(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors">
                      <Edit3 size={14} />
                      Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. EDIT OVERRIDE MODAL */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">
                  Provision Overrides
                </h3>
                <p className="text-xs text-slate-500">
                  Editing access for {editingSub.lab.name}
                </p>
              </div>
              <button
                onClick={() => setEditingSub(null)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAddons} className="p-6 space-y-6">
              {/* Feature Toggles */}
              <div>
                <label className="font-semibold text-sm mb-3 block text-slate-800">
                  Unlock Modules
                </label>
                <div className="space-y-2.5">
                  {ADDON_CATALOG.map((feature) => {
                    const isUnlocked = (
                      editingSub.unlockedFeatures || []
                    ).includes(feature.sku);
                    return (
                      <label
                        key={feature.sku}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${isUnlocked ? "bg-blue-50/50 border-blue-200" : "hover:bg-slate-50 border-slate-200"}`}>
                        <input
                          type="checkbox"
                          checked={isUnlocked}
                          onChange={() => toggleFeature(feature.sku)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${feature.bg} ${feature.color}`}>
                          <feature.icon size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {feature.name}
                        </span>
                        {isUnlocked && (
                          <ShieldCheck
                            size={18}
                            className="text-green-500 ml-auto"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Capacity Boosters */}
              <div>
                <label className="font-semibold text-sm mb-3 block text-slate-800">
                  Add Capacity Boosters
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Extra Branches
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingSub.boosterBranches}
                      onChange={(e) =>
                        setEditingSub({
                          ...editingSub,
                          boosterBranches: Number(e.target.value),
                        })
                      }
                      className="w-full border-slate-300 rounded-md py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Extra Staff
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingSub.boosterStaff}
                      onChange={(e) =>
                        setEditingSub({
                          ...editingSub,
                          boosterStaff: Number(e.target.value),
                        })
                      }
                      className="w-full border-slate-300 rounded-md py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Storage (GB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingSub.boosterStorage}
                      onChange={(e) =>
                        setEditingSub({
                          ...editingSub,
                          boosterStorage: Number(e.target.value),
                        })
                      }
                      className="w-full border-slate-300 rounded-md py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-5 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {isSaving ? "Saving..." : "Save Overrides"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
