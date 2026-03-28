"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  TestTube,
  FileText,
  Settings,
  CreditCard,
  LifeBuoy,
  Building2,
  FlaskConical,
  Truck,
  Cpu,
  BrainCircuit,
  Stethoscope,
  Briefcase,
  Receipt,
  LogOut,
  Box,
  BarChart3,
  ShieldCheck,
  UserCog,
  Mail,
  UserPlus,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  FileImage,
  Disc,
  Activity,
  CalendarDays,
  ScanLine,
  Server,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  role: "LAB_OWNER" | "TECHNICIAN" | "RECEPTIONIST";
}

type NavItem = { name: string; href: string; icon: any; badge?: string };
type NavGroup = { title: string; items: NavItem[] };

// --- NAVIGATION DATA (Preserved exactly as provided) ---
const labOwnerNav: NavGroup[] = [
  {
    title: "Front Desk",
    items: [
      { name: "Dashboard", href: "/lab-owner", icon: LayoutDashboard },
      {
        name: "New Registration",
        href: "/lab-owner/registration",
        icon: UserPlus,
        badge: "Start",
      },
      {
        name: "Patient Worklist",
        href: "/lab-owner/patients",
        icon: ClipboardList,
      },
      { name: "Billing & Invoices", href: "/lab-owner/billing", icon: Receipt },
    ],
  },
  {
    title: "Lab Operations",
    items: [
      {
        name: "Test Management",
        href: "/lab-owner/test-management",
        icon: TestTube,
      },
      { name: "Machines (IoT)", href: "/lab-owner/analyzers", icon: Cpu },
      { name: "Inventory & Stock", href: "/lab-owner/inventory", icon: Box },
      { name: "Logistics / Trips", href: "/lab-owner/logistics", icon: Truck },
      {
        name: "Report Templates",
        href: "/lab-owner/settings/templates",
        icon: LayoutTemplate,
        badge: "New",
      },
    ],
  },
  {
    title: "Radiology (RIS)",
    items: [
      {
        name: "Dashboard",
        href: "/lab-owner/radiology/dashboard",
        icon: Activity,
      },
      {
        name: "Appointments & Scans",
        href: "/lab-owner/radiology/appointments",
        icon: CalendarDays,
      },
      {
        name: "Technician Worklist",
        href: "/lab-owner/radiology/worklist",
        icon: ScanLine,
        badge: "Live",
      },
      {
        name: "Radiologist Queue",
        href: "/lab-owner/radiology/reporting",
        icon: Stethoscope,
      },
      {
        name: "PACS / Viewer",
        href: "/lab-owner/radiology/pacs",
        icon: FileImage,
      },
      {
        name: "Reports",
        href: "/lab-owner/radiology/reports-archive",
        icon: FileText,
      },
      { name: "Films & Media", href: "/lab-owner/radiology/media", icon: Disc },
      {
        name: "Modalities (Machines)",
        href: "/lab-owner/radiology/modalities",
        icon: Server,
      },
      {
        name: "Reporting Macros",
        href: "/lab-owner/radiology/settings/macros",
        icon: LayoutTemplate,
      },
      {
        name: "DICOM Settings",
        href: "/lab-owner/radiology/settings/dicom",
        icon: Settings,
      },
    ],
  },
  {
    title: "Business Growth",
    items: [
      {
        name: "Doctors & Referrals",
        href: "/lab-owner/doctors",
        icon: Stethoscope,
      },
      { name: "B2B Agencies", href: "/lab-owner/agencies", icon: Briefcase },
      { name: "Commissions", href: "/lab-owner/commissions", icon: BarChart3 },
    ],
  },
  {
    title: "Finance & Admin",
    items: [
      { name: "Expenses", href: "/lab-owner/expenses", icon: FileText },
      {
        name: "Subscription",
        href: "/lab-owner/subscription",
        icon: ShieldCheck,
      },
      { name: "Staff Management", href: "/lab-owner/staff", icon: UserCog },
      { name: "Settings", href: "/lab-owner/settings", icon: Settings },
    ],
  },
];

const technicianNav: NavGroup[] = [
  {
    title: "Workflow",
    items: [
      { name: "Dashboard", href: "/technician", icon: LayoutDashboard },
      {
        name: "Pending Tests",
        href: "/technician/tests",
        icon: FlaskConical,
        badge: "12",
      },
      {
        name: "Sample Management",
        href: "/technician/samples",
        icon: TestTube,
      },
    ],
  },
  {
    title: "Lab",
    items: [
      { name: "Machine Results", href: "/technician/analyzers", icon: Cpu },
      {
        name: "AI Validations",
        href: "/technician/ai-review",
        icon: BrainCircuit,
      },
      { name: "Inventory Request", href: "/technician/inventory", icon: Box },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        name: "Completed Reports",
        href: "/technician/reports",
        icon: FileText,
      },
    ],
  },
];

const receptionistNav: NavGroup[] = [
  {
    title: "Front Desk",
    items: [
      { name: "Dashboard", href: "/receptionist", icon: LayoutDashboard },
      {
        name: "New Registration",
        href: "/receptionist/registration",
        icon: UserPlus,
      },
      {
        name: "Appointments",
        href: "/receptionist/appointments",
        icon: FileText,
      },
      { name: "Home Collection", href: "/receptionist/logistics", icon: Truck },
    ],
  },
  {
    title: "Records",
    items: [
      {
        name: "Patient Directory",
        href: "/receptionist/patients",
        icon: Users,
      },
      {
        name: "Doctors Directory",
        href: "/receptionist/doctors",
        icon: Stethoscope,
      },
    ],
  },
  {
    title: "Finance",
    items: [{ name: "Billing", href: "/receptionist/billing", icon: Receipt }],
  },
];

const roleNavMap = {
  LAB_OWNER: labOwnerNav,
  TECHNICIAN: technicianNav,
  RECEPTIONIST: receptionistNav,
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navigation = roleNavMap[role] || [];

  const [isOpen, setIsOpen] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      "Front Desk": true,
      "Lab Operations": true,
      "Finance & Admin": true,
    },
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = () => {
    document.cookie = "token=; Max-Age=0; path=/;";
    window.location.href = "/login";
  };

  return (
    <>
      {/* --- PREMIUM FLOATING TRIGGER BUTTON --- */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-7 left-6 md:left-10 z-50 bg-white shadow-sm border-slate-200 rounded-xl h-10 w-10 transition-all duration-300 flex items-center justify-center hover:bg-slate-50 hover:shadow-md",
          isOpen
            ? "opacity-0 scale-90 pointer-events-none"
            : "opacity-100 scale-100",
        )}
        onClick={() => setIsOpen(true)}>
        <Menu className="h-5 w-5 text-slate-700" />
      </Button>

      {/* --- OVERLAY --- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- SIDEBAR COMMAND CENTER DRAWER --- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-slate-950 border-r border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}>
        {/* 1. Brand Header */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-slate-800/60 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
              <FlaskConical className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              patholab<span className="text-emerald-400">.cloud</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl h-9 w-9 transition-colors">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 2. Scrollable Navigation */}
        <ScrollArea className="flex-1 py-6">
          <nav className="space-y-6 px-4">
            {navigation.map((group, groupIndex) => {
              const isGroupOpen = expandedGroups[group.title];

              return (
                <div key={groupIndex} className="space-y-1">
                  {/* COLLAPSIBLE HEADER */}
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-2 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors rounded-lg focus:outline-none">
                    {group.title}
                    {isGroupOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* NAV ITEMS */}
                  <div
                    className={cn(
                      "space-y-1 overflow-hidden transition-all duration-300 ease-in-out pl-3 border-l border-slate-800 ml-2.5",
                      isGroupOpen
                        ? "max-h-[500px] opacity-100 mt-2"
                        : "max-h-0 opacity-0",
                    )}>
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                          )}>
                          <div className="flex items-center space-x-3">
                            <item.icon
                              className={cn(
                                "h-4 w-4 transition-colors",
                                isActive
                                  ? "text-emerald-400"
                                  : "text-slate-500 group-hover:text-slate-300",
                              )}
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={cn(
                                "flex items-center justify-center rounded-full text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider",
                                isActive
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-800 text-slate-400",
                              )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* 3. Bottom Profile Footer */}
        <div className="border-t border-slate-800/60 p-5 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm text-white font-black shadow-lg">
                {role.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white leading-none">
                  Workspace
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  {role.replace("_", " ")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={handleLogout}
              title="Secure Log Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
