'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { UploadCloud, Code, Trash2 } from 'lucide-react'; 

// --- TYPES ---
export interface CustomFieldDef {
  id: string;
  name: string;
  type: 'TEXT' | 'LONG_TEXT' | 'DROPDOWN' | 'DATE' | 'IMAGE' | 'RICH_TEXT'; 
  options: string[];
}

export interface TemplateFieldMapping {
  id: string;
  fieldDefId: string;
  fieldDef: CustomFieldDef;
  order: number;
  required: boolean;
}

export interface CustomResultValue {
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
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span>Additional Information</span>
        <div className="h-px bg-slate-200 flex-1"></div>
      </h4>
      
      <div className="grid grid-cols-1 gap-4">
        {sortedFields.map((mapping) => {
          const def = mapping.fieldDef;
          const currentVal = values.find((v) => v.fieldDefId === def.id)?.value || '';

          return (
            <div key={def.id} className="space-y-1.5">
              <Label className="text-xs text-foreground/80 font-medium flex items-center gap-2">
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
                  className="bg-card min-h-[80px] text-sm resize-y"
                  placeholder={`Enter ${def.name.toLowerCase()}...`}
                />
              
              /* 2. DROPDOWN (Select) */
              ) : def.type === 'DROPDOWN' ? (
                <Select 
                  value={currentVal} 
                  onValueChange={(val) => onChange(def.id, val)} 
                  disabled={readOnly}
                >
                   <SelectTrigger className="bg-card h-9 text-sm">
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

              /* 3. ✅ INTERACTIVE: IMAGE (Upload Preview) */
              ) : def.type === 'IMAGE' ? (
                <div className="relative border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center bg-card hover:bg-muted/30 transition group overflow-hidden">
                    {/* Hidden Native File Input */}
                    <input 
                      type="file"
                      accept="image/*"
                      disabled={readOnly}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Generating a local preview URL
                          // In a real app, you would upload this file to S3/Cloudinary and pass the URL to onChange
                          const previewUrl = URL.createObjectURL(file);
                          onChange(def.id, previewUrl);
                        }
                      }}
                    />
                    
                    {currentVal ? (
                      <div className="flex flex-col items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentVal} alt="Preview" className="max-h-32 rounded-md shadow-sm object-contain relative z-0" />
                        {!readOnly && (
                            <span className="text-xs text-primary underline group-hover:text-blue-800 relative z-20 bg-card/80 px-2 py-1 rounded mt-1">
                              Click to replace image
                            </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="bg-muted p-2 rounded-full mb-2 group-hover:bg-primary/10 transition-colors">
                            <UploadCloud className="h-5 w-5 text-muted-foreground/70 group-hover:text-blue-500" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium group-hover:text-slate-700">Click or drag to upload Image</span>
                        <span className="text-[10px] text-muted-foreground/70 mt-1">(Max 2MB)</span>
                      </>
                    )}
                </div>

              /* 4. ✅ REFINED: RICH TEXT (HTML Input) */
              ) : def.type === 'RICH_TEXT' ? (
                <div className="space-y-1">
                    <Textarea 
                      value={currentVal}
                      onChange={(e) => onChange(def.id, e.target.value)}
                      disabled={readOnly}
                      className="bg-muted/30 min-h-[100px] text-sm font-mono border-border focus:bg-card"
                      placeholder={`<b>Patient Note:</b><br/>Enter HTML content here...`}
                    />
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Code className="h-3 w-3" /> <span>Raw HTML Editor (Supports &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, etc.)</span>
                    </div>
                </div>

              /* 5. STANDARD TEXT (Input) & DATE */
              ) : (
                <Input 
                  value={currentVal}
                  onChange={(e) => onChange(def.id, e.target.value)}
                  disabled={readOnly}
                  type={def.type === 'DATE' ? 'date' : 'text'}
                  className="bg-card h-9 text-sm"
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