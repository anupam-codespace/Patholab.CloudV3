"use client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function B2BReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["b2b-reports"],
    queryFn: async () => { const res = await fetch("/api/b2b/reports"); if (!res.ok) throw new Error(); return res.json(); },
  });

  const handleDownload = (testId: string) => {
    toast.success("Downloading report...");
    window.open(`/api/workspace/reports/${testId}/pdf`, "_blank");
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Reports</h1>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Report #</TableHead><TableHead>Patient</TableHead><TableHead>Test</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Download</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.reports?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reports available yet.</TableCell></TableRow>
              ) : (
                data?.reports?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reportNumber || r.id.substring(0, 8)}</TableCell>
                    <TableCell><div className="font-semibold">{r.test?.patient?.name}</div><div className="text-xs text-muted-foreground">{r.test?.patient?.patientId}</div></TableCell>
                    <TableCell className="font-medium">{r.test?.testName}</TableCell>
                    <TableCell><Badge variant="outline" className={r.status === "APPROVED" || r.status === "VERIFIED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleDownload(r.testId)} disabled={r.status !== "APPROVED" && r.status !== "VERIFIED"}>
                          <Download className="h-4 w-4 mr-1" /> Lab Report
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/api/b2b/reports/${r.testId}/pdf`, "_blank")} disabled={r.status !== "APPROVED" && r.status !== "VERIFIED"}>
                          <Download className="h-4 w-4 mr-1" /> On Letterhead
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
