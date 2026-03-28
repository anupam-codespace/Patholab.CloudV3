'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { createParameter, updateParameter } from '@/actions/parameter-management'; 
import { getContainerTypes } from '@/actions/lims-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Loader2, AlertCircle, FileText, User, Beaker } from 'lucide-react'; // ✅ Added Beaker icon
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query'; 

enum ParameterInputType {
  NUMBER = "NUMBER",
  TEXT = "TEXT",
  LONG_TEXT = "LONG_TEXT",
  DROPDOWN = "DROPDOWN",
  HEADING = "HEADING"
}

// ✅ NEW: Fetch Inventory Items for the dropdown
const fetchInventoryItems = async () => {
  const res = await fetch('/api/lab-owner/inventory/items');
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
};

export default function ParameterForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
  const [loading, setLoading] = useState(false);
  
  const { data: containers } = useQuery({
    queryKey: ['containers'],
    queryFn: async () => await getContainerTypes() 
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: fetchInventoryItems
  });

  const defaultValues = {
    name: '',
    code: '',
    unit: '',
    inputType: ParameterInputType.NUMBER,
    price: 0,
    decimals: 2,
    formula: '',
    method: '',
    containerTypeId: '', 
    reagents: [], // ✅ ADDED
    ranges: [
      { 
        gender: 'BOTH', 
        minAge: 0, 
        maxAge: 100, 
        ageUnit: 'YEAR', 
        lowValue: '', 
        highValue: '', 
        criticalLow: '', 
        criticalHigh: '',
        textValue: '',
        customLabel: '' 
      }
    ]
  };

  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    setValue, 
    reset, 
    getValues, 
    formState: { errors } 
  } = useForm({
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ranges"
  });

  // ✅ ADDED: Reagents Field Array
  const { fields: reagentFields, append: appendReagent, remove: removeReagent } = useFieldArray({
    control,
    name: "reagents"
  });

  const inputType = watch("inputType");

  useEffect(() => {
    if (initialData) {
      const formattedData = {
        ...initialData,
        price: initialData.price || 0,
        containerTypeId: initialData.containerTypeId || '', 
        // ✅ Map existing reagents if any
        reagents: initialData.reagents?.length > 0 
          ? initialData.reagents.map((r: any) => ({
              inventoryItemId: r.inventoryItemId,
              quantity: r.quantity
            }))
          : [],
        ranges: initialData.referenceRanges?.length > 0 
          ? initialData.referenceRanges 
          : defaultValues.ranges
      };
      reset(formattedData);
    } else {
      reset(defaultValues);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const formattedData = {
        ...data,
        price: Number(data.price),
        decimals: Number(data.decimals),
        containerTypeId: data.containerTypeId || undefined, 
        // ✅ Parse Reagent Quantities
        reagents: data.reagents?.map((r: any) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: Number(r.quantity)
        })) || [],
        ranges: data.ranges.map((r: any) => ({
          ...r,
          minAge: Number(r.minAge),
          maxAge: Number(r.maxAge),
          lowValue: r.lowValue !== '' ? Number(r.lowValue) : null,
          highValue: r.highValue !== '' ? Number(r.highValue) : null,
          criticalLow: r.criticalLow !== '' ? Number(r.criticalLow) : null,
          criticalHigh: r.criticalHigh !== '' ? Number(r.criticalHigh) : null,
          textValue: r.textValue || null,
          customLabel: r.gender === 'CUSTOM' ? r.customLabel : null, 
        }))
      };

      if (initialData && initialData.id) {
         await updateParameter(initialData.id, formattedData);
         toast.success("Parameter updated successfully!");
      } else {
         await createParameter(formattedData);
         toast.success("Parameter created successfully!");
      }

      onSuccess(); 
    } catch (error) {
      toast.error("Failed to save parameter.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getRangeError = (index: number, field: string) => {
    // @ts-ignore
    return errors.ranges?.[index]?.[field];
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      <Tabs defaultValue="core" className="w-full">
        {/* ✅ UPDATED TABS LIST: Added Inventory Tab */}
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="core">Core</TabsTrigger>
          <TabsTrigger value="ranges" disabled={inputType !== 'NUMBER'}>Ranges</TabsTrigger>
          <TabsTrigger value="formula" disabled={inputType !== 'NUMBER'}>Formula</TabsTrigger>
          <TabsTrigger value="reagents">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="core" className="space-y-5 pt-4">
           <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-1">Parameter Name <span className="text-red-500">*</span></label>
              <Input {...register("name", { required: "Required" })} placeholder="e.g. Hemoglobin" className={errors.name ? "border-red-500" : ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-1">Short Code <span className="text-red-500">*</span></label>
              <Input {...register("code", { required: "Required" })} placeholder="e.g. HGB" className={errors.code ? "border-red-500" : ""} />
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">Tube / Container</label>
             <Select onValueChange={(val) => setValue('containerTypeId', val)} defaultValue={getValues('containerTypeId') || initialData?.containerTypeId} key={initialData?.containerTypeId}>
                <SelectTrigger><SelectValue placeholder="Select Tube" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="generic">General Vial</SelectItem> 
                    {containers && containers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>))}
                </SelectContent>
             </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Input Type</label>
              <Select onValueChange={(val) => setValue("inputType", val as ParameterInputType)} value={watch("inputType")}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMBER">Numeric Result</SelectItem>
                  <SelectItem value="TEXT">Short Text</SelectItem>
                  <SelectItem value="LONG_TEXT">Paragraph</SelectItem>
                  <SelectItem value="DROPDOWN">Dropdown List</SelectItem>
                  <SelectItem value="HEADING">Heading Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <Input {...register("unit")} placeholder="e.g. g/dL" disabled={inputType === 'HEADING'} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (₹)</label>
              <Input type="number" step="0.01" {...register("price")} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-sm font-medium">Method</label>
                <Input {...register("method")} placeholder="e.g. Photometry" />
             </div>
             {inputType === 'NUMBER' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Decimal Places</label>
                  <Input type="number" {...register("decimals")} className="w-24" />
                </div>
             )}
          </div>
        </TabsContent>

        {/* --- TAB: REFERENCE RANGES --- */}
        <TabsContent value="ranges" className="space-y-4 pt-4">
          <div className="space-y-6">
            <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-700 flex gap-2">
                <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                   <strong>Text Reporting:</strong> Paste long text in "Report Display Text" to override numbers.<br/>
                   <strong>Custom Conditions:</strong> Select "Custom" in Gender to enable the custom label input (e.g. "Child").
                </div>
            </div>
            
            {fields.map((field, index) => {
              const errMinAge = getRangeError(index, 'minAge');
              const errMaxAge = getRangeError(index, 'maxAge');
              const errLow = getRangeError(index, 'lowValue');
              const errHigh = getRangeError(index, 'highValue');
              const currentGender = watch(`ranges.${index}.gender`);
              const isCustom = currentGender === 'CUSTOM';

              return (
              <Card key={field.id} className={`relative shadow-sm overflow-hidden ${errLow || errHigh ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${errLow || errHigh ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-2 text-red-500 hover:bg-red-50" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
                
                <CardContent className="p-4 grid gap-5">
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-600"/> 
                          Report Display Text (Ref Range Column)
                      </label>
                      <Textarea 
                        {...register(`ranges.${index}.textValue`)} 
                        className="min-h-[60px] text-xs font-mono bg-slate-50 border-slate-200 focus:bg-white"
                        placeholder={">6.5 DIABETIC\n5.7-6.4 PRE DIABETIC\n<5.7 NON DIABETIC"} 
                      />
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end border-b pb-4 border-slate-100">
                    <div className="col-span-3 space-y-1">
                        <label className="text-xs text-slate-500 font-medium">Gender / Condition</label>
                        <Select onValueChange={(v) => {
                            setValue(`ranges.${index}.gender`, v);
                            if (v !== 'CUSTOM') setValue(`ranges.${index}.customLabel`, ''); 
                        }} defaultValue={field.gender}>
                            <SelectTrigger className="h-8 text-xs font-medium"><SelectValue placeholder={field.gender} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="BOTH">Both</SelectItem>
                                <SelectItem value="CUSTOM" className="font-bold text-blue-600">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="col-span-3 space-y-1">
                        <label className={`text-xs font-medium flex items-center gap-1 ${isCustom ? 'text-blue-700' : 'text-slate-300'}`}>
                           Custom Label
                        </label>
                        <Input 
                            {...register(`ranges.${index}.customLabel`)} 
                            disabled={!isCustom} 
                            className={`h-8 text-xs transition-colors ${isCustom ? 'bg-yellow-50 border-yellow-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-400'}`} 
                            placeholder={isCustom ? "e.g. Child, High Risk" : "Select Custom first"} 
                        />
                    </div>

                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-slate-500 font-medium">Min Age <span className="text-red-500">*</span></label>
                        <Input type="number" {...register(`ranges.${index}.minAge`, { required: true })} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-slate-500 font-medium">Max Age <span className="text-red-500">*</span></label>
                        <Input type="number" {...register(`ranges.${index}.maxAge`, { required: true })} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-slate-500 font-medium">Unit</label>
                        <Select onValueChange={(v) => setValue(`ranges.${index}.ageUnit`, v)} defaultValue={field.ageUnit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={field.ageUnit} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="YEAR">Years</SelectItem>
                                <SelectItem value="MONTH">Months</SelectItem>
                                <SelectItem value="DAY">Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Low (Num) <span className="text-red-500">*</span></label>
                        <Input type="number" step="0.01" {...register(`ranges.${index}.lowValue`, { required: "Required" })} className={`h-8 text-xs ${errLow ? 'border-red-500 bg-red-50 focus-visible:ring-red-500' : 'bg-white'}`} placeholder="0" />
                        {errLow && <span className="text-[10px] text-red-600 font-bold">Required</span>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">High (Num) <span className="text-red-500">*</span></label>
                        <Input type="number" step="0.01" {...register(`ranges.${index}.highValue`, { required: "Required" })} className={`h-8 text-xs ${errHigh ? 'border-red-500 bg-red-50 focus-visible:ring-red-500' : 'bg-white'}`} placeholder="0" />
                        {errHigh && <span className="text-[10px] text-red-600 font-bold">Required</span>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-red-600">Panic Low</label>
                        <Input type="number" step="0.01" {...register(`ranges.${index}.criticalLow`)} className="h-8 text-xs bg-red-50 border-red-100" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-red-600">Panic High</label>
                        <Input type="number" step="0.01" {...register(`ranges.${index}.criticalHigh`)} className="h-8 text-xs bg-red-50 border-red-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})}
            
            <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => append({ gender: 'BOTH', minAge: 0, maxAge: 100, ageUnit: 'YEAR', lowValue: '', highValue: '', criticalLow: '', criticalHigh: '', textValue: '', customLabel: '' })}>
                <Plus className="mr-2 h-4 w-4" /> Add Range Condition
            </Button>
          </div>
        </TabsContent>

         <TabsContent value="formula" className="pt-4 space-y-4">
             <div className="p-4 bg-blue-50 text-blue-800 rounded-md text-sm">
                 <strong>How to use:</strong> Use parameter codes in calculations. Example: <code>(TP - ALB)</code>
             </div>
             <div className="space-y-2">
                 <label className="text-sm font-medium">Calculation Formula</label>
                 <Input {...register("formula")} placeholder="e.g. (TP - ALB)" />
             </div>
        </TabsContent>

        {/* ✅ ADDED: INVENTORY / REAGENTS TAB */}
        <TabsContent value="reagents" className="pt-4 space-y-4">
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-md text-sm mb-4">
            <strong>Auto-Consumption:</strong> Any items linked here will be automatically deducted from your active inventory batches whenever this test parameter is marked as completed.
          </div>

          <div className="space-y-3">
            {reagentFields.map((field, index) => {
              // Get the selected item's usage unit to display next to quantity
              const selectedItemId = watch(`reagents.${index}.inventoryItemId`);
              const selectedItem = inventoryItems?.find((i: any) => i.id === selectedItemId);
              const unitLabel = selectedItem ? selectedItem.usageUnit : 'units';

              return (
                <div key={field.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Inventory Catalog Item *</label>
                    <Select onValueChange={(v) => setValue(`reagents.${index}.inventoryItemId`, v)} defaultValue={field.inventoryItemId}>
                      <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Search or select an item..." /></SelectTrigger>
                      <SelectContent>
                        {inventoryItems?.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} <span className="text-slate-400">({item.category || 'No Category'})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-1/3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Quantity per Test *</label>
                    <div className="relative">
                      <Input type="number" step="0.001" min="0" {...register(`reagents.${index}.quantity`, { required: true })} className="pr-16" placeholder="0.0" />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-medium">
                        {unitLabel}
                      </div>
                    </div>
                  </div>

                  <Button type="button" variant="ghost" size="icon" className="mt-6 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeReagent(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" className="w-full border-dashed text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200" onClick={() => appendReagent({ inventoryItemId: '', quantity: 0 })}>
            <Beaker className="mr-2 h-4 w-4" /> Link Inventory Item
          </Button>
        </TabsContent>

      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {initialData ? 'Update Parameter' : 'Save Parameter'}
        </Button>
      </div>

      {/* Global Error Summary */}
      {(Object.keys(errors).length > 0) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-5 h-5" />
              <strong>Validation Error:</strong> Please fill in all required fields marked in red.
          </div>
      )}
    </form>
  );
}