"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Receipt, LogOut, Menu, X,
  Building2, Download, TestTube2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const navItems = [
  { name: "Dashboard", href: "/b2b", icon: LayoutDashboard },
  { name: "My Patients", href: "/b2b/patients", icon: Users },
  { name: "Reports", href: "/b2b/reports", icon: FileText },
  { name: "Invoices", href: "/b2b/invoices", icon: Receipt },
];

export default function B2BPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* SIDEBAR */}
      <aside className={`w-64 bg-sidebar flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-16 flex items-center px-6 border-b border-sidebar-foreground/10">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <TestTube2 className="h-6 w-6" />
            <span className="text-sidebar-active-foreground">B2B Portal</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/b2b" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-sidebar-active text-sidebar-active-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-foreground/10"
                }`}>
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-foreground/10">
          <Button variant="ghost" onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="h-5 w-5 mr-3" /> Logout
          </Button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center px-4 md:px-8 justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden">
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" /> Agency Portal
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-muted/30">
          {children}
        </div>
      </main>
    </div>
  );
}
