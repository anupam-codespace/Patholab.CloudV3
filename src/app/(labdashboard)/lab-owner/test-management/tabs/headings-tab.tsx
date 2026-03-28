'use client';

import { useState, useEffect } from 'react';
import { getTestHeadings, createTestHeading, updateTestHeading, deleteTestHeading } from '@/actions/lims-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Layers, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HeadingsTab() {
  const [headings, setHeadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await getTestHeadings();
      setHeadings(data);
    } catch (error) { toast.error("Error loading headings"); } 
    finally { setLoading(false); }
  }

  function handleEdit(item: any) {
      setEditingItem(item);
      setNewName(item.name);
  }

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
          await updateTestHeading(editingItem.id, newName);
          toast.success("Heading updated");
      } else {
          await createTestHeading(newName);
          toast.success("Heading created");
      }
      handleCancel();
      loadData();
    } catch (error) { toast.error("Error saving heading"); } 
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
      if (!confirm("Delete this heading?")) return;
      // Note: You need to implement deleteTestHeading in backend first
      await deleteTestHeading(id); 
      loadData();
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* LEFT: FORM */}
      <div className="md:col-span-1 space-y-4">
        <div className={`p-4 border rounded-lg ${editingItem ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
          <h3 className="font-semibold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" /> {editingItem ? 'Edit Heading' : 'Add Test Heading'}
            </span>
            {editingItem && <Button variant="ghost" onClick={handleCancel}><X className="h-4 w-4"/></Button>}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Heading Text</label>
              <Input placeholder="e.g. LIPID PROFILE" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="flex gap-2">
                <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : (
                        editingItem ? 'Update' : <><Plus className="mr-2 h-4 w-4" /> Add</>
                    )}
                </Button>
                {editingItem && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT: LIST */}
      <div className="md:col-span-2 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead>Heading Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={2} className="text-center h-24">Loading...</TableCell></TableRow> :
             headings.map((item) => (
              <TableRow key={item.id} className={editingItem?.id === item.id ? 'bg-blue-50/50' : ''}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="text-slate-500 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}