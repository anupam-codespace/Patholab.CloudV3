"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Image as ImageIcon, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState("");
  const [letterhead, setLetterhead] = useState("");
  const [footer, setFooter] = useState("");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workspace/settings/branding");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLogo(data.logo || "");
        setLetterhead(data.letterhead || "");
        setFooter(data.footer || "");
        setSignature(data.signature || "");
      } catch { toast.error("Failed to load branding"); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    // ✅ Try server-side file upload first (returns a /uploads/... URL).
    // This works much better than base64 in PDFs, <img> tags, and cross-origin contexts.
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/workspace/upload/public", {
        method: "POST",
        body: formData,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        if (data.url) {
          setter(data.url);
          toast.success("Image uploaded");
          return;
        }
      }
    } catch {
      // Fall through to base64 fallback
    }

    // Fallback: base64 data URL (works for <img> but problematic in PDFs due to size)
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo, letterhead, footer, signature }),
      });
      if (!res.ok) throw new Error();
      toast.success("Branding saved");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const ImageUpload = ({ label, value, setter }: { label: string; value: string; setter: (v: string) => void }) => (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-2 flex items-start gap-4">
        <div className="w-32 h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center overflow-hidden bg-muted/20">
          {value ? <img src={value} alt={label} className="w-full h-full object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground/30" />}
        </div>
        <div className="space-y-2">
          <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, setter)} className="w-56" />
          {value && <Button variant="outline" size="sm" onClick={() => setter("")}><X className="h-3 w-3 mr-1" /> Remove</Button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoice Branding</h1>
        <p className="text-sm text-muted-foreground">Upload logo, letterhead, footer, and signature for invoices and reports</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Branding Assets</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload label="Lab Logo" value={logo} setter={setLogo} />
          <ImageUpload label="Letterhead Header" value={letterhead} setter={setLetterhead} />
          <ImageUpload label="Footer Image" value={footer} setter={setFooter} />
          <ImageUpload label="Signature" value={signature} setter={setSignature} />
          <Button onClick={handleSave} disabled={saving} className="bg-primary">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Branding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
