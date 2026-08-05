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
  TestTube2,
  AlertCircle,
  Globe,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import ContainerForm from "../components/container-form";

// 1. Define the Multi-Tenant Container Interface
export interface ContainerType {
  id: string;
  name: string;
  code: string;
  capColor: string;
  isGlobal: boolean; // CRITICAL FOR SAAS
}

// --- API FETCHING FUNCTIONS ---
const fetchContainers = async (): Promise<ContainerType[]> => {
  const res = await fetch("/api/workspace/containers");
  if (!res.ok) throw new Error("Failed to fetch containers");
  const data = await res.json();
  return data.containers || [];
};

const deleteLocalContainer = async (id: string) => {
  const res = await fetch(`/api/workspace/containers?id=${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return true;
};

export default function ContainersTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog & Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContainer, setEditingContainer] =
    useState<ContainerType | null>(null);

  // 2. Fetch Containers with React Query
  const {
    data: containers = [],
    isLoading,
    isError,
  } = useQuery<ContainerType[]>({
    queryKey: ["local-containers"],
    queryFn: fetchContainers,
  });

  // 3. Handle Deletions with useMutation
  const deleteMutation = useMutation({
    mutationFn: deleteLocalContainer,
    onSuccess: () => {
      toast.success("Container deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["local-containers"] });
    },
    onError: () => {
      toast.error("Error deleting container. It may be in use.");
    },
  });

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure? Deleting this custom container will affect existing tests using it.",
      )
    )
      return;
    deleteMutation.mutate(id);
  }

  // --- Handlers for Add/Edit ---
  function handleEdit(container: ContainerType) {
    setEditingContainer(container);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingContainer(null);
    setIsDialogOpen(true);
  }

  const filteredContainers = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by container name or code..."
            className="pl-10 focus-visible:ring-primary border-border w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* EDIT/ADD MODAL */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingContainer(null);
          }}>
          <Button
            onClick={handleAddNew}
            className="bg-primary hover:bg-primary/90 shadow-sm shrink-0 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Custom Container
          </Button>

          <DialogContent className="max-w-md p-0 border-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-muted/30 sticky top-0 z-10">
              <DialogTitle className="text-xl text-slate-800">
                {editingContainer
                  ? `Edit Container: ${editingContainer.name}`
                  : "Add New Custom Container"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6">
              {/* PASS DATA TO FORM */}
              <ContainerForm
                key={editingContainer ? editingContainer.id : "new"}
                initialData={editingContainer || undefined}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({
                    queryKey: ["local-containers"],
                  });
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border hover:bg-muted/30">
                <TableHead className="w-[80px] font-semibold text-muted-foreground">
                  Preview
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Container Name
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Code
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Scope
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Hex Color
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
                    colSpan={6}
                    className="text-center h-32 text-muted-foreground animate-pulse">
                    Loading containers dictionary...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center h-32 text-red-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                      <span className="font-medium">
                        Failed to load containers. Please refresh the page.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredContainers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center h-32 text-muted-foreground">
                    No containers found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContainers.map((container) => (
                  <TableRow
                    key={container.id}
                    className={`transition-colors ${editingContainer?.id === container.id ? "bg-primary/10/50" : "hover:bg-muted/50/80"} ${container.isGlobal ? "bg-slate-50/30" : ""}`}>
                    <TableCell>
                      <div
                        className="w-8 h-8 rounded-full border border-border shadow-sm flex items-center justify-center"
                        style={{
                          backgroundColor: container.capColor || "#ccc",
                        }}>
                        <TestTube2 className="h-4 w-4 text-white drop-shadow-md mix-blend-luminosity" />
                      </div>
                    </TableCell>

                    <TableCell className="font-medium text-foreground">
                      {container.name}
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs font-semibold bg-muted px-2 py-1 rounded text-muted-foreground border border-border">
                        {container.code}
                      </span>
                    </TableCell>

                    <TableCell>
                      {container.isGlobal ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-indigo-50 text-primary px-2.5 py-1 rounded-md border border-indigo-100">
                          <Globe size={12} /> Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-50 text-primary px-2.5 py-1 rounded-md border border-emerald-100">
                          <Building2 size={12} /> Local
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground font-mono uppercase">
                      {container.capColor || "—"}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* EDIT BUTTON */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(container)}
                          disabled={container.isGlobal}
                          title={
                            container.isGlobal
                              ? "Global containers cannot be edited"
                              : "Edit Container"
                          }
                          className="h-8 w-8 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* DELETE BUTTON */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(container.id)}
                          disabled={
                            container.isGlobal ||
                            (deleteMutation.isPending &&
                              deleteMutation.variables === container.id)
                          }
                          title={
                            container.isGlobal
                              ? "Global containers cannot be deleted"
                              : "Delete Container"
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
