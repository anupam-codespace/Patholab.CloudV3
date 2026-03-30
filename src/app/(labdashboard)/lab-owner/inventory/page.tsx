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
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Beaker,
  Archive,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { format } from "date-fns";

// --- API FETCHERS ---
const fetchItems = async () => {
  const res = await fetch("/api/lab-owner/inventory/items");
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
};

const fetchLedger = async (itemId: string) => {
  const res = await fetch(
    `/api/lab-owner/inventory/transactions?itemId=${itemId}`,
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
      const res = await fetch("/api/lab-owner/inventory/items", {
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
      const res = await fetch(`/api/lab-owner/inventory/items/${id}`, {
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
      const res = await fetch(`/api/lab-owner/inventory/items/${id}`, {
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
      const res = await fetch("/api/lab-owner/inventory/batches", {
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
      const res = await fetch(`/api/lab-owner/inventory/batches/${batchId}`, {
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
      const res = await fetch(`/api/lab-owner/inventory/batches/${batchId}`, {
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

  const lowStockCount =
    items?.filter(
      (i: any) =>
        (i.batches?.reduce((s: number, b: any) => s + b.currentQuantity, 0) ||
          0) <= i.minStockLevel,
    ).length || 0;

  if (itemsLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="text-zinc-500 font-medium animate-pulse">
          Syncing Inventory Data...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      
      {/* 1. FLUID DARK HEADER BLOCK */}
      <div className="bg-zinc-950 pt-8 pb-20 lg:pt-12 lg:pb-28 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-5 lg:gap-6 animate-in fade-in duration-500">
          <div className="space-y-1.5 text-white w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-2.5 lg:gap-3">
              <Archive className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-indigo-400 shrink-0" />
              Inventory Central
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base lg:text-lg max-w-xl">
              Precise tracking for laboratory reagents and supplies.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
            <Button
              onClick={openAddItemModal}
              className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 h-12 px-6 rounded-xl font-bold shadow-sm transition-all"
            >
              <Plus className="h-5 w-5 mr-2 text-zinc-400 shrink-0" /> Define Catalog
            </Button>
            <Button
              onClick={() => setIsAddStockOpen(true)}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white h-12 px-6 lg:px-8 rounded-xl shadow-lg shadow-indigo-900/40 transition-all hover:-translate-y-0.5"
            >
              <PackagePlus className="h-5 w-5 mr-2 shrink-0" /> Receive Stock
            </Button>
          </div>
        </div>
      </div>

      {/* 2. OVERLAPPING CONTENT CONTAINER */}
      <div className="relative z-10 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 -mt-10 lg:-mt-14 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
        
        {/* --- STATS RIBBON --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white p-5 lg:p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Total SKU items
              </p>
              <h3 className="text-2xl lg:text-3xl font-black text-zinc-900">
                {items?.length || 0}
              </h3>
            </div>
            <div className="h-10 w-10 lg:h-12 lg:w-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 shrink-0">
              <Layers className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
          <div className="bg-white p-5 lg:p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Low Stock Alerts
              </p>
              <h3
                className={`text-2xl lg:text-3xl font-black ${lowStockCount > 0 ? "text-rose-600" : "text-indigo-600"}`}
              >
                {lowStockCount}
              </h3>
            </div>
            <div
              className={`h-10 w-10 lg:h-12 lg:w-12 rounded-xl flex items-center justify-center shrink-0 ${lowStockCount > 0 ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}
            >
              <ShieldAlert className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
          <div className="bg-white p-5 lg:p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Active Batches
              </p>
              <h3 className="text-2xl lg:text-3xl font-black text-zinc-900">
                {items?.reduce(
                  (sum: number, i: any) => sum + (i.batches?.length || 0),
                  0,
                )}
              </h3>
            </div>
            <div className="h-10 w-10 lg:h-12 lg:w-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 shrink-0">
              <Beaker className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </div>

        {/* --- SEARCH & LIST --- */}
        <div className="space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter items by name, SKU, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 lg:py-4 bg-white border border-zinc-200 rounded-2xl text-sm lg:text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-5 lg:px-6 py-4 lg:py-5 text-[10px] lg:text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                      Item & Context
                    </th>
                    <th className="px-5 lg:px-6 py-4 lg:py-5 text-[10px] lg:text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                      Department
                    </th>
                    <th className="px-5 lg:px-6 py-4 lg:py-5 text-[10px] lg:text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                      Inventory Level
                    </th>
                    <th className="px-5 lg:px-6 py-4 lg:py-5 text-[10px] lg:text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                      Conversion
                    </th>
                    <th className="px-5 lg:px-6 py-4 lg:py-5 text-[10px] lg:text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-right pr-8 lg:pr-12">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {items?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 lg:py-24 text-center">
                        <div className="max-w-xs mx-auto space-y-4">
                          <div className="h-16 w-16 lg:h-20 lg:w-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-zinc-100">
                            <Box className="h-8 w-8 lg:h-10 lg:w-10 text-zinc-300" />
                          </div>
                          <h4 className="text-lg lg:text-xl font-bold text-zinc-800 tracking-tight">
                            Catalog is Empty
                          </h4>
                          <p className="text-zinc-500 text-xs lg:text-sm">
                            Define your reagents and items to begin tracking
                            stock batches.
                          </p>
                          <Button
                            onClick={openAddItemModal}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-11 mt-2"
                          >
                            Create First Item
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-16 lg:py-24 text-center text-zinc-400 italic text-sm"
                      >
                        No items matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredItems?.map((item: any) => {
                      const totalStock =
                        item.batches?.reduce(
                          (sum: number, batch: any) =>
                            sum + batch.currentQuantity,
                          0,
                        ) || 0;
                      const isLowStock = totalStock <= item.minStockLevel;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50 transition-colors group"
                        >
                          <td className="px-5 lg:px-6 py-5 lg:py-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-900 group-hover:text-indigo-700 transition-colors text-base lg:text-lg">
                                {item.name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter mt-1">
                                {item.sku || "No SKU"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 lg:px-6 py-5 lg:py-6 text-center">
                            <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-none px-2 lg:px-3 py-1 font-bold text-[9px] lg:text-[10px] uppercase">
                              {item.category || "Unassigned"}
                            </Badge>
                          </td>
                          <td className="px-5 lg:px-6 py-5 lg:py-6">
                            <div
                              className={`inline-flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl border-2 transition-all ${isLowStock ? "bg-rose-50 border-rose-100 text-rose-700 shadow-sm shadow-rose-100" : "bg-indigo-50 border-indigo-100 text-indigo-800"}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-lg lg:text-xl font-black leading-none">
                                  {totalStock.toFixed(2)}
                                </span>
                                <span className="text-[9px] lg:text-[10px] uppercase font-black opacity-60 tracking-wider mt-1">
                                  {item.usageUnit}
                                </span>
                              </div>
                              {isLowStock && (
                                <ShieldAlert className="h-4 w-4 lg:h-5 lg:w-5 animate-pulse" />
                              )}
                            </div>
                          </td>
                          <td className="px-5 lg:px-6 py-5 lg:py-6">
                            <div className="text-xs lg:text-sm font-medium text-zinc-700">
                              1 {item.purchaseUnit}
                            </div>
                            <div className="flex items-center gap-1.5 lg:gap-2 text-zinc-400 mt-1">
                              <ArrowUpRight className="h-3 w-3 shrink-0" />
                              <span className="text-[10px] lg:text-xs font-bold whitespace-nowrap">
                                {item.conversionFactor} {item.usageUnit}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 lg:px-6 py-5 lg:py-6 text-right pr-6 lg:pr-8">
                            <div className="flex items-center justify-end gap-1.5 lg:gap-2">
                              <Button
                                variant="ghost"
                                className="h-9 w-9 lg:h-10 lg:w-10 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-all border border-transparent hover:border-indigo-200 shrink-0"
                                onClick={() => openManageModal(item)}
                              >
                                <History className="h-4 w-4 lg:h-5 lg:w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-9 w-9 lg:h-10 lg:w-10 p-0 rounded-full hover:bg-violet-50 hover:text-violet-700 transition-all border border-transparent hover:border-violet-200 shrink-0"
                                onClick={() => openEditItemModal(item)}
                              >
                                <Edit2 className="h-4 w-4 lg:h-5 lg:w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-9 w-9 lg:h-10 lg:w-10 p-0 rounded-full hover:bg-rose-50 hover:text-rose-700 transition-all border border-transparent hover:border-rose-200 shrink-0"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
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
        </div>

        {/* --- MODAL: BATCHES & LEDGER --- */}
        {manageItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity"
              onClick={() => setManageItem(null)}
            ></div>
            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-5 lg:p-8 border-b bg-zinc-50/50">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="h-10 w-10 lg:h-14 lg:w-14 bg-indigo-100 rounded-xl lg:rounded-2xl flex items-center justify-center text-indigo-700 shadow-inner shrink-0">
                    <Archive className="h-5 w-5 lg:h-7 lg:w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-black text-zinc-900 leading-none">
                      {manageItem.name}
                    </h2>
                    <p className="text-xs lg:text-sm font-medium text-zinc-500 mt-1 lg:mt-2">
                      Inventory Management Terminal
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setManageItem(null)}
                  className="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 bg-white border border-zinc-200 rounded-full transition-all shrink-0"
                >
                  <X className="h-4 w-4 lg:h-6 lg:w-6" />
                </button>
              </div>

              {/* Enhanced Tab Navigation (Scrollable) */}
              <div className="flex border-b px-5 lg:px-8 bg-white shrink-0 gap-6 lg:gap-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button
                  onClick={() => setManageTab("BATCHES")}
                  className={`relative py-4 lg:py-5 text-xs lg:text-sm font-black uppercase tracking-widest transition-all ${manageTab === "BATCHES" ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}
                >
                  Active Batches
                  {manageTab === "BATCHES" && (
                    <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setManageTab("LEDGER")}
                  className={`relative py-4 lg:py-5 text-xs lg:text-sm font-black uppercase tracking-widest transition-all ${manageTab === "LEDGER" ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}
                >
                  Stock Ledger
                  {manageTab === "LEDGER" && (
                    <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full" />
                  )}
                </button>
              </div>

              <div className="overflow-y-auto p-5 lg:p-8 flex-1 bg-zinc-100/30">
                {manageTab === "BATCHES" && (
                  <div className="space-y-4 lg:space-y-6">
                    {manageItem.batches?.length === 0 ? (
                      <div className="text-center py-12 lg:py-20 text-zinc-400 font-medium bg-white rounded-2xl lg:rounded-3xl border-2 border-dashed text-sm">
                        No active batches for this product.
                      </div>
                    ) : (
                      manageItem.batches.map((batch: any) => (
                        <div
                          key={batch.id}
                          className="bg-white border border-zinc-200 rounded-2xl p-5 lg:p-6 shadow-sm group/batch"
                        >
                          {editingBatchId === batch.id ? (
                            <form
                              onSubmit={(e) =>
                                handleUpdateBatchSubmit(e, batch.id)
                              }
                              className="space-y-5 lg:space-y-6"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    Current Qty ({manageItem.usageUnit})
                                  </Label>
                                  <input
                                    required
                                    name="currentQuantity"
                                    type="number"
                                    step="0.01"
                                    defaultValue={batch.currentQuantity}
                                    className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    Expiry Date
                                  </Label>
                                  <input
                                    required
                                    name="expiryDate"
                                    type="date"
                                    defaultValue={
                                      new Date(batch.expiryDate)
                                        .toISOString()
                                        .split("T")[0]
                                    }
                                    className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    Storage Zone
                                  </Label>
                                  <input
                                    name="location"
                                    type="text"
                                    defaultValue={batch.location || ""}
                                    className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 lg:gap-3 pt-4 border-t border-zinc-100">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-10 rounded-xl w-full sm:w-auto"
                                  onClick={() => setEditingBatchId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  className="h-10 bg-indigo-600 text-white rounded-xl px-8 shadow-md shadow-indigo-100 w-full sm:w-auto"
                                >
                                  Save Batch Changes
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 lg:gap-8">
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12 w-full lg:flex-1">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-black text-zinc-400 tracking-tighter">
                                    Batch Identity
                                  </p>
                                  <p className="text-sm lg:text-base font-bold text-zinc-900 break-all">
                                    {batch.batchNumber}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-black text-zinc-400 tracking-tighter">
                                    Stock Remaining
                                  </p>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg lg:text-xl font-black text-indigo-600 leading-none">
                                      {batch.currentQuantity}
                                    </span>
                                    <span className="text-[10px] lg:text-xs font-bold text-zinc-500 uppercase">
                                      {manageItem.usageUnit}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-black text-zinc-400 tracking-tighter">
                                    Shelf Life
                                  </p>
                                  <p
                                    className={`text-xs lg:text-sm font-bold ${new Date(batch.expiryDate) < new Date() ? "text-rose-600" : "text-zinc-700"}`}
                                  >
                                    {format(
                                      new Date(batch.expiryDate),
                                      "dd MMM yyyy",
                                    )}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-black text-zinc-400 tracking-tighter">
                                    Location
                                  </p>
                                  <p className="text-xs lg:text-sm font-bold text-zinc-700">
                                    {batch.location || "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 lg:opacity-0 group-hover/batch:opacity-100 transition-all lg:scale-95 group-hover/batch:scale-100 w-full lg:w-auto mt-2 lg:mt-0 border-t lg:border-none pt-4 lg:pt-0">
                                <Button
                                  variant="outline"
                                  className="h-10 flex-1 lg:w-10 p-0 rounded-xl border-zinc-200 hover:text-indigo-600 hover:border-indigo-200"
                                  onClick={() => setEditingBatchId(batch.id)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-10 flex-1 lg:w-10 p-0 rounded-xl border-zinc-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                                  onClick={() => handleDeleteBatch(batch.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {manageTab === "LEDGER" && (
                  <div className="bg-white rounded-2xl lg:rounded-3xl border border-zinc-200 shadow-sm overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                      {ledgerLoading ? (
                        <div className="flex justify-center p-12 lg:p-20 animate-pulse text-indigo-600 font-bold text-sm">
                          Accessing Ledger Records...
                        </div>
                      ) : ledger?.length === 0 ? (
                        <div className="text-center py-12 lg:py-20 text-zinc-400 font-medium text-sm">
                          History is clear for this SKU.
                        </div>
                      ) : (
                        <table className="w-full text-left min-w-[600px]">
                          <thead className="bg-zinc-50 border-b border-zinc-200">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                                Timestamp
                              </th>
                              <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-center">
                                Type
                              </th>
                              <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                                Batch
                              </th>
                              <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">
                                Adjustment
                              </th>
                              <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                                Audit Note
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {ledger?.map((tx: any) => (
                              <tr
                                key={tx.id}
                                className="hover:bg-zinc-50/50 transition-colors"
                              >
                                <td className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-zinc-500 whitespace-nowrap">
                                  {format(
                                    new Date(tx.createdAt),
                                    "dd MMM yy, hh:mm a",
                                  )}
                                </td>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                                  <span
                                    className={`inline-block px-2 lg:px-3 py-1 rounded-full text-[8px] lg:text-[9px] font-black uppercase tracking-tighter border ${
                                      tx.type === "PURCHASE"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                        : tx.type === "CONSUMPTION"
                                          ? "bg-amber-50 text-amber-700 border-amber-100"
                                          : "bg-violet-50 text-violet-700 border-violet-100"
                                    }`}
                                  >
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 font-bold text-zinc-700 text-xs lg:text-sm whitespace-nowrap">
                                  #{tx.batch?.batchNumber || "DEL"}
                                </td>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 text-right">
                                  <span
                                    className={`text-xs lg:text-sm font-black flex items-center justify-end ${tx.quantity > 0 ? "text-indigo-600" : "text-rose-600"}`}
                                  >
                                    {tx.quantity > 0 ? (
                                      <ArrowUpRight className="h-3 w-3 mr-0.5 shrink-0" />
                                    ) : (
                                      <ArrowDownRight className="h-3 w-3 mr-0.5 shrink-0" />
                                    )}
                                    {Math.abs(tx.quantity)}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs text-zinc-500 font-medium max-w-[150px] lg:max-w-[240px] truncate italic">
                                  {tx.test
                                    ? `Usage via: ${tx.test.testName}`
                                    : tx.notes || "Routine update"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- ADD / EDIT ITEM MODAL (Catalog) --- */}
        {isAddItemOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <div
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsAddItemOpen(false)}
            ></div>
            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 animate-in slide-in-from-bottom-8 duration-500 max-h-[95vh] overflow-y-auto">
              <div className="p-5 lg:p-8 border-b bg-zinc-50/50 sticky top-0 z-20">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 bg-indigo-600 text-white rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
                    <Box className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">
                      {editingItem ? "Modify SKU" : "New Catalog Entry"}
                    </h2>
                    <p className="text-xs lg:text-sm font-medium text-zinc-400 mt-0.5 lg:mt-1">
                      Define item parameters and conversion rules.
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleItemSubmit} className="p-5 lg:p-8 space-y-6 lg:space-y-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div className="col-span-1 sm:col-span-2 space-y-2">
                      <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                        Full Item Name
                      </Label>
                      <input
                        required
                        name="name"
                        type="text"
                        defaultValue={editingItem?.name || ""}
                        placeholder="e.g. Sysmex Cellpack DCL"
                        className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 lg:p-3.5 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-sm lg:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                        SKU / Code
                      </Label>
                      <input
                        name="sku"
                        type="text"
                        defaultValue={editingItem?.sku || ""}
                        placeholder="SYS-1002"
                        className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-600 outline-none font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                        Department
                      </Label>
                      <input
                        name="category"
                        type="text"
                        defaultValue={editingItem?.category || ""}
                        placeholder="Hematology"
                        className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-sm lg:text-base"
                      />
                    </div>
                  </div>

                  <div className="p-4 lg:p-6 bg-violet-50/30 rounded-2xl lg:rounded-3xl border border-violet-100/50 space-y-4 lg:space-y-6">
                    <h3 className="text-[10px] lg:text-xs font-black text-violet-900 uppercase tracking-widest border-b border-violet-100 pb-2 lg:pb-3">
                      Unit Mapping Engine
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-zinc-400">
                          Purchase (Unit)
                        </Label>
                        <input
                          name="purchaseUnit"
                          type="text"
                          defaultValue={editingItem?.purchaseUnit || "Box"}
                          className="w-full bg-white border-zinc-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-violet-600 outline-none font-bold text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-violet-600">
                          Usage (Unit)
                        </Label>
                        <input
                          required
                          name="usageUnit"
                          type="text"
                          defaultValue={editingItem?.usageUnit || "ml"}
                          className="w-full bg-white border-violet-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-violet-600 outline-none font-black text-center text-violet-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-zinc-400">
                          Factor
                        </Label>
                        <input
                          name="conversionFactor"
                          type="number"
                          step="0.01"
                          defaultValue={editingItem?.conversionFactor || 1}
                          className="w-full bg-white border-zinc-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-violet-600 outline-none font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                      Critical Stock Threshold
                    </Label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <input
                        name="minStockLevel"
                        type="number"
                        defaultValue={editingItem?.minStockLevel || 10}
                        className="w-full sm:w-24 bg-rose-50 border-rose-100 text-rose-700 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 outline-none font-black text-center"
                      />
                      <span className="text-[10px] lg:text-xs text-zinc-400 font-medium">
                        Alerts will trigger when stock drops below this level.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 lg:pt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-zinc-100">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 lg:h-12 rounded-xl px-6 w-full sm:w-auto"
                    onClick={() => setIsAddItemOpen(false)}
                  >
                    Discard
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      addItemMutation.isPending || updateItemMutation.isPending
                    }
                    className="h-10 lg:h-12 bg-zinc-900 text-white rounded-xl px-8 lg:px-10 font-bold shadow-xl shadow-zinc-200 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                  >
                    {addItemMutation.isPending ||
                    updateItemMutation.isPending ? (
                      <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" />
                    ) : editingItem ? (
                      "Update Configuration"
                    ) : (
                      "Confirm Catalog Item"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD STOCK MODAL (Batch Processing) --- */}
        {isAddStockOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <div
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsAddStockOpen(false)}
            ></div>
            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 animate-in slide-in-from-bottom-8 duration-500 max-h-[95vh] overflow-y-auto">
              <div className="p-5 lg:p-8 border-b bg-indigo-50/50 sticky top-0 z-20">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 bg-indigo-600 text-white rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
                    <PackagePlus className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">
                      Stock Reception
                    </h2>
                    <p className="text-xs lg:text-sm font-medium text-indigo-600 mt-0.5 lg:mt-1">
                      Register a new physical batch.
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleAddStockSubmit} className="p-5 lg:p-8 space-y-6 lg:space-y-8">
                <div className="space-y-4 lg:space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                      Linked Catalog Product
                    </Label>
                    <select
                      required
                      name="itemId"
                      className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 lg:p-4 text-sm lg:text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Choose item to replenish...</option>
                      {items?.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.usageUnit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                        Batch / Lot #
                      </Label>
                      <input
                        required
                        name="batchNumber"
                        type="text"
                        className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 lg:p-3.5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm lg:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                        Expiry Date
                      </Label>
                      <input
                        required
                        name="expiryDate"
                        type="date"
                        className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 lg:p-3.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm lg:text-base"
                      />
                    </div>
                  </div>

                  <div className="p-5 lg:p-8 bg-zinc-900 rounded-2xl lg:rounded-3xl space-y-6 lg:space-y-8 border-4 border-indigo-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                      <div className="space-y-2 lg:space-y-3">
                        <Label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">
                          Qty Received
                        </Label>
                        <input
                          required
                          name="quantity"
                          type="number"
                          step="0.01"
                          min="0.1"
                          className="w-full bg-zinc-800 border-indigo-500/30 text-white rounded-xl lg:rounded-2xl p-3 lg:p-4 text-xl lg:text-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-2 lg:space-y-3">
                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                          MRP (Optional)
                        </Label>
                        <input
                          name="mrp"
                          type="number"
                          step="0.01"
                          placeholder="₹ 0.00"
                          className="w-full bg-zinc-800 border-zinc-700 text-white rounded-xl lg:rounded-2xl p-3 lg:p-4 text-xl lg:text-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 lg:space-y-3 border-t border-zinc-800 pt-4 lg:pt-6">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex justify-between items-center">
                        Total Purchase Cost
                        <span className="text-indigo-400 font-bold hidden sm:inline">
                          Expense Log Enabled
                        </span>
                      </Label>
                      <input
                        required
                        name="costPrice"
                        type="number"
                        step="0.01"
                        placeholder="₹ Total Paid"
                        className="w-full bg-zinc-800 border-zinc-700 text-indigo-400 rounded-xl lg:rounded-2xl p-4 lg:p-5 text-2xl lg:text-3xl font-black outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] lg:text-xs font-bold uppercase text-zinc-400">
                      Storage Zone
                    </Label>
                    <input
                      name="location"
                      type="text"
                      placeholder="Fridge A / Shelf 4..."
                      className="w-full bg-zinc-50 border-zinc-200 rounded-xl p-3 lg:p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm lg:text-base"
                    />
                  </div>
                </div>

                <div className="pt-6 lg:pt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-zinc-100">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 lg:h-12 rounded-xl px-6 w-full sm:w-auto"
                    onClick={() => setIsAddStockOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addStockMutation.isPending}
                    className="h-10 lg:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 lg:px-12 font-black shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 w-full sm:w-auto"
                  >
                    {addStockMutation.isPending ? (
                      <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin mx-auto" />
                    ) : (
                      "Execute Reception"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal Badge replacement if not found in project UI folder
function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}