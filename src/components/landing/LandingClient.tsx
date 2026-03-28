"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Zap,
  Network,
  Server,
  Syringe,
  BarChart3,
  Smartphone,
  Lock,
  Globe,
  Star,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Rocket,
  Layers,
  Calculator,
  QrCode,
  Send,
  Factory,
  MonitorPlay,
  BrainCircuit,
  FileText,
  Package,
  Microscope,
  ArrowDownRight,
  CreditCard,
  Building2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import BookDemoModal from "./BookDemoModal"; // Assumed existing component

// --- UTILS ---
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

// --- ENTERPRISE FEATURES LIST ---
// Stripped heavy arbitrary gradients, adhering strictly to the slate/blue design system
const FEATURES = [
  {
    icon: Zap,
    title: "AI Smart Reporting",
    desc: "Auto-interpretation & normal ranges. Delivers PDF via WhatsApp in <30s.",
  },
  {
    icon: Network,
    title: "Machine Interfacing",
    desc: "Bi-directional link for 500+ analyzers (Cell counters, Biochemistry).",
  },
  {
    icon: Server,
    title: "Hub & Spoke",
    desc: "Centralized control for multi-center chains. Real-time sample tracking.",
  },
  {
    icon: Syringe,
    title: "Barcode Tracking",
    desc: "Zero-error sample management from phlebotomy to archiving.",
  },
  {
    icon: BarChart3,
    title: "Finance Audit",
    desc: "GST billing, referral payouts, and daily collection reports.",
  },
  {
    icon: Smartphone,
    title: "Patient App",
    desc: "White-labeled Android/iOS apps with your lab branding.",
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    desc: "256-bit Encryption, RBAC, and Audit Logs for every click.",
  },
  {
    icon: Globe,
    title: "B2B Portal",
    desc: "Let hospitals outsource tests to you via a dedicated portal.",
  },
];

const TESTIMONIALS = [
  {
    name: "Dr. Arvind Mehta",
    lab: "Mehta Diagnostics",
    text: "We scaled from 1 center to 5 in a year. The hub-and-spoke logic is flawless.",
  },
  {
    name: "Sarah Jenkins",
    lab: "City Path Labs",
    text: "Interfacing saved us 4 hours of data entry daily. No more typing errors.",
  },
  {
    name: "Dr. A. Khan",
    lab: "Apex Healthcare",
    text: "The WhatsApp report delivery is a game changer. Patients love it.",
  },
];

export default function LandingClient() {
  const [isYearly, setIsYearly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // FETCH PLANS
  const { data: landingData, isLoading } = useQuery({
    queryKey: ["landing-plans"],
    queryFn: async () => {
      const res = await fetch("/api/landing");
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json();
    },
  });

  const plans = landingData?.plans || [];
  const displayedPlans = plans.filter(
    (p: any) => p.billingCycle === (isYearly ? "YEARLY" : "MONTHLY")
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 md:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span className="tracking-tight">patholab.cloud</span>
          </div>

          <nav className="hidden md:flex gap-6 text-sm font-semibold text-slate-600">
            {["Tour", "Features", "Pricing", "Testimonials"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="hover:text-blue-600 transition-colors duration-200"
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex gap-3 items-center">
            <Link href="/login">
              <Button variant="ghost" className="h-10 rounded-lg font-semibold text-slate-700 hover:bg-slate-50">
                Login
              </Button>
            </Link>
            {/* <BookDemoModal> */}
              <Button className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200">
                Book Demo
              </Button>
            {/* </BookDemoModal> */}
          </div>

          <button
            className="md:hidden p-2 text-slate-700 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 shadow-sm">
            {["Tour", "Features", "Pricing", "Login"].map((item) => (
              <Link
                key={item}
                href={item === "Login" ? "/login" : `#${item.toLowerCase()}`}
                className="block py-2 text-sm font-semibold text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="pt-2">
              {/* <BookDemoModal> */}
                <Button className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  Book Free Demo
                </Button>
              {/* </BookDemoModal> */}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* --- HERO SECTION --- */}
        {/* Adheres to strict background rules. Clean, fast, and no heavy iframes. */}
        <section className="relative pt-24 pb-32 overflow-hidden bg-slate-50 border-b border-slate-200">
          <div className="container mx-auto px-4 md:px-8 flex flex-col items-center text-center space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-4">
              <Rocket className="h-4 w-4" />
              <span>v3.0 is Live: Barcode printing included</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight max-w-4xl leading-tight">
              One Cloud for <br />
              <span className="text-blue-600">Modern Lab Management.</span>
            </h1>

            <p className="mx-auto max-w-2xl text-sm md:text-base text-slate-600 leading-relaxed">
              Manage samples, machines, reports, and finances in one lightning-fast
              cloud dashboard. Secure, responsive, and trusted by 500+ labs.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center pt-6">
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all duration-200">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#tour" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm transition-all duration-200">
                  Take the Tour
                </Button>
              </a>
            </div>
          </div>
        </section>

        <div id="tour"></div>

        {/* --- SECTION 1: REPORTING --- */}
        <section className="py-16 md:py-24 bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  Prepare Flawless, Accurate Lab Reports.
                </h2>
                <p className="text-sm text-slate-600">
                  Deliver high-quality reports that build doctors' trust in your
                  lab. Our safety features minimize human errors with built-in
                  checks, restrictions, and automation.
                </p>

                <div className="space-y-4 pt-4">
                  {[
                    { icon: Calculator, title: "Auto-Calculations", desc: "Eliminate manual mistakes. Automatically calculate complex parameters like LDL, BUN, A/G Ratio." },
                    { icon: QrCode, title: "QR Coded & Digitally Signed", desc: "Print reports with pre-saved digital signatures and secure QR verification." },
                    { icon: Send, title: "Instant WhatsApp Delivery", desc: "Share reports online the second they are approved by the pathologist." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="mt-0.5 bg-blue-50 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border border-blue-100">
                        <item.icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abstract UI */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
                <div className="bg-white rounded-lg p-4 border border-slate-200 flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg text-xs">Verified</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-semibold text-slate-800">Hemoglobin (Hb)</span>
                    <span className="text-xs font-mono text-red-600 font-bold">10.2 Low</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-semibold text-slate-800">A/G Ratio</span>
                    <span className="text-xs font-mono text-blue-600 flex items-center gap-1">
                      <Calculator className="h-3 w-3" /> 1.5 Auto
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" className="h-8 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none text-xs">
                      <Phone className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FEATURES GRID --- */}
        <section id="features" className="py-16 md:py-24 bg-slate-50 border-b border-slate-200">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-4">
                Everything your lab needs.
              </h2>
              <p className="text-sm text-slate-600">
                A unified design system powered by lightning-fast cloud architecture.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feat, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4 bg-blue-50 border border-blue-100 text-blue-600">
                    <feat.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- PRICING SECTION --- */}
        <section id="pricing" className="py-16 md:py-24 bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-4">
                Transparent Pricing
              </h2>
              <p className="text-sm text-slate-600 mb-8">
                Powerful features at a fraction of the cost.
              </p>

              {/* Toggle */}
              <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`h-8 px-4 rounded-lg text-sm font-semibold transition-all ${!isYearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`h-8 px-4 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${isYearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Yearly
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Save 20%</span>
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : displayedPlans.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                No plans configured.
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:max-w-5xl lg:mx-auto">
                {displayedPlans.map((plan: any) => (
                  <Card
                    key={plan.id}
                    className={`flex flex-col h-full rounded-xl transition-all duration-200 ${plan.isPopular ? "border-blue-600 shadow-md relative" : "border-slate-200 shadow-sm"}`}
                  >
                    {plan.isPopular && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-blue-600 rounded-t-xl"></div>
                    )}
                    <CardHeader className="pt-6 pb-4">
                      {plan.isPopular && (
                        <Badge className="w-fit mb-3 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-lg text-xs">
                          MOST POPULAR
                        </Badge>
                      )}
                      <CardTitle className="text-lg font-semibold text-slate-800">
                        {plan.displayName}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 py-2">
                      <div className="flex items-baseline mb-6">
                        <span className="text-3xl font-bold text-slate-900 tracking-tight">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium ml-1">
                          /{isYearly ? "yr" : "mo"}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {(Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || "[]")).map((feature: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-600">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 pb-6">
                      <Link href={`/register?planId=${plan.id}&cycle=${plan.billingCycle}&price=${plan.price}`} className="w-full">
                        <Button className={`w-full h-10 rounded-lg font-semibold ${plan.isPopular ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                          Choose {plan.displayName}
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section id="testimonials" className="py-16 md:py-24 bg-slate-50 border-b border-slate-200">
          <div className="container mx-auto px-4 md:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center tracking-tight text-slate-900 mb-12">
              Loved by Lab Owners
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:-translate-y-1 transition-all duration-200">
                  <div className="flex text-yellow-400 mb-4 gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 italic mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50">
                      <AvatarFallback className="font-semibold text-sm text-slate-700">
                        {t.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">{t.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{t.lab}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 text-center">
            <ShieldCheck className="h-12 w-12 text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight">
              Ready to Upgrade?
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-xl mx-auto">
              Join the new generation of pathology labs. Fast, Secure, Cloud-Native.
            </p>
            <div className="flex justify-center">
              <Link href="/register?planId=growth&cycle=MONTHLY" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-12 px-8 rounded-lg text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200">
                  Get Started Now
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400 font-medium uppercase tracking-wider">
              No Credit Card Required
            </p>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-12 bg-slate-900 text-slate-400">
        <div className="container mx-auto px-4 md:px-8 grid gap-8 grid-cols-1 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-lg text-white">
              <Layers className="h-5 w-5 text-blue-500" />
              <span className="tracking-tight">patholab.cloud</span>
            </div>
            <p className="text-xs leading-relaxed max-w-xs">
              The #1 Cloud LIMS Platform. Designed for speed, security, and scalability.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-300 mb-4 text-sm">Product</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-300 mb-4 text-sm">Legal</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors">Refund & Cancellation</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-300 mb-4 text-sm">Contact</h3>
            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <a href="mailto:sales@globizpatholab.com" className="hover:text-white transition-colors">sales@globizpatholab.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" />
                <a href="tel:+918402010207" className="hover:text-white transition-colors">+91 8402010207</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-8 mt-12 pt-6 border-t border-slate-800 text-center flex flex-col md:flex-row justify-between items-center gap-2 text-xs">
          <p>© {new Date().getFullYear()} Globiz Patholab. All rights reserved.</p>
          <p>
            Developed by <a href="https://globizhub.com" className="text-blue-400 hover:text-blue-300">Globizhub India Pvt Ltd.</a>
          </p>
        </div>
      </footer>
    </div>
  );
}