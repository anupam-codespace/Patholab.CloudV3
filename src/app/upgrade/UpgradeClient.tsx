"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Lock,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Activity,
  Zap,
} from "lucide-react";
import { format } from "date-fns"; // Make sure to run: npm install date-fns

// Types based on your Prisma schema
type Plan = any;
type AddOn = any;
type Subscription = any;

export default function UpgradeClient({
  currentSub,
  plans,
  addOns,
  reason,
  feature,
}: {
  currentSub: Subscription | null;
  plans: Plan[];
  addOns: AddOn[];
  reason?: string;
  feature?: string;
}) {
  const [isYearly, setIsYearly] = useState(false);

  // 1. Dynamic Alert Configuration
  let alertConfig = null;
  if (reason === "trial_ended") {
    alertConfig = {
      title: "Your Free Trial Has Ended",
      message:
        "Please select a plan below to resume operations without interruption.",
      icon: <Clock className="w-6 h-6 text-amber-600" />,
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-900",
    };
  } else if (reason === "subscription_expired") {
    alertConfig = {
      title: "Subscription Expired",
      message:
        "Your current billing cycle has ended. Renew your plan to restore access.",
      icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
      bg: "bg-rose-50 border-rose-200",
      text: "text-rose-900",
    };
  } else if (reason === "module_locked" || feature) {
    alertConfig = {
      title: "Premium Module Locked",
      message: `You are trying to access a feature (${feature || "Premium Add-on"}) not included in your current plan.`,
      icon: <Lock className="w-6 h-6 text-indigo-600" />,
      bg: "bg-indigo-50 border-indigo-200",
      text: "text-indigo-900",
    };
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 pb-24">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">
            Patholab<span className="text-indigo-600">.cloud</span>
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
          Return to Dashboard
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-12">
        {/* DYNAMIC ALERT BANNER */}
        {alertConfig && (
          <div
            className={`mb-12 p-6 rounded-2xl border flex items-start gap-4 shadow-sm ${alertConfig.bg}`}>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              {alertConfig.icon}
            </div>
            <div>
              <h2
                className={`text-xl font-black tracking-tight mb-1 ${alertConfig.text}`}>
                {alertConfig.title}
              </h2>
              <p className={`font-medium opacity-90 ${alertConfig.text}`}>
                {alertConfig.message}
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
            Scale your lab with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Enterprise Power
            </span>
          </h1>
          <p className="text-lg font-medium text-slate-500 max-w-2xl mx-auto mb-8">
            Choose a complete plan or build your own system with our a la carte
            modules.
          </p>

          {/* MONTHLY / YEARLY TOGGLE */}
          <div className="inline-flex items-center gap-3 p-1.5 bg-slate-200 rounded-full">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${!isYearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Monthly Billing
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${isYearly ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}>
              Yearly Billing{" "}
              <span
                className={isYearly ? "text-indigo-200" : "text-emerald-500"}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* CORE SUBSCRIPTION PLANS FROM DB            */}
        {/* ========================================== */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {plans.map((plan) => {
            const isCurrentPlan = currentSub?.planId === plan.id;

            // Calculate Yearly Discount (assuming DB price is Monthly)
            const displayPrice = isYearly
              ? Math.floor(Number(plan.price) * 12 * 0.8) // 20% off yearly
              : Number(plan.price);

            return (
              <div
                key={plan.id}
                className={`rounded-[2rem] p-8 border flex flex-col relative transition-all ${
                  plan.isPopular
                    ? "bg-slate-900 border-slate-800 shadow-2xl transform md:-translate-y-4"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                {plan.isPopular && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3
                  className={`text-xl font-black mb-2 ${plan.isPopular ? "text-white" : "text-slate-900"}`}>
                  {plan.displayName}
                </h3>
                <p
                  className={`text-sm font-bold uppercase tracking-widest mb-6 ${plan.isPopular ? "text-indigo-400" : "text-slate-400"}`}>
                  {plan.description || "For pathology labs"}
                </p>

                <div className="mb-8">
                  <span
                    className={`text-4xl font-black tracking-tight ${plan.isPopular ? "text-white" : "text-slate-900"}`}>
                    ₹{displayPrice.toLocaleString("en-IN")}
                  </span>
                  <span
                    className={`font-bold ${plan.isPopular ? "text-slate-400" : "text-slate-500"}`}>
                    /{isYearly ? "yr" : "mo"}
                  </span>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  <FeatureItem
                    text={`Up to ${plan.maxPatientsTotal} Patients`}
                    light={plan.isPopular}
                  />
                  <FeatureItem
                    text={`${plan.maxBranches} Branch(es)`}
                    light={plan.isPopular}
                  />
                  <FeatureItem
                    text={`${plan.maxStaff} Staff Accounts`}
                    light={plan.isPopular}
                  />
                  {plan.hasInventory && (
                    <FeatureItem
                      text="Inventory Module"
                      highlight
                      light={plan.isPopular}
                    />
                  )}
                  {plan.hasMachineIoT && (
                    <FeatureItem
                      text="HL7 Machine Interfacing"
                      highlight
                      light={plan.isPopular}
                    />
                  )}
                  {plan.hasRadiology && (
                    <FeatureItem
                      text="Radiology (RIS/PACS)"
                      highlight
                      light={plan.isPopular}
                    />
                  )}
                  {plan.hasB2bBilling && (
                    <FeatureItem
                      text="B2B Agency Billing"
                      light={plan.isPopular}
                    />
                  )}
                </ul>

                {/* CALL TO ACTION / STATUS */}
                {isCurrentPlan ? (
                  <div className="mt-auto">
                    <button
                      disabled
                      className="w-full py-4 rounded-xl font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center gap-2 cursor-default">
                      <CheckCircle2 className="w-5 h-5" /> Active Plan
                    </button>
                    {currentSub?.endDate && (
                      <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4 flex items-center justify-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Renews on{" "}
                        {format(new Date(currentSub.endDate), "dd MMM, yyyy")}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    className={`mt-auto w-full py-4 rounded-xl font-bold transition-all ${
                      plan.isPopular
                        ? "bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                        : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    }`}>
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================== */}
        {/* MODULAR ADD-ONS FROM DB                    */}
        {/* ========================================== */}
        <div className="border-t border-slate-200 pt-16">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                A La Carte Modules
              </h2>
              <p className="font-medium text-slate-500 mt-2">
                Just need a little extra space? Bolt these onto your current
                plan.
              </p>
            </div>
            <ShieldCheck className="w-12 h-12 text-slate-200" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOns.map((addon) => {
              // Check if user already unlocked this exact add-on via Subscription.unlockedFeatures
              const isUnlocked = currentSub?.unlockedFeatures?.includes(
                addon.name,
              );

              return (
                <div
                  key={addon.id}
                  className={`p-6 rounded-[1.5rem] border transition-all group ${
                    isUnlocked
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-white border-slate-200 hover:shadow-lg"
                  }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600">
                      <Zap className="w-6 h-6" />
                    </div>
                    {isUnlocked && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded">
                        Active
                      </span>
                    )}
                  </div>

                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    {addon.name}
                  </h4>
                  <p className="text-sm font-medium text-slate-500 mb-6 line-clamp-2">
                    {addon.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-black text-slate-900">
                      ₹{Number(addon.price).toLocaleString("en-IN")}/
                      {addon.currency === "INR" ? "mo" : ""}
                    </span>

                    {!isUnlocked && (
                      <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureItem({
  text,
  light = false,
  highlight = false,
}: {
  text: string;
  light?: boolean;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2
        className={`w-5 h-5 shrink-0 mt-0.5 ${light ? "text-indigo-400" : "text-indigo-600"} ${highlight && "text-amber-400"}`}
      />
      <span
        className={`font-bold text-sm leading-relaxed ${light ? "text-slate-300" : "text-slate-600"} ${highlight && "text-amber-500"}`}>
        {text}
      </span>
    </li>
  );
}
