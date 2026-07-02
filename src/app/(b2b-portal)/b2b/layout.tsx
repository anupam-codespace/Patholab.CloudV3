"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  LogOut,
  TestTube2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function B2BPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/b2b-portal", icon: LayoutDashboard },
    { name: "My Patients", href: "/b2b-portal/patients", icon: Users },
    { name: "Financial Ledger", href: "/b2b-portal/ledger", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <TestTube2 className="h-6 w-6" />
            <span>Patholab Partner</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}>
                  <item.icon
                    className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                  />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="h-5 w-5 mr-3" /> Logout
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* MOBILE HEADER (Optional, implement hamburger menu here if needed) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-8 justify-between md:justify-end">
          <div className="md:hidden flex items-center gap-2 text-indigo-600 font-bold">
            <TestTube2 className="h-5 w-5" /> Partner Portal
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Building2 className="h-4 w-4 text-slate-400" /> My Agency
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
