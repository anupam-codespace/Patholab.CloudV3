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
  Pencil,
  X,
  AlertCircle,
  Globe,
  Building2,
  FlaskConical,
} from "lucide-react";
import toast from "react-hot-toast";

// 1. Define the Multi-Tenant Department Interface
export interface Department {
  id: string;
  name: string;
  code: string | null;
  isGlobal: boolean; // CRITICAL FOR SAAS
  _count?: {
    testTemplates: number;
  };
}

// 2. Zod Schema
const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

// --- API FETCHING FUNCTIONS ---
const fetchDepartments = async (): Promise<Department[]> => {
  const res = await fetch("/api/workspace/departments");
  if (!res.ok) throw new Error("Failed to fetch departments");
  const data = await res.json();
  return data.departments || [];
};

const saveLocalDepartment = async (data: {
  id?: string;
  name: string;
  code?: string;
}) => {
  const method = data.id ? "PUT" : "POST";
  const res = await fetch("/api/workspace/departments", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to save department");
  }
  return res.json();
};

const deleteLocalDepartment = async (id: string) => {
  const res = await fetch(`/api/workspace/departments?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function DepartmentsTab() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<Department | null>(null);

  // 3. React Query for Fetching
  const {
    data: departments = [],
    isLoading,
    isError,
  } = useQuery<Department[]>({
    queryKey: ["local-departments"],
    queryFn: fetchDepartments,
  });

  // 4. React Hook Form Setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", code: "" },
  });

  // 5. Mutations for Save and Delete
  const saveMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      await saveLocalDepartment({
        id: editingItem?.id,
        name: data.name,
        code: data.code,
      });
      return editingItem ? "Department updated" : "Department added";
    },
    onSuccess: (message) => {
      toast.success(message);
      handleCancel();
      queryClient.invalidateQueries({ queryKey: ["local-departments"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save department");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocalDepartment,
    onSuccess: () => {
      toast.success("Department deleted");
      queryClient.invalidateQueries({ queryKey: ["local-departments"] });
    },
    onError: () => {
      toast.error("Could not delete department. It may be in use by tests.");
    },
  });

  // --- Handlers ---
  function handleEdit(item: Department) {
    setEditingItem(item);
    setValue("name", item.name);
    setValue("code", item.code || "");
  }

  function handleCancel() {
    setEditingItem(null);
    reset({ name: "", code: "" });
  }

  function onSubmit(data: DepartmentFormData) {
    saveMutation.mutate(data);
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure? Deleting this will remove the department from all associated tests.",
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
              <FlaskConical className="h-4 w-4 text-blue-600" />
              {editingItem ? "Edit Custom Dept" : "Add Custom Dept"}
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
                Department Name *
              </label>
              <Input
                placeholder="e.g. Advanced Hematology"
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
                placeholder="e.g. HEM-ADV"
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
                  "Update Dept"
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Add Dept
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
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="font-semibold text-slate-600">
                  Department Name
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Scope
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Tests Linked
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
                    Loading departments...
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
                        Failed to load departments. Please refresh.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-32 text-slate-500">
                    No departments found.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow
                    key={dept.id}
                    className={`transition-colors ${editingItem?.id === dept.id ? "bg-blue-50/50" : "hover:bg-slate-50/80"} ${dept.isGlobal ? "bg-slate-50/30" : ""}`}>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {dept.name}
                      </div>
                      {dept.code && (
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          {dept.code}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {dept.isGlobal ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                          <Globe size={12} /> Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
                          <Building2 size={12} /> Local
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {dept._count?.testTemplates || 0} tests
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(dept)}
                          disabled={dept.isGlobal}
                          title={
                            dept.isGlobal
                              ? "Global departments cannot be edited"
                              : "Edit Department"
                          }
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dept.id)}
                          disabled={
                            dept.isGlobal ||
                            (deleteMutation.isPending &&
                              deleteMutation.variables === dept.id)
                          }
                          title={
                            dept.isGlobal
                              ? "Global departments cannot be deleted"
                              : "Delete Department"
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
