'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Save, Loader2, RefreshCcw, X, UploadCloud, Plus, 
  Trash2, Code, Image as ImageIcon, LayoutTemplate, ArrowLeft 
} from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ Import Server Actions
import { getTemplateById, saveTemplate } from '@/actions/report-settings';

// Default Config Structure
const DEFAULT_CONFIG = {
  header: { show: true, mode: 'standard', title: '', subTitle: '', html: '', height: 150 },
  footer: { show: true, mode: 'standard', text: '', isoMarkUrls: [], signatures: [], height: 100 },
  branding: { primaryColor: '#2563eb' }
};

export default function TemplateBuilderPage() {
  const params = useParams();
  const router = useRouter();
  
  // Handle "new" vs existing ID
  const templateId = params.id === 'new' ? null : (params.id as string);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [templateName, setTemplateName] = useState("My New Template");
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const init = async () => {
        setDataLoading(true);
        if (templateId) {
            // Edit Mode: Fetch existing
            const data = await getTemplateById(templateId);
            if (data) {
                setTemplateName(data.name);
                
                // Merge with defaults to prevent crashes if fields are missing
                let loadedConfig = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
                if (!loadedConfig) loadedConfig = {};

                // Ensure Arrays exist
                if (!loadedConfig.footer) loadedConfig.footer = {};
                if (!loadedConfig.footer.isoMarkUrls) loadedConfig.footer.isoMarkUrls = [];
                if (!Array.isArray(loadedConfig.footer.signatures)) {
                    loadedConfig.footer.signatures = [
                        { title: "Technician", imageUrl: "", show: true },
                        { title: "Pathologist", imageUrl: "", show: true }
                    ];
                }
                
                setConfig(loadedConfig);
            } else {
                toast.error("Template not found");
                router.push('/lab-owner/settings/templates');
            }
        } else {
            // Create Mode: Use Default
            setConfig(DEFAULT_CONFIG);
        }
        setDataLoading(false);
    };
    init();
  }, [templateId, router]);

  // --- 2. SAVE HANDLER ---
  const handleSave = async () => {
    if (!templateName.trim()) return toast.error("Please enter a template name");
    
    setLoading(true);
    try {
      await saveTemplate(templateId, templateName, config);
      toast.success("Template Saved Successfully!");
      // If we just created a new one, go back to the gallery
      if (!templateId) router.push('/lab-owner/settings/templates');
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. HELPER HANDLERS (Same as before) ---
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, section: 'header' | 'footer' | 'branding', key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("Image too large (>4MB)");
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setConfig((prev: any) => ({
        ...prev,
        [section]: { ...prev[section], [key]: reader.result }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleIsoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    const newImages: string[] = [];
    let processed = 0;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') newImages.push(reader.result);
            processed++;
            if (processed === files.length) {
                setConfig((prev: any) => ({
                    ...prev,
                    footer: { ...prev.footer, isoMarkUrls: [...(prev.footer.isoMarkUrls || []), ...newImages] }
                }));
            }
        };
        reader.readAsDataURL(file);
    });
  };

  const handleSigUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          const newSigs = [...(config.footer.signatures || [])];
          newSigs[index].imageUrl = reader.result;
          setConfig({ ...config, footer: { ...config.footer, signatures: newSigs } });
      };
      reader.readAsDataURL(file);
  };

  // --- RENDER ---
  if (dataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5 text-slate-500"/>
            </Button>
            <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Template Name</Label>
                <Input 
                    value={templateName} 
                    onChange={(e) => setTemplateName(e.target.value)} 
                    className="h-8 w-64 font-semibold text-lg border-none shadow-none px-0 focus-visible:ring-0" 
                    placeholder="Enter template name..."
                />
            </div>
         </div>
         <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            Save Template
         </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: Controls */}
        <div className="w-1/3 overflow-y-auto p-6 border-r bg-white custom-scrollbar">
            <Tabs defaultValue="header" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-6">
                    <TabsTrigger value="header">Header</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="footer">Footer</TabsTrigger>
                </TabsList>

                {/* HEADER TAB */}
                <TabsContent value="header" className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Show Header</Label>
                                <Switch checked={config.header?.show} onCheckedChange={(c) => setConfig({...config, header: {...config.header, show: c}})} />
                            </div>
                            
                            <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-md gap-1">
                                {['standard', 'html', 'image'].map((mode) => (
                                    <button 
                                        key={mode}
                                        onClick={() => setConfig({...config, header: {...config.header, mode}})}
                                        className={`text-xs py-1.5 font-medium rounded-sm capitalize flex items-center justify-center gap-1
                                        ${config.header?.mode === mode ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {mode === 'standard' && <LayoutTemplate className="h-3 w-3"/>}
                                        {mode === 'html' && <Code className="h-3 w-3"/>}
                                        {mode === 'image' && <ImageIcon className="h-3 w-3"/>}
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            {/* Standard Mode Inputs */}
                            {config.header?.mode === 'standard' && (
                                <>
                                    <div className="space-y-2"><Label>Title</Label><Input value={config.header?.title} onChange={(e) => setConfig({...config, header: {...config.header, title: e.target.value}})} /></div>
                                    <div className="space-y-2"><Label>Subtitle</Label><Input value={config.header?.subTitle} onChange={(e) => setConfig({...config, header: {...config.header, subTitle: e.target.value}})} /></div>
                                    <div className="space-y-2"><Label>Logo</Label><Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'header', 'logoUrl')} /></div>
                                </>
                            )}

                            {/* HTML Mode */}
                            {config.header?.mode === 'html' && (
                                <Textarea className="font-mono text-xs" value={config.header?.html} onChange={(e) => setConfig({...config, header: {...config.header, html: e.target.value}})} rows={8} placeholder="<div>...</div>"/>
                            )}

                            {/* Image Mode */}
                            {config.header?.mode === 'image' && (
                                <div className="space-y-3">
                                    <Label>Upload Full Header Image</Label>
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'header', 'fullImage')} />
                                    <div className="flex justify-between text-xs text-slate-500"><span>Height: {config.header?.height}px</span></div>
                                    <input type="range" min="50" max="400" value={config.header?.height || 150} onChange={(e) => setConfig({...config, header: {...config.header, height: parseInt(e.target.value)}})} className="w-full" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BRANDING TAB */}
                <TabsContent value="branding" className="space-y-6">
                    <Card><CardContent className="pt-6"><Label>Primary Color</Label><div className="flex gap-2 mt-2"><Input type="color" className="w-12 h-10 p-1" value={config.branding?.primaryColor} onChange={(e) => setConfig({...config, branding: {...config.branding, primaryColor: e.target.value}})} /><Input value={config.branding?.primaryColor} onChange={(e) => setConfig({...config, branding: {...config.branding, primaryColor: e.target.value}})} /></div></CardContent></Card>
                </TabsContent>

                {/* FOOTER TAB */}
                <TabsContent value="footer" className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Show Footer</Label>
                                <Switch checked={config.footer?.show} onCheckedChange={(c) => setConfig({...config, footer: {...config.footer, show: c}})} />
                            </div>

                            <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-md gap-1">
                                {['standard', 'html', 'image'].map((mode) => (
                                    <button key={mode} onClick={() => setConfig({...config, footer: {...config.footer, mode}})} className={`text-xs py-1.5 font-medium rounded-sm capitalize ${config.footer?.mode === mode ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>{mode}</button>
                                ))}
                            </div>

                            {/* Standard Footer Controls */}
                            {config.footer?.mode !== 'image' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>ISO Marks</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {config.footer?.isoMarkUrls?.map((url: string, idx: number) => (
                                                <div key={idx} className="relative group border p-1 rounded"><img src={url} className="h-10 mx-auto object-contain"/><button onClick={() => setConfig((p:any)=>({...p, footer: {...p.footer, isoMarkUrls: p.footer.isoMarkUrls.filter((_:any, i:number)=>i!==idx)}}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3"/></button></div>
                                            ))}
                                            <label className="cursor-pointer border border-dashed rounded h-12 flex items-center justify-center"><Plus className="h-4 w-4"/><input type="file" multiple accept="image/*" onChange={handleIsoUpload} className="hidden"/></label>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t">
                                        <div className="flex justify-between"><Label>Signatories</Label><Button size="sm" variant="ghost" onClick={() => setConfig((p:any)=>({...p, footer: {...p.footer, signatures: [...(p.footer.signatures||[]), {title:'New', show:true}]}}))}><Plus className="h-3 w-3"/></Button></div>
                                        {config.footer?.signatures?.map((sig: any, idx: number) => (
                                            <div key={idx} className="flex gap-2 items-center text-xs">
                                                <Input value={sig.title} onChange={(e) => {const s=[...config.footer.signatures]; s[idx].title=e.target.value; setConfig({...config, footer: {...config.footer, signatures: s}})}} className="h-8 w-1/3"/>
                                                <label className="cursor-pointer border px-2 py-1 rounded bg-slate-100 flex-1 truncate">Upload Sig<input type="file" onChange={(e) => handleSigUpload(idx, e)} className="hidden"/></label>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setConfig((p:any)=>({...p, footer: {...p.footer, signatures: p.footer.signatures.filter((_:any, i:number)=>i!==idx)}}))}><Trash2 className="h-3 w-3"/></Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t">
                                        <Label>Footer Text (HTML)</Label>
                                        <Textarea className="font-mono text-xs" value={config.footer?.text} onChange={(e) => setConfig({...config, footer: {...config.footer, text: e.target.value}})} rows={3}/>
                                    </div>
                                </>
                            )}

                            {/* Image Footer Mode */}
                            {config.footer?.mode === 'image' && (
                                <div className="space-y-3">
                                    <Label>Upload Full Footer Image</Label>
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'footer', 'fullImage')} />
                                    <input type="range" min="50" max="300" value={config.footer?.height || 100} onChange={(e) => setConfig({...config, footer: {...config.footer, height: parseInt(e.target.value)}})} className="w-full" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>

        {/* RIGHT: Preview (Scrollable) */}
        <div className="w-2/3 bg-slate-200/50 flex justify-center p-10 overflow-y-auto">
            <div className="bg-white shadow-2xl relative flex flex-col justify-between" style={{ width: '210mm', minHeight: '297mm', padding: config.header?.mode === 'image' ? '0' : '10mm', borderTop: config.header?.mode === 'image' ? 'none' : `6px solid ${config.branding?.primaryColor || '#000'}` }}>
                
                {/* --- HEADER RENDER --- */}
                {config.header?.show && (
                    config.header?.mode === 'image' ? (
                        <div className="w-full overflow-hidden mb-8" style={{ height: `${config.header.height || 150}px` }}>
                            {config.header.fullImage ? <img src={config.header.fullImage} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">Header Image</div>}
                        </div>
                    ) : config.header?.mode === 'html' ? (
                        <div className="mb-8 w-full" dangerouslySetInnerHTML={{ __html: config.header.html || 'HTML Header' }} />
                    ) : (
                        <div className="flex justify-between items-center border-b pb-4 mb-8" style={{ borderColor: config.branding?.primaryColor }}>
                            <div className="flex items-center gap-4">
                                {config.header?.logoUrl ? <img src={config.header.logoUrl} className="h-20 w-auto object-contain" /> : <div className="h-20 w-20 bg-slate-50 flex items-center justify-center text-xs">Logo</div>}
                                <div>
                                    <h1 className="text-2xl font-bold uppercase" style={{ color: config.branding?.primaryColor }}>{config.header?.title || "LAB TITLE"}</h1>
                                    <p className="text-sm text-slate-500">{config.header?.subTitle}</p>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* Content Placeholder */}
                <div className={`flex-1 opacity-60 pointer-events-none select-none space-y-6 ${config.header?.mode === 'image' ? 'px-10' : ''}`}>
                    <div className="grid grid-cols-2 gap-4 text-xs border p-3 rounded bg-slate-50"><div><strong>Patient:</strong> John Doe</div><div><strong>Date:</strong> {new Date().toLocaleDateString()}</div></div>
                    <table className="w-full text-xs"><thead><tr className="bg-slate-100 text-left border-b"><th className="p-2">Test</th><th className="p-2">Result</th><th className="p-2">Unit</th></tr></thead><tbody><tr className="border-b"><td className="p-2">Hemoglobin</td><td className="p-2 font-bold">14.2</td><td className="p-2">g/dL</td></tr></tbody></table>
                </div>

                {/* --- FOOTER RENDER --- */}
                {config.footer?.show && (
                    config.footer?.mode === 'image' ? (
                        <div className="w-full mt-auto overflow-hidden" style={{ height: `${config.footer.height || 100}px` }}>
                            {config.footer.fullImage ? <img src={config.footer.fullImage} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">Footer Image</div>}
                        </div>
                    ) : (
                        <div className={`mt-auto ${config.header?.mode === 'image' ? 'px-10 pb-10' : ''}`}>
                            <div className="flex justify-end gap-4 mb-2 px-2 min-h-[40px]">
                                {config.footer?.isoMarkUrls?.map((url: string, i: number) => <img key={i} src={url} className="h-12 object-contain" />)}
                            </div>
                            <div className="border-t border-slate-300 pt-4 pb-2">
                                <div className="flex justify-between items-end px-4 mb-4">
                                    {Array.isArray(config.footer?.signatures) && config.footer.signatures.map((sig: any, idx: number) => (
                                        <div key={idx} className="flex flex-col items-center min-w-[120px]">
                                            <div className="h-12 flex items-end justify-center mb-1">{sig.imageUrl && sig.show && <img src={sig.imageUrl} className="h-full object-contain" />}</div>
                                            <div className="border-t border-slate-400 w-full pt-1 text-center"><p className="font-bold text-[10px] text-slate-800 uppercase">{sig.title}</p></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[9px] text-slate-500 text-center w-full" dangerouslySetInnerHTML={{ __html: config.footer.text }} />
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>

      </div>
    </div>
  );
}