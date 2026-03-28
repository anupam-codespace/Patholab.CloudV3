'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  // role: "SUPER_ADMIN" | "LAB_OWNER" | "TECHNICIAN" | "RECEPTIONIST";
  role: "LAB_OWNER" | "TECHNICIAN" | "RECEPTIONIST";
}

type NavItem = { name: string; href: string; icon: any; badge?: string; };
type NavGroup = { title: string; items: NavItem[]; };

// --- NAVIGATION DATA ---
// const superAdminNav: NavGroup[] = [
//   {
//     title: 'Overview',
//     items: [
//       { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
//       { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
//       { name: 'Leads', href: '/admin/leads', icon: Mail, badge: 'New' },
//     ]
//   },
//   {
//     title: 'Management',
//     items: [
//       { name: 'Labs & Tenants', href: '/admin/labs', icon: Building2 },
//       { name: 'Global Users', href: '/admin/users', icon: Users },
//       { name: 'SaaS Plans', href: '/admin/plans', icon: Box },
//     ]
//   },
//   {
//     title: 'Finance',
//     items: [
//       { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
//       { name: 'Invoices', href: '/admin/invoices', icon: Receipt },
//     ]
//   },
//   {
//     title: 'System',
//     items: [
//       { name: 'Support Tickets', href: '/admin/support', icon: LifeBuoy, badge: '5' },
//       { name: 'Pages', href: '/admin/pages', icon: FileText, badge: 'New' },
//       { name: 'Settings', href: '/admin/settings', icon: Settings },
//     ]
//   }
// ];

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
      // ✅ NEW: Report Templates Link
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
      {
        name: "Films & Media",
        href: "/lab-owner/radiology/media",
        icon: Disc,
      },
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
    title: 'Workflow',
    items: [
      { name: 'Dashboard', href: '/technician', icon: LayoutDashboard },
      { name: 'Pending Tests', href: '/technician/tests', icon: FlaskConical, badge: '12' },
      { name: 'Sample Management', href: '/technician/samples', icon: TestTube },
    ]
  },
  {
    title: 'Lab',
    items: [
      { name: 'Machine Results', href: '/technician/analyzers', icon: Cpu },
      { name: 'AI Validations', href: '/technician/ai-review', icon: BrainCircuit },
      { name: 'Inventory Request', href: '/technician/inventory', icon: Box },
    ]
  },
  {
    title: 'Reports',
    items: [
      { name: 'Completed Reports', href: '/technician/reports', icon: FileText },
    ]
  }
];

const receptionistNav: NavGroup[] = [
  {
    title: 'Front Desk',
    items: [
      { name: 'Dashboard', href: '/receptionist', icon: LayoutDashboard },
      { name: 'New Registration', href: '/receptionist/registration', icon: UserPlus },
      { name: 'Appointments', href: '/receptionist/appointments', icon: FileText },
      { name: 'Home Collection', href: '/receptionist/logistics', icon: Truck },
    ]
  },
  {
    title: 'Records',
    items: [
      { name: 'Patient Directory', href: '/receptionist/patients', icon: Users },
      { name: 'Doctors Directory', href: '/receptionist/doctors', icon: Stethoscope },
    ]
  },
  {
    title: 'Finance',
    items: [
      { name: 'Billing', href: '/receptionist/billing', icon: Receipt },
    ]
  }
];

const roleNavMap = {
  // SUPER_ADMIN: superAdminNav,
  LAB_OWNER: labOwnerNav,
  TECHNICIAN: technicianNav,
  RECEPTIONIST: receptionistNav,
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navigation = roleNavMap[role] || [];
  
  const [isOpen, setIsOpen] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Front Desk": true, 
    "Lab Operations": true,
    "Finance & Admin": true, // ✅ Auto-expand this to show the new link
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/;';
    window.location.href = '/login';
  };

  return (
    <>
      {/* --- TRIGGER BUTTON --- */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-4 left-4 z-50 bg-white shadow-md border-slate-200 transition-all duration-300",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </Button>

      {/* --- OVERLAY --- */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- SIDEBAR DRAWER --- */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 1. Header with Close Button */}
        <div className="flex h-16 items-center justify-end px-4 border-b bg-primary/5">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>
        
        {/* 2. Scrollable Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-4 px-4">
            {navigation.map((group, groupIndex) => {
              const isGroupOpen = expandedGroups[group.title];

              return (
                <div key={groupIndex} className="space-y-1">
                  {/* COLLAPSIBLE HEADER */}
                  <button 
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-primary hover:bg-slate-100/50 rounded transition-colors"
                  >
                    {group.title}
                    {isGroupOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>

                  {/* ITEMS */}
                  <div className={cn(
                    "space-y-1 overflow-hidden transition-all duration-300 ease-in-out pl-2 border-l-2 border-slate-100 ml-2",
                    isGroupOpen ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
                  )}>
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] px-1.5",
                              isActive ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600"
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

        {/* 3. Footer */}
        <div className="border-t p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-xs text-white font-bold">
                {role.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none">My Account</p>
                <p className="text-xs text-muted-foreground capitalize">{role.replace('_', ' ').toLowerCase()}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}