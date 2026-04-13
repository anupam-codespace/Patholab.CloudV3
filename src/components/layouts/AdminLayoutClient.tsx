"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { cn } from "@/lib/utils";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: string;
    email?: string;
    avatar?: string;
  };
}

export default function AdminLayoutClient({
  children,
  user,
}: AdminLayoutClientProps) {
  // Default to false, but will be overridden by localStorage in useEffect
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Persist Sidebar State & Handle Initial Screen Size
  useEffect(() => {
    setMounted(true);
    const storedState = localStorage.getItem("superAdminSidebarState");

    if (storedState !== null) {
      setIsCollapsed(JSON.parse(storedState));
    } else if (window.innerWidth < 1024) {
      // Auto-collapse on tablets/small screens if no preference is saved
      setIsCollapsed(true);
    }
  }, []);

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("superAdminSidebarState", JSON.stringify(collapsed));
  };

  // Prevent hydration mismatch flashes
  if (!mounted) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      {/* 1. Sidebar (Fixed Left) */}
      {/* Note: Removed the user={user} prop as our updated AdminSidebar doesn't require it */}
      <AdminSidebar
        collapsed={isCollapsed}
        setCollapsed={handleSidebarToggle}
      />

      {/* 2. Main Wrapper (Pushed Right) */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full",
          // Use md: prefix so mobile doesn't get pushed off-screen
          isCollapsed ? "md:ml-20" : "md:ml-64",
        )}>
        {/* 3. Header (Sticky Top) */}
        <AdminHeader user={user} />

        {/* 4. Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative bg-slate-50/50">
          {/* Subtle dotted background pattern for the "Command Center" feel */}
          <div
            className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#0f172a 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Max-width container to prevent ultrawide stretching */}
          <div className="relative z-10 w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
