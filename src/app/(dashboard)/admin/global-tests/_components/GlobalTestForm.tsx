"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface GlobalTestFormProps {
  initialData?: any;
}

export function GlobalTestForm({ initialData }: GlobalTestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    code: initialData?.code || "",
    price: initialData?.price || 0,
    b2bPrice: initialData?.b2bPrice || 0,
    cost: initialData?.cost || 0,
    type: initialData?.type || "SINGLE",
    tat: initialData?.tat || "24 hrs",
    method: initialData?.method || "",
    isActive: initialData?.isActive ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    toast.loading("Saving global test...", { id: "save-test" });

    try {
      const url = initialData
        ? `/api/admin/global-tests/${initialData.id}`
        : `/api/admin/global-tests`;
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Global test saved successfully!", { id: "save-test" });
      router.push("/admin/global-tests");
      router.refresh();
    } catch (error) {
      toast.error("Failed to save test", { id: "save-test" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/global-tests">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {initialData ? "Edit Global Test" : "Create Global Test"}
          </h1>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Test
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>
              Test Name <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Complete Blood Count (CBC)"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Test Code <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. CBC-01"
            />
          </div>
          <div className="space-y-2">
            <Label>Test Type</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE">Single Parameter</SelectItem>
                <SelectItem value="PROFILE">Profile / Panel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.isActive ? "true" : "false"}
              onValueChange={(v) =>
                setFormData({ ...formData, isActive: v === "true" })
              }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active (Available to Labs)</SelectItem>
                <SelectItem value="false">Inactive (Archived)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Operations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Default Price (₹)</Label>
            <Input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label>B2B Price (₹)</Label>
            <Input
              type="number"
              name="b2bPrice"
              value={formData.b2bPrice}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label>Turnaround Time (TAT)</Label>
            <Input
              name="tat"
              value={formData.tat}
              onChange={handleChange}
              placeholder="e.g. 12 hrs"
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Clinical Method</Label>
            <Input
              name="method"
              value={formData.method}
              onChange={handleChange}
              placeholder="e.g. Flow Cytometry"
            />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
