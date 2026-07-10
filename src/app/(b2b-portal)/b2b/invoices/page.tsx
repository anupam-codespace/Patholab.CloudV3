"use client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Receipt } from "lucide-react";

export default function B2BInvoicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["b2b-invoices"],
    queryFn: async () => { const res = await fetch("/api/b2b/invoices"); if (!res.ok) throw new Error(); return res.json(); },
  });

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> B2B Invoices</h1>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice #</TableHead><TableHead>Patient</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.invoices?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices yet.</TableCell></TableRow>
              ) : (
                data?.invoices?.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                    <TableCell><div className="font-semibold">{inv.patient?.name || "—"}</div><div className="text-xs text-muted-foreground">{inv.patient?.patientId}</div></TableCell>
                    <TableCell className="text-sm">{inv.items?.length || 0} items</TableCell>
                    <TableCell className="font-bold">₹{Number(inv.grandTotal).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className={inv.paymentStatus === "PAID" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{inv.paymentStatus}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
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
