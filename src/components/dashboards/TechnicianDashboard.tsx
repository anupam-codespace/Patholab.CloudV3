"use client";

import { FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TechnicianDashboard({ labId }: { labId: string }) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Clinical Workspace
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Ready to process today's samples.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-slate-200 shadow-sm rounded-2xl bg-amber-50 border-amber-100 flex flex-col items-center text-center">
          <AlertTriangle className="h-10 w-10 text-amber-600 mb-3" />
          <h3 className="text-3xl font-black text-amber-900">12</h3>
          <p className="text-sm font-bold text-amber-700 uppercase tracking-wide">
            Urgent Pending
          </p>
          <Link href="/workspace/worklist" className="w-full mt-4">
            <Button className="w-full bg-amber-600 hover:bg-amber-700">
              Process Now
            </Button>
          </Link>
        </Card>

        <Card className="p-6 border-slate-200 shadow-sm rounded-2xl bg-blue-50 border-blue-100 flex flex-col items-center text-center">
          <FlaskConical className="h-10 w-10 text-blue-600 mb-3" />
          <h3 className="text-3xl font-black text-blue-900">45</h3>
          <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">
            Routine Pending
          </p>
          <Link href="/workspace/samples" className="w-full mt-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Accession Samples
            </Button>
          </Link>
        </Card>

        <Card className="p-6 border-slate-200 shadow-sm rounded-2xl bg-emerald-50 border-emerald-100 flex flex-col items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-3" />
          <h3 className="text-3xl font-black text-emerald-900">89</h3>
          <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
            Completed Today
          </p>
        </Card>
      </div>
    </div>
  );
}
