"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Download, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Users, 
  CreditCard, 
  BarChart3,
  Loader2,
  Activity,
  Wallet
} from "lucide-react";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { TestsChart } from "@/components/charts/TestsChart";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
      });
      const response = await fetch(`/api/reports?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  const handleExport = async (type: string) => {
    try {
      const response = await fetch(
        `/api/reports/export?type=${type}&from=${dateRange.from}&to=${dateRange.to}`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report-${dateRange.from}-to-${dateRange.to}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Compiling Analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                Reports & Analytics
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                Financial insights, test volume, and clinic performance.
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => handleExport("comprehensive")}
            className="w-full md:w-auto h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md shadow-indigo-500/25 font-bold transition-all duration-300 hover:-translate-y-0.5 shrink-0 px-6">
            <Download className="mr-2 h-4 w-4" />
            Export Full Report
          </Button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        
        {/* DATE RANGE SELECTOR */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center justify-center h-11 w-11 bg-indigo-50 rounded-xl shrink-0 hidden sm:flex">
               <Calendar className="h-5 w-5 text-indigo-500" />
            </div>
            
            {/* 🛠 FIXED: Switched to flex-col on mobile so inputs stack instead of squish */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-bold text-slate-600 w-full sm:w-[150px] shadow-sm"
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:block">To</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-bold text-slate-600 w-full sm:w-[150px] shadow-sm"
              />
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() =>
              setDateRange({
                from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
                to: new Date().toISOString().split("T")[0],
              })
            }
            className="w-full md:w-auto h-11 rounded-xl font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm transition-all">
            <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
            This Month
          </Button>
        </div>

        {/* SUMMARY METRICS CARDS */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Revenue */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
             <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-inner">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
             </div>
             <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                  {formatCurrency(reports?.summary?.revenue || 0)}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 truncate">
                  Across {reports?.summary?.invoices || 0} invoices
                </p>
             </div>
          </div>

          {/* Tests */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
             <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-inner">
                <Activity className="h-6 w-6 text-indigo-600" />
             </div>
             <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tests Completed</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                  {reports?.summary?.tests || 0}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 truncate">
                  Avg: {reports?.summary?.avgTestsPerDay || 0} / day
                </p>
             </div>
          </div>

          {/* Patients */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
             <div className="h-12 w-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 shadow-inner">
                <Users className="h-6 w-6 text-violet-600" />
             </div>
             <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Patients</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                  {reports?.summary?.newPatients || 0}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 truncate">
                  Total DB: {reports?.summary?.totalPatients || 0}
                </p>
             </div>
          </div>

          {/* Avg Invoice */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
             <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 shadow-inner">
                <CreditCard className="h-6 w-6 text-amber-600" />
             </div>
             <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg. Invoice</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                  {formatCurrency(reports?.summary?.avgInvoiceValue || 0)}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 truncate">
                  Revenue per invoice
                </p>
             </div>
          </div>
        </div>

        {/* CHARTS ROW */}
        <div className="grid gap-6 lg:grid-cols-2">
          {reports?.revenueData && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" /> Revenue Trend
              </h3>
              <RevenueChart data={reports.revenueData} showExpenses={false} variant="line" />
            </div>
          )}
          {reports?.testData && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" /> Test Volume Trend
              </h3>
              <TestsChart data={reports.testData} variant="bar" />
            </div>
          )}
        </div>

        {/* DETAILED LISTS ROW */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Top Tests */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Top Performing Tests</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Most frequently ordered tests by volume.</p>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
              {reports?.topTests?.length > 0 ? (
                reports.topTests.map((test: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4 min-w-0 pr-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-sm font-black text-indigo-600 shadow-sm">
                        #{index + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-800 truncate">{test.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900">{test.count} <span className="text-[10px] font-bold text-slate-500 uppercase">Tests</span></p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">
                        {formatCurrency(test.revenue)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                  <FileText className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-bold">No test data available.</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Payment Methods</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Revenue breakdown by payment type.</p>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
              {reports?.paymentMethods?.length > 0 ? (
                reports.paymentMethods.map((method: any) => (
                  <div key={method.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                         <Wallet className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">{method.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(method.amount)}</p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${method.percentage}%` }} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 w-8 text-right">
                          {method.percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                  <CreditCard className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-bold">No payment data available.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* INDIVIDUAL EXPORT OPTIONS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Export Specific Reports</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Download detailed modular reports in PDF format.</p>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Button 
                variant="outline" 
                onClick={() => handleExport("revenue")}
                className="h-12 rounded-xl bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center h-auto py-4 gap-2">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
                Revenue Report
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport("tests")}
                className="h-12 rounded-xl bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center h-auto py-4 gap-2">
                <FileText className="h-6 w-6 text-indigo-500" />
                Test Volume Report
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport("patients")}
                className="h-12 rounded-xl bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center h-auto py-4 gap-2">
                <Users className="h-6 w-6 text-violet-500" />
                Patient Demographics
              </Button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}