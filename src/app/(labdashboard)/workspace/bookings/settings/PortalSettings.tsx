"use client";
import { useState } from "react";
import toast from "react-hot-toast";

export default function PortalSettings({
  initialSlug,
}: {
  initialSlug: string | null;
}) {
  const [isActive, setIsActive] = useState(!!initialSlug);
  const [slug, setSlug] = useState(initialSlug || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // If they turn it off, we send null to the database
      const finalSlug = isActive
        ? slug.toLowerCase().replace(/[^a-z0-9-]/g, "")
        : null;

      const res = await fetch("/api/workspace/settings/portal", {
        method: "PATCH",
        body: JSON.stringify({ portalSlug: finalSlug }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update portal settings");
      }

      toast.success(isActive ? "Portal is LIVE!" : "Portal has been disabled.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-xl border shadow-sm max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Public Booking Portal</h2>
      <p className="text-gray-500 mb-6 text-sm">
        Allow patients to book tests directly online. Claim your unique lab URL
        below.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          <span className="ml-3 text-sm font-medium text-gray-900">
            {isActive ? "Portal is Enabled" : "Portal is Disabled"}
          </span>
        </label>
      </div>

      {isActive && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Your Public URL
          </label>
          <div className="flex items-center">
            <span className="bg-gray-100 border border-r-0 rounded-l-md px-3 py-2 text-gray-500 text-sm">
              app.patholab.cloud/book/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., my-city-lab"
              className="flex-1 border p-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Use only letters, numbers, and hyphens.
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading || (isActive && !slug)}
        className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50">
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
