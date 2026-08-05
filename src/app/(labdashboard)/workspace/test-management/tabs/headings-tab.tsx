"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Loader2,
  Layers,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Globe,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

// 1. Define the Multi-Tenant Heading Interface
export interface Heading {
  id: string;
  name: string;
  isGlobal: boolean; // CRITICAL FOR SAAS
}

// 2. Zod Schema
const headingSchema = z.object({
  name: z.string().min(1, "Heading text is required"),
});

type HeadingFormData = z.infer<typeof headingSchema>;

// --- API FETCHING FUNCTIONS ---
const fetchHeadings = async (): Promise<Heading[]> => {
  const res = await fetch("/api/workspace/headings");
  if (!res.ok) throw new Error("Failed to fetch headings");
  const data = await res.json();
  return data.headings || [];
};

const saveLocalHeading = async (data: { id?: string; name: string }) => {
  const method = data.id ? "PUT" : "POST";
  const res = await fetch("/api/workspace/headings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to save heading");
  }
  return res.json();
};

const deleteLocalHeading = async (id: string) => {
  const res = await fetch(`/api/workspace/headings?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function HeadingsTab() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<Heading | null>(null);

  // 3. React Query for Fetching
  const {
    data: headings = [],
    isLoading,
    isError,
  } = useQuery<Heading[]>({
    queryKey: ["local-headings"],
    queryFn: fetchHeadings,
  });

  // 4. React Hook Form Setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<HeadingFormData>({
    resolver: zodResolver(headingSchema),
    defaultValues: { name: "" },
  });

  // 5. Mutations for Save and Delete
  const saveMutation = useMutation({
    mutationFn: async (data: HeadingFormData) => {
      await saveLocalHeading({
        id: editingItem?.id,
        name: data.name,
      });
      return editingItem ? "Heading updated" : "Heading added";
    },
    onSuccess: (message) => {
      toast.success(message);
      handleCancel();
      queryClient.invalidateQueries({ queryKey: ["local-headings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save heading");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocalHeading,
    onSuccess: () => {
      toast.success("Heading deleted");
      queryClient.invalidateQueries({ queryKey: ["local-headings"] });
    },
    onError: () => {
      toast.error("Could not delete heading. It may be in use by a test.");
    },
  });

  // --- Handlers ---
  function handleEdit(item: Heading) {
    setEditingItem(item);
    setValue("name", item.name);
  }

  function handleCancel() {
    setEditingItem(null);
    reset({ name: "" });
  }

  function onSubmit(data: HeadingFormData) {
    saveMutation.mutate(data);
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this custom heading?",
      )
    )
      return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* LEFT: FORM */}
      <div className="md:col-span-1 space-y-4">
        <div
          className={`p-5 border rounded-xl shadow-sm transition-colors ${editingItem ? "bg-primary/10/50 border-primary/20" : "bg-card border-border"}`}>
          <div className="font-semibold mb-5 flex items-center justify-between text-slate-800">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {editingItem ? "Edit Custom Heading" : "Add Custom Heading"}
            </span>
            {editingItem && (
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-red-50 hover:text-red-600 transition-colors">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Heading Text *
              </label>
              <Input
                placeholder="e.g. LIPID PROFILE"
                {...register("name")}
                className={`focus-visible:ring-primary uppercase ${errors.name ? "border-red-500 bg-red-50" : "bg-card"}`}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 transition-colors"
                disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : editingItem ? (
                  "Update Heading"
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Add Heading
                  </>
                )}
              </Button>
              {editingItem && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saveMutation.isPending}
                  className="w-full">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT: LIST */}
      <div className="md:col-span-2 border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border">
                <TableHead className="font-semibold text-muted-foreground">
                  Heading Name
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Scope
                </TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center h-32 text-muted-foreground animate-pulse">
                    Loading headings...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center h-32 text-red-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                      <span className="font-medium">
                        Failed to load headings. Please refresh.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : headings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center h-32 text-muted-foreground">
                    No headings found.
                  </TableCell>
                </TableRow>
              ) : (
                headings.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`transition-colors ${editingItem?.id === item.id ? "bg-primary/10/50" : "hover:bg-muted/50/80"} ${item.isGlobal ? "bg-slate-50/30" : ""}`}>
                    <TableCell className="font-medium text-foreground">
                      {item.name}
                    </TableCell>

                    <TableCell>
                      {item.isGlobal ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-indigo-50 text-primary px-2.5 py-1 rounded-md border border-indigo-100">
                          <Globe size={12} /> Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-50 text-primary px-2.5 py-1 rounded-md border border-emerald-100">
                          <Building2 size={12} /> Local
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          disabled={item.isGlobal}
                          title={
                            item.isGlobal
                              ? "Global headings cannot be edited"
                              : "Edit Heading"
                          }
                          className="h-8 w-8 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          disabled={
                            item.isGlobal ||
                            (deleteMutation.isPending &&
                              deleteMutation.variables === item.id)
                          }
                          title={
                            item.isGlobal
                              ? "Global headings cannot be deleted"
                              : "Delete Heading"
                          }
                          className="h-8 w-8 text-muted-foreground/70 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
