'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { getCustomFields } from '@/actions/custom-field-management';

interface CustomFieldSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CustomFieldSelector({ selectedIds, onChange }: CustomFieldSelectorProps) {
  const [open, setOpen] = useState(false);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomFields()
      .then((data) => setAvailableFields(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedFields = availableFields.filter(f => selectedIds.includes(f.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-semibold text-slate-800">Custom Report Fields</Label>
        <p className="text-[11px] text-slate-500">Select extra fields to appear on the report (e.g. Interpretation, Kit Name).</p>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white h-10 font-normal border-slate-300"
          >
            {selectedIds.length > 0 
              ? `${selectedIds.length} fields selected` 
              : "Select custom fields..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search custom fields..." />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-xs text-slate-500">
                 {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto"/> : 'No custom fields found. Create one in the "Custom Fields" tab.'}
              </CommandEmpty>
              <CommandGroup>
                {availableFields.map((field) => (
                  <CommandItem
                    key={field.id}
                    value={field.name}
                    onSelect={() => handleSelect(field.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-blue-600",
                        selectedIds.includes(field.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                        <span className="font-medium">{field.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{field.type}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Tags Display */}
      {selectedFields.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
            {selectedFields.map(field => (
                <Badge key={field.id} variant="secondary" className="bg-white border-slate-300 text-slate-700 pl-2 pr-1 py-1">
                    {field.name}
                    <X 
                        className="h-3 w-3 ml-2 text-slate-400 hover:text-red-500 cursor-pointer" 
                        onClick={() => handleSelect(field.id)}
                    />
                </Badge>
            ))}
        </div>
      )}
    </div>
  );
}