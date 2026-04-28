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
import TestForm from "../components/test-form";

// --- TYPESCRIPT INTERFACES ---
export interface InventoryItem {
  id: string;
  name: string;
  usageUnit: string;
}

export interface Reagent {
  inventoryItemId: string;
  quantity: number;
  inventoryItem: InventoryItem;
}

export interface Parameter {
  id: string;
  reagents?: Reagent[];
}

export interface TestComponent {
  parameter?: Parameter;
}

export interface ContainerType {
  code: string;
  capColor?: string;
}

export interface Department {
  name: string;
}

// Updated to match the new API response
export interface Test {
  id: string;
  name: string;
  code: string;
  isGlobal: boolean; // CRITICAL ADDITION
  effectivePrice: number;
  _count?: { parameters: number };
  department?: Department;
  containerType?: ContainerType;
  components: TestComponent[];
}

interface AggregatedReagent {
  name: string;
  unit: string;
  totalQuantity: number;
}

// 1. Fetching Function hitting our new API Route
const fetchLocalTests = async (): Promise<Test[]> => {
  const res = await fetch("/api/workspace/test-catalog");
  if (!res.ok) throw new Error("Failed to fetch tests");
  const data = await res.json();
  return data.tests || [];
};

// 2. Delete Function
const deleteLocalTest = async (id: string) => {
  // Assuming you have a DELETE method on your catalog route, or point this to your specific delete API.
  const res = await fetch(`/api/workspace/test-catalog?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function TestsTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);

  // --- FETCH DATA ---
  const {
    data: tests = [],
    isLoading,
    isError,
  } = useQuery<Test[]>({
    queryKey: ["local-tests-catalog"],
    queryFn: fetchLocalTests,
  });

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: deleteLocalTest,
    onSuccess: () => {
      toast.success("Test deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["local-tests-catalog"] });
    },
    onError: () => {
      toast.error("Failed to delete test");
    },
  });

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this test? This action cannot be undone.",
      )
    )
      return;
    deleteMutation.mutate(id);
  }

  function handleEdit(test: Test) {
    setEditingTest(test);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingTest(null);
    setIsDialogOpen(true);
  }

  const filteredTests = tests.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="Search tests by name or code..."
            className="pl-10 focus-visible:ring-blue-500 border-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingTest(null);
          }}>
          <Button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Custom Test
          </Button>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50 sticky top-0 z-10">
              <DialogTitle className="text-xl">
                {editingTest
                  ? `Edit Test: ${editingTest.name}`
                  : "Create New Test Master"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              {/* Ensure your TestForm supports the new Schema structure */}
              <TestForm
                key={editingTest ? editingTest.id : "new"}
                initialData={editingTest || undefined}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({
                    queryKey: ["local-tests-catalog"],
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
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                <TableHead className="w-[100px] font-semibold text-slate-600">
                  Code
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Test Details
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Scope
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Tube Type
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Auto-Reagents
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
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
                    colSpan={7}
                    className="text-center h-32 text-slate-500 animate-pulse">
                    Loading test database...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center h-32 text-red-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                      <span className="font-medium">
                        Failed to load tests. Please refresh the page.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center h-32 text-slate-500">
                    No tests found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTests.map((t) => {
                  // Reagent Aggregation
                  const aggregatedReagents = (t.components || []).reduce<
                    Record<string, AggregatedReagent>
                  >((acc, comp) => {
                    comp.parameter?.reagents?.forEach((r) => {
                      if (!acc[r.inventoryItemId]) {
                        acc[r.inventoryItemId] = {
                          name: r.inventoryItem.name,
                          unit: r.inventoryItem.usageUnit,
                          totalQuantity: 0,
                        };
                      }
                      acc[r.inventoryItemId].totalQuantity += r.quantity;
                    });
                    return acc;
                  }, {});
                  const reagentList = Object.values(aggregatedReagents);

                  return (
                    <TableRow
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition-colors ${t.isGlobal ? "bg-slate-50/30" : ""}`}>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {t.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">
                          {t.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500">
                            {t.department?.name || "General"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            {t._count?.parameters || 0} parameters
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {t.isGlobal ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                            <Globe size={12} /> Global
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
                            <Building2 size={12} /> Local
                          </span>
                        )}
                      </TableCell>

                      {/* Tube Visual Indicator */}
                      <TableCell>
                        {t.containerType ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border border-slate-300 shadow-sm"
                              style={{
                                backgroundColor:
                                  t.containerType.capColor || "#ccc",
                              }}
                            />
                            <span className="text-xs text-slate-700 font-medium">
                              {t.containerType.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Unassigned
                          </span>
                        )}
                      </TableCell>

                      {/* DISPLAY AGGREGATED REAGENTS */}
                      <TableCell>
                        {reagentList.length > 0 ? (
                          <div className="flex flex-col gap-1.5 max-w-[200px]">
                            {reagentList.map((r, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                <Beaker className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate" title={r.name}>
                                  {r.name}
                                </span>
                                <span className="font-bold border-l border-emerald-200 pl-1.5 ml-auto">
                                  {r.totalQuantity.toFixed(2)} {r.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            No auto-deduction
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="font-semibold text-slate-900">
                        ₹{Number(t.effectivePrice || t.price).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(t)}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 transition-colors"
                            title={t.isGlobal ? "View Details" : "Edit Test"}>
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* Disable Delete button if it's a Global Test */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(t.id)}
                            disabled={
                              t.isGlobal ||
                              (deleteMutation.isPending &&
                                deleteMutation.variables === t.id)
                            }
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            title={
                              t.isGlobal
                                ? "Cannot delete global master tests"
                                : "Delete Test"
                            }>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
