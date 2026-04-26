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
    // Auto-refresh every 30 seconds to catch live WooCommerce orders
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatusBadge = ({ status }: { status: WebhookLog["status"] }) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 size={14} /> Success
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} /> Failed
          </span>
        );
      case "IGNORED":
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            <AlertCircle size={14} /> Ignored
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 animate-pulse">
        Loading flight recorder data...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            WooCommerce Webhook Ledger
          </h1>
          <p className="text-slate-500 mt-1">
            Live monitoring of your SaaS payments and provisioning engine.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          Refresh Logs
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
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
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No webhook events logged yet. Waiting for orders...
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-800 whitespace-nowrap">
                      {format(
                        new Date(log.createdAt),
                        "MMM d, yyyy • h:mm:ss a",
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {log.source}
                        </span>
                        <span className="font-mono text-xs text-slate-500 mt-0.5">
                          {log.event}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="p-4 text-sm max-w-xs truncate">
                      {log.errorMessage ? (
                        <span
                          className="text-red-600 font-medium"
                          title={log.errorMessage}>
                          {log.errorMessage}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          Clean execution
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedPayload(log.payload)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">
                Raw Webhook Payload
              </h3>
              <button
                onClick={() => setSelectedPayload(null)}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-900 flex-1">
              <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-words">
                {JSON.stringify(selectedPayload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
