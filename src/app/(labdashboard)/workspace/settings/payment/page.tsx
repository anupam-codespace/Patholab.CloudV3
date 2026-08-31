"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, QrCode, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrPreview, setQrPreview] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workspace/settings/payment");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUpiId(data.upiId || "");
        setQrCode(data.upiQrCode || "");
        setQrPreview(data.upiQrCode || "");
      } catch { toast.error("Failed to load settings"); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setQrCode(base64);
      setQrPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId, upiQrCode: qrCode }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment settings saved");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Settings</h1>
        <p className="text-sm text-muted-foreground">Set UPI ID and QR code for online booking payments</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> UPI Payment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">UPI ID</Label>
            <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourlab@upi" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Patients will see this UPI ID to make payment for online bookings.</p>
          </div>

          <div>
            <Label className="text-sm font-medium">QR Code Image</Label>
            <div className="mt-2 flex items-start gap-4">
              <div className="w-40 h-40 border-2 border-dashed border-border rounded-xl flex items-center justify-center overflow-hidden">
                {qrPreview ? (
                  <img src={qrPreview} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="h-12 w-12 text-muted-foreground/30" />
                )}
              </div>
              <div className="space-y-2">
                <Input type="file" accept="image/*" onChange={handleQrUpload} className="w-64" />
                {qrCode && (
                  <Button variant="outline" size="sm" onClick={() => { setQrCode(""); setQrPreview(""); }}>Remove</Button>
                )}
                <p className="text-xs text-muted-foreground">Upload your UPI QR code image. Patients will scan this to pay.</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-primary">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
