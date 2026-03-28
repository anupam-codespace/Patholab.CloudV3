'use client';

import { useState, useEffect } from 'react';
import { getParameters, deleteParameter } from '@/actions/parameter-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Pencil, Beaker } from 'lucide-react'; 
import toast from 'react-hot-toast';
import ParameterForm from '../components/parameter-form'; 

export default function ParametersTab() {
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog & Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await getParameters();
      setParameters(data);
    } catch (error) {
      toast.error("Failed to load parameters");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? Deleting this parameter will remove it from all tests that use it.")) return;
    try {
        await deleteParameter(id);
        toast.success("Parameter deleted");
        loadData();
    } catch (error) {
        toast.error("Error deleting parameter");
    }
  }

  // --- Handlers for Add/Edit ---
  function handleEdit(param: any) {
    setEditingParam(param);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingParam(null);
    setIsDialogOpen(true);
  }

  const filteredParams = parameters.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Search by name or code..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* EDIT/ADD MODAL */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
             setIsDialogOpen(open);
             if (!open) setEditingParam(null);
        }}>
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
             <Plus className="mr-2 h-4 w-4" /> Add Parameter
          </Button>

          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingParam ? `Edit Parameter: ${editingParam.name}` : 'Add New Parameter'}
              </DialogTitle>
            </DialogHeader>
            
            {/* PASS DATA TO FORM */}
            <ParameterForm 
                // key ensures the form resets completely when switching between Add/Edit
                key={editingParam ? editingParam.id : 'new'} 
                initialData={editingParam}
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
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Parameter Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Input Type</TableHead>
              <TableHead>Tube</TableHead>
              {/* ✅ NEW: Reagents Column */}
              <TableHead>Auto-Consume Reagents</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Loading Library...</TableCell></TableRow>
            ) : filteredParams.length === 0 ? (
               <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No parameters found. Create one to get started.</TableCell></TableRow>
            ) : (
              filteredParams.map((param) => (
                <TableRow key={param.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                        {param.code}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <span className="text-slate-900">{param.name}</span>
                        {param.printName && param.printName !== param.name && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">Print: {param.printName}</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {param.unit ? <span className="text-slate-600 text-sm">{param.unit}</span> : <span className="text-slate-300">-</span>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {param.inputType}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {param.containerType ? (
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full border border-gray-300 shadow-sm" 
                                 style={{ backgroundColor: param.containerType.capColor || '#ccc' }} />
                            <span className="text-xs text-slate-600 font-medium">{param.containerType.code}</span>
                        </div>
                    ) : (
                        <span className="text-slate-300 text-xs">-</span>
                    )}
                  </TableCell>

                  {/* ✅ NEW: Reagents Display */}
                  <TableCell>
                    {param.reagents && param.reagents.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                        {param.reagents.map((r: any) => (
                          <div key={r.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Beaker className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-[120px]" title={r.inventoryItem?.name}>
                              {r.inventoryItem?.name}
                            </span>
                            <span className="font-bold border-l border-emerald-200 pl-1.5">
                              {r.quantity} {r.inventoryItem?.usageUnit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs italic">Not linked</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {param.price ? `₹${param.price}` : <span className="text-slate-300">-</span>}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(param)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
                           <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(param.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
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