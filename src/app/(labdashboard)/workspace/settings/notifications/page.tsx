"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Smartphone,
  Mail,
  Save,
  Send,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface NotificationSettings {
  whatsapp: { apiKey: string; phoneId: string; configured: boolean };
  sms: { apiKey: string; senderId: string; configured: boolean };
  smtp: {
    host: string;
    port: number;
    user: string;
    from: string;
    configured: boolean;
  };
  email: string;
  phone: string;
}

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const [whatsapp, setWhatsapp] = useState({ apiKey: "", phoneId: "" });
  const [sms, setSms] = useState({ apiKey: "", senderId: "" });
  const [smtp, setSmtp] = useState({
    host: "",
    port: 587,
    user: "",
    password: "",
    from: "",
  });
  const [configured, setConfigured] = useState({
    whatsapp: false,
    sms: false,
    smtp: false,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/workspace/settings/notifications");
      if (!res.ok) throw new Error("Failed to load settings");
      const data: NotificationSettings = await res.json();
      setWhatsapp({
        apiKey: data.whatsapp.apiKey,
        phoneId: data.whatsapp.phoneId,
      });
      setSms({ apiKey: data.sms.apiKey, senderId: data.sms.senderId });
      setSmtp({
        host: data.smtp.host,
        port: data.smtp.port,
        user: data.smtp.user,
        password: "",
        from: data.smtp.from || data.email,
      });
      setConfigured({
        whatsapp: data.whatsapp.configured,
        sms: data.sms.configured,
        smtp: data.smtp.configured,
      });
    } catch (e: any) {
      toast.error(e.message || "Could not load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/workspace/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappApiKey: whatsapp.apiKey,
          whatsappPhoneId: whatsapp.phoneId,
          smsApiKey: sms.apiKey,
          smsSenderId: sms.senderId,
          smtpHost: smtp.host,
          smtpPort: smtp.port,
          smtpUser: smtp.user,
          smtpPassword: smtp.password,
          smtpFrom: smtp.from,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(data.message || "Settings saved");
      fetchSettings();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channel: "WHATSAPP" | "SMS" | "EMAIL") => {
    const to =
      channel === "EMAIL"
        ? smtp.from || prompt("Enter recipient email") || ""
        : prompt("Enter recipient phone (with country code)") || "";
    if (!to) return;
    try {
      setTesting(channel);
      const res = await fetch("/api/workspace/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      toast.success(`${channel} test message sent to ${to}`);
    } catch (e: any) {
      toast.error(e.message || "Test failed");
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">
          Loading notification settings…
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 mb-6">
        <Link
          href="/workspace/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Notification Settings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure WhatsApp, SMS, and email channels for patient
              communications.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">WhatsApp Business</CardTitle>
                  <CardDescription>Send reports via WhatsApp</CardDescription>
                </div>
              </div>
              {configured.whatsapp ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              ) : (
                <Badge variant="outline">Not configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="wa-key">API Key</Label>
              <Input
                id="wa-key"
                type="password"
                value={whatsapp.apiKey}
                placeholder="Meta Cloud API access token"
                onChange={(e) =>
                  setWhatsapp({ ...whatsapp, apiKey: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="wa-phone">Phone Number ID</Label>
              <Input
                id="wa-phone"
                value={whatsapp.phoneId}
                placeholder="123456789012345"
                onChange={(e) =>
                  setWhatsapp({ ...whatsapp, phoneId: e.target.value })
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest("WHATSAPP")}
              disabled={testing === "WHATSAPP" || !configured.whatsapp}
            >
              {testing === "WHATSAPP" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </Button>
          </CardFooter>
        </Card>

        {/* SMS */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">SMS Gateway</CardTitle>
                  <CardDescription>
                    Send OTP &amp; status updates via SMS
                  </CardDescription>
                </div>
              </div>
              {configured.sms ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              ) : (
                <Badge variant="outline">Not configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sms-key">API Key</Label>
              <Input
                id="sms-key"
                type="password"
                value={sms.apiKey}
                placeholder="MSG91 / Textlocal / Twilio key"
                onChange={(e) => setSms({ ...sms, apiKey: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sms-sender">Sender ID</Label>
              <Input
                id="sms-sender"
                value={sms.senderId}
                placeholder="PATHLB"
                maxLength={6}
                onChange={(e) =>
                  setSms({ ...sms, senderId: e.target.value.toUpperCase() })
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest("SMS")}
              disabled={testing === "SMS" || !configured.sms}
            >
              {testing === "SMS" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </Button>
          </CardFooter>
        </Card>

        {/* SMTP / Email */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">SMTP / Email</CardTitle>
                  <CardDescription>
                    Outgoing mail server for invoices and reports
                  </CardDescription>
                </div>
              </div>
              {configured.smtp ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              ) : (
                <Badge variant="outline">Not configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                value={smtp.host}
                placeholder="smtp.gmail.com"
                onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                value={smtp.port}
                onChange={(e) =>
                  setSmtp({ ...smtp, port: Number(e.target.value) || 587 })
                }
              />
            </div>
            <div>
              <Label htmlFor="smtp-user">Username</Label>
              <Input
                id="smtp-user"
                value={smtp.user}
                placeholder="you@yourdomain.com"
                onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="smtp-pass">Password</Label>
              <Input
                id="smtp-pass"
                type="password"
                value={smtp.password}
                placeholder="••••••••"
                onChange={(e) =>
                  setSmtp({ ...smtp, password: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="smtp-from">From Email</Label>
              <Input
                id="smtp-from"
                type="email"
                value={smtp.from}
                placeholder="noreply@yourlab.com"
                onChange={(e) => setSmtp({ ...smtp, from: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest("EMAIL")}
              disabled={testing === "EMAIL"}
            >
              {testing === "EMAIL" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test Email
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
