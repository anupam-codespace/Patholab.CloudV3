import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Globe, ShieldCheck } from "lucide-react";
import PortalSettings from "./PortalSettings"; // This will be the form component we create next
// Import your auth helper - adjust path as neededaf
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export default async function BookingSettingsPage() {
  // 1. Authenticate user
  const token = cookies().get("token")?.value;
  if (!token) return null;
  const user = await verifyToken(token);

  // 2. Fetch current Lab configurations
  const lab = await prisma.lab.findUnique({
    where: { id: user.labId },
    select: {
      portalSlug: true,
      name: true,
    },
  });

  if (!lab) return <div>Lab not found.</div>;

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      {/* --- HEADER --- */}
      <div className="mb-8">
        <Link
          href="/workspace/bookings"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Bookings
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-600" />
          Public Portal Settings
        </h1>
        <p className="text-slate-500 mt-2">
          Configure how your B2B2C booking website appears to the public.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Settings Area */}
        <div className="md:col-span-2">
          <PortalSettings initialSlug={lab.portalSlug} />
        </div>

        {/* Informational Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Secure Routing
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              When patients book Home Collection, the system automatically
              checks your <strong>Service Areas</strong> to route the
              appointment to the correct branch.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">Test Visibility</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Not all tests are shown on your public portal. You can hide
              specific B2B tests from your Test Catalog settings.
            </p>
            <Link
              href="/workspace/tests"
              className="text-sm font-bold text-blue-600 hover:underline">
              Manage Test Visibility &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
