'use client';

import { useState, useEffect } from 'react';
import { getTests, deleteTest } from '@/actions/test-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Pencil, Beaker } from 'lucide-react'; // ✅ Added Beaker icon
import toast from 'react-hot-toast';
import TestForm from '../components/test-form';

export default function TestsTab() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await getTests();
      setTests(data);
    } catch (error) { toast.error("Failed to load tests"); } 
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this test?")) return;
    await deleteTest(id);
    loadData();
  }

  function handleEdit(test: any) {
    setEditingTest(test);
    setIsDialogOpen(true);
  }

  function handleAddNew() {
    setEditingTest(null);
    setIsDialogOpen(true);
  }

  const filtered = tests.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tests..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingTest(null);
        }}>
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Add New Test
          </Button>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTest ? `Edit Test: ${editingTest.name}` : 'Add New Test Master'}
              </DialogTitle>
            </DialogHeader>
            <TestForm 
              key={editingTest ? editingTest.id : 'new'} // ✅ Added Key constraint
              initialData={editingTest} 
              onSuccess={() => { setIsDialogOpen(false); loadData(); }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[80px]">Code</TableHead>
              <TableHead>Test Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Tube</TableHead>
              <TableHead>Auto-Consume Reagents</TableHead> {/* ✅ NEW COLUMN */}
              <TableHead>Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center h-24">Loading...</TableCell></TableRow> :
             filtered.map((t) => {
                // ✅ LIVE REAGENT AGGREGATION LOGIC
                // Combine reagents from all parameters in this test
                const aggregatedReagents = t.components.reduce((acc: any, comp: any) => {
                   comp.parameter?.reagents?.forEach((r: any) => {
                      if (!acc[r.inventoryItemId]) {
                         acc[r.inventoryItemId] = {
                            name: r.inventoryItem.name,
                            unit: r.inventoryItem.usageUnit,
                            totalQuantity: 0
                         };
                      }
                      acc[r.inventoryItemId].totalQuantity += r.quantity;
                   });
                   return acc;
                }, {});
                const reagentList = Object.values(aggregatedReagents);

                return (
                  <TableRow key={t.id} className="hover:bg-slate-50">
                    <TableCell><span className="font-mono text-xs font-bold text-slate-600">{t.code}</span></TableCell>
                    <TableCell className="font-medium">
                        {t.name}
                        <div className="text-[10px] text-muted-foreground">{t._count?.parameters || 0} parameters</div>
                    </TableCell>
                    <TableCell>{t.department?.name}</TableCell>
                    
                    {/* Tube Visual Indicator */}
                    <TableCell>
                        {t.containerType ? (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full border border-gray-200" 
                                     style={{ backgroundColor: t.containerType.capColor || '#ccc' }} />
                                <span className="text-xs text-slate-600 font-medium">{t.containerType.code}</span>
                            </div>
                        ) : (
                            <span className="text-slate-300 text-xs">-</span>
                        )}
                    </TableCell>

                    {/* ✅ DISPLAY AGGREGATED REAGENTS */}
                    <TableCell>
                      {reagentList.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {reagentList.map((r: any, idx: number) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
                              <Beaker className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[120px]" title={r.name}>{r.name}</span>
                              <span className="font-bold border-l border-emerald-200 pl-1">
                                {r.totalQuantity.toFixed(2)} {r.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">No reagents mapped</span>
                      )}
                    </TableCell>

                    <TableCell className="font-semibold text-green-700">₹{t.price}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} className="text-slate-400 hover:text-blue-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
             })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}