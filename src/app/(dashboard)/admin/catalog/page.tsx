"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Edit,
  Trash2,
  Database,
  Loader2,
  Beaker,
  Building2,
    TestTube,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";
import { CatalogDialog } from "./_components/CatalogDialog"; // We will build this next

const TABS = [
  {
    id: "tests",
    label: "Tests & Packages",
    icon: Database,
    columns: ["name", "code", "type", "price"],
  },
  {
    id: "parameters",
    label: "Parameters (Metrics)",
    icon: Activity,
    columns: ["name", "code", "unit", "inputType"],
  },
  {
    id: "departments",
    label: "Departments",
    icon: Building2,
    columns: ["name", "code"],
  },
  {
    id: "samples",
    label: "Sample Types",
    icon: Beaker,
    columns: ["name", "code"],
  },
  {
    id: "containers",
    label: "Containers",
    icon: TestTube,
    columns: ["name", "code", "capColor"],
  },
  {
    id: "categories",
    label: "Categories",
    icon: Database,
    columns: ["name", "description"],
  },
];

export default function MasterCatalogPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch data dynamically based on the active tab
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["catalog", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/admin/catalog/${activeTab}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Dynamic Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/catalog/${activeTab}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast.success("Record deleted/archived");
      queryClient.invalidateQueries({ queryKey: ["catalog", activeTab] });
    },
    onError: () => toast.error("Failed to delete record"),
  });

  const handleDelete = (id: string) => {
    if (
      confirm("Are you sure you want to delete/archive this global record?")
    ) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const openEditDialog = (record: any) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const currentTabConfig = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Master Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure the global medical engine available to all SaaS tenants.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add{" "}
          {currentTabConfig.label.split(" ")[0]}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-lg flex space-x-1 overflow-x-auto w-full justify-start h-auto">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-2.5 px-4">
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card className="mt-4 border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      {currentTabConfig.columns.map((col) => (
                        <th key={col} className="px-6 py-4">
                          {col}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record: any) => (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/50 transition-colors">
                        {currentTabConfig.columns.map((col) => (
                          <td
                            key={col}
                            className="px-6 py-4 text-slate-700 font-medium">
                            {/* Format arrays or booleans nicely */}
                            {typeof record[col] === "boolean" ? (
                              <Badge variant="outline">
                                {record[col] ? "Yes" : "No"}
                              </Badge>
                            ) : (
                              record[col] || "-"
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(record)}
                            className="text-blue-600 hover:bg-blue-50 h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                            className="text-red-500 hover:bg-red-50 h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td
                          colSpan={currentTabConfig.columns.length + 1}
                          className="p-8 text-center text-slate-500">
                          No records found. Create one to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* The Dynamic Form Modal */}
      <CatalogDialog
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        resource={activeTab}
        columns={currentTabConfig.columns}
        initialData={editingRecord}
      />
    </div>
  );
}
