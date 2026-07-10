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
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";

import TestForm from "../components/test-form";
import PricingOverrideModal from "../components/pricing-modal";

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

export interface Test {
  id: string;
  name: string;
  code: string;
  price?: number; // Ensuring base price is known to the form
  isGlobal: boolean;
  effectivePrice: number;
  effectiveB2BPrice: number;
  effectiveTat: string;
  isActive: boolean;
  hasOverride: boolean;
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

// --- API FUNCTIONS ---
const fetchTests = async (): Promise<Test[]> => {
  const res = await fetch("/api/workspace/test-catalog"); // Using our unified API
  if (!res.ok) throw new Error("Failed to fetch tests");
  const data = await res.json();
  return data.tests || [];
};

const deleteLocalTest = async (id: string) => {
  const res = await fetch(`/api/workspace/test-catalog?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function TestsTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Modals State
  const [isTestFormOpen, setIsTestFormOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [pricingTest, setPricingTest] = useState<Test | null>(null);

  // --- FETCH DATA ---
  const {
    data: tests = [],
    isLoading,
    isError,
  } = useQuery<Test[]>({
    queryKey: ["unified-tests"],
    queryFn: fetchTests,
  });

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: deleteLocalTest,
    onSuccess: () => {
      toast.success("Test deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["unified-tests"] });
    },
    onError: () => toast.error("Failed to delete test"),
  });

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this custom test?",
      )
    )
      return;
    deleteMutation.mutate(id);
  }

  // ✅ FIX: Allow full editing for ALL tests
  function handleActionClick(test: Test) {
    setEditingTest(test);
    setIsTestFormOpen(true);
  }

  // (Optional) Keep this if you want a dedicated quick-price button alongside the full edit button
  function handleQuickPriceClick(test: Test) {
    setPricingTest(test);
  }

  function handleAddNew() {
    setEditingTest(null);
    setIsTestFormOpen(true);
  }

  const filteredTests = tests.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="Search tests by name or code..."
            className="pl-10 focus-visible:ring-primary border-border shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          onClick={handleAddNew}
          className="bg-primary hover:bg-blue-700 shadow-sm shrink-0 w-full sm:w-auto transition-all">
          <Plus className="mr-2 h-4 w-4" /> Create Custom Test
        </Button>
      </div>

      {/* FULL TEST FORM MODAL (For Both Local & Global Tests) */}
      <Dialog
        open={isTestFormOpen}
        onOpenChange={(open) => {
          setIsTestFormOpen(open);
          if (!open) setEditingTest(null);
        }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 sticky top-0 z-10 flex flex-row items-center gap-2">
            {/* Show a globe icon in the title if editing a master test */}
            {editingTest?.isGlobal && (
              <Globe className="h-5 w-5 text-primary" />
            )}
            <DialogTitle className="text-xl text-slate-800">
              {editingTest
                ? `Edit ${editingTest.isGlobal ? "Master Catalog" : "Custom"} Test: ${editingTest.name}`
                : "Create New Custom Test"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <TestForm
              key={editingTest ? editingTest.id : "new"}
              initialData={editingTest || undefined}
              onSuccess={(result) => {
                setIsTestFormOpen(false);
                // The backend API will return { forked: true/false } based on logic
                if (result?.forked) {
                  toast.success("A customized local copy has been created!");
                } else {
                  toast.success("Test overrides saved successfully!");
                }
                queryClient.invalidateQueries({ queryKey: ["unified-tests"] });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* PRICING OVERRIDE MODAL (For Quick Price Updates) */}
      {pricingTest && (
        <PricingOverrideModal
          test={pricingTest}
          onClose={() => setPricingTest(null)}
          onSuccess={() => {
            setPricingTest(null);
            queryClient.invalidateQueries({ queryKey: ["unified-tests"] });
          }}
        />
      )}

      {/* DATA TABLE */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border hover:bg-muted/30">
                <TableHead className="w-[100px] font-semibold text-muted-foreground">
                  Code
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Test Details
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Scope
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Tube Type
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Auto-Reagents
                </TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">
                  Patient Price
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
                    colSpan={7}
                    className="text-center h-32 text-muted-foreground animate-pulse">
                    Loading test catalog...
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
                    className="text-center h-32 text-muted-foreground">
                    No tests found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTests.map((t) => {
                  // Reagent Aggregation Logic
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
                      className={`hover:bg-muted/50/80 transition-colors ${!t.isActive ? "opacity-60 bg-muted/30" : ""}`}>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded border border-border shadow-sm">
                          {t.code}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-foreground text-sm flex items-center gap-2">
                          {t.name}
                          {!t.isActive && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {t.department?.name || "General"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium border border-border">
                            {t._count?.parameters || 0} parameters
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {t.isGlobal ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100"
                            title="Master Catalog Test">
                            <Globe size={12} /> Global
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100"
                            title="Customized for your lab">
                            <Building2 size={12} /> Local
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {t.containerType ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border border-border shadow-sm"
                              style={{
                                backgroundColor:
                                  t.containerType.capColor || "#ccc",
                              }}
                            />
                            <span className="text-xs text-foreground/80 font-semibold">
                              {t.containerType.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70 text-xs italic">
                            Unassigned
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {reagentList.length > 0 ? (
                          <div className="flex flex-col gap-1.5 max-w-[200px]">
                            {reagentList.map((r, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center justify-between gap-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Beaker className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span className="truncate" title={r.name}>
                                    {r.name}
                                  </span>
                                </div>
                                <span className="font-bold border-l border-emerald-200 pl-1.5 shrink-0">
                                  {r.totalQuantity.toFixed(2)} {r.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70 text-[11px] italic">
                            No auto-deduction
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 font-bold text-foreground text-sm">
                          <IndianRupee size={14} className="text-slate-400" />
                          {Number(t.effectivePrice || t.price || 0).toFixed(2)}
                        </div>
                        {t.hasOverride && (
                          <div className="text-[10px] text-primary font-semibold mt-0.5">
                            Custom Price
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* QUICK PRICE OVERRIDE BUTTON */}
                          {t.isGlobal && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuickPriceClick(t)}
                              className="text-muted-foreground/70 hover:text-emerald-600 hover:bg-emerald-50 h-8 w-8 transition-colors"
                              title="Quick Price Override">
                              <IndianRupee className="h-4 w-4" />
                            </Button>
                          )}

                          {/* FULL EDIT BUTTON (Now available for all tests) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleActionClick(t)}
                            className="text-muted-foreground/70 hover:text-primary hover:bg-primary/10 h-8 w-8 transition-colors"
                            title="Full Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* DELETE BUTTON (Disabled for Global) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(t.id)}
                            disabled={
                              t.isGlobal ||
                              (deleteMutation.isPending &&
                                deleteMutation.variables === t.id)
                            }
                            className="text-muted-foreground/70 hover:text-red-600 hover:bg-red-50 h-8 w-8 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            title={
                              t.isGlobal
                                ? "Cannot delete global master tests"
                                : "Delete Local Test"
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
