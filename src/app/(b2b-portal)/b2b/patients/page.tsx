"use client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users } from "lucide-react";

export default function B2BPatientsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["b2b-patients"],
    queryFn: async () => { const res = await fetch("/api/b2b/patients"); if (!res.ok) throw new Error(); return res.json(); },
  });

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> My Patients</h1>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Test</TableHead><TableHead>Status</TableHead><TableHead>Checked By</TableHead><TableHead>Approved By</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.tests?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No patients yet.</TableCell></TableRow>
              ) : (
                data?.tests?.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><div className="font-semibold">{t.patient.name}</div><div className="text-xs text-muted-foreground">{t.patient.patientId} • {t.patient.age}Y / {t.patient.gender}</div></TableCell>
                    <TableCell className="font-medium">{t.testName}</TableCell>
                    <TableCell><Badge variant="outline" className={t.status === "APPROVED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{t.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.checkedBy || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.approvedBy || "—"}</TableCell>
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
