"use client";

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// --- TYPES ---
export type FilterType = "select" | "range" | "text";

export interface FilterConfig {
  id: string;
  label: string;
  type: FilterType;
  options?: { label: string; value: string }[]; // For Select
  placeholder?: string;
}

interface FilterSheetProps {
  title?: string;
  description?: string;
  config: FilterConfig[];
  onApply: (filters: Record<string, any>) => void;
  onReset?: () => void;
  activeFilters?: Record<string, any>; // To show active state icon
}

export function FilterSheet({
  title = "Filters",
  description = "Refine your search results.",
  config,
  onApply,
  onReset,
  activeFilters,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});

  // Reset internal state when sheet opens
  useEffect(() => {
    if (open && activeFilters) {
      setValues({ ...activeFilters });
    }
  }, [open, activeFilters]);

  const handleApply = () => {
    onApply(values);
    setOpen(false);
  };

  const handleReset = () => {
    setValues({});
    if (onReset) onReset();
    setOpen(false);
  };

  const hasActiveFilters =
    activeFilters && Object.values(activeFilters).some((v) => v && v !== "ALL");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`h-9 w-9 shrink-0 bg-card ${hasActiveFilters ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
          <Filter className="h-4 w-4" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[300px] sm:w-[350px] flex flex-col h-full z-[100]">
        <SheetHeader className="px-1 border-b pb-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {config.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                {field.label}
              </Label>

              {/* SELECT INPUT */}
              {field.type === "select" && (
                <Select
                  value={values[field.id] || "ALL"}
                  onValueChange={(val) =>
                    setValues((prev) => ({ ...prev, [field.id]: val }))
                  }>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All {field.label}s</SelectItem>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* RANGE INPUT (e.g. Price) */}
              {field.type === "range" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="h-9"
                    value={values[`${field.id}Min`] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [`${field.id}Min`]: e.target.value,
                      }))
                    }
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    className="h-9"
                    value={values[`${field.id}Max`] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [`${field.id}Max`]: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {/* TEXT INPUT */}
              {field.type === "text" && (
                <Input
                  placeholder={field.placeholder}
                  value={values[field.id] || ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.id]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="border-t pt-4 flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleApply}>
            Apply Filters
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleReset}>
            Reset All
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
