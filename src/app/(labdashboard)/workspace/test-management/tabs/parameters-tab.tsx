"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Beaker,
  AlertCircle,
  Globe,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import ParameterForm from "../components/parameter-form";

// --- TYPESCRIPT INTERFACES ---
export interface InventoryItem {
  name: string;
  usageUnit: string;
}

export interface Reagent {
  id: string;
  quantity: number;
  inventoryItem?: InventoryItem;
}

export interface ContainerType {
  code: string;
  capColor?: string;
}

export interface Parameter {
  id: string;
  code: string;
  name: string;
  printName?: string;
  unit?: string;
  inputType: "NUMBER" | "TEXT" | "LONG_TEXT" | "DROPDOWN" | "HEADING";
  price?: number;
  isGlobal: boolean; // CRITICAL ADDITION FOR SAAS
  containerType?: ContainerType;
  reagents?: Reagent[];
}

// 1. Fetching Function hitting the multi-tenant API Route
const fetchParameters = async (): Promise<Parameter[]> => {
  const res = await fetch("/api/workspace/parameters");
  if (!res.ok) throw new Error("Failed to fetch parameters");
  const data = await res.json();
  return data.parameters || [];
};

// 2. Delete Function
const deleteLocalParameter = async (id: string) => {
  const res = await fetch(`/api/workspace/parameters?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function ParametersTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog & Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<Parameter | null>(null);

  // --- FETCH DATA ---
  const {
    data: parameters = [],
    isLoading,
    isError,
  } = useQuery<Parameter[]>({
    queryKey: ["local-parameters"],
    queryFn: fetchParameters,
  });

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: deleteLocalParameter,
    onSuccess: () => {
      toast.success("Parameter deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["local-parameters"] });
    },
    onError: () => {
      toast.error("Error deleting parameter. It may be in use by a test.");
    },
  });

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure? Deleting this parameter will permanently remove it from all local tests that use it.",
      )
    )
      return;
    deleteMutation.mutate(id);
  }

  // --- Handlers for Add/Edit ---
  function handleEdit(param: Parameter) {
    setEditingParam(param);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingParam(null);
    setIsDialogOpen(true);
  }

  const filteredParams = parameters.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by parameter name or code..."
            className="pl-10 focus-visible:ring-blue-500 border-slate-300 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* EDIT/ADD MODAL */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingParam(null);
          }}>
          <Button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Custom Parameter
          </Button>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50 sticky top-0 z-10">
              <DialogTitle className="text-xl text-slate-800">
                {editingParam
                  ? `Edit Parameter: ${editingParam.name}`
                  : "Create New Custom Parameter"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6">
              {/* Ensure your ParameterForm expects the updated schema */}
              <ParameterForm
                key={editingParam ? editingParam.id : "new"}
                initialData={editingParam || undefined}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({
                    queryKey: ["local-parameters"],
                  });
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                <TableHead className="w-[100px] font-semibold text-slate-600">
                  Code
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Parameter Details
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Scope
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Input Type
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Tube
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Auto-Reagents
                </TableHead>
                <TableHead className="text-right font-semibold text-slate-600">
                  Price (₹)
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
                    colSpan={8}
                    className="text-center h-32 text-slate-500 animate-pulse">
                    Loading parameter dictionary...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center h-32 text-red-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                      <span className="font-medium">
                        Failed to load parameters. Please refresh the page.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredParams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center h-32 text-slate-500">
                    No parameters found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParams.map((param) => (
                  <TableRow
                    key={param.id}
                    className={`hover:bg-slate-50/80 transition-colors ${param.isGlobal ? "bg-slate-50/30" : ""}`}>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                        {param.code}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-medium">
                          {param.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {param.unit ? (
                            <span className="text-[11px] text-blue-600 font-semibold">
                              {param.unit}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              No Unit
                            </span>
                          )}
                          {param.printName &&
                            param.printName !== param.name && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] text-slate-500">
                                  Print: {param.printName}
                                </span>
                              </>
                            )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {param.isGlobal ? (
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {param.inputType}
                      </span>
                    </TableCell>

                    <TableCell>
                      {param.containerType ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-slate-300 shadow-sm"
                            style={{
                              backgroundColor:
                                param.containerType.capColor || "#ccc",
                            }}
                          />
                          <span className="text-xs text-slate-700 font-medium">
                            {param.containerType.code}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Unassigned
                        </span>
                      )}
                    </TableCell>

                    {/* Reagents Display */}
                    <TableCell>
                      {param.reagents && param.reagents.length > 0 ? (
                        <div className="flex flex-col gap-1.5 max-w-[200px]">
                          {param.reagents.map((r) => (
                            <div
                              key={r.id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Beaker className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span
                                className="truncate"
                                title={r.inventoryItem?.name}>
                                {r.inventoryItem?.name}
                              </span>
                              <span className="font-bold border-l border-emerald-200 pl-1.5 ml-auto">
                                {r.quantity} {r.inventoryItem?.usageUnit}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Not linked
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-medium text-slate-900">
                      {param.price ? (
                        `₹${param.price}`
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(param)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 transition-colors"
                          title={
                            param.isGlobal ? "View Details" : "Edit Parameter"
                          }>
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Disable Delete button if it's a Global Parameter */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(param.id)}
                          disabled={
                            param.isGlobal ||
                            (deleteMutation.isPending &&
                              deleteMutation.variables === param.id)
                          }
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title={
                            param.isGlobal
                              ? "Cannot delete global master parameters"
                              : "Delete Parameter"
                          }>
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
