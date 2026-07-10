"use client";

import {
  Globe,
  Building2,
  IndianRupee,
  ListTree,
  TestTube,
  FlaskConical,
  Layers,
  FileText,
  Info,
  Lightbulb,
} from "lucide-react";

export default function GuideTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-md">
        <h2 className="text-2xl font-bold mb-2">
          Welcome to the Master Data Dictionary
        </h2>
        <p className="text-blue-100 max-w-3xl leading-relaxed">
          This module is the brain of your diagnostic center. Here you can
          manage your entire test menu, configure your pricing, and define
          exactly how reports should be generated. Read this quick guide to
          understand how the platform works.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CONCEPT 1: Global vs Local */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Global vs. Local Scope
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Understanding the badges
              </p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              To save you weeks of manual data entry, Patholab Cloud comes
              pre-loaded with thousands of standard tests, parameters, and
              departments.
            </p>
            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg border border-slate-100">
              <Globe className="text-indigo-500 shrink-0 mt-0.5" size={16} />
              <div>
                <strong className="text-slate-800">Global Master Data:</strong>{" "}
                Items with this badge are provided by the platform. You cannot
                delete or edit their core details (to ensure system stability),
                but you <em>can</em> override their pricing.
              </div>
            </div>
            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg border border-slate-100">
              <Building2
                className="text-emerald-500 shrink-0 mt-0.5"
                size={16}
              />
              <div>
                <strong className="text-slate-800">Local Custom Data:</strong>{" "}
                Items with this badge were created specifically by your lab.
                Only your staff can see them, and you have full control to edit
                or delete them.
              </div>
            </div>
          </div>
        </div>

        {/* CONCEPT 2: Pricing Overrides */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <IndianRupee size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Managing Your Pricing
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                The Catalog Tab
              </p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              You don't need to recreate the "Complete Blood Count" test just to
              change its price!
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Go to the <strong>Catalog & Pricing</strong> tab.
              </li>
              <li>Find any Global or Local test.</li>
              <li>
                Click <strong>Manage Pricing</strong> to set your specific
                Patient Price, B2B/Agency Price, and Turnaround Time (TAT).
              </li>
            </ul>
            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg flex gap-2 text-xs border border-amber-100 mt-2">
              <Lightbulb className="shrink-0 mt-0.5" size={14} />
              <p>
                Your pricing overrides are private to your lab. Changing a
                Global Test's price will not affect other labs on the platform.
              </p>
            </div>
          </div>
        </div>

        {/* CONCEPT 3: Hierarchy of Creating a Test */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <ListTree size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                How to Build a Custom Test
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                The step-by-step workflow
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            If you need to offer a highly specialized test that isn't in our
            Global Master catalog, you must build it from the bottom up. Follow
            this exact order:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="border border-border rounded-xl p-4 bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-slate-200 text-muted-foreground font-bold text-[10px] px-2 py-1 rounded-bl-lg">
                STEP 1
              </div>
              <FlaskConical className="text-muted-foreground/70 mb-3" size={20} />
              <h4 className="font-bold text-foreground mb-1">Base Categories</h4>
              <p className="text-xs text-muted-foreground">
                Ensure your required <strong>Department</strong> (e.g.,
                Immunology), <strong>Sample Type</strong> (e.g., Serum), and{" "}
                <strong>Container</strong> (e.g., SST Tube) exist first.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border border-border rounded-xl p-4 bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-slate-200 text-muted-foreground font-bold text-[10px] px-2 py-1 rounded-bl-lg">
                STEP 2
              </div>
              <ListTree className="text-blue-500 mb-3" size={20} />
              <h4 className="font-bold text-foreground mb-1">
                Create Parameters
              </h4>
              <p className="text-xs text-muted-foreground">
                Go to the <strong>Parameters</strong> tab. Create the individual
                ingredients (e.g., T3, T4, TSH) and set their reference ranges
                and units.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border border-border rounded-xl p-4 bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-slate-200 text-muted-foreground font-bold text-[10px] px-2 py-1 rounded-bl-lg">
                STEP 3
              </div>
              <Layers className="text-purple-500 mb-3" size={20} />
              <h4 className="font-bold text-foreground mb-1">Create Headings</h4>
              <p className="text-xs text-muted-foreground">
                If your report needs sections (e.g., "Thyroid Profile" above the
                results), create them in the <strong>Headings</strong> tab.
              </p>
            </div>

            {/* Step 4 */}
            <div className="border border-primary/20 rounded-xl p-4 bg-primary/10 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 bg-primary text-white font-bold text-[10px] px-2 py-1 rounded-bl-lg">
                STEP 4
              </div>
              <FileText className="text-primary mb-3" size={20} />
              <h4 className="font-bold text-blue-900 mb-1">Build the Test</h4>
              <p className="text-xs text-primary/80">
                Go to <strong>Local Tests</strong>. Create the test, attach the
                parameters you made in Step 2, and set the price.
              </p>
            </div>
          </div>
        </div>

        {/* CONCEPT 4: Custom Fields */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4 md:col-span-2 flex items-start gap-4">
          <div className="p-3 bg-muted text-muted-foreground rounded-full shrink-0">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-1">
              What are Custom Fields?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sometimes you need to collect extra information from a patient at
              the front desk before running a test (e.g., "Last Menstrual Period
              Date", "Fasting Duration", or "Clinical History"). Create these in
              the <strong>Custom Fields</strong> tab, and then link them to
              specific tests. The receptionist will be forced to fill them out
              during patient registration!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
