'use client';

import { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/actions/lims-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Loader2, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null); // Tracks if we are editing
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) { toast.error("Failed to load departments"); } 
    finally { setLoading(false); }
  }

  // Populate form for editing
  function handleEdit(item: any) {
    setEditingItem(item);
    setNewName(item.name);
  }

  // Cancel editing
  function handleCancel() {
    setEditingItem(null);
    setNewName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setSubmitting(true);
    try {
      if (editingItem) {
        // --- UPDATE MODE ---
        await updateDepartment(editingItem.id, { name: newName });
        toast.success("Department updated");
      } else {
        // --- CREATE MODE ---
        await createDepartment({ name: newName });
        toast.success("Department added");
      }
      handleCancel(); // Reset form
      loadData();     // Reload list
    } catch (error) {
      toast.error("Failed to save department");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This might affect existing tests.")) return;
    try {
      await deleteDepartment(id);
      toast.success("Department deleted");
      loadData();
    } catch (error) {
      toast.error("Could not delete department");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* LEFT: FORM */}
      <div className="md:col-span-1 space-y-4">
        <div className={`p-4 border rounded-lg ${editingItem ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
          <h3 className="font-semibold mb-4 flex items-center justify-between">
             {editingItem ? 'Edit Department' : 'Add Department'}
             {editingItem && (
                 <Button variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0 text-slate-500">
                     <X className="h-4 w-4"/>
                 </Button>
             )}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Department Name</label>
              <Input 
                placeholder="e.g. Hematology" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
              />
            </div>
            <div className="flex gap-2">
                <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : (
                    editingItem ? 'Update' : <><Plus className="mr-2 h-4 w-4" /> Add</>
                )}
                </Button>
                {editingItem && (
                    <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                )}
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT: LIST */}
      <div className="md:col-span-2 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead>Name</TableHead>
              <TableHead>Tests Linked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={3} className="text-center h-24">Loading...</TableCell></TableRow> :
              departments.map((dept) => (
                <TableRow key={dept.id} className={editingItem?.id === dept.id ? 'bg-blue-50/50' : ''}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {dept._count.testTemplates} tests
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(dept)} className="text-slate-500 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(dept.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}