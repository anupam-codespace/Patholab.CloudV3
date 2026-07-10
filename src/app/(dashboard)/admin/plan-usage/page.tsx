"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Edit2,
  Save,
  X,
  Check,
  Shield,
  Users,
  Database,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import toast from "react-hot-toast";

export default function PlanManagementPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // 1. Fetch Plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/plan-usage");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // 2. Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/plan-usage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Plan updated successfully");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
    onError: () => toast.error("Failed to update plan"),
  });

  const handleEdit = (plan: any) => {
    setEditingId(plan.id);
    setEditForm(plan);
  };

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  const handleChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading) return <PlansSkeleton />;

  return (
    <div className="p-8 space-y-8 bg-muted/30 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Plan & Limits Control
        </h1>
        <p className="text-muted-foreground">
          Manage limits, pricing, and feature access for all SaaS tiers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan: any) => {
          const isEditing = editingId === plan.id;
          const current = isEditing ? editForm : plan;

          return (
            <Card
              key={plan.id}
              className={`border-t-4 ${plan.isActive ? "border-t-blue-500" : "border-t-slate-300 opacity-75"}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    {isEditing ? (
                      <Input
                        value={current.displayName}
                        onChange={(e) =>
                          handleChange("displayName", e.target.value)
                        }
                        className="font-bold text-lg h-8 w-40"
                      />
                    ) : (
                      <CardTitle className="text-xl flex items-center gap-2">
                        {plan.displayName}
                        {!plan.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                    )}
                    <CardDescription className="mt-1">
                      {plan._count.subscriptions} Active Labs
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-lg px-3 py-1 bg-muted/30">
                    ₹{plan.price}
                    <span className="text-xs text-muted-foreground/70 font-normal ml-1">
                      /mo
                    </span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* LIMITS SECTION */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                    Usage Limits
                  </h4>

                  <LimitRow
                    label="Monthly Tests"
                    icon={Activity}
                    value={current.maxTestsPerMonth}
                    isEditing={isEditing}
                    onChange={(v) => handleChange("maxTestsPerMonth", v)}
                  />
                  <LimitRow
                    label="Storage (GB)"
                    icon={Database}
                    value={current.maxStorageGB}
                    isEditing={isEditing}
                    onChange={(v) => handleChange("maxStorageGB", v)}
                    step={0.1}
                  />
                  <LimitRow
                    label="Staff Accounts"
                    icon={Shield}
                    value={current.maxStaff}
                    isEditing={isEditing}
                    onChange={(v) => handleChange("maxStaff", v)}
                  />
                  <LimitRow
                    label="Total Patients"
                    icon={Users}
                    value={current.maxPatientsTotal}
                    isEditing={isEditing}
                    onChange={(v) => handleChange("maxPatientsTotal", v)}
                  />
                </div>

                {/* FEATURES TOGGLES */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                    Feature Flags
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <ToggleRow
                      label="Inventory"
                      checked={current.hasInventory}
                      isEditing={isEditing}
                      onChange={(v) => handleChange("hasInventory", v)}
                    />
                    <ToggleRow
                      label="WhatsApp"
                      checked={current.hasWhatsapp}
                      isEditing={isEditing}
                      onChange={(v) => handleChange("hasWhatsapp", v)}
                    />
                    <ToggleRow
                      label="AI Predict"
                      checked={current.hasAiPrediction}
                      isEditing={isEditing}
                      onChange={(v) => handleChange("hasAiPrediction", v)}
                    />
                    <ToggleRow
                      label="White Label"
                      checked={current.hasWhiteLabel}
                      isEditing={isEditing}
                      onChange={(v) => handleChange("hasWhiteLabel", v)}
                    />
                    <ToggleRow
                      label="Active Plan"
                      checked={current.isActive}
                      isEditing={isEditing}
                      onChange={(v) => handleChange("isActive", v)}
                    />
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-4 flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        disabled={updateMutation.isPending}>
                        <X className="h-4 w-4 mr-2" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 mr-2" /> Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                      className="w-full">
                      <Edit2 className="h-4 w-4 mr-2" /> Edit Limits
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// --- Helper Components ---

function LimitRow({
  label,
  icon: Icon,
  value,
  isEditing,
  onChange,
  step = 1,
}: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-slate-400" /> {label}
      </div>
      {isEditing ? (
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 text-right"
        />
      ) : (
        <span className="font-semibold text-sm">
          {value === -1 ? "Unlimited" : value}
        </span>
      )}
    </div>
  );
}

function ToggleRow({ label, checked, isEditing, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm text-muted-foreground cursor-pointer">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={!isEditing}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-96 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
