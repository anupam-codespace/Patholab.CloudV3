"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Mail,
  Building2,
  Receipt,
  LifeBuoy,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Bell,
  Server,
  Database,
  Files,
  Activity,
  Trash2,
  HardDriveDownload,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

// --- PIVOTED NAVIGATION DATA ---
const navGroups = [
  {
    title: "Overview",
    items: [
      { name: "Command Center", href: "/admin", icon: LayoutDashboard },
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { name: "Leads & Outreach", href: "/admin/leads", icon: Mail },
    ],
  },
  {
    title: "Tenant Management",
    items: [
      { name: "Client Labs", href: "/admin/labs", icon: Building2 },
      { name: "Global Users", href: "/admin/users", icon: Users },
      { name: "Master Catalog", href: "/admin/catalog", icon: Database },
    ],
  },
  {
    title: "Platform Economics", // Replaced 'Monetization'
    items: [
      // Replaced old SaaS Subscriptions with Wallet system
      { name: "Wallet Ledger", href: "/admin/wallet", icon: Wallet },
      {
        name: "Recharge History",
        href: "/admin/wallet/recharges",
        icon: ArrowDownRight,
      },
      {
        name: "Usage Deductions",
        href: "/admin/wallet/deductions",
        icon: ArrowUpRight,
      },
      { name: "Tax Invoices", href: "/admin/invoices", icon: Receipt },
      { name: "Webhooks", href: "/admin/webhooks", icon: HardDriveDownload },
    ],
  },
  {
    title: "Audit & Compliance",
    items: [
      { name: "Activity Logs", href: "/admin/activity", icon: Activity },
      { name: "Recycle Bin", href: "/admin/archives", icon: Trash2 },
    ],
  },
  {
    title: "System Control",
    items: [
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
      { name: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
      { name: "Global Config", href: "/admin/settings", icon: Settings },
      { name: "CMS Pages", href: "/admin/pages", icon: Files },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export default function AdminSidebar({
  collapsed,
  setCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // Fetch System Status & Config on Mount
  useEffect(() => {
    Promise.all([
      fetch("/api/system/status").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/system/config").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([statusData, configData]) => {
        if (statusData) setSystemStatus(statusData);
        if (configData) setSystemConfig(configData);
      })
      .catch((err) => console.error("Initialization fetch failed", err));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed");
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "bg-slate-900 text-slate-300 fixed h-full left-0 top-0 z-50 flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out",
          collapsed ? "w-20" : "w-64",
        )}>
        {/* 1. Header & Dynamic Branding */}
        <div
          className={cn(
            "border-b border-slate-800 flex flex-col transition-all",
            collapsed ? "p-4 items-center" : "p-6",
          )}>
          <div className="flex items-center gap-3 mb-2">
            {/* Dynamic Logo Rendering */}
            {systemConfig?.systemLogo ? (
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src={systemConfig.systemLogo}
                  alt="System Logo"
                  fill
                  className="object-contain rounded-md"
                />
              </div>
            ) : (
              <ShieldCheck className="text-emerald-500 h-8 w-8 shrink-0" />
            )}

            {!collapsed && (
              <div className="overflow-hidden">
                {/* Dynamic System Name */}
                <h2 className="text-lg font-bold text-white tracking-tight leading-none truncate">
                  {systemConfig?.systemName || "Patholab Admin"}
                </h2>
                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest font-bold">
                  God Mode
                </span>
              </div>
            )}
          </div>

          {!collapsed && systemStatus && (
            <div className="mt-4 bg-slate-950/50 rounded-lg p-3 text-xs space-y-2 border border-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Server className="h-3 w-3" /> Server
                </span>
                <span className="text-slate-200 font-mono">
                  {systemStatus.server}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Database className="h-3 w-3" /> DB
                </span>
                <span
                  className={cn(
                    "font-mono flex items-center gap-1.5",
                    systemStatus.dbStatus === "Connected"
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      systemStatus.dbStatus === "Connected"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-red-500",
                    )}
                  />
                  {systemStatus.dbName}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Navigation Links with ScrollArea */}
        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                {!collapsed && (
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3 transition-opacity duration-300">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center rounded-lg transition-all duration-200 group relative",
                              collapsed ? "justify-center p-3" : "px-3 py-2.5",
                              isActive
                                ? "bg-emerald-600/10 text-emerald-400 shadow-sm border border-emerald-500/20"
                                : "hover:bg-slate-800 hover:text-white border border-transparent",
                            )}>
                            <item.icon
                              className={cn(
                                "h-5 w-5 shrink-0 transition-colors",
                                isActive
                                  ? "text-emerald-400"
                                  : "text-slate-500 group-hover:text-slate-300",
                              )}
                            />

                            {!collapsed && (
                              <span className="ml-3 text-sm font-semibold whitespace-nowrap overflow-hidden">
                                {item.name}
                              </span>
                            )}

                            {isActive && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            )}
                          </Link>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent
                            side="right"
                            className="bg-slate-900 text-white border-slate-700 font-medium">
                            {item.name}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* 3. Footer: Toggle & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 mb-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <ChevronLeft className="h-4 w-4" /> Collapse
              </div>
            )}
          </button>

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 transition-all border border-transparent hover:border-rose-900/30",
              collapsed ? "justify-center p-3" : "px-4 py-3",
            )}>
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm font-bold">Sign Out</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
