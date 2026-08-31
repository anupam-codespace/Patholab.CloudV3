"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, MapPin, Plus, Trash2, Building2, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface ServiceArea {
  id: string;
  pincode: string;
  areaName: string | null;
  deliveryFee: number;
  isActive: boolean;
  branch: { id: string; name: string };
}

export default function ServiceAreasPage() {
  const queryClient = useQueryClient();
  const [branches, setBranches] = useState<any[]>([]);
  const [newArea, setNewArea] = useState({
    branchId: "",
    pincode: "",
    areaName: "",
    deliveryFee: "0",
  });

  // Fetch service areas
  const { data, isLoading } = useQuery<{ serviceAreas: ServiceArea[] }>({
    queryKey: ["service-areas"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/service-areas");
      if (!res.ok) throw new Error("Failed to load service areas");
      return res.json();
    },
  });

  // Fetch branches (for the dropdown)
  const { data: labData } = useQuery<any>({
    queryKey: ["lab-settings-for-branches"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // ✅ v3.2.4.3 FIX: Move setBranches into useEffect — calling setState during
  // render triggers "Too many re-renders. React limits the number of renders
  // to prevent an infinite loop." The old code did:
  //   if (labData?.lab?.branches && branches.length === 0) setBranches(...)
  // directly in the component body, which re-renders → re-evaluates → re-sets.
  useEffect(() => {
    if (labData?.lab?.branches && branches.length === 0) {
      setBranches(labData.lab.branches);
    }
  }, [labData, branches.length]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newArea.branchId || !newArea.pincode) {
        throw new Error("Branch and Pincode are required");
      }
      const res = await fetch("/api/workspace/service-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: newArea.branchId,
          pincode: newArea.pincode,
          areaName: newArea.areaName || undefined,
          deliveryFee: Number(newArea.deliveryFee) || 0,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Service area added");
      setNewArea({ branchId: "", pincode: "", areaName: "", deliveryFee: "0" });
      queryClient.invalidateQueries({ queryKey: ["service-areas"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspace/service-areas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast.success("Service area removed");
      queryClient.invalidateQueries({ queryKey: ["service-areas"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/workspace/service-areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-areas"] });
    },
  });

  const serviceAreas = data?.serviceAreas || [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Areas</h1>
        <p className="text-sm text-muted-foreground">
          Map pincodes to branches. When a patient books a home collection, the
          system checks if their pincode is in your service areas and auto-assigns
          the matching branch.
        </p>
      </div>

      {/* Add new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Service Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              You need at least one branch before adding service areas.{" "}
              <Link href="/workspace/settings" className="underline font-bold">
                Add a branch in Lab Settings →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <Label className="text-xs">Branch</Label>
                <Select
                  value={newArea.branchId}
                  onValueChange={(v) => setNewArea({ ...newArea, branchId: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.isMainBranch ? "(Main)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pincode</Label>
                <Input
                  value={newArea.pincode}
                  onChange={(e) => setNewArea({ ...newArea, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="e.g., 700001"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Area Name (optional)</Label>
                <Input
                  value={newArea.areaName}
                  onChange={(e) => setNewArea({ ...newArea, areaName: e.target.value })}
                  placeholder="e.g., Park Street"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Delivery Fee (₹)</Label>
                <Input
                  type="number"
                  value={newArea.deliveryFee}
                  onChange={(e) => setNewArea({ ...newArea, deliveryFee: e.target.value })}
                  className="h-9"
                />
              </div>
              <Button
                className="md:col-span-5"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !newArea.branchId || !newArea.pincode}
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Add Service Area
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Mapped Pincodes ({serviceAreas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            </div>
          ) : serviceAreas.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No service areas mapped yet</p>
              <p className="text-xs">Add a pincode above to start accepting home collection requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pincode</TableHead>
                    <TableHead className="text-xs">Area</TableHead>
                    <TableHead className="text-xs">Branch</TableHead>
                    <TableHead className="text-xs">Delivery Fee</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceAreas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-mono font-bold">{area.pincode}</TableCell>
                      <TableCell>{area.areaName || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {area.branch?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell>₹{area.deliveryFee.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={area.isActive ? "bg-green-50 text-green-700 cursor-pointer" : "bg-slate-50 text-slate-500 cursor-pointer"}
                          onClick={() => toggleMutation.mutate({ id: area.id, isActive: area.isActive })}
                        >
                          {area.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remove pincode ${area.pincode} from service areas?`)) {
                              deleteMutation.mutate(area.id);
                            }
                          }}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
