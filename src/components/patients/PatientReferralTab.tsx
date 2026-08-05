"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Stethoscope,
  Building2,
  Calculator,
  Plus,
  Link2,
} from "lucide-react";
import { getDoctors } from "@/actions/doctor-management";
import { getAgencies } from "@/actions/agency-management";
import toast from "react-hot-toast";

export function PatientReferralTab({
  patientId,
  labId,
}: {
  patientId?: string;
  labId?: string;
}) {
  const queryClient = useQueryClient();
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [linking, setLinking] = useState(false);

  const { data: doctors } = useQuery({
    queryKey: ["doctors-referral"],
    queryFn: async () => await getDoctors(),
  });
  const { data: agencies } = useQuery({
    queryKey: ["agencies-referral"],
    queryFn: async () => await getAgencies(),
  });

  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ["patient-commissions", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await fetch(
        `/api/workspace/patients/${patientId}/commissions`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.commissions || [];
    },
    enabled: !!patientId,
  });

  const linkReferral = async () => {
    if (!patientId) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/workspace/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctorId || null,
          agencyId: selectedAgencyId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to link referral");
      toast.success("Referral linked to patient");
      queryClient.invalidateQueries({
        queryKey: ["patient-detail", patientId],
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLinking(false);
    }
  };

  const calculateCommissions = async () => {
    if (!patientId) return;
    try {
      const res = await fetch(
        `/api/workspace/patients/${patientId}/calculate-commissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: selectedDoctorId || null,
            agencyId: selectedAgencyId || null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        data.message || "Commissions calculated and submitted to ledger",
      );
      queryClient.invalidateQueries({
        queryKey: ["patient-commissions", patientId],
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!doctors || !agencies)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Link Referral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" /> Referring Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full h-10 text-sm border border-slate-200 rounded-lg px-3 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20">
                <option value="">No Doctor (Self)</option>
                {doctors?.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({Number(doc.commissionRate || 0)}
                    {doc.commissionType === "PERCENTAGE" ? "%" : " Flat"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> B2B Agency
              </label>
              <select
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                className="w-full h-10 text-sm border border-slate-200 rounded-lg px-3 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20">
                <option value="">No Agency (Direct)</option>
                {agencies?.map((ag: any) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.agencyName} ({Number(ag.commissionRate || 0)}
                    {ag.commissionType === "PERCENTAGE" ? "%" : " Flat"})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={linkReferral}
              disabled={linking || (!selectedDoctorId && !selectedAgencyId)}
              variant="outline">
              {linking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}{" "}
              Link Referral
            </Button>
            <Button
              onClick={calculateCommissions}
              disabled={!selectedDoctorId && !selectedAgencyId}
              className="bg-primary">
              <Calculator className="h-4 w-4 mr-2" /> Calculate Commission &
              Submit to Ledger
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Commission Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCommissions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : commissions?.length === 0 ? (
            <p className="text-center py-8 text-slate-500 text-sm">
              No commissions yet. Link a referral and click "Calculate
              Commission" to generate.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Test</TableHead>
                  <TableHead className="text-xs">Referrer</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Base</TableHead>
                  <TableHead className="text-xs text-right">
                    Commission
                  </TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions?.map((comm: any) => (
                  <TableRow key={comm.id}>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(comm.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {comm.test?.testName || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {comm.doctor?.name || comm.agency?.agencyName || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {comm.type} ({Number(comm.rate || 0)})
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      ₹{Number(comm.test?.price || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-orange-600">
                      ₹{Number(comm.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge
                        variant="outline"
                        className={
                          comm.status === "PAID"
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-700"
                        }>
                        {comm.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
