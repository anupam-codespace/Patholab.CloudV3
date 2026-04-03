'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Type, AlignLeft, List, CalendarDays, FileText, AlertCircle, Image as ImageIcon, Code } from 'lucide-react';
import toast from 'react-hot-toast';

import { getCustomFields, deleteCustomField } from '@/actions/custom-field-management';
import CustomFieldForm from '../components/custom-field-form';

// 1. Define the Custom Field Interface
export interface CustomFieldDef {
  id: string;
  name: string;
  type: 'TEXT' | 'LONG_TEXT' | 'DROPDOWN' | 'DATE' | 'IMAGE' | 'RICH_TEXT';
  options: string[];
  reportLayout?: string;
}

export default function CustomFieldsTab() {
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null);

  // 2. Fetch Data with React Query
  const { data: fields = [], isLoading, isError } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields'],
    queryFn: async () => await getCustomFields(),
  });

  // 3. Handle Deletions with useMutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteCustomField(id);
    },
    onSuccess: () => {
      toast.success("Field deleted");
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
    },
    onError: () => {
      toast.error("Error deleting field");
    }
  });

  function handleDelete(id: string) {
    if (!window.confirm("Delete this field? It will be removed from all tests using it.")) return;
    deleteMutation.mutate(id);
  }

  function handleEdit(field: CustomFieldDef) {
    setEditingField(field);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingField(null);
    setIsDialogOpen(true);
  }

  // Updated to include the new IMAGE and RICH_TEXT types we added earlier
  const getTypeIcon = (type: string) => {
    switch(type) {
        case 'TEXT': return <Type className="h-3 w-3 mr-1 text-blue-600"/>;
        case 'LONG_TEXT': return <AlignLeft className="h-3 w-3 mr-1 text-orange-600"/>;
        case 'DROPDOWN': return <List className="h-3 w-3 mr-1 text-purple-600"/>;
        case 'DATE': return <CalendarDays className="h-3 w-3 mr-1 text-green-600"/>;
        case 'IMAGE': return <ImageIcon className="h-3 w-3 mr-1 text-pink-600"/>;
        case 'RICH_TEXT': return <Code className="h-3 w-3 mr-1 text-teal-600"/>;
        default: return <FileText className="h-3 w-3 mr-1"/>;
    }
  };

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex justify-end items-center bg-white p-4 rounded-lg border shadow-sm">
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Create Custom Field
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
             setIsDialogOpen(open);
             if (!open) setEditingField(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingField ? `Edit Field: ${editingField.name}` : 'Create New Custom Field'}
              </DialogTitle>
            </DialogHeader>
            <CustomFieldForm 
                key={editingField ? editingField.id : 'new'} 
                initialData={editingField || undefined}
                onSuccess={() => {
                    setIsDialogOpen(false);
                    // Invalidating the cache immediately updates the table
                    queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
                }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[250px]">Field Name</TableHead>
              <TableHead className="w-[150px]">Input Type</TableHead>
              <TableHead>Options / Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Loading Fields...</TableCell></TableRow>
            ) : isError ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center h-24 text-red-500">
                   <div className="flex items-center justify-center gap-2">
                     <AlertCircle className="h-4 w-4" /> Failed to load custom fields. Please refresh.
                   </div>
                 </TableCell>
               </TableRow>
            ) : fields.length === 0 ? (
               <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No custom fields defined yet.</TableCell></TableRow>
            ) : (
              fields.map((field) => (
                <TableRow key={field.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">{field.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {getTypeIcon(field.type)}
                        {field.type.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {field.type === 'DROPDOWN' ? field.options?.join(', ') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(field)} className="h-8 w-8 text-slate-400 hover:text-blue-600">
                           <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(field.id)} 
                          // Disables this specific trash can while it's processing
                          disabled={deleteMutation.isPending && deleteMutation.variables === field.id}
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
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