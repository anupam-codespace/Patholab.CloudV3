"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar"; // Adjust path if needed
import { AdminHeader } from "./AdminHeader"; // ✅ Import Header
import { cn } from "@/lib/utils";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: string;
    email?: string;
  };
}

export default function AdminLayoutClient({
  children,
  user,
}: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* 1. Sidebar (Fixed Left) */}
      <AdminSidebar
        collapsed={isCollapsed}
        setCollapsed={setIsCollapsed}
        user={user}
      />

      {/* 2. Main Wrapper (Pushed Right) */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          isCollapsed ? "ml-20" : "ml-64",
        )}>
        {/* ✅ 3. Header (Sticky Top) */}
        <AdminHeader user={user} />

        {/* 4. Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
