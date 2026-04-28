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
  Trash2,
  Plus,
  Loader2,
  TestTube,
  Pencil,
  X,
  AlertCircle,
  Globe,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

// 1. Define the Multi-Tenant Sample Type Interface
export interface SampleType {
  id: string;
  name: string;
  code: string | null;
  isGlobal: boolean; // CRITICAL FOR SAAS
}

// 2. Zod Schema
const sampleSchema = z.object({
  name: z.string().min(1, "Sample name is required"),
  code: z.string().optional(),
});

type SampleFormData = z.infer<typeof sampleSchema>;

// --- API FETCHING FUNCTIONS ---
const fetchSamples = async (): Promise<SampleType[]> => {
  const res = await fetch("/api/workspace/samples");
  if (!res.ok) throw new Error("Failed to fetch samples");
  const data = await res.json();
  // Assuming your API returns { samples: [...] } like the departments route
  return data.samples || [];
};

const saveLocalSample = async (data: {
  id?: string;
  name: string;
  code?: string;
}) => {
  const method = data.id ? "PUT" : "POST";
  const res = await fetch("/api/workspace/samples", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to save sample");
  }
  return res.json();
};

const deleteLocalSample = async (id: string) => {
  const res = await fetch(`/api/workspace/samples?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function SamplesTab() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<SampleType | null>(null);

  // 3. React Query for Fetching
  const {
    data: samples = [],
    isLoading,
    isError,
  } = useQuery<SampleType[]>({
    queryKey: ["local-samples"],
    queryFn: fetchSamples,
  });

  // 4. React Hook Form Setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SampleFormData>({
    resolver: zodResolver(sampleSchema),
    defaultValues: { name: "", code: "" },
  });

  // 5. Mutations for Save and Delete
  const saveMutation = useMutation({
    mutationFn: async (data: SampleFormData) => {
      await saveLocalSample({
        id: editingItem?.id,
        name: data.name,
        code: data.code,
      });
      return editingItem ? "Sample updated" : "Sample added";
    },
    onSuccess: (message) => {
      toast.success(message);
      handleCancel();
      queryClient.invalidateQueries({ queryKey: ["local-samples"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save sample");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocalSample,
    onSuccess: () => {
      toast.success("Sample type deleted");
      queryClient.invalidateQueries({ queryKey: ["local-samples"] });
    },
    onError: () => {
      toast.error("Could not delete sample type. It may be in use.");
    },
  });

  // --- Handlers ---
  function handleEdit(item: SampleType) {
    setEditingItem(item);
    setValue("name", item.name);
    setValue("code", item.code || "");
  }

  function handleCancel() {
    setEditingItem(null);
    reset({ name: "", code: "" });
  }

  function onSubmit(data: SampleFormData) {
    saveMutation.mutate(data);
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this custom sample type?",
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
          className={`p-5 border rounded-xl shadow-sm transition-colors ${editingItem ? "bg-blue-50/50 border-blue-200" : "bg-white border-slate-200"}`}>
          <div className="font-semibold mb-5 flex items-center justify-between text-slate-800">
            <span className="flex items-center gap-2">
              <TestTube className="h-4 w-4 text-blue-600" />
              {editingItem ? "Edit Custom Sample" : "Add Custom Sample"}
            </span>
            {editingItem && (
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="h-6 w-6 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase">
                Sample Name *
              </label>
              <Input
                placeholder="e.g. Swab, Saliva"
                {...register("name")}
                className={`focus-visible:ring-blue-500 ${errors.name ? "border-red-500 bg-red-50" : "bg-white"}`}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase">
                Short Code
              </label>
              <Input
                placeholder="e.g. SWB"
                {...register("code")}
                className="bg-white focus-visible:ring-blue-500 uppercase"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : editingItem ? (
                  "Update Sample"
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Add Sample
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
      <div className="md:col-span-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="font-semibold text-slate-600">
                  Sample Name
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Code
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Scope
                </TableHead>
                <TableHead className="text-right font-semibold text-slate-600">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-32 text-slate-500 animate-pulse">
                    Loading sample types...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-32 text-red-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                      <span className="font-medium">
                        Failed to load sample types. Please refresh.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : samples.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-32 text-slate-500">
                    No sample types found.
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`transition-colors ${editingItem?.id === item.id ? "bg-blue-50/50" : "hover:bg-slate-50/80"} ${item.isGlobal ? "bg-slate-50/30" : ""}`}>
                    <TableCell className="font-medium text-slate-900">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                        {item.code || "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      {item.isGlobal ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                          <Globe size={12} /> Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
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
                              ? "Global samples cannot be edited"
                              : "Edit Sample"
                          }
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
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
                              ? "Global samples cannot be deleted"
                              : "Delete Sample"
                          }
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
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
