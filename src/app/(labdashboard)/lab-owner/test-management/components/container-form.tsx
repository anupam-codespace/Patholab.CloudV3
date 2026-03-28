'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createContainerType, updateContainerType } from '@/actions/container-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, TestTube2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContainerForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      name: '',
      code: '',
      capColor: '#A855F7' // Default Lavender
    }
  });

  const currentColor = watch('capColor');

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        code: initialData.code,
        capColor: initialData.capColor
      });
    } else {
      reset({ name: '', code: '', capColor: '#A855F7' });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      if (initialData && initialData.id) {
        await updateContainerType(initialData.id, data);
        toast.success("Container updated successfully!");
      } else {
        await createContainerType(data);
        toast.success("Container created successfully!");
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to save container.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Container Name *</label>
        <Input {...register("name", { required: true })} placeholder="e.g. Lavender Top (EDTA)" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Short Code *</label>
          <Input 
            {...register("code", { required: true })} 
            placeholder="e.g. EDTA" 
            className="uppercase font-mono"
            onChange={(e) => setValue('code', e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Cap Color</label>
          <div className="flex gap-2">
            <Input 
              type="color" 
              className="w-12 p-1 cursor-pointer h-10" 
              {...register("capColor")} 
            />
            <Input 
              {...register("capColor")} 
              placeholder="#RRGGBB" 
              className="flex-1 font-mono uppercase" 
            />
          </div>
        </div>
      </div>

      {/* Visual Preview */}
      <div className="p-4 bg-slate-50 rounded flex items-center justify-center gap-3 border border-dashed">
        <div 
          className="w-10 h-10 rounded-full border shadow-sm flex items-center justify-center transition-colors duration-200" 
          style={{ backgroundColor: currentColor }}
        >
          <TestTube2 className="h-5 w-5 text-white/90 drop-shadow-md" />
        </div>
        <span className="text-sm text-slate-500 font-medium">Cap Color Preview</span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {initialData ? 'Update Container' : 'Save Container'}
        </Button>
      </div>
    </form>
  );
}