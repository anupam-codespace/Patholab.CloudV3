"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Activity, IndianRupee, FileCheck2, Clock, Download, Loader2 } from "lucide-react";
import Link from "next/link";
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
    toast.success("Downloading report...");
    window.open(`/api/workspace/reports/${testId}/pdf`, "_blank");
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <div className="p-8 text-destructive">Error loading dashboard. Please try again.</div>;
  }

  const { stats, recentPatients, agency } = data;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* WELCOME BANNER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Welcome back, {agency?.agencyName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is your referral overview and recent patient reports.
          <Badge variant="outline" className="ml-3 bg-primary/10 text-primary border-primary/20">
            {agency?.agencyTier || "Standard"} Tier
          </Badge>
        </p>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{stats?.totalReferrals}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reports</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{stats?.pendingReports}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Reports</CardTitle>
            <FileCheck2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{stats?.completedReports}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">₹{stats?.totalEarnings?.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* RECENT PATIENTS TABLE */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" /> Recent Patients
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/b2b/patients">View All</Link>
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
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No patients referred yet.</TableCell></TableRow>
              ) : (
                recentPatients?.map((test: any) => (
                  <TableRow key={test.id}>
                    <TableCell className="text-sm text-muted-foreground font-mono">{new Date(test.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">{test.patient.name}</div>
                      <div className="text-xs text-muted-foreground">{test.patient.age} Y / {test.patient.gender} • {test.patient.phone}</div>
                    </TableCell>
                    <TableCell><div className="font-medium text-foreground">{test.testName}</div></TableCell>
                    <TableCell>
                      {test.status === "COMPLETED" || test.status === "APPROVED" ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Completed</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Processing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant={test.status === "COMPLETED" || test.status === "APPROVED" ? "default" : "secondary"} size="sm"
                        disabled={test.status !== "COMPLETED" && test.status !== "APPROVED"}
                        onClick={() => handleDownloadReport(test.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        {test.status === "COMPLETED" || test.status === "APPROVED" ? "Download" : "Pending"}
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
