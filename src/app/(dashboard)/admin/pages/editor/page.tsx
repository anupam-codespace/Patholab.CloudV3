'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, Loader2, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const pageSchema = z.object({
  title: z.string().min(1, "Title required"),
  slug: z.string().min(1, "Slug required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase, numbers, or hyphens"),
  content: z.string().min(1, "Content required"),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  isPublished: z.boolean().default(true),
});

export default function PageEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('id');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      title: '', slug: '', content: '', metaTitle: '', metaDesc: '', isPublished: true
    }
  });

  // Load data if Editing
  useEffect(() => {
    if (pageId) {
      fetch(`/api/admin/pages/${pageId}`)
        .then(res => res.json())
        .then(data => form.reset(data));
    }
  }, [pageId, form]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    const method = pageId ? 'PATCH' : 'POST';
    const url = pageId ? `/api/admin/pages/${pageId}` : '/api/admin/pages';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      toast.success(pageId ? 'Page updated' : 'Page created');
      router.push('/admin/pages');
    } catch (error) {
      toast.error('Error saving page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4"/></Button>
            <h1 className="text-2xl font-bold">{pageId ? 'Edit Page' : 'Create New Page'}</h1>
         </div>
         <Button onClick={form.handleSubmit(onSubmit)} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
            Save Page
         </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="col-span-2 space-y-6">
           <Card>
             <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                   <Label>Page Title</Label>
                   <Input {...form.register('title')} placeholder="e.g. About Our Lab" />
                   {form.formState.errors.title && <p className="text-red-500 text-xs">Required</p>}
                </div>
                
                <div className="space-y-2">
                   <Label>Content (HTML/Text)</Label>
                   {/* Replace this Textarea with a Rich Text Editor (e.g. React Quill) if desired */}
                   <Textarea 
                      {...form.register('content')} 
                      className="min-h-[400px] font-mono text-sm" 
                      placeholder="<p>Write your page content here...</p>" 
                   />
                   <p className="text-xs text-muted-foreground">HTML tags are supported.</p>
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
           <Card>
              <CardContent className="p-6 space-y-4">
                 <div className="space-y-2">
                    <Label>URL Slug</Label>
                    <div className="flex items-center gap-1 bg-muted rounded border px-2">
                       <span className="text-muted-foreground text-xs">/</span>
                       <input {...form.register('slug')} className="bg-transparent border-none text-sm w-full outline-none h-8" placeholder="about-us" />
                    </div>
                    {form.formState.errors.slug && <p className="text-red-500 text-xs">Invalid slug</p>}
                 </div>

                 <div className="flex items-center justify-between border-t pt-4">
                    <Label>Published?</Label>
                    <Switch 
                       checked={form.watch('isPublished')}
                       onCheckedChange={(c) => form.setValue('isPublished', c)}
                    />
                 </div>
              </CardContent>
           </Card>

           <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">SEO Metadata</CardTitle></CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                 <div className="space-y-2">
                    <Label className="text-xs">Meta Title</Label>
                    <Input {...form.register('metaTitle')} className="h-8 text-xs" placeholder="Browser Tab Title" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs">Meta Description</Label>
                    <Textarea {...form.register('metaDesc')} className="h-20 text-xs resize-none" placeholder="Search engine description..." />
                 </div>
              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}