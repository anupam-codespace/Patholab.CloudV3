'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, X, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

import { saveCustomField } from '@/actions/custom-field-management';
import { DynamicTestFields } from './dynamic-test-fields';

// ✅ UPDATE 1: Add IMAGE, RICH_TEXT and reportLayout to validation schema
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['TEXT', 'LONG_TEXT', 'DROPDOWN', 'DATE', 'IMAGE', 'RICH_TEXT']),
  reportLayout: z.string().optional(), // New field for controlling image size
});

export default function CustomFieldForm({ initialData, onSuccess }: { initialData?: any, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<string[]>(initialData?.options || []);
  const [newOption, setNewOption] = useState('');

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'TEXT',
      reportLayout: initialData?.reportLayout || 'FULL', // Default to Full Width
    }
  });

  const watchedName = form.watch('name');
  const watchedType = form.watch('type');
  const watchedLayout = form.watch('reportLayout');

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setOptions([...options, newOption.trim()]);
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await saveCustomField({
        id: initialData?.id,
        name: data.name,
        type: data.type,
        options: data.type === 'DROPDOWN' ? options : [],
        // ✅ Send the chosen layout to the server
        reportLayout: data.reportLayout, 
      });
      toast.success(initialData ? "Field updated" : "Field created");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save field");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewFields = [{
    id: 'preview',
    fieldDefId: 'preview-def',
    fieldDef: {
      id: 'preview-def',
      name: watchedName || 'Field Name',
      type: watchedType as any,
      options: options.length > 0 ? options : ['Option 1', 'Option 2']
    },
    order: 0,
    required: false
  }];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* LEFT: FORM */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        <div>
          <Label>Field Name</Label>
          <Input {...form.register('name')} placeholder="e.g. ECG Graph, Cardiologist Note" />
        </div>

        <div>
          <Label>Input Type</Label>
          <Select 
            onValueChange={(val) => form.setValue('type', val as any)} 
            defaultValue={form.getValues('type')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXT">Short Text</SelectItem>
              <SelectItem value="LONG_TEXT">Long Text (TextArea)</SelectItem>
              <SelectItem value="DROPDOWN">Dropdown List</SelectItem>
              <SelectItem value="DATE">Date Picker</SelectItem>
              {/* ✅ Add New Options */}
              <SelectItem value="IMAGE">Image / Graph Upload</SelectItem>
              <SelectItem value="RICH_TEXT">Rich Text / HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ✅ NEW: Layout Selector (Only shows when Image is selected) */}
        {watchedType === 'IMAGE' && (
            <div className="bg-primary/10 p-4 rounded-md border border-blue-100">
                <Label className="flex items-center gap-2 mb-3 text-blue-800 text-xs font-bold uppercase tracking-wide">
                    <LayoutTemplate className="h-4 w-4"/> Report Display Size
                </Label>
                <div className="grid grid-cols-3 gap-2">
                    {/* Full Width Option */}
                    <div 
                        className={`cursor-pointer border-2 rounded-md p-2 flex flex-col items-center gap-2 text-xs font-medium transition-all ${watchedLayout === 'FULL' ? 'border-primary bg-card shadow-sm ring-1 ring-blue-600' : 'border-border bg-card/50 hover:bg-white'}`}
                        onClick={() => form.setValue('reportLayout', 'FULL')}
                    >
                        <div className="w-full h-6 bg-slate-300 rounded border border-slate-400"></div>
                        <span className="text-[10px] text-muted-foreground">Full Width (1/1)</span>
                    </div>

                    {/* Half Width Option */}
                    <div 
                        className={`cursor-pointer border-2 rounded-md p-2 flex flex-col items-center gap-2 text-xs font-medium transition-all ${watchedLayout === 'HALF' ? 'border-primary bg-card shadow-sm ring-1 ring-blue-600' : 'border-border bg-card/50 hover:bg-white'}`}
                        onClick={() => form.setValue('reportLayout', 'HALF')}
                    >
                        <div className="flex gap-1 w-full h-6">
                            <div className="w-1/2 bg-slate-300 rounded border border-slate-400"></div>
                            <div className="w-1/2 bg-slate-200 rounded border border-border border-dashed"></div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Half Width (1/2)</span>
                    </div>

                    {/* Third Width Option */}
                    <div 
                        className={`cursor-pointer border-2 rounded-md p-2 flex flex-col items-center gap-2 text-xs font-medium transition-all ${watchedLayout === 'THIRD' ? 'border-primary bg-card shadow-sm ring-1 ring-blue-600' : 'border-border bg-card/50 hover:bg-white'}`}
                        onClick={() => form.setValue('reportLayout', 'THIRD')}
                    >
                        <div className="flex gap-1 w-full h-6">
                            <div className="w-1/3 bg-slate-300 rounded border border-slate-400"></div>
                            <div className="w-1/3 bg-slate-200 rounded border border-border border-dashed"></div>
                            <div className="w-1/3 bg-slate-200 rounded border border-border border-dashed"></div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Small (1/3)</span>
                    </div>
                </div>
                <p className="text-[10px] text-primary/80 mt-2">Select how much width this image should take on the printed report.</p>
            </div>
        )}

        {watchedType === 'DROPDOWN' && (
          <div className="bg-muted/30 p-3 rounded-md border border-border">
            <Label className="text-xs">Dropdown Options</Label>
            <div className="flex gap-2 mt-2 mb-3">
              <Input 
                value={newOption} 
                onChange={e => setNewOption(e.target.value)} 
                placeholder="Add option..." 
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddOption} className="h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.map((opt, i) => (
                <Badge key={i} variant="outline" className="bg-card pl-2 pr-1 py-0.5 text-[10px]">
                  {opt} <X className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500" onClick={() => removeOption(i)}/>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save
          </Button>
        </div>
      </form>

      {/* RIGHT: PREVIEW */}
      <div className="bg-slate-100/50 p-6 rounded-lg border-2 border-dashed border-border flex flex-col justify-center">
        <div className="bg-card p-4 shadow-sm border border-border rounded-md">
           <p className="text-[10px] text-muted-foreground/70 mb-2 uppercase tracking-wider font-bold">Preview (Data Entry Form)</p>
           <DynamicTestFields 
              fields={previewFields} 
              values={[]} 
              onChange={() => {}} 
           />
        </div>
      </div>
    </div>
  );
}