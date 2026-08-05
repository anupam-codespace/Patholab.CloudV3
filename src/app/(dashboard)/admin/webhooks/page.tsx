// src/app/admin/webhooks/page.tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  X,
  RefreshCw,
    HardDriveDownload,
  Activity,
} from "lucide-react";

type WebhookLog = {
  id: string;
  source: string;
  event: string;
  payload: any;
  status: "PENDING" | "SUCCESS" | "FAILED" | "IGNORED";
  errorMessage: string | null;
  createdAt: string;
};

export default function DetailedWebhooksPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  // Manual Sync State
  const [syncOrderId, setSyncOrderId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/webhooks");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncOrderId) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch("/api/admin/sync-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: syncOrderId }),
      });
      const data = await res.json();

      if (res.ok) {
        setSyncMessage({
          type: "success",
          text: data.message || "Order synced successfully!",
        });
        setSyncOrderId("");
        fetchLogs();
      } else {
        setSyncMessage({
          type: "error",
          text: data.error || "Failed to sync order.",
        });
      }
    } catch (error) {
      setSyncMessage({
        type: "error",
        text: "Network error occurred during manual sync.",
      });
    } finally {
      setIsSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const StatusBadge = ({ status }: { status: WebhookLog["status"] }) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 size={14} /> Success
          </span>
        );
      case "FAILED":
        return (
          <span className="flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle size={14} /> Failed
          </span>
        );
      case "IGNORED":
        return (
          <span className="flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
            <AlertCircle size={14} /> Ignored
          </span>
        );
      default:
        return (
          <span className="flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  if (loading)
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center text-muted-foreground space-y-4">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="animate-pulse font-medium">
          Loading flight recorder data...
        </p>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            WooCommerce Webhook Ledger
          </h1>
          <p className="text-muted-foreground mt-1">
            Live monitoring of your SaaS payments and provisioning engine.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border text-foreground/80 rounded-lg hover:bg-muted/30 transition text-sm font-medium shadow-sm">
          <RefreshCw size={16} />
          Refresh Logs
        </button>
      </div>

      {/* Manual Sync Tool */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-end gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <HardDriveDownload size={16} className="text-primary" />
            Manual Order Sync
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            If a WooCommerce webhook was missed due to downtime, enter the Order
            ID here to force database provisioning.
          </p>
          <form
            onSubmit={handleManualSync}
            className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g., 10452"
              value={syncOrderId}
              onChange={(e) => setSyncOrderId(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 focus:outline-none transition-all text-sm"
            />
            <button
              type="submit"
              disabled={isSyncing || !syncOrderId}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isSyncing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Syncing...
                </>
              ) : (
                "Force Sync Order"
              )}
            </button>
          </form>
        </div>

        {/* Sync Status Message */}
        {syncMessage && (
          <div
            className={`px-4 py-3 rounded-lg border text-sm w-full md:w-auto md:max-w-md flex items-start gap-2 ${
              syncMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
            {syncMessage.type === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0" />
            )}
            <span className="leading-tight">{syncMessage.text}</span>
          </div>
        )}
      </div>

      {/* Webhooks Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Event Source</th>
                <th className="p-4">Status</th>
                <th className="p-4">Trace / Error Message</th>
                <th className="p-4 text-right">Raw Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <Activity size={32} className="text-slate-300 mb-3" />
                    <p>No webhook events logged yet. Waiting for orders...</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm text-foreground whitespace-nowrap">
                      {format(
                        new Date(log.createdAt),
                        "MMM d, yyyy • h:mm:ss a",
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {log.source || "WOOCOMMERCE"}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground mt-0.5">
                          {log.event}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="p-4 text-sm max-w-[250px]">
                      {log.errorMessage ? (
                        <span
                          className="text-red-600 font-medium line-clamp-2"
                          title={log.errorMessage}>
                          {log.errorMessage}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70 italic">
                          Clean execution
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedPayload(log.payload)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-blue-100 rounded-md transition-colors border border-blue-100">
                        <Eye size={14} />
                        View Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON PAYLOAD MODAL */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                  <span className="text-white font-mono text-xs">{"{ }"}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Raw Webhook Payload
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Unmodified JSON data received from source
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="p-1.5 text-muted-foreground/70 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-900 flex-1 custom-scrollbar">
              <pre className="text-[13px] text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-words">
                {JSON.stringify(selectedPayload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
