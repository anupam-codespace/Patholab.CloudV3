"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  X,
  LogOut,
  Activity,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";
import { roleNavMap, NavGroup, NavItem } from "@/config/navigation";

interface SidebarProps {
  role: string;
  subscription: any;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({
  role,
  subscription,
  isOpen,
  setIsOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const rawNavigation: NavGroup[] = roleNavMap[role] || [];

  // Expanded Groups State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initialState: Record<string, boolean> = {};
      rawNavigation.forEach((group) => (initialState[group.title] = true));
      return initialState;
    },
  );

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [pathname, setIsOpen]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Robust Logout Fix
  const handleLogout = async () => {
    const toastId = toast.loading("Logging out securely...");
    try {
      // Changed to the standard Auth API route format
      const res = await fetch("/api/auth/logout", { method: "POST" });

      if (!res.ok) throw new Error("Failed to clear session");

      toast.success("Logged out successfully", { id: toastId });

      // Force a hard reload to clear all client-side cache and states
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error("Logout failed. Please try again.", { id: toastId });
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0f172a] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}>
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-800/60 bg-[#0B1120]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="bg-blue-600/10 border border-blue-500/20 p-1.5 rounded-lg">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Patholab<span className="text-blue-500">.cloud</span>
            </span>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Area */}
        <ScrollArea className="flex-1 py-6 px-4">
          <nav className="space-y-8">
            {rawNavigation.map((group, gIdx) => {
              const isGroupOpen = expandedGroups[group.title];
              return (
                <div key={gIdx} className="space-y-2">
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors">
                    {group.title}
                    <div
                      className={cn(
                        "transition-transform duration-200",
                        isGroupOpen ? "rotate-180" : "rotate-0",
                      )}>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>

                  <div
                    className={cn(
                      "space-y-1 transition-all duration-300 ease-in-out overflow-hidden",
                      isGroupOpen
                        ? "max-h-[800px] opacity-100"
                        : "max-h-0 opacity-0",
                    )}>
                    {group.items.map((item) => (
                      <SidebarItem
                        key={item.name}
                        item={item}
                        subscription={subscription}
                        pathname={pathname}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer Area */}
        <div className="shrink-0 border-t border-slate-800/60 p-4 bg-[#0B1120]">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-xl"
            onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-semibold text-sm">Log Out</span>
          </Button>
        </div>
      </aside>
    </>
  );
}

// --- Subcomponent for Sidebar Items ---

function SidebarItem({
  item,
  subscription,
  pathname,
}: {
  item: NavItem;
  subscription: any;
  pathname: string;
}) {
  // Logic: Locked if a reqModule exists and is NOT in unlockedFeatures/Plans
  const isLocked =
    item.reqModule &&
    !subscription?.plan?.[item.reqModule] &&
    !subscription?.unlockedFeatures?.includes(item.reqModule);

  const Icon = isLocked ? Lock : item.icon;
  const isActive =
    !isLocked &&
    (pathname === item.href || pathname.startsWith(`${item.href}/`));
  const href = isLocked ? `/upgrade?feature=${item.reqModule}` : item.href;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 relative overflow-hidden",
        isActive
          ? "bg-blue-600/10 text-blue-400"
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100",
        isLocked && "opacity-60 cursor-pointer hover:opacity-100",
      )}>
      {/* Active State Left Accent Line */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md" />
      )}

      <div className="flex items-center space-x-3 z-10">
        <Icon
          className={cn(
            "h-[18px] w-[18px] transition-colors duration-200",
            isActive
              ? "text-blue-500"
              : "text-slate-500 group-hover:text-slate-300",
          )}
        />
        <span>{item.name}</span>
      </div>

      {isLocked ? (
        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full uppercase font-bold tracking-wide z-10">
          Pro
        </span>
      ) : (
        item.badge && (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide z-10 shadow-sm",
              isActive
                ? "bg-blue-500 text-white"
                : "bg-slate-700 text-slate-300",
            )}>
            {item.badge}
          </span>
        )
      )}
    </Link>
  );
}
