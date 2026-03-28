'use client';

import { useState, useEffect } from 'react';
import { getContainerTypes, deleteContainerType } from '@/actions/container-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Pencil, TestTube2 } from 'lucide-react'; 
import toast from 'react-hot-toast';
import ContainerForm from '../components/container-form'; 

export default function ContainersTab() {
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog & Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await getContainerTypes();
      setContainers(data);
    } catch (error) {
      toast.error("Failed to load containers");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This might affect existing tests using this container.")) return;
    try {
        const res = await deleteContainerType(id);
        if(res.success) {
            toast.success("Container deleted");
            loadData();
        } else {
            toast.error("Failed to delete");
        }
    } catch (error) {
        toast.error("Error deleting container");
    }
  }

  // --- Handlers for Add/Edit ---
  function handleEdit(container: any) {
    setEditingContainer(container);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingContainer(null);
    setIsDialogOpen(true);
  }

  const filteredContainers = containers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or code..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* EDIT/ADD MODAL */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
             setIsDialogOpen(open);
             if (!open) setEditingContainer(null);
        }}>
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
             <Plus className="mr-2 h-4 w-4" /> Add Container
          </Button>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingContainer ? `Edit Container: ${editingContainer.name}` : 'Add New Container'}
              </DialogTitle>
            </DialogHeader>
            
            {/* PASS DATA TO FORM */}
            <ContainerForm 
                key={editingContainer ? editingContainer.id : 'new'} 
                initialData={editingContainer}
                onSuccess={() => {
                   setIsDialogOpen(false);
                   loadData();
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
              <TableHead className="w-[80px]">Preview</TableHead>
              <TableHead>Container Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Hex Color</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Loading Containers...</TableCell></TableRow>
            ) : filteredContainers.length === 0 ? (
               <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No containers found. Create one to get started.</TableCell></TableRow>
            ) : (
                filteredContainers.map((container) => (
                <TableRow key={container.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div 
                        className="w-8 h-8 rounded-full border shadow-sm flex items-center justify-center" 
                        style={{ backgroundColor: container.capColor || '#ccc' }}
                    >
                        <TestTube2 className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{container.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600 border">
                        {container.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono uppercase">
                    {container.capColor}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        {/* EDIT BUTTON */}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(container)} className="text-slate-400 hover:text-blue-600">
                           <Pencil className="h-4 w-4" />
                        </Button>
                        {/* DELETE BUTTON */}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(container.id)} className="text-slate-400 hover:text-red-600">
                           <Trash2 className="h-4 w-4" />
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