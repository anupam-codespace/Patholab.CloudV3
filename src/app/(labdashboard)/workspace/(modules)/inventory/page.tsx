"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  PackagePlus,
  AlertCircle,
  X,
  Box,
  CheckCircle2,
  History,
  Edit2,
  Save as SaveIcon,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { format } from "date-fns";

// --- API FETCHERS ---
const fetchItems = async () => {
  const res = await fetch("/api/workspace/inventory/items");
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
};

const fetchLedger = async (itemId: string) => {
  const res = await fetch(
    `/api/workspace/inventory/transactions?itemId=${itemId}`,
  );
  if (!res.ok) throw new Error("Failed to fetch ledger");
  return res.json();
};

export default function InventoryPage() {
  const queryClient = useQueryClient();

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);

  const [manageItem, setManageItem] = useState<any | null>(null);
  const [manageTab, setManageTab] = useState<"BATCHES" | "LEDGER">("BATCHES");
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // Queries
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: fetchItems,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["inventoryLedger", manageItem?.id],
    queryFn: () => fetchLedger(manageItem.id),
    enabled: !!manageItem && manageTab === "LEDGER",
  });

  // --- ITEM MUTATIONS ---
  const addItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add item");
      return data;
    },
    onSuccess: () => {
      toast.success("Item added to catalog!");
      setIsAddItemOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/workspace/inventory/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update item");
      return data;
    },
    onSuccess: () => {
      toast.success("Item updated successfully!");
      setIsAddItemOpen(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspace/inventory/items/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete item");
      return data;
    },
    onSuccess: () => {
      toast.success("Item deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  // --- BATCH MUTATIONS ---
  const addStockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/inventory/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add stock");
      return data;
    },
    onSuccess: () => {
      toast.success("Stock received successfully!");
      setIsAddStockOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      if (manageItem)
        queryClient.invalidateQueries({
          queryKey: ["inventoryLedger", manageItem.id],
        });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({
      batchId,
      payload,
    }: {
      batchId: string;
      payload: any;
    }) => {
      const res = await fetch(`/api/workspace/inventory/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update batch");
      return data;
    },
    onSuccess: () => {
      toast.success("Batch updated successfully!");
      setEditingBatchId(null);
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({
        queryKey: ["inventoryLedger", manageItem?.id],
      });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch(`/api/workspace/inventory/batches/${batchId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete batch");
      return data;
    },
    onSuccess: () => {
      toast.success("Batch deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({
        queryKey: ["inventoryLedger", manageItem?.id],
      });
    },
    onError: (error: any) => toast.error(error.message),
  });

  // --- HANDLERS ---
  const handleItemSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, payload });
    } else {
      addItemMutation.mutate(payload);
    }
  };

  const handleDeleteItem = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this catalog item? All associated batches and transaction history will also be permanently deleted.",
      )
    ) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleAddStockSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    addStockMutation.mutate(payload);
  };

  const handleUpdateBatchSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    batchId: string,
  ) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    updateBatchMutation.mutate({ batchId, payload });
  };

  const handleDeleteBatch = (batchId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this specific batch? All ledger history for this batch will be lost.",
      )
    ) {
      deleteBatchMutation.mutate(batchId);
    }
  };

  const openManageModal = (item: any) => {
    setManageItem(item);
    setManageTab("BATCHES");
    setEditingBatchId(null);
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setIsAddItemOpen(true);
  };

  const openEditItemModal = (item: any) => {
    setEditingItem(item);
    setIsAddItemOpen(true);
  };

  // ✅ FILTER LOGIC FOR SEARCH
  const filteredItems = items?.filter((item: any) => {
    const term = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term)
    );
  });

  if (itemsLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-2xl shadow-sm border border-border gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage catalog definitions and track physical stock batches.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button
            onClick={openAddItemModal}
            variant="outline"
            className="gap-2 border-border flex-1 md:flex-none">
            <Plus className="h-4 w-4 text-muted-foreground" /> Add Catalog Item
          </Button>
          <Button
            onClick={() => setIsAddStockOpen(true)}
            className="gap-2 bg-primary hover:bg-blue-700 text-white shadow-md flex-1 md:flex-none transition-all">
            <PackagePlus className="h-4 w-4" /> Receive Stock
          </Button>
        </div>
      </div>

      {/* --- SEARCH BAR --- */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search items by name, SKU, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
        />
      </div>

      {/* --- ITEMS TABLE --- */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-slate-50/80 uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-5 font-semibold">Item & Details</th>
                <th className="px-6 py-5 font-semibold">Department</th>
                <th className="px-6 py-5 font-semibold">Unit Mapping</th>
                <th className="px-6 py-5 font-semibold">Total Stock</th>
                <th className="px-6 py-5 font-semibold">Batches</th>
                <th className="px-6 py-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Box className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-lg font-semibold text-slate-700">
                        Your catalog is empty
                      </p>
                      <p className="text-sm max-w-sm">
                        Start by adding items to your catalog. Once items are
                        defined, you can receive physical stock batches.
                      </p>
                      <Button
                        onClick={openAddItemModal}
                        variant="outline"
                        className="mt-4">
                        Create First Item
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredItems?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
                      <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
                        <Search className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-lg font-semibold text-slate-700">
                        No matching items found
                      </p>
                      <p className="text-sm">
                        We couldn't find any items matching "{searchQuery}"
                      </p>
                      <Button
                        onClick={() => setSearchQuery("")}
                        variant="link"
                        className="text-primary mt-2">
                        Clear search
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems?.map((item: any) => {
                  const totalStock =
                    item.batches?.reduce(
                      (sum: number, batch: any) => sum + batch.currentQuantity,
                      0,
                    ) || 0;
                  const isLowStock = totalStock <= item.minStockLevel;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {item.name}
                        </div>
                        {item.sku && (
                          <div className="text-[11px] font-medium text-muted-foreground/70 mt-1 uppercase tracking-wide">
                            SKU: {item.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium">
                          {item.category || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {item.usageUnit}{" "}
                          <span className="text-muted-foreground/70 text-xs">
                            (Usage)
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          1 {item.purchaseUnit} = {item.conversionFactor}{" "}
                          {item.usageUnit}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isLowStock ? "bg-red-50 border-red-100 text-red-700" : "bg-green-50 border-green-100 text-green-700"}`}>
                          <span className="font-bold text-base">
                            {totalStock.toFixed(2)}
                          </span>
                          <span className="text-xs font-medium uppercase opacity-70">
                            {item.usageUnit}
                          </span>
                          {isLowStock && (
                            <AlertCircle
                              className="h-4 w-4 ml-1"
                              title="Low Stock!"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground font-medium">
                          <PackagePlus className="h-4 w-4 text-slate-400" />
                          {item.batches?.length || 0} Active
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-blue-800 hover:bg-primary/10 h-8 w-8"
                            onClick={() => openManageModal(item)}
                            title="Manage Batches">
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
                            onClick={() => openEditItemModal(item)}
                            title="Edit Item">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Delete Item">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: MANAGE BATCHES & LEDGER */}
      {/* ========================================== */}
      {manageItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setManageItem(null)}></div>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b bg-muted/30">
              <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">
                  {manageItem.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Tracked in {manageItem.usageUnit}s
                </p>
              </div>
              <button
                onClick={() => setManageItem(null)}
                className="text-muted-foreground/70 hover:text-foreground/80 bg-card hover:bg-muted p-1.5 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6 bg-card shrink-0">
              <button
                onClick={() => setManageTab("BATCHES")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${manageTab === "BATCHES" ? "border-blue-600 text-primary" : "border-transparent text-muted-foreground hover:text-slate-700"}`}>
                Active Batches
              </button>
              <button
                onClick={() => setManageTab("LEDGER")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${manageTab === "LEDGER" ? "border-blue-600 text-primary" : "border-transparent text-muted-foreground hover:text-slate-700"}`}>
                Ledger / History
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
              {/* TAB 1: BATCHES */}
              {manageTab === "BATCHES" && (
                <div className="space-y-4">
                  {manageItem.batches?.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No active batches for this item.
                    </div>
                  ) : (
                    manageItem.batches.map((batch: any) => {
                      const isEditing = editingBatchId === batch.id;

                      return isEditing ? (
                        <form
                          key={batch.id}
                          onSubmit={(e) => handleUpdateBatchSubmit(e, batch.id)}
                          className="bg-card border border-primary/20 rounded-xl p-4 shadow-sm space-y-4 relative">
                          <div className="flex justify-between items-center pb-2 border-b">
                            <span className="font-bold text-sm text-slate-800">
                              Editing Batch: {batch.batchNumber}
                            </span>
                            <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                              Originally: {batch.initialQuantity}{" "}
                              {manageItem.usageUnit}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">
                                Current Stock ({manageItem.usageUnit})
                              </label>
                              <input
                                required
                                name="currentQuantity"
                                type="number"
                                step="0.01"
                                defaultValue={batch.currentQuantity}
                                className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">
                                Expiry Date
                              </label>
                              <input
                                required
                                name="expiryDate"
                                type="date"
                                defaultValue={
                                  new Date(batch.expiryDate)
                                    .toISOString()
                                    .split("T")[0]
                                }
                                className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">
                                Location
                              </label>
                              <input
                                name="location"
                                type="text"
                                defaultValue={batch.location || ""}
                                className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingBatchId(null)}>
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              className="bg-primary text-white hover:bg-blue-700"
                              disabled={updateBatchMutation.isPending}>
                              {updateBatchMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                              ) : (
                                <SaveIcon className="h-3 w-3 mr-2" />
                              )}{" "}
                              Save Changes
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div
                          key={batch.id}
                          className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-300 transition-colors group/batch">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 w-full">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">
                                Batch Number
                              </p>
                              <p className="text-sm font-semibold text-slate-800">
                                {batch.batchNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">
                                Stock Left
                              </p>
                              <p className="text-sm font-bold text-primary">
                                {batch.currentQuantity}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                  {manageItem.usageUnit}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">
                                Expires
                              </p>
                              <p className="text-sm font-medium text-slate-700">
                                {format(
                                  new Date(batch.expiryDate),
                                  "dd MMM yyyy",
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">
                                Location
                              </p>
                              <p className="text-sm font-medium text-slate-700">
                                {batch.location || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1 opacity-0 group-hover/batch:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                              onClick={() => setEditingBatchId(batch.id)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground/70 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                              onClick={() => handleDeleteBatch(batch.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: LEDGER */}
              {manageTab === "LEDGER" && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {ledgerLoading ? (
                    <div className="flex justify-center p-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : ledger?.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No transaction history found.
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-muted/30 uppercase border-b">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Batch</th>
                          <th className="px-4 py-3 text-right">Change</th>
                          <th className="px-4 py-3">Context / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledger?.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {format(
                                new Date(tx.createdAt),
                                "dd MMM yy, hh:mm a",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                                ${
                                  tx.type === "PURCHASE"
                                    ? "bg-green-100 text-green-700"
                                    : tx.type === "CONSUMPTION"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-blue-100 text-primary"
                                }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {tx.batch?.batchNumber || "Deleted Batch"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              <span
                                className={
                                  tx.quantity > 0
                                    ? "text-green-600"
                                    : "text-orange-600"
                                }>
                                {tx.quantity > 0 ? "+" : ""}
                                {tx.quantity}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate"
                              title={tx.notes || ""}>
                              {tx.test
                                ? `Consumed by Test: ${tx.test.testName}`
                                : tx.notes || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT ITEM MODAL --- */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAddItemOpen(false)}></div>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-primary rounded-lg shadow-inner">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground leading-tight">
                    {editingItem ? "Edit Catalog Item" : "Add Catalog Item"}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="text-muted-foreground/70 hover:text-foreground/80 bg-card hover:bg-muted p-1.5 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleItemSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    Item Name *
                  </label>
                  <input
                    required
                    name="name"
                    type="text"
                    defaultValue={editingItem?.name || ""}
                    placeholder="e.g. Sysmex Cellpack DCL"
                    className="w-full border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    SKU / Item Code
                  </label>
                  <input
                    name="sku"
                    type="text"
                    defaultValue={editingItem?.sku || ""}
                    placeholder="e.g. SYS-1002"
                    className="w-full border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    Department
                  </label>
                  <input
                    name="category"
                    type="text"
                    defaultValue={editingItem?.category || ""}
                    placeholder="e.g. Hematology"
                    className="w-full border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="p-5 bg-primary/10/50 rounded-xl border border-blue-100/60 space-y-4">
                <h3 className="text-sm font-bold text-blue-900">
                  Unit Mapping & Conversion
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                      Purchase Unit
                    </label>
                    <input
                      name="purchaseUnit"
                      type="text"
                      defaultValue={editingItem?.purchaseUnit || "Box"}
                      className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                      Usage Unit *
                    </label>
                    <input
                      required
                      name="usageUnit"
                      type="text"
                      defaultValue={editingItem?.usageUnit || "ml"}
                      className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                      Factor
                    </label>
                    <input
                      name="conversionFactor"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem?.conversionFactor || 1}
                      className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                  Min Stock Alert Level
                </label>
                <input
                  name="minStockLevel"
                  type="number"
                  defaultValue={editingItem?.minStockLevel || 10}
                  className="w-32 border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddItemOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    addItemMutation.isPending || updateItemMutation.isPending
                  }
                  className="bg-primary text-white hover:bg-blue-700 px-8">
                  {(addItemMutation.isPending ||
                    updateItemMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingItem ? "Update Item" : "Save Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD STOCK MODAL --- */}
      {isAddStockOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAddStockOpen(false)}></div>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shadow-inner">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  Receive Stock Batch
                </h2>
              </div>
              <button
                onClick={() => setIsAddStockOpen(false)}
                className="text-muted-foreground/70 hover:text-foreground/80 bg-card hover:bg-muted p-1.5 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddStockSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                  Select Catalog Item *
                </label>
                <select
                  required
                  name="itemId"
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none">
                  <option value="">-- Choose an item --</option>
                  {items?.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.usageUnit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    Batch / Lot Number *
                  </label>
                  <input
                    required
                    name="batchNumber"
                    type="text"
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    Expiry Date *
                  </label>
                  <input
                    required
                    name="expiryDate"
                    type="date"
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 p-4 bg-muted/30 rounded-xl border">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">
                    Quantity Received *
                  </label>
                  <input
                    required
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0.1"
                    className="w-full border border-border rounded-lg p-2.5 text-sm font-semibold text-emerald-700 outline-none"
                  />
                </div>

                {/* ✅ NEW: MRP Field Added */}
                <div>
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    MRP (Optional)
                  </label>
                  <input
                    name="mrp"
                    type="number"
                    step="0.01"
                    placeholder="Printed Price"
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    Total Buying Cost (₹) *
                  </label>
                  <input
                    required
                    name="costPrice"
                    type="number"
                    step="0.01"
                    placeholder="What you paid"
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    This amount will be logged as an expense.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                  Storage Location
                </label>
                <input
                  name="location"
                  type="text"
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddStockOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addStockMutation.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-8">
                  {addStockMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}{" "}
                  Add Inventory
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
