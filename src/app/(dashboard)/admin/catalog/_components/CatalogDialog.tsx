"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface CatalogDialogProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  resource: string;
  columns: string[];
  initialData: any;
}

export function CatalogDialog({
  isOpen,
  setIsOpen,
  resource,
  columns,
  initialData,
}: CatalogDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        // Create an empty object based on the required columns
        const emptyState: any = {};
        columns.forEach((col) => (emptyState[col] = ""));
        setFormData(emptyState);
      }
    }
  }, [isOpen, initialData, columns]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      // Ensure numbers map to Prisma Float/Decimal correctly
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = initialData
        ? `/api/admin/catalog/${resource}/${initialData.id}`
        : `/api/admin/catalog/${resource}`;
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success(`${initialData ? "Updated" : "Created"} successfully!`);
      queryClient.invalidateQueries({ queryKey: ["catalog", resource] });
      setIsOpen(false);
    },
    onError: () => {
      toast.error("Failed to save changes. Please check your inputs.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {initialData ? "Edit" : "Add New"} {resource.slice(0, -1)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-4">
          {columns.map((col) => (
            <div key={col} className="space-y-2">
              <Label className="capitalize">
                {col.replace(/([A-Z])/g, " $1").trim()}
              </Label>
              <Input
                name={col}
                value={formData[col] || ""}
                onChange={handleChange}
                type={
                  col.toLowerCase().includes("price") || col === "order"
                    ? "number"
                    : "text"
                }
                placeholder={`Enter ${col}`}
                required
              />
            </div>
          ))}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saveMutation.isPending}>
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
