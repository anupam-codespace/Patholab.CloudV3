"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Activity,
  IndianRupee,
  FileCheck2,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

export default function B2BDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["b2b-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/b2b/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
  });

  const handleDownloadReport = (testId: string) => {
    // Implement your PDF download logic here (e.g., open in new tab or trigger jspdf)
    toast.success("Downloading report...");
    window.open(`/api/reports/download/${testId}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500">
        Error loading dashboard. Please try again.
      </div>
    );
  }

  const { stats, recentPatients, agency } = data;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* WELCOME BANNER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Welcome back, {agency?.agencyName}
        </h1>
        <p className="text-slate-500 mt-1">
          Here is your referral overview and recent patient reports.
          <Badge
            variant="outline"
            className="ml-3 bg-indigo-50 text-indigo-700 border-indigo-200">
            {agency?.agencyTier || "Standard"} Tier
          </Badge>
        </p>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Referrals
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.totalReferrals}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending Reports
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pendingReports}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Completed Reports
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats?.completedReports}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Earnings
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              ₹{stats?.totalEarnings?.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RECENT PATIENTS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-400" /> Recent Patients
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/b2b-portal/patients">View All</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient Details</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPatients?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-slate-500">
                    No patients referred yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentPatients?.map((test: any) => (
                  <TableRow key={test.id}>
                    <TableCell className="text-sm text-slate-500 font-mono">
                      {new Date(test.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        {test.patient.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {test.patient.age} Y / {test.patient.gender} •{" "}
                        {test.patient.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-700">
                        {test.testName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {test.status === "COMPLETED" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Completed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200">
                          Processing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={
                          test.status === "COMPLETED" ? "default" : "secondary"
                        }
                        size="sm"
                        disabled={test.status !== "COMPLETED"}
                        onClick={() => handleDownloadReport(test.id)}
                        className={
                          test.status === "COMPLETED"
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            : ""
                        }>
                        <Download className="h-4 w-4 mr-2" />
                        {test.status === "COMPLETED" ? "Download" : "Pending"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
