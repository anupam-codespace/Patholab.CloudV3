"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Send,
  Megaphone,
  Link as LinkIcon,
  ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Bell,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminNotificationsPage() {
  const [formData, setFormData] = useState({
    targetAudience: "ALL",
    type: "SYSTEM",
    title: "",
    message: "",
    link: "",
    imageUrl: "",
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Sent to ${data.count} users successfully!`);
      setFormData({
        ...formData,
        title: "",
        message: "",
        link: "",
        imageUrl: "",
      });
    },
    onError: () => toast.error("Failed to send broadcast"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message)
      return toast.error("Title and Message are required");
    sendMutation.mutate(formData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Broadcast Center</h1>
        <p className="text-muted-foreground">
          Send announcements, updates, and alerts to your users.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT: FORM */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>
              This will trigger a push notification to users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select
                    value={formData.targetAudience}
                    onValueChange={(val) =>
                      setFormData({ ...formData, targetAudience: val })
                    }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Users</SelectItem>
                      <SelectItem value="LAB_OWNERS">
                        Lab Owners Only
                      </SelectItem>
                      <SelectItem value="TECHNICIANS">
                        Technicians Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) =>
                      setFormData({ ...formData, type: val })
                    }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYSTEM">System Update</SelectItem>
                      <SelectItem value="LAB_UPDATE">Lab News</SelectItem>
                      <SelectItem value="PROMOTION">Promotion</SelectItem>
                      <SelectItem value="ALERT">Critical Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g., New Feature Released!"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your message here..."
                  className="h-32"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <LinkIcon className="h-3 w-3" /> Link URL (Optional)
                  </Label>
                  <Input
                    placeholder="https://..."
                    value={formData.link}
                    onChange={(e) =>
                      setFormData({ ...formData, link: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-3 w-3" /> Image URL (Optional)
                  </Label>
                  <Input
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendMutation.isPending}>
                  {sendMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Send Broadcast
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* RIGHT: PREVIEW */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground">Live Preview</h3>

          {/* Phone Mockup */}
          <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden max-w-sm mx-auto">
            <div className="bg-muted/30 p-3 border-b flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Notifications
              </span>
              <Bell className="h-4 w-4 text-slate-400" />
            </div>

            <div className="p-0">
              <div className="bg-primary/10/50 p-4 border-l-4 border-blue-500">
                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-blue-100 text-primary flex items-center justify-center shrink-0">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {formData.title || "Notification Title"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {formData.message ||
                        "Your notification message will appear here. It can be up to 3-4 lines long."}
                    </p>

                    {/* Image Preview */}
                    {formData.imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-border">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}

                    {/* Link Preview */}
                    {formData.link && (
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className="text-primary bg-primary/10 hover:bg-blue-100 cursor-pointer">
                          Action Required &rarr;
                        </Badge>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/70 font-medium pt-2">
                      Just now
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 text-amber-800 p-4 rounded-lg text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              <strong>Warning:</strong> Broadcasts are sent immediately to all
              selected users. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
