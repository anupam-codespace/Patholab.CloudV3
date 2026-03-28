// FILE: src/app/(labdashboard)/lab-owner/reports/page.tsx
// Lab Reports Dashboard
// ==========================================
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Calendar, FileText, TrendingUp } from "lucide-react";
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
    return <div className="text-center py-12">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            View detailed reports and insights
          </p>
        </div>
        <Button variant="outline" onClick={() => handleExport("comprehensive")}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDateRange({
                  from: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1,
                  )
                    .toISOString()
                    .split("T")[0],
                  to: new Date().toISOString().split("T")[0],
                })
              }>
              This Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reports?.summary?.revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports?.summary?.invoices || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tests Completed
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.summary?.tests || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {reports?.summary?.avgTestsPerDay || 0}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.summary?.newPatients || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {reports?.summary?.totalPatients || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reports?.summary?.avgInvoiceValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per invoice</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {reports?.revenueData && (
          <RevenueChart
            data={reports.revenueData}
            showExpenses={false}
            variant="line"
          />
        )}
        {reports?.testData && (
          <TestsChart data={reports.testData} variant="bar" />
        )}
      </div>

      {/* Detailed Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Tests</CardTitle>
            <CardDescription>Most frequently ordered tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports?.topTests?.map((test: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{test.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{test.count} tests</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(test.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Revenue by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports?.paymentMethods?.map((method: any) => (
                <div
                  key={method.name}
                  className="flex items-center justify-between">
                  <span className="text-sm">{method.name}</span>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(method.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {method.percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
          <CardDescription>
            Download detailed reports in various formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" onClick={() => handleExport("revenue")}>
              <Download className="mr-2 h-4 w-4" />
              Revenue Report
            </Button>
            <Button variant="outline" onClick={() => handleExport("tests")}>
              <Download className="mr-2 h-4 w-4" />
              Test Report
            </Button>
            <Button variant="outline" onClick={() => handleExport("patients")}>
              <Download className="mr-2 h-4 w-4" />
              Patient Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
