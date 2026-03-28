'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, X, FileImage, Code } from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomFieldInputProps {
  field: {
    name: string;
    type: string; // 'TEXT' | 'LONG_TEXT' | 'DROPDOWN' | 'DATE' | 'IMAGE' | 'RICH_TEXT'
    options?: string[];
  }; 
  value: any; 
  onChange: (val: any) => void;
}

export function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  
  // --- HANDLE IMAGE UPLOAD (Convert to Base64) ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB Limit to keep DB healthy
    if (file.size > 2 * 1024 * 1024) { 
        toast.error("Image must be under 2MB");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        onChange(reader.result); // Pass Base64 string to parent
    };
    reader.readAsDataURL(file);
  };

  // --- RENDER BASED ON TYPE ---
  
  // 1. IMAGE INPUT
  if (field.type === 'IMAGE') {
    return (
      <div className="space-y-3 border p-4 rounded-md bg-white">
        <Label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <FileImage className="h-3 w-3"/> {field.name}
        </Label>
        
        {value ? (
            <div className="relative w-full max-w-sm group">
                <img src={value} alt="Uploaded Graph" className="rounded-md border shadow-sm max-h-60 object-contain bg-slate-50" />
                <Button 
                    size="icon" 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    onClick={() => onChange('')}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative min-h-[120px]">
                <Input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    onChange={handleImageUpload}
                />
                <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs text-slate-600 font-bold">Click to Upload Graph / Image</p>
                <p className="text-[10px] text-slate-400">Max size 2MB</p>
            </div>
        )}
      </div>
    );
  }

  // 2. RICH TEXT / HTML INPUT
  if (field.type === 'RICH_TEXT') {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Code className="h-3 w-3"/> {field.name}
        </Label>
        <Textarea 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder="Enter text (HTML tags <b>Supported</b>)..."
            className="font-mono text-xs min-h-[100px] bg-white border-slate-300"
        />
        <p className="text-[10px] text-slate-400">Accepts HTML tags for formatting (e.g. &lt;b&gt;bold&lt;/b&gt;)</p>
      </div>
    );
  }

  // 3. DROPDOWN
  if (field.type === 'DROPDOWN') {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">{field.name}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                    {field.options?.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
  }

  // 4. LONG TEXT
  if (field.type === 'LONG_TEXT') {
      return (
        <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">{field.name}</Label>
            <Textarea 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)} 
                className="bg-white min-h-[80px] text-xs resize-y"
            />
        </div>
      );
  }

  // 5. DATE PICKER
  if (field.type === 'DATE') {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">{field.name}</Label>
            <Input 
                type="date" 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)} 
                className="bg-white h-9 text-xs" 
            />
        </div>
    );
  }
  
  // 6. STANDARD TEXT (Fallback)
  return (
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase text-slate-500">{field.name}</Label>
        <Input 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)} 
            className="bg-white h-9 text-xs" 
        />
      </div>
  );
}