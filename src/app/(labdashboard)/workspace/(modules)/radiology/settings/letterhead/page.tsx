"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Save, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function LetterheadSettingsPage() {
  const queryClient = useQueryClient();
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [footerImage, setFooterImage] = useState<string | null>(null);

  // 1. FETCH: Using React Query
  const { data: settings, isLoading } = useQuery({
    queryKey: ["letterhead-settings"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/settings/letterhead");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Sync the fetched data into our local state so we can preview/edit it
  useEffect(() => {
    if (settings) {
      setHeaderImage(settings.letterheadHeader || null);
      setFooterImage(settings.letterheadFooter || null);
    }
  }, [settings]);

  // 2. SAVE: Using React Query Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: { letterheadHeader: string | null, letterheadFooter: string | null }) => {
      const res = await fetch("/api/workspace/radiology/settings/letterhead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Letterhead updated successfully!");
      // Invalidate the cache to ensure we have the freshest data
      queryClient.invalidateQueries({ queryKey: ["letterhead-settings"] });
    },
    onError: () => {
      toast.error("Failed to save. Please try again.");
    },
  });

  // Handle File Upload & Convert to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "header" | "footer") => {
    const file = e.target.files?.[0];
    if (file) {
      // Prevent massive files from crashing the database (Limit to ~2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image is too large. Please upload an image under 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "header") setHeaderImage(reader.result as string);
        else setFooterImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Report Letterhead</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload your clinic's official header and footer. These will automatically appear on all printed A4 reports.
        </p>
      </div>

      {/* HEADER UPLOAD CARD */}
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg">Header Image</CardTitle>
          <CardDescription>Recommended size: 2100px wide by 300px tall. Max 2MB.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-slate-50/50 hover:bg-muted/30 transition-colors relative group">
            {headerImage ? (
              <div className="relative inline-block w-full">
                <img src={headerImage} alt="Header Preview" className="max-h-32 mx-auto object-contain mb-4 border border-border shadow-sm bg-card" />
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="absolute -top-3 -right-3 h-8 w-8 rounded-full p-0 shadow-md"
                  onClick={() => setHeaderImage(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="py-4">
                <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground mb-4">No header image uploaded</p>
              </div>
            )}
            <input type="file" id="header-upload" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "header")} />
            <label htmlFor="header-upload" className="cursor-pointer bg-card border border-border text-foreground/80 px-4 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-indigo-50 hover:text-primary hover:border-indigo-200 inline-flex items-center transition-colors">
              <Upload className="w-4 h-4 mr-2" /> {headerImage ? "Replace Header" : "Upload Header Image"}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* FOOTER UPLOAD CARD */}
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg">Footer Image</CardTitle>
          <CardDescription>Recommended size: 2100px wide by 200px tall. Max 2MB.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-slate-50/50 hover:bg-muted/30 transition-colors relative group">
            {footerImage ? (
              <div className="relative inline-block w-full">
                <img src={footerImage} alt="Footer Preview" className="max-h-24 mx-auto object-contain mb-4 border border-border shadow-sm bg-card" />
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="absolute -top-3 -right-3 h-8 w-8 rounded-full p-0 shadow-md"
                  onClick={() => setFooterImage(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="py-4">
                <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground mb-4">No footer image uploaded</p>
              </div>
            )}
            <input type="file" id="footer-upload" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "footer")} />
            <label htmlFor="footer-upload" className="cursor-pointer bg-card border border-border text-foreground/80 px-4 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-indigo-50 hover:text-primary hover:border-indigo-200 inline-flex items-center transition-colors">
              <Upload className="w-4 h-4 mr-2" /> {footerImage ? "Replace Footer" : "Upload Footer Image"}
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button 
          onClick={() => saveMutation.mutate({ letterheadHeader: headerImage, letterheadFooter: footerImage })} 
          disabled={saveMutation.isPending} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-11"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saveMutation.isPending ? "Saving..." : "Save Letterhead"}
        </Button>
      </div>
    </div>
  );
}