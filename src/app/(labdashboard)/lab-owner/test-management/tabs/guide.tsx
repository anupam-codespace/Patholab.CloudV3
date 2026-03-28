import React from 'react';
import { 
  Building2, FlaskConical, Box, Type, FileText, 
  List, Beaker, ArrowRight, CheckCircle2, AlertCircle, Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function GuideTab() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      
      {/* 1. HERO SECTION */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Master Your Test Menu 🚀
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Building a robust Laboratory Information System starts with a strong foundation. 
          Follow this <strong>step-by-step roadmap</strong> to set up your test catalog correctly.
        </p>
      </div>

      {/* 2. THE ROADMAP CONTAINER */}
      <div className="relative border-l-4 border-slate-200 ml-6 md:ml-12 space-y-12 pl-8 md:pl-12">
        
        {/* STEP 1: MASTER DATA */}
        <div className="relative">
          <div className="absolute -left-[3.25rem] md:-left-[4.25rem] bg-blue-600 text-white rounded-full p-2 border-4 border-slate-50 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-blue-100 text-blue-700 hover:bg-blue-200">Step 1: The Foundation</Badge>
              <CardTitle className="text-xl text-slate-800">Master Data Setup</CardTitle>
              <CardDescription>
                Before creating tests, define the basic vocabulary of your lab.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
                  <Building2 className="w-4 h-4 text-blue-500"/> Departments
                </div>
                <p className="text-xs text-slate-500">Create broad categories like Hematology, Biochemistry, or Serology.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
                  <FlaskConical className="w-4 h-4 text-purple-500"/> Sample Types
                </div>
                <p className="text-xs text-slate-500">Define specimens: Whole Blood, Serum, Urine, Swab, etc.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
                  <Box className="w-4 h-4 text-orange-500"/> Containers
                </div>
                <p className="text-xs text-slate-500">List your tubes: Lavender Top (EDTA), Red Top, Sterile Container.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STEP 2: REPORT STRUCTURE */}
        <div className="relative">
          <div className="absolute -left-[3.25rem] md:-left-[4.25rem] bg-indigo-600 text-white rounded-full p-2 border-4 border-slate-50 shadow-sm">
            <Type className="w-6 h-6" />
          </div>
          <Card className="border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Step 2: Structure</Badge>
              <CardTitle className="text-xl text-slate-800">Headings & Custom Fields</CardTitle>
              <CardDescription>
                Prepare how your PDF report will look. Group parameters or add extra notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-4">
                <div className="mt-1"><Type className="w-5 h-5 text-indigo-500"/></div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-700">Report Headings</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Use these to group parameters on the report. <br/>
                    <em>Example: "Differential Count", "Lipid Profile"</em>
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1"><FileText className="w-5 h-5 text-pink-500"/></div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-700">Custom Fields (Optional)</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Need extra inputs? Create fields for "Clinical History", "Methodology Notes", or even "Images/Graphs".
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STEP 3: PARAMETERS (CRITICAL) */}
        <div className="relative">
          <div className="absolute -left-[3.25rem] md:-left-[4.25rem] bg-emerald-600 text-white rounded-full p-2 border-4 border-slate-50 shadow-sm">
            <List className="w-6 h-6" />
          </div>
          <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-shadow ring-1 ring-emerald-50">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Step 3: The Building Blocks</Badge>
              <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                Define Parameters <span className="text-sm font-normal text-slate-400">(Most Important)</span>
              </CardTitle>
              <CardDescription>
                Create individual analytes. A test like "CBC" is made of many parameters like Hb, WBC, RBC.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-emerald-50/50 p-4 rounded-md border border-emerald-100 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-emerald-800 mb-1">Pro Tip: Reference Ranges</strong>
                    Be very specific here. You can set ranges by <strong>Age, Gender, or Custom labels</strong> (e.g., "Child", "Diabetic"). 
                    <br/>
                    For text-based results (like Blood Group), use the <strong>Report Display Text</strong> field to define what is "Normal".
                  </div>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 pl-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Define Unit (mg/dL, %, etc.)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Set Input Type (Number vs Text)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Add Low/High Panic Values</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Configure Age Groups</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* STEP 4: CREATE TEST */}
        <div className="relative">
          <div className="absolute -left-[3.25rem] md:-left-[4.25rem] bg-slate-900 text-white rounded-full p-2 border-4 border-slate-50 shadow-sm">
            <Beaker className="w-6 h-6" />
          </div>
          <Card className="border-slate-200 shadow-lg bg-slate-900 text-white">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-slate-700 text-slate-200 border-none">Step 4: The Final Product</Badge>
              <CardTitle className="text-xl text-white">Create the Test</CardTitle>
              <CardDescription className="text-slate-400">
                This is the billable item you select when registering a patient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">
                Combine everything you built! Select a Department, Sample Type, and Tube. Then, <strong>map your Parameters</strong>.
              </p>
              
              <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                  <h5 className="font-bold text-sm mb-1 text-slate-200">Single Parameter Test</h5>
                  <p className="text-xs text-slate-400">e.g. "Hemoglobin". Just map one parameter. The system auto-handles the rest.</p>
                </div>
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                  <h5 className="font-bold text-sm mb-1 text-slate-200">Profile / Panel</h5>
                  <p className="text-xs text-slate-400">e.g. "CBC" or "Liver Function Test". Map multiple parameters and group them under Headings.</p>
                </div>
              </div>

              <Separator className="bg-slate-700"/>
              
              <div className="flex items-center gap-2 text-sm text-orange-300 font-medium">
                <AlertCircle className="w-4 h-4"/>
                Don't forget to set the Price and Turnaround Time (TAT)!
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* FOOTER NOTE */}
      <div className="text-center pt-8">
        <p className="text-slate-500 text-sm">
          Need more help? Check the documentation or contact support.
        </p>
      </div>

    </div>
  );
}