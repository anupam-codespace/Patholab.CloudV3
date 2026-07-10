"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  Activity,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";

export default function BookDemoModal({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // === AUTO-POPUP LOGIC ===
  // Automatically pops up 3 seconds after the page loads
  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem("demoPopupSeen");

    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("demoPopupSeen", "true");
      }, 3000); // 3-second delay so it doesn't instantly block the screen

      return () => clearTimeout(timer);
    }
  }, []);

  // === PRESERVED BUSINESS LOGIC ===
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/book-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.ok) {
        setSuccess(true);
        toast.success("Request sent successfully!");
      } else {
        throw new Error(json.error || "Failed to send request");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setTimeout(() => setSuccess(false), 300); // Reset after animation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      {/* Premium Split-Modal Design 
        Removed default padding (p-0) to allow edge-to-edge design.
      */}
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-card">
        {!success ? (
          <div className="flex flex-col md:flex-row w-full h-full max-h-[90vh] overflow-y-auto">
            {/* === LEFT PANEL: VALUE PROP (Hidden on Mobile) === */}
            <div className="hidden md:flex flex-col justify-between w-2/5 bg-slate-950 p-8 relative overflow-hidden">
              {/* Decorative Gradients */}
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-600/30 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-600/30 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="relative z-10">
                <div className="bg-card/10 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 mb-6 shadow-lg">
                  <Activity className="h-6 w-6 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-4">
                  See patholab.cloud in action.
                </h2>
                <p className="text-sm font-medium text-muted-foreground/70 leading-relaxed">
                  Join 500+ modern diagnostic centers that have upgraded their
                  workflow, eliminated errors, and scaled their B2B networks.
                </p>
              </div>

              <div className="relative z-10 space-y-4 mt-12">
                <div className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
                  15-min personalized walkthrough
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
                  Live IoT Machine Interfacing demo
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
                  Zero commitment required
                </div>
              </div>
            </div>

            {/* === RIGHT PANEL: FORM === */}
            <div className="w-full md:w-3/5 p-6 md:p-8 bg-card">
              <div className="mb-6">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                  Book your demo
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Fill in your details and our team will connect with you
                  instantly.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Dr. John Doe"
                      className="pl-11 h-12 rounded-xl bg-muted/30 border-border focus:bg-card focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="john@lab.com"
                        className="pl-11 h-12 rounded-xl bg-muted/30 border-border focus:bg-card focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-foreground"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="phone"
                      className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Phone <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors" />
                      <Input
                        id="phone"
                        name="phone"
                        required
                        placeholder="98765 43210"
                        maxLength={10}
                        className="pl-11 h-12 rounded-xl bg-muted/30 border-border focus:bg-card focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Lab Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="labName"
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Lab / Center Name
                  </Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                      id="labName"
                      name="labName"
                      placeholder="e.g. Apex Diagnostics"
                      className="pl-11 h-12 rounded-xl bg-muted/30 border-border focus:bg-card focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-foreground"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="message"
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Specific Requirements (Optional)
                  </Label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors" />
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="E.g., I need to connect a Sysmex XN-1000..."
                      className="pl-11 pt-3.5 min-h-[100px] resize-none rounded-xl bg-muted/30 border-border focus:bg-card focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-foreground"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 active:scale-[0.98]"
                    disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />{" "}
                        Scheduling...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Schedule My Free Demo <Zap className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* === SUCCESS STATE === */
          <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center animate-in fade-in zoom-in-95 duration-500 bg-muted/30 rounded-2xl h-full min-h-[400px]">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
              <div className="h-24 w-24 bg-card border-4 border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center shadow-xl relative z-10">
                <CheckCircle2 className="h-12 w-12" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Demo Requested!
              </h2>
              <p className="text-base text-muted-foreground font-medium max-w-[300px] mx-auto">
                Thank you for your interest. Our experts have been notified and
                will contact you shortly.
              </p>
            </div>

            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              className="mt-4 h-12 px-8 rounded-xl border-border font-bold text-foreground/80 hover:bg-card hover:text-foreground shadow-sm transition-all">
              Close Window
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
