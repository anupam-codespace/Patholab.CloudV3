'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getSampleTypes, createSampleType, updateSampleType, deleteSampleType } from '@/actions/lims-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Loader2, TestTube, Pencil, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// 1. Define the Sample Type Interface
export interface SampleType {
  id: string;
  name: string;
}

// 2. Zod Schema
const sampleSchema = z.object({
  name: z.string().min(1, "Sample name is required"),
});

type SampleFormData = z.infer<typeof sampleSchema>;

export default function SamplesTab() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<SampleType | null>(null);

  // 3. React Query for Fetching
  const { data: samples = [], isLoading, isError } = useQuery<SampleType[]>({
    queryKey: ['sample-types'],
    queryFn: async () => await getSampleTypes(),
  });

  // 4. React Hook Form Setup
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SampleFormData>({
    resolver: zodResolver(sampleSchema),
    defaultValues: { name: '' }
  });

  // 5. Mutations for Save and Delete
  const saveMutation = useMutation({
    mutationFn: async (data: SampleFormData) => {
      if (editingItem) {
        await updateSampleType(editingItem.id, { name: data.name });
        return "Sample updated";
      } else {
        await createSampleType({ name: data.name });
        return "Sample added";
      }
    },
    onSuccess: (message) => {
      toast.success(message);
      handleCancel();
      queryClient.invalidateQueries({ queryKey: ['sample-types'] });
    },
    onError: () => {
      toast.error("Failed to save sample");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteSampleType(id);
    },
    onSuccess: () => {
      toast.success("Sample type deleted");
      queryClient.invalidateQueries({ queryKey: ['sample-types'] });
    },
    onError: () => {
      toast.error("Could not delete sample type");
    }
  });

  // --- Handlers ---
  function handleEdit(item: SampleType) {
    setEditingItem(item);
    setValue('name', item.name);
  }

  function handleCancel() {
    setEditingItem(null);
    reset({ name: '' });
  }

  function onSubmit(data: SampleFormData) {
    saveMutation.mutate(data);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this sample type?")) return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* LEFT: FORM */}
      <div className="md:col-span-1 space-y-4">
        <div className={`p-4 border rounded-lg transition-colors ${editingItem ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
          <div className="font-semibold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
                <TestTube className="h-4 w-4" /> {editingItem ? 'Edit Sample' : 'Add Sample Type'}
            </span>
            {editingItem && (
                <Button variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0 text-slate-500 hover:bg-blue-100 hover:text-blue-700">
                    <X className="h-4 w-4"/>
                </Button>
            )}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Sample Name</label>
              <Input 
                placeholder="e.g. Serum" 
                {...register("name")}
                className={errors.name ? "border-red-500 bg-red-50" : "bg-white"}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="flex gap-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : (
                    editingItem ? 'Update' : <><Plus className="mr-2 h-4 w-4" /> Add</>
                )}
                </Button>
                {editingItem && (
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={saveMutation.isPending}>
                        Cancel
                    </Button>
                )}
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT: LIST */}
      <div className="md:col-span-2 border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">Loading sample types...</TableCell></TableRow>
            ) : isError ? (
               <TableRow>
                 <TableCell colSpan={2} className="text-center h-24 text-red-500">
                   <div className="flex items-center justify-center gap-2">
                     <AlertCircle className="h-4 w-4" /> Failed to load sample types. Please refresh.
                   </div>
                 </TableCell>
               </TableRow>
            ) : samples.length === 0 ? (
               <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No sample types found.</TableCell></TableRow>
            ) : (
              samples.map((item) => (
                <TableRow key={item.id} className={editingItem?.id === item.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}>
                  <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(item)} 
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(item.id)} 
                          disabled={deleteMutation.isPending && deleteMutation.variables === item.id}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
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
  );
}