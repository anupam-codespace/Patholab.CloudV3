'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getTestHeadings, createTestHeading, updateTestHeading, deleteTestHeading } from '@/actions/lims-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Layers, Pencil, Trash2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// 1. Define the Heading Interface
export interface Heading {
  id: string;
  name: string;
}

// 2. Zod Schema
const headingSchema = z.object({
  name: z.string().min(1, "Heading text is required"),
});

type HeadingFormData = z.infer<typeof headingSchema>;

export default function HeadingsTab() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<Heading | null>(null);

  // 3. React Query for Fetching
  const { data: headings = [], isLoading, isError } = useQuery<Heading[]>({
    queryKey: ['test-headings'],
    queryFn: async () => await getTestHeadings(),
  });

  // 4. React Hook Form Setup
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<HeadingFormData>({
    resolver: zodResolver(headingSchema),
    defaultValues: { name: '' }
  });

  // 5. Mutations for Save and Delete
  const saveMutation = useMutation({
    mutationFn: async (data: HeadingFormData) => {
      if (editingItem) {
        await updateTestHeading(editingItem.id, data.name);
        return "Heading updated";
      } else {
        await createTestHeading(data.name);
        return "Heading created";
      }
    },
    onSuccess: (message) => {
      toast.success(message);
      handleCancel();
      queryClient.invalidateQueries({ queryKey: ['test-headings'] });
    },
    onError: () => {
      toast.error("Failed to save heading");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteTestHeading(id);
    },
    onSuccess: () => {
      toast.success("Heading deleted");
      queryClient.invalidateQueries({ queryKey: ['test-headings'] });
    },
    onError: () => {
      toast.error("Could not delete heading");
    }
  });

  // --- Handlers ---
  function handleEdit(item: Heading) {
    setEditingItem(item);
    setValue('name', item.name);
  }

  function handleCancel() {
    setEditingItem(null);
    reset({ name: '' });
  }

  function onSubmit(data: HeadingFormData) {
    saveMutation.mutate(data);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this heading?")) return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* LEFT: FORM */}
      <div className="md:col-span-1 space-y-4">
        <div className={`p-4 border rounded-lg transition-colors ${editingItem ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
          <div className="font-semibold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" /> {editingItem ? 'Edit Heading' : 'Add Test Heading'}
            </span>
            {editingItem && (
                <Button variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0 text-slate-500 hover:bg-blue-100 hover:text-blue-700">
                    <X className="h-4 w-4"/>
                </Button>
            )}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Heading Text</label>
              <Input 
                placeholder="e.g. LIPID PROFILE" 
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
              <TableHead>Heading Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">Loading headings...</TableCell></TableRow>
            ) : isError ? (
               <TableRow>
                 <TableCell colSpan={2} className="text-center h-24 text-red-500">
                   <div className="flex items-center justify-center gap-2">
                     <AlertCircle className="h-4 w-4" /> Failed to load headings. Please refresh.
                   </div>
                 </TableCell>
               </TableRow>
            ) : headings.length === 0 ? (
               <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No headings found.</TableCell></TableRow>
            ) : (
              headings.map((item) => (
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