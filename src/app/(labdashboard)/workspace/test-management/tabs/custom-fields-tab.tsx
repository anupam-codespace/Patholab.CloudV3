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
  Type,
  AlignLeft,
  List,
  CalendarDays,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  Code,
} from "lucide-react";
import toast from "react-hot-toast";

import CustomFieldForm from "../components/custom-field-form";

// 1. Define the Custom Field Interface (Removed isGlobal)
export interface CustomFieldDef {
  id: string;
  name: string;
  type: "TEXT" | "LONG_TEXT" | "DROPDOWN" | "DATE" | "IMAGE" | "RICH_TEXT";
  options: string[];
  reportLayout?: string;
}

// --- API FETCHING FUNCTIONS ---
const fetchCustomFields = async (): Promise<CustomFieldDef[]> => {
  const res = await fetch("/api/workspace/custom-fields");
  if (!res.ok) throw new Error("Failed to fetch custom fields");
  const data = await res.json();
  return data.customFields || [];
};

const deleteLocalCustomField = async (id: string) => {
  const res = await fetch(`/api/workspace/custom-fields?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function CustomFieldsTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null);

  // 2. Fetch Data with React Query
  const {
    data: fields = [],
    isLoading,
    isError,
  } = useQuery<CustomFieldDef[]>({
    queryKey: ["custom-fields"],
    queryFn: fetchCustomFields,
  });

  // 3. Handle Deletions with useMutation
  const deleteMutation = useMutation({
    mutationFn: deleteLocalCustomField,
    onSuccess: () => {
      toast.success("Field deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
    },
    onError: () => {
      toast.error("Error deleting field. It may be in use.");
    },
  });

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure? Deleting this custom field will permanently remove it from all tests using it.",
      )
    )
      return;
    deleteMutation.mutate(id);
  }

  function handleEdit(field: CustomFieldDef) {
    setEditingField(field);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingField(null);
    setIsDialogOpen(true);
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "TEXT":
        return <Type className="h-3 w-3 mr-1.5 text-blue-600" />;
      case "LONG_TEXT":
        return <AlignLeft className="h-3 w-3 mr-1.5 text-orange-600" />;
      case "DROPDOWN":
        return <List className="h-3 w-3 mr-1.5 text-purple-600" />;
      case "DATE":
        return <CalendarDays className="h-3 w-3 mr-1.5 text-green-600" />;
      case "IMAGE":
        return <ImageIcon className="h-3 w-3 mr-1.5 text-pink-600" />;
      case "RICH_TEXT":
        return <Code className="h-3 w-3 mr-1.5 text-teal-600" />;
      default:
        return <FileText className="h-3 w-3 mr-1.5" />;
    }
  };

  const filteredFields = fields.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search custom fields..."
            className="pl-10 focus-visible:ring-blue-500 border-slate-300 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingField(null);
          }}>
          <Button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Custom Field
          </Button>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50 sticky top-0 z-10">
              <DialogTitle className="text-xl text-slate-800">
                {editingField
                  ? `Edit Field: ${editingField.name}`
                  : "Create New Custom Field"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <CustomFieldForm
                key={editingField ? editingField.id : "new"}
                initialData={editingField || undefined}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({
                    queryKey: ["custom-fields"],
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
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                <TableHead className="font-semibold text-slate-600 w-[250px]">
                  Field Name
                </TableHead>
                <TableHead className="font-semibold text-slate-600 w-[180px]">
                  Input Type
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Options / Details
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
                    Loading fields dictionary...
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
                        Failed to load custom fields. Please refresh.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredFields.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-32 text-slate-500">
                    No custom fields found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFields.map((field) => (
                  <TableRow
                    key={field.id}
                    className={`transition-colors ${editingField?.id === field.id ? "bg-blue-50/50" : "hover:bg-slate-50/80"}`}>
                    <TableCell className="font-medium text-slate-900">
                      {field.name}
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {getTypeIcon(field.type)}
                        {field.type.replace("_", " ")}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {field.type === "DROPDOWN" &&
                      field.options &&
                      field.options.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {field.options.map((opt, i) => (
                            <span
                              key={i}
                              className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">
                              {opt}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(field)}
                          title="Edit Field"
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(field.id)}
                          disabled={
                            deleteMutation.isPending &&
                            deleteMutation.variables === field.id
                          }
                          title="Delete Field"
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
