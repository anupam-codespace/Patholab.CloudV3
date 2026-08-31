"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  label: string;
  value: string;
}

interface CreatableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  icon?: any;
  /** When true, allows creating new entries by typing (default true). */
  creatable?: boolean;
  /** Empty-state label shown when no option matches. */
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * CreatableCombobox — a search-driven dropdown that also lets the user type a
 * brand-new value when no existing option matches.
 *
 * Used by:
 *  - Registration page (new patient) for Doctor + Agency selectors
 *  - Accession page (visit booking) for Doctor + Agency selectors (v3.2.1)
 *
 * When the user types a name and clicks "+ Add", the `onChange` callback fires
 * with the raw typed string. The backend is responsible for auto-creating the
 * Doctor/Agency record if it doesn't exist (see /api/workspace/patients POST
 * and /api/workspace/accession POST — both have v3.2.1 auto-create logic).
 */
export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder = "Select...",
  icon: Icon,
  creatable = true,
  emptyLabel = "No record found.",
  className,
  disabled,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative group cursor-pointer">
          {Icon && (
            <Icon className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70 group-hover:text-primary transition-colors z-10" />
          )}
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full h-11 pl-10 pr-4 justify-between font-normal bg-muted/30 border-border hover:bg-card focus:bg-card text-left text-sm rounded-xl transition-all shadow-sm",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">
              {value
                ? options.find((opt) => opt.value === value)?.label || value
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 shadow-2xl border-slate-100 rounded-xl overflow-hidden"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Search or type new..."
            onValueChange={(search) => setInputValue(search)}
            className="h-11 text-sm border-none focus:ring-0"
          />
          <CommandList className="max-h-[250px] custom-scrollbar">
            <CommandEmpty>
              <div className="p-3 text-sm text-muted-foreground text-center">
                <p className="mb-2">{emptyLabel}</p>
                {creatable && inputValue.trim() && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full bg-primary/10 text-primary hover:bg-primary/20 font-bold"
                    onClick={() => {
                      onChange(inputValue.trim());
                      setOpen(false);
                    }}
                  >
                    + Add "{inputValue.trim()}"
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="text-sm py-2.5 cursor-pointer hover:bg-muted/30"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
