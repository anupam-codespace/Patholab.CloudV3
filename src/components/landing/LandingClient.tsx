"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
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

  // 1. FETCH PLANS
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
    (p: any) => p.billingCycle === (isYearly ? "YEARLY" : "MONTHLY"),
  );

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* --- FLOATING NAVBAR --- */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4 md:px-0">
        <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-xl border border-stone-200/50 shadow-sm rounded-full h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 font-bold text-xl text-stone-900">
            <div className="bg-stone-900 text-white p-1.5 rounded-full shadow-sm">
              <Layers className="h-4 w-4" />
            </div>
            <span className="tracking-tight">patholab.cloud</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
            {["Tour", "Features", "Pricing", "Testimonials"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="hover:text-rose-600 transition-colors">
                {item}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="h-10 rounded-full font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-900">
                Login
              </Button>
            </Link>
            {/* <BookDemoModal> */}
            <Button className="h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-bold px-6 transition-all duration-300 hover:shadow-rose-600/20 hover:-translate-y-0.5">
              Book Demo
            </Button>
            {/* </BookDemoModal> */}
          </div>

          <button
            className="md:hidden text-stone-700 p-2 rounded-full hover:bg-stone-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-4 right-4 bg-white border border-stone-200 rounded-2xl p-4 shadow-xl flex flex-col space-y-2 animate-in slide-in-from-top-4">
            {["Tour", "Features", "Pricing", "Login"].map((item) => (
              <Link
                key={item}
                href={item === "Login" ? "/login" : `#${item.toLowerCase()}`}
                className="p-3 text-sm font-bold text-stone-700 hover:bg-stone-50 rounded-xl"
                onClick={() => setMobileMenuOpen(false)}>
                {item}
              </Link>
            ))}
            <div className="pt-2">
              {/* <BookDemoModal> */}
              <Button className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm">
                Book Free Demo
              </Button>
              {/* </BookDemoModal> */}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* --- MINIMALIST HERO SECTION --- */}
        <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 overflow-hidden px-4">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          <div className="container mx-auto max-w-5xl flex flex-col items-center text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-widest mb-8">
              <Rocket className="h-3.5 w-3.5" />
              <span>v3.0 is Live: Barcode printing included</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-stone-900 leading-[1.05] mb-6">
              One Cloud for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500">
                Modern Labs.
              </span>
            </h1>

            <p className="max-w-2xl text-lg md:text-xl text-stone-500 font-medium leading-relaxed mb-10">
              Manage samples, machines, reports, and finances in one beautifully
              minimalist dashboard. Secure, fast, and trusted by 500+ labs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-base rounded-full bg-stone-900 text-white hover:bg-stone-800 font-bold shadow-xl transition-transform hover:-translate-y-1">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#tour" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-14 px-8 text-base rounded-full border-stone-200 text-stone-900 hover:bg-stone-100 font-bold">
                  Take the Tour
                </Button>
              </a>
            </div>
          </div>
        </section>

        <div id="tour"></div>

        {/* --- SECTION 1: REPORTING (Asymmetric Grid) --- */}
        <section className="py-24 bg-white border-y border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
              <div className="max-w-2xl">
                <div className="h-12 w-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
                  <FileText className="h-6 w-6 text-rose-600" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tight mb-4">
                  Flawless, Accurate Lab Reports.
                </h2>
                <p className="text-stone-500 text-lg font-medium">
                  Deliver high-quality reports that build doctors' trust.
                  Built-in checks, restrictions, and automation minimize human
                  errors.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature Cards */}
              <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                    <Calculator className="h-4 w-4 text-stone-900" />
                  </div>
                  <h4 className="font-bold text-stone-900 text-xl mb-2">
                    Auto-Calculations
                  </h4>
                  <p className="text-stone-500 text-sm">
                    Eliminate manual mistakes. Calculate complex parameters like
                    LDL, BUN, A/G Ratio instantly.
                  </p>
                </div>
              </div>

              <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                    <QrCode className="h-4 w-4 text-stone-900" />
                  </div>
                  <h4 className="font-bold text-stone-900 text-xl mb-2">
                    QR & Signed
                  </h4>
                  <p className="text-stone-500 text-sm">
                    Print reports with pre-saved digital signatures. Patients
                    scan the bill to download verified PDFs.
                  </p>
                </div>
              </div>

              <div className="bg-stone-900 text-white p-8 rounded-3xl border border-stone-800 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="h-10 w-10 bg-rose-500 rounded-full flex items-center justify-center mb-6">
                    <Send className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-bold text-xl mb-2">Instant WhatsApp</h4>
                  <p className="text-stone-400 text-sm mb-8">
                    Share reports online the second they are approved by the
                    pathologist.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex items-center justify-between backdrop-blur-sm">
                  <span className="text-sm font-semibold">
                    Report Generated
                  </span>
                  <Badge className="bg-emerald-400 text-emerald-950 border-0 hover:bg-emerald-400">
                    Sent
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: HARDWARE AUTOMATION --- */}
        <section className="py-24 bg-stone-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Brutalist Abstract UI */}
              <div className="bg-white rounded-[2rem] border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(28,25,23,1)] p-8 relative overflow-hidden">
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b-2 border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-stone-100 p-2 rounded-lg">
                        <MonitorPlay className="h-5 w-5 text-stone-900" />
                      </div>
                      <span className="font-black text-lg uppercase tracking-tight text-stone-900">
                        Sysmex XN-1000
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-bold flex items-center gap-2">
                      <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>{" "}
                      ONLINE
                    </span>
                  </div>
                  <div className="bg-stone-900 rounded-xl p-5 font-mono text-[11px] text-emerald-400 leading-relaxed">
                    <p>{`MSH|^~\\&|SYSMEX|LAB|LIMS||20260306`}</p>
                    <p>{`PID|1||PAT992||John Doe`}</p>
                    <p className="text-white">{`OBX|1|NM|WBC||6.5|10^9/L|4.0-10.0|N`}</p>
                    <p>{`OBX|2|NM|RBC||4.8|10^12/L|4.5-5.5|N`}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <Badge className="bg-stone-200 text-stone-700 hover:bg-stone-200 border-0 mb-4 text-xs font-bold uppercase tracking-widest">
                    IoT Engine
                  </Badge>
                  <h2 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tight mb-4">
                    Zero-Touch Machine Integration.
                  </h2>
                  <p className="text-stone-500 text-lg font-medium">
                    Stop typing results manually. Our Desktop Local Agent
                    connects your physical lab machines directly to the cloud
                    seamlessly.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      title: "Universal Protocol",
                      desc: "Connect modern TCP/IP machines via HL7/ASTM, or hook up legacy equipment using RS-232.",
                    },
                    {
                      title: "The Visual Mapper",
                      desc: "Machine speaks a different language? Drag-and-drop to link it to your database parameters.",
                    },
                    {
                      title: "Offline Resilience",
                      desc: "If your internet goes down, the local agent catches data and auto-syncs when online.",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1">
                        <CheckCircle2 className="h-5 w-5 text-rose-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-lg">
                          {item.title}
                        </h4>
                        <p className="text-sm text-stone-500 mt-1">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 3: RADIOLOGY (RIS) --- */}
        <section className="py-24 bg-stone-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div>
                  <Badge className="bg-stone-800 text-stone-300 hover:bg-stone-800 border-0 mb-4 text-xs font-bold uppercase tracking-widest">
                    Radiology
                  </Badge>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
                    Complete RIS + PACS.
                  </h2>
                  <p className="text-stone-400 text-lg font-medium">
                    Don't buy separate software for X-Rays and MRI. Manage your
                    entire imaging department seamlessly within the same
                    platform.
                  </p>
                </div>
                <div className="grid gap-6">
                  <div className="bg-stone-800/50 p-6 rounded-2xl border border-stone-700">
                    <h4 className="font-bold text-lg flex items-center gap-2 mb-2">
                      <Server className="h-5 w-5 text-rose-400" /> Modality
                      Worklist
                    </h4>
                    <p className="text-sm text-stone-400">
                      Patient bookings bypass the sample collection phase and
                      appear directly on your machine's screen.
                    </p>
                  </div>
                  <div className="bg-stone-800/50 p-6 rounded-2xl border border-stone-700">
                    <h4 className="font-bold text-lg flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-rose-400" /> Macros &
                      Reporting
                    </h4>
                    <p className="text-sm text-stone-400">
                      Radiologists use shortcodes like{" "}
                      <code className="bg-stone-950 px-1.5 py-0.5 rounded text-rose-300 mx-1">
                        /NormalCXR
                      </code>{" "}
                      to instantly inject pre-written findings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Minimalist Timeline */}
              <div className="pl-4 md:pl-12 border-l-2 border-stone-800 space-y-12 py-8">
                {[
                  {
                    step: "01",
                    title: "Reception Booking",
                    desc: "MRI Brain booked. Sent to RIS.",
                  },
                  {
                    step: "02",
                    title: "Modality Worklist",
                    desc: "Name appears on MRI Machine.",
                  },
                  {
                    step: "03",
                    title: "Reporting Workspace",
                    desc: "Radiologist writes findings instantly.",
                  },
                ].map((item, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[58px] md:-left-[74px] top-0 bg-stone-900 border-2 border-stone-700 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-stone-400">
                      {item.step}
                    </div>
                    <h5 className="font-bold text-xl text-white mb-1">
                      {item.title}
                    </h5>
                    <p className="text-sm text-stone-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 4 & 5 Combined: Inventory & Finance --- */}
        <section className="py-24 bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-24">
            {/* Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="order-last lg:order-first bg-stone-50 rounded-3xl p-8 border border-stone-200 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-50 p-2 rounded-lg">
                      <Microscope className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-stone-900">
                        Lipid Profile
                      </h4>
                      <p className="text-xs text-stone-500 font-medium">
                        Test Approved
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowDownRight className="h-6 w-6 text-stone-300" />
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">
                      Cholesterol Reagent
                    </h4>
                    <p className="text-xs text-stone-500 font-medium">
                      Batch #CHOL-992
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-rose-600 font-black text-lg">
                      - 2.5 ml
                    </div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">
                      Auto-deducted
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight">
                  Smart Inventory & Auto-Depletion.
                </h2>
                <p className="text-stone-500 text-lg font-medium">
                  Never run out of reagents again. The system bridges your
                  clinical tests with physical stock on your shelves.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-stone-900 mt-0.5" />
                    <span className="text-stone-700">
                      <strong>Unit Conversions:</strong> Buy in boxes, consume
                      in ml.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-stone-900 mt-0.5" />
                    <span className="text-stone-700">
                      <strong>Test-Driven:</strong> Reagents deduct
                      automatically upon report approval.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-stone-900 mt-0.5" />
                    <span className="text-stone-700">
                      <strong>Low Stock Alerts:</strong> Get flagged before
                      running out.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Commissions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight">
                  The Commission Waterfall.
                </h2>
                <p className="text-stone-500 text-lg font-medium">
                  Manage B2B referrals and lab profitability with surgical
                  precision using our smart financial engines.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-stone-900 mt-0.5" />
                    <span className="text-stone-700">
                      <strong>Smart Logic:</strong> Flat rates for MRI,
                      percentages for pathology. The system calculates it all
                      instantly.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-stone-900 mt-0.5" />
                    <span className="text-stone-700">
                      <strong>B2B Billing:</strong> Manage collection centers
                      with compliant invoicing.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-stone-900 mt-0.5" />
                    <span className="text-stone-700">
                      <strong>Expense Ledger:</strong> Aggregate rent, salaries,
                      and payouts to see true Net Profit.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-stone-50 rounded-3xl p-8 border border-stone-200">
                <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-stone-200">
                  {[
                    {
                      num: 1,
                      title: "Custom Test Rate",
                      desc: "Dr. Smith • MRI Brain • Flat ₹500",
                      active: true,
                    },
                    {
                      num: 2,
                      title: "Profile Default Margin",
                      desc: "Skipped",
                      active: false,
                    },
                    {
                      num: 3,
                      title: "Global Lab Default",
                      desc: "Skipped",
                      active: false,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`relative flex items-center gap-4 bg-white p-4 rounded-2xl border z-10 shadow-sm transition-opacity ${item.active ? "border-stone-300 opacity-100" : "border-stone-100 opacity-50"}`}>
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm ${item.active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-400"}`}>
                        {item.num}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                            Check {item.num}
                          </p>
                          {item.active && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                              Match Found
                            </span>
                          )}
                        </div>
                        <p
                          className={`font-bold ${item.active ? "text-stone-900" : "text-stone-600"}`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-stone-500 font-medium">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FEATURES BENTO --- */}
        <section
          id="features"
          className="py-24 bg-stone-100 border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-stone-900 mb-4">
                Everything your lab needs.
              </h2>
              <p className="text-lg text-stone-500 font-medium">
                No bloat. Just powerful features designed for speed.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((feat, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-8 border border-stone-200 hover:border-stone-300 transition-colors">
                  <feat.icon className="h-8 w-8 text-rose-600 mb-6" />
                  <h3 className="text-xl font-bold text-stone-900 mb-3">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-stone-500 font-medium leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- PRICING SECTION --- */}
        <section
          id="pricing"
          className="py-24 bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-stone-900 mb-6">
                Transparent Pricing
              </h2>

              <div className="inline-flex bg-stone-100 p-1.5 rounded-full border border-stone-200">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`h-10 px-6 rounded-full text-sm font-bold transition-all ${!isYearly ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>
                  Monthly
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`h-10 px-6 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isYearly ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>
                  Yearly{" "}
                  <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full uppercase">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-stone-900" />
              </div>
            ) : displayedPlans.length === 0 ? (
              <div className="text-center py-12 text-sm text-stone-500 font-medium">
                No plans configured.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {displayedPlans.map((plan: any) => (
                  <div
                    key={plan.id}
                    className={`flex flex-col bg-white rounded-[2rem] p-8 border-2 transition-all ${plan.isPopular ? "border-stone-900 shadow-[8px_8px_0px_0px_rgba(28,25,23,1)] scale-105 z-10 bg-stone-50" : "border-stone-200"}`}>
                    {plan.isPopular && (
                      <div className="mb-6">
                        <Badge className="bg-stone-900 text-white hover:bg-stone-900 uppercase tracking-widest text-[10px] font-bold px-3 py-1">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <h3 className="text-2xl font-black text-stone-900 mb-2">
                      {plan.displayName}
                    </h3>
                    <p className="text-sm text-stone-500 font-medium h-10">
                      {plan.description}
                    </p>

                    <div className="my-8 flex items-end gap-1">
                      <span className="text-5xl font-black text-stone-900 tracking-tighter">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-sm font-bold text-stone-400 mb-2">
                        /{isYearly ? "yr" : "mo"}
                      </span>
                    </div>

                    <div className="space-y-4 flex-1 mb-8">
                      {(Array.isArray(plan.features)
                        ? plan.features
                        : JSON.parse(plan.features || "[]")
                      ).map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />
                          <span className="text-sm text-stone-700 font-medium">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={`/register?planId=${plan.id}&cycle=${plan.billingCycle}&price=${plan.price}`}
                      className="w-full mt-auto">
                      <Button
                        className={`w-full h-14 rounded-xl text-base font-bold transition-all ${plan.isPopular ? "bg-stone-900 text-white hover:bg-stone-800" : "bg-stone-100 text-stone-900 hover:bg-stone-200"}`}>
                        {plan.price === 0
                          ? "Start Free Trial"
                          : "Choose " + plan.displayName}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-32 bg-stone-900 text-center px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Ready to modernize?
            </h2>
            <p className="text-stone-400 text-xl font-medium mb-10">
              Join the new generation of pathology labs. Fast, Secure,
              Cloud-Native.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register?planId=growth&cycle=MONTHLY">
                <Button className="w-full sm:w-auto h-14 px-10 rounded-full text-lg font-bold bg-white text-stone-900 hover:bg-stone-200 transition-transform hover:-translate-y-1">
                  Get Started Now
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-stone-500 font-bold uppercase tracking-widest">
              No Credit Card Required
            </p>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-12 bg-white text-stone-600 border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-black text-lg text-stone-900">
            <Layers className="h-5 w-5 text-rose-600" />
            <span>patholab.cloud</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-bold">
            <Link href="#features" className="hover:text-stone-900">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-stone-900">
              Pricing
            </Link>
            <Link href="/terms-conditions" className="hover:text-stone-900">
              Terms
            </Link>
            <Link href="/privacy-policy" className="hover:text-stone-900">
              Privacy
            </Link>
          </div>

          <div className="text-xs font-medium text-stone-400 text-center md:text-right">
            <p>© {new Date().getFullYear()} Patholab.</p>
            <p>
              Developed by{" "}
              <a
                href="https://globizhub.com"
                className="text-stone-600 hover:text-stone-900 font-bold">
                Globizhub India
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
