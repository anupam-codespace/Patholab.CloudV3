'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { UploadCloud, FileImage, Code } from 'lucide-react'; // ✅ Import icons for new types

// --- TYPES ---
interface CustomFieldDef {
  id: string;
  name: string;
  // ✅ UPDATED: Added IMAGE and RICH_TEXT to type definition
  type: 'TEXT' | 'LONG_TEXT' | 'DROPDOWN' | 'DATE' | 'IMAGE' | 'RICH_TEXT'; 
  options: string[];
}

interface TemplateFieldMapping {
  id: string;
  fieldDefId: string;
  fieldDef: CustomFieldDef;
  order: number;
  required: boolean;
}

interface CustomResultValue {
  fieldDefId: string;
  value: string;
}

interface DynamicFieldProps {
  fields: TemplateFieldMapping[]; 
  values: CustomResultValue[];    
  onChange: (fieldDefId: string, value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function DynamicTestFields({ 
  fields, 
  values, 
  onChange, 
  readOnly = false,
  className 
}: DynamicFieldProps) {
  
  if (!fields || fields.length === 0) return null;

  // Ensure fields are sorted by order
  const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className={cn("space-y-4 border-t border-slate-100 pt-4 mt-4 bg-slate-50/50 p-4 rounded-md", className)}>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
        <span>Additional Information</span>
        <div className="h-px bg-slate-200 flex-1"></div>
      </h4>
      
      <div className="grid grid-cols-1 gap-4">
        {sortedFields.map((mapping) => {
          const def = mapping.fieldDef;
          const currentVal = values.find((v) => v.fieldDefId === def.id)?.value || '';

          return (
            <div key={def.id} className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-medium flex items-center gap-2">
                {def.name} 
                {mapping.required && <span className="text-red-500">*</span>}
              </Label>
              
              {/* --- RENDER LOGIC --- */}
              
              {/* 1. LONG TEXT (Textarea) */}
              {def.type === 'LONG_TEXT' ? (
                <Textarea 
                  value={currentVal}
                  onChange={(e) => onChange(def.id, e.target.value)}
                  disabled={readOnly}
                  className="bg-white min-h-[80px] text-sm resize-y"
                  placeholder={`Enter ${def.name.toLowerCase()}...`}
                />
              
              /* 2. DROPDOWN (Select) */
              ) : def.type === 'DROPDOWN' ? (
                <Select 
                  value={currentVal} 
                  onValueChange={(val) => onChange(def.id, val)} 
                  disabled={readOnly}
                >
                   <SelectTrigger className="bg-white h-9 text-sm">
                      <SelectValue placeholder="Select option..." />
                   </SelectTrigger>
                   <SelectContent>
                      {def.options?.map((opt, idx) => (
                        <SelectItem key={`${def.id}-opt-${idx}`} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                   </SelectContent>
                </Select>

              /* 3. ✅ NEW: IMAGE (Upload Preview) */
              ) : def.type === 'IMAGE' ? (
                <div className="border-2 border-dashed border-slate-300 rounded-md p-6 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition cursor-not-allowed">
                    <div className="bg-slate-100 p-2 rounded-full mb-2">
                        <UploadCloud className="h-5 w-5 text-slate-400" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Upload Image / Graph</span>
                    <span className="text-[10px] text-slate-400 mt-1">(Max 2MB)</span>
                </div>

              /* 4. ✅ NEW: RICH TEXT (HTML Input) */
              ) : def.type === 'RICH_TEXT' ? (
                <div className="space-y-1">
                    <Textarea 
                      value={currentVal}
                      onChange={(e) => onChange(def.id, e.target.value)}
                      disabled={readOnly}
                      className="bg-white min-h-[100px] text-sm font-mono"
                      placeholder={`Enter HTML content...`}
                    />
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Code className="h-3 w-3" /> <span>Supports HTML tags (&lt;b&gt;, &lt;i&gt;, etc.)</span>
                    </div>
                </div>

              /* 5. STANDARD TEXT (Input) & DATE */
              ) : (
                <Input 
                  value={currentVal}
                  onChange={(e) => onChange(def.id, e.target.value)}
                  disabled={readOnly}
                  type={def.type === 'DATE' ? 'date' : 'text'}
                  className="bg-white h-9 text-sm"
                  placeholder={def.type === 'DATE' ? undefined : `Enter ${def.name.toLowerCase()}...`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}