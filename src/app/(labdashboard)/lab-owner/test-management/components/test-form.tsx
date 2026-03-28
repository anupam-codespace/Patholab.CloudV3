'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { createTest, updateTest } from '@/actions/test-catalog'; 
import { getDepartments, getSampleTypes, getTestHeadings, getContainerTypes } from '@/actions/lims-management';
import { getParameters } from '@/actions/parameter-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Trash2, GripVertical, Save, Loader2, Search, AlertCircle, Beaker } from 'lucide-react'; // ✅ Added Beaker icon
import toast from 'react-hot-toast';
import { CustomFieldSelector } from './custom-field-selector';
import { useQuery } from '@tanstack/react-query';

type Option = { id: string; name: string; code?: string };

interface TestFormProps {
  onSuccess: () => void;
  initialData?: any; 
}

export default function TestForm({ onSuccess, initialData }: TestFormProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [samples, setSamples] = useState<Option[]>([]);
  const [headings, setHeadings] = useState<Option[]>([]);
  const [paramLibrary, setParamLibrary] = useState<any[]>([]);
  const [paramSearch, setParamSearch] = useState('');
  const [customFieldIds, setCustomFieldIds] = useState<string[]>([]);

  const { data: containers } = useQuery({
    queryKey: ['containers'],
    queryFn: async () => await getContainerTypes() 
  });

  useEffect(() => {
    Promise.all([getDepartments(), getSampleTypes(), getTestHeadings(), getParameters()])
      .then(([d, s, h, p]) => {
        setDepartments(d);
        setSamples(s);
        setHeadings(h);
        setParamLibrary(p);
      });
  }, []);

  const { 
    register, 
    control, 
    handleSubmit, 
    setValue, 
    reset, 
    watch, 
    getValues,
    trigger, 
    formState: { errors } 
  } = useForm({
    defaultValues: {
      name: '', 
      code: '', 
      printName: '', 
      departmentId: '', 
      sampleTypeId: '',
      containerTypeId: '', 
      price: 0, 
      b2bPrice: 0, 
      cost: 0, 
      tat: '', 
      method: '', 
      isActive: true,
      components: [] as { parameterId: string; headingId?: string; name: string }[] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "components" });

  const watchedComponents = watch("components");

  // ✅ Load Initial Data (Population Logic)
  useEffect(() => {
    if (initialData) {
      const formattedComponents = initialData.components?.map((c: any) => ({
        parameterId: c.parameterId || c.parameter?.id, 
        name: c.parameter?.name || "Unknown Parameter",
        headingId: c.headingId || "none"
      })) || [];

      reset({
        name: initialData.name, 
        code: initialData.code, 
        printName: initialData.printName || '',
        departmentId: initialData.departmentId, 
        sampleTypeId: initialData.sampleTypeId,
        containerTypeId: initialData.containerTypeId || '', 
        price: Number(initialData.price), 
        b2bPrice: Number(initialData.b2bPrice || 0),
        cost: Number(initialData.cost || 0), 
        
        tat: initialData.tat || '', 
        method: initialData.method || '',
        
        isActive: initialData.isActive ?? true, 
        components: formattedComponents
      });

      const existingIds = initialData.customFields?.map((cf: any) => cf.fieldDefId) || [];
      setCustomFieldIds(existingIds);
    } else {
      reset({
        name: '', code: '', printName: '', departmentId: '', sampleTypeId: '',
        containerTypeId: '', price: 0, b2bPrice: 0, cost: 0, tat: '', method: '', isActive: true, components: []
      });
      setCustomFieldIds([]);
    }
  }, [initialData, reset]);

  // Auto-calculate price
  useEffect(() => {
      if (!paramLibrary.length) return;
      const totalParamPrice = watchedComponents.reduce((sum, comp) => {
          const param = paramLibrary.find(p => p.id === comp.parameterId);
          return sum + (param?.price || 0);
      }, 0);

      if (totalParamPrice > 0 && getValues("price") === 0) {
          setValue("price", totalParamPrice);
      }
  }, [watchedComponents, paramLibrary, setValue, getValues]);


  const onSubmit = async (data: any) => {
    if (data.components.length === 0) {
        toast.error("Please add at least one parameter to this test.");
        return; 
    }

    setLoading(true);
    try {
      const payload = {
        ...data,
        containerTypeId: data.containerTypeId || undefined,
        price: Number(data.price), 
        b2bPrice: Number(data.b2bPrice), 
        cost: Number(data.cost),
        components: data.components.map((c: any, index: number) => ({
            parameterId: c.parameterId,
            headingId: c.headingId === "none" ? null : c.headingId,
            order: index + 1
        })),
        customFieldIds: customFieldIds
      };

      if (initialData?.id) {
        await updateTest(initialData.id, payload);
        toast.success("Test updated successfully!");
      } else {
        await createTest(payload);
        toast.success("Test created successfully!");
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to save test");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addParameter = (paramId: string) => {
    const param = paramLibrary.find(p => p.id === paramId);
    if (param) {
       append({ parameterId: param.id, name: param.name });
       setParamSearch('');
    }
  };

  // ✅ LIVE REAGENT AGGREGATION FOR PREVIEW (NEW LOGIC)
  const liveReagents = watchedComponents.reduce((acc: any, comp: any) => {
    const param = paramLibrary.find(p => p.id === comp.parameterId);
    param?.reagents?.forEach((r: any) => {
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
  const liveReagentList = Object.values(liveReagents);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      <input type="hidden" {...register("departmentId", { required: "Department is required" })} />
      <input type="hidden" {...register("sampleTypeId", { required: "Sample Type is required" })} />

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="basic" className={errors.name || errors.code || errors.departmentId ? "text-red-500" : ""}>
             Basic Details {errors.name && "*"}
          </TabsTrigger>
          <TabsTrigger value="parameters" className={watchedComponents.length === 0 ? "text-amber-600" : ""}>
             Parameter Mapping
          </TabsTrigger>
          <TabsTrigger value="pricing" className={errors.price || errors.tat || errors.method ? "text-red-500" : ""}>
             Pricing & Ops {errors.tat && "*"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="flex items-center gap-1">Test Name <span className="text-red-500">*</span></Label>
                <Input 
                    {...register("name", { required: "Test Name is required" })} 
                    placeholder="e.g. Complete Blood Count" 
                    className={errors.name ? "border-red-500 bg-red-50" : ""}
                />
                {errors.name && <span className="text-xs text-red-500">{errors.name.message as string}</span>}
             </div>
             <div className="space-y-2">
                <Label className="flex items-center gap-1">Short Code <span className="text-red-500">*</span></Label>
                <Input 
                    {...register("code", { required: "Code is required" })} 
                    placeholder="e.g. CBC" 
                    className={errors.code ? "border-red-500 bg-red-50" : ""}
                />
                {errors.code && <span className="text-xs text-red-500">{errors.code.message as string}</span>}
             </div>
          </div>
          
          <div className="space-y-2">
             <Label>Print Name (on Report)</Label>
             <Input {...register("printName")} placeholder="Usually same as Test Name" />
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
                <Label className="flex items-center gap-1">Department <span className="text-red-500">*</span></Label>
                <Select 
                    value={watch("departmentId")} 
                    onValueChange={(v) => {
                        setValue("departmentId", v, { shouldValidate: true });
                    }}
                >
                    <SelectTrigger className={errors.departmentId ? "border-red-500 ring-1 ring-red-200" : ""}>
                        <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {errors.departmentId && <span className="text-xs text-red-500">{errors.departmentId.message as string}</span>}
             </div>

             <div className="space-y-2">
                <Label className="flex items-center gap-1">Sample Type <span className="text-red-500">*</span></Label>
                <Select 
                    value={watch("sampleTypeId")} 
                    onValueChange={(v) => {
                        setValue("sampleTypeId", v, { shouldValidate: true });
                    }}
                >
                    <SelectTrigger className={errors.sampleTypeId ? "border-red-500 ring-1 ring-red-200" : ""}>
                        <SelectValue placeholder="Select Sample" />
                    </SelectTrigger>
                    <SelectContent>
                        {samples.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {errors.sampleTypeId && <span className="text-xs text-red-500">{errors.sampleTypeId.message as string}</span>}
             </div>

             <div className="space-y-2">
                <Label>Container / Tube</Label>
                <Select 
                    onValueChange={(val) => setValue('containerTypeId', val)} 
                    defaultValue={getValues('containerTypeId') || initialData?.containerTypeId}
                    key={initialData?.containerTypeId} 
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Tube" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="generic">General Vial</SelectItem> 
                        {Array.isArray(containers) && containers.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.capColor || '#ccc' }} />
                                    <span>{c.name} ({c.code})</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
          </div>
          
          <div className="p-4 bg-slate-50 border rounded-lg mt-4">
             <CustomFieldSelector selectedIds={customFieldIds} onChange={setCustomFieldIds} />
          </div>
        </TabsContent>

        <TabsContent value="parameters" className="space-y-4 pt-4">
           {/* Parameter Selection (Unchanged) */}
           <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Add Parameters</Label>
              <div className="relative">
                 <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input placeholder="Search parameter name or code..." className="pl-8" value={paramSearch} onChange={(e) => setParamSearch(e.target.value)} />
                 {paramSearch && (
                    <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                       {paramLibrary.filter(p => p.name.toLowerCase().includes(paramSearch.toLowerCase()) || p.code.toLowerCase().includes(paramSearch.toLowerCase())).slice(0, 10).map(p => (
                               <div key={p.id} className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between" onClick={() => addParameter(p.id)}>
                                   <span>{p.name}</span>
                                   <span className="text-xs text-muted-foreground font-mono">{p.code}</span>
                               </div>
                           ))}
                    </div>
                 )}
              </div>
           </div>
           
           <div className={`space-y-2 border rounded-md p-2 ${fields.length === 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
              <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Selected Components ({fields.length})</div>
                  {fields.length === 0 && <span className="text-xs text-amber-600 font-bold flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> No parameters selected</span>}
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 bg-white p-2 border rounded shadow-sm group">
                        <GripVertical className="h-4 w-4 text-slate-300 cursor-move" />
                        <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                            <span className="font-medium text-sm">{field.name}</span>
                            <Select value={watch(`components.${index}.headingId`) || "none"} onValueChange={(v) => setValue(`components.${index}.headingId`, v)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="No Heading" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Heading</SelectItem>
                                    {headings.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-6 w-6 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                ))}
              </div>
           </div>

           {/* ✅ NEW: LIVE REAGENT PREVIEW UI */}
           {liveReagentList.length > 0 && (
             <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Beaker className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Estimated Reagent Consumption</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {liveReagentList.map((r: any, idx: number) => (
                    <div key={idx} className="bg-white border border-emerald-200 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 shadow-sm">
                      {r.name}: <span className="font-bold text-emerald-700">{r.totalQuantity.toFixed(2)} {r.unit}</span>
                    </div>
                  ))}
                </div>
             </div>
           )}

        </TabsContent>

        <TabsContent value="pricing" className="space-y-4 pt-4">
             <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-1">Standard Rate (₹) <span className="text-red-500">*</span></Label>
                    <Input 
                        type="number" 
                        {...register("price", { required: "Price is required", min: 0 })} 
                        className={`font-semibold text-slate-900 ${errors.price ? "border-red-500 bg-red-50" : ""}`}
                    />
                    {errors.price && <span className="text-xs text-red-500">Required</span>}
                    <p className="text-[10px] text-muted-foreground">Auto-calculated from parameters. You can edit this.</p>
                </div>
                <div className="space-y-2"><Label>B2B Rate</Label><Input type="number" {...register("b2bPrice")} /></div>
                <div className="space-y-2"><Label>Lab Cost</Label><Input type="number" {...register("cost")} /></div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-1">TAT <span className="text-red-500">*</span></Label>
                    <Input 
                        {...register("tat", { required: "Turnaround Time is required" })} 
                        placeholder="e.g. 4 Hours" 
                        className={errors.tat ? "border-red-500 bg-red-50" : ""}
                    />
                    {errors.tat && <span className="text-xs text-red-500">{errors.tat.message as string}</span>}
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-1">Methodology <span className="text-red-500">*</span></Label>
                    <Input 
                        {...register("method", { required: "Methodology is required" })} 
                        placeholder="e.g. CLIA" 
                        className={errors.method ? "border-red-500 bg-red-50" : ""}
                    />
                    {errors.method && <span className="text-xs text-red-500">{errors.method.message as string}</span>}
                </div>
             </div>
             
             <div className="flex items-center space-x-2 pt-2"><Checkbox id="active" checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", !!v)} /><Label htmlFor="active">Active</Label></div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {initialData ? 'Update Test' : 'Save Test Master'}
        </Button>
      </div>

      {/* Global Validation Error Message */}
      {(Object.keys(errors).length > 0) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-5 h-5" />
              <strong>Validation Error:</strong> Please fill in all required fields (marked in red).
          </div>
      )}
    </form>
  );
}