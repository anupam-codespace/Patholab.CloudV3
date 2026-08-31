import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { authorizeAccess } from "@/lib/auth-guard";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Cpu,
  Globe,
  Key,
  Terminal,
  Download,
  Activity,
  Zap,
  Database,
  RefreshCcw,
  ShieldCheck,
  ChevronRight,
  HardDrive,
  Network,
  Lock,
  Box,
  AlertCircle,
} from "lucide-react";

export default async function AnalyzerPage() {
  // ==========================================
  // 1. AUTHENTICATION & ENTERPRISE GUARD
  // ==========================================
  const session = await getSession();

  if (!session || !session.userId || !session.labId) {
    redirect("/login");
  }

  // SECURE THE PAGE: This completely prevents URL manual typing access
  // The guard will automatically redirect them if they fail the checks.
  await authorizeAccess({
    userId: session.userId,
    labId: session.labId,
    requiredFeature: "hasMachineIoT", // TIER 1: Lab must pay for IoT Integrations
    // requiredPermission: "settings:manage" // TIER 2: Optional - restrict to managers only
  });

  const labId = session.labId;

  // ==========================================
  // 2. DATA FETCHING
  // ==========================================
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
  });

  if (!lab) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl flex items-center gap-4 text-rose-600 font-bold shadow-sm">
          <ShieldCheck className="w-6 h-6" />
          Error: Lab identity missing or corrupted.
        </div>
      </div>
    );
  }

  const headersList = headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const realWebhookUrl = `${protocol}://${host}/api/webhooks/analyzer`;

  const totalMachineResults = await prisma.testResultParameter.count({
    where: {
      entryMethod: "MACHINE_INTERFACE",
      test: {
        sample: { labId: labId },
      },
    },
  });

  // ✅ NEW: Fetch the list of registered analyzers (auto-registered on first webhook call)
  const registeredAnalyzers = await prisma.labAnalyzer.findMany({
    where: { labId: labId },
    include: {
      _count: {
        select: {
          results: true,
          mappings: true,
          unmappedCodes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const recentSyncs = await prisma.sample.findMany({
    where: {
      labId: labId,
      tests: {
        some: {
          results: {
            some: { entryMethod: "MACHINE_INTERFACE" },
          },
        },
      },
    },
    include: {
      patient: { select: { name: true } },
      tests: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  // ==========================================
  // 3. RENDER UI
  // ==========================================
  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8 lg:p-12 font-sans selection:bg-indigo-100">
      {/* HEADER SECTION */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-primary">
            <Cpu className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
              LIS Interface Engine
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Analyzer{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary">
              Integrations
            </span>
          </h1>
          <p className="text-muted-foreground font-medium italic">
            patholab.cloud — Real-time HL7/ASTM machine synchronization
          </p>
        </div>

        <Link
          href="/api/agent/download"
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-black text-primary-foreground rounded-2xl font-bold shadow-2xl shadow-indigo-200 transition-all active:scale-95 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          <span>Download Windows Agent</span>
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: CONNECTION HUB */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-card rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Terminal className="w-64 h-64" />
            </div>

            <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-8">
              <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-indigo-200">
                <Network className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight uppercase">
                  Connection Settings
                </h2>
                <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                  Handshake Credentials for Local Agent
                </p>
              </div>
            </div>

            <div className="space-y-10">
              {/* Webhook URL */}
              <div className="group">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">
                    <Globe className="w-3 h-3 text-indigo-500" /> Remote
                    Endpoint URL
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none border-r border-slate-100 pr-4">
                    <Zap className="h-4 w-4 text-indigo-400" />
                  </div>
                  <code className="block w-full bg-muted/30 border border-slate-100 rounded-2xl px-16 py-6 text-sm text-primary font-mono select-all transition-all group-hover:border-indigo-200 group-hover:bg-indigo-50/30">
                    {realWebhookUrl}
                  </code>
                </div>
              </div>

              {/* API Key */}
              <div className="group">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1">
                    <Key className="w-3 h-3 text-emerald-500" /> Secure Lab
                    Identity (API Key)
                  </label>
                  <Lock className="w-3 h-3 text-slate-300" />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none border-r border-slate-800 pr-4">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <code className="block w-full bg-slate-900 border border-slate-800 rounded-2xl px-16 py-6 text-xl text-emerald-400 font-mono tracking-[0.2em] select-all shadow-2xl">
                    {lab.licenseNumber || "NO-LICENSE-FOUND"}
                  </code>
                </div>
                <div className="mt-6 p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-800 uppercase leading-relaxed tracking-tight">
                    Security Warning: This key allows physical machines to
                    inject data into patient records. Expose this key only
                    within your local network infrastructure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SYSTEM STATE */}
        <div className="lg:col-span-4 space-y-8">
          {/* Status Card */}
          <div className="bg-slate-900 rounded-[32px] p-8 text-primary-foreground shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000" />

            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 animate-[spin_8s_linear_infinite]" />{" "}
                Cloud Status
              </h2>
              <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
            </div>

            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-card/5 border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  Listener Profile
                </p>
                <p className="text-2xl font-black text-emerald-400 tracking-tight">
                  ACTIVE
                </p>
                <p className="text-[10px] font-bold text-muted-foreground mt-2 italic uppercase">
                  System ready for HL7 packets
                </p>
              </div>

              <div className="flex items-center justify-between px-2 pt-4 border-t border-white/10">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">
                    Global Synced Parameters
                  </p>
                  <h3 className="text-4xl font-black tabular-nums tracking-tighter text-indigo-300">
                    {totalMachineResults}
                  </h3>
                </div>
                <Database className="w-10 h-10 text-indigo-500/20" />
              </div>
            </div>
          </div>

          {/* Specs Card */}
          <div className="bg-card rounded-[32px] p-8 border border-slate-100 shadow-sm relative group overflow-hidden">
            <Box className="absolute -right-4 -top-4 w-24 h-24 text-slate-50 -rotate-12 transition-transform group-hover:scale-110" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2 relative z-10">
              <HardDrive className="w-4 h-4" /> Agent Specs
            </h3>
            <ul className="space-y-4 text-[11px] font-black text-muted-foreground uppercase tracking-tight relative z-10">
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                Win 10/11 Architecture
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                Serial/TCP HL7 v2.x
              </li>
              <li className="flex items-center gap-3 opacity-40">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                Unix Binary (Beta)
              </li>
            </ul>
          </div>
        </div>

        {/* ✅ REGISTERED ANALYZERS LIST */}
        <div className="lg:col-span-12 bg-card rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mt-4">
          <div className="px-10 py-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <Cpu className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-black text-foreground text-lg tracking-tight uppercase">
                  Registered Analyzers
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  Auto-discovered machines (first webhook ping creates the record)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">
                {registeredAnalyzers.length} Machine{registeredAnalyzers.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {registeredAnalyzers.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Cpu className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                No machines registered yet.
              </h3>
              <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                Send a test result from your middleware/agent to register the first analyzer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-card text-muted-foreground/70 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-10 py-6">Machine Name</th>
                    <th className="px-10 py-6">Model</th>
                    <th className="px-10 py-6">Protocol</th>
                    <th className="px-10 py-6">Results Synced</th>
                    <th className="px-10 py-6">Mappings</th>
                    <th className="px-10 py-6">Unmapped Queue</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {registeredAnalyzers.map((analyzer) => (
                    <tr key={analyzer.id} className="group hover:bg-muted/30 transition-all duration-300">
                      <td className="px-10 py-6">
                        <span className="font-mono font-black text-sm text-primary bg-indigo-50 px-4 py-2 rounded-xl">
                          {analyzer.name}
                        </span>
                      </td>
                      <td className="px-10 py-8 font-mono text-xs text-muted-foreground/70">
                        {analyzer.model}
                        <div className="text-[9px] text-slate-400">SN: {analyzer.serialNumber}</div>
                      </td>
                      <td className="px-10 py-6">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                          {analyzer.protocol || "JSON"}
                        </span>
                      </td>
                      <td className="px-10 py-6 font-mono text-sm text-foreground">
                        {analyzer._count.results}
                      </td>
                      <td className="px-10 py-6 font-mono text-sm text-foreground">
                        {analyzer._count.mappings}
                      </td>
                      <td className="px-10 py-6 font-mono text-sm">
                        {analyzer._count.unmappedCodes > 0 ? (
                          <span className="text-amber-600 font-bold">{analyzer._count.unmappedCodes} pending</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-10 py-6">
                        <span className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${analyzer.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-100"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${analyzer.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {analyzer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <Link
                          href="/workspace/analyzers/mappings"
                          className="inline-flex items-center gap-2 text-foreground hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all group/link">
                          Manage Mappings
                          <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LIVE FEED TABLE */}
        <div className="lg:col-span-12 bg-card rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mt-4">
          <div className="px-10 py-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-2xl">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-black text-foreground text-lg tracking-tight uppercase">
                  Live Telemetry Feed
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  Real-time capturing from hardware nodes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                {recentSyncs.length} Active Streams
              </span>
            </div>
          </div>

          {recentSyncs.length === 0 ? (
            <div className="p-24 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <Cpu className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                Standby: No hardware signal detected.
              </h3>
              <p className="text-xs text-muted-foreground mt-3 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                Connect your Local Agent and transmit a test message to initiate
                the handshake.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-card text-muted-foreground/70 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-10 py-6">Hardware Reference</th>
                    <th className="px-10 py-6">Subject Identity</th>
                    <th className="px-10 py-6">Capture Window</th>
                    <th className="px-10 py-6">State</th>
                    <th className="px-10 py-6 text-right">Navigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentSyncs.map((sample) => (
                    <tr
                      key={sample.id}
                      className="group hover:bg-muted/30 transition-all duration-300">
                      <td className="px-10 py-8">
                        <span className="font-mono font-black text-sm text-primary bg-indigo-50 px-4 py-2 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {sample.sampleId}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <p className="font-black text-foreground text-base tracking-tight mb-1">
                          {sample.patient?.name || "Unknown Identity"}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Captured via HL7 Node
                        </p>
                      </td>
                      <td className="px-10 py-8 font-mono text-xs text-muted-foreground/70 tabular-nums">
                        {new Date(sample.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-10 py-8">
                        <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-primary border border-emerald-100">
                          <Zap className="w-3 h-3 fill-emerald-500" />
                          Validated
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <Link
                          href={`/workspace/samples/${sample.sampleId}`}
                          className="inline-flex items-center gap-2 text-foreground hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all group/link">
                          Review Result Matrix
                          <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
