"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, X, LogOut, Activity, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";
import { roleNavMap, NavGroup, NavItem } from "@/config/navigation";

interface SidebarProps {
  role: string;
  subscription: any;
  activeModules?: string[]; // Array of enabled module IDs from DB
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({
  role,
  subscription,
  activeModules = [], // Default to empty array to prevent crashes
  isOpen,
  setIsOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const rawNavigation: NavGroup[] = roleNavMap[role] || [];

  // ✅ Normalize activeModules for case-insensitive comparison
  // Handle both array (PostgreSQL) and CSV string (SQLite) formats
  const normalizedActive = useMemo(() => {
    if (!activeModules) return [];
    const arr = Array.isArray(activeModules)
      ? activeModules
      : typeof activeModules === 'string'
        ? String(activeModules).split(',').filter(Boolean)
        : [];
    return arr.map((m: any) => String(m).toLowerCase()).filter(Boolean);
  }, [activeModules]);

  // ✅ 1. FILTER ENGINE: Dynamically rebuild the menu based on active modules
  const filteredNavigation = useMemo(() => {
    return (
      rawNavigation
        .map((group) => {
          // 🚨 If the GROUP itself has a moduleTag and it's not active, drop all items in this group.
          if (group.moduleTag && !normalizedActive.includes(group.moduleTag.toLowerCase())) {
            return { ...group, items: [] };
          }

          return {
            ...group,
            items: group.items.filter((item) => {
              // If the item doesn't require a specific module, always show it (e.g., Dashboard)
              if (!item.moduleTag) return true;

              // If it DOES require a module, check if the lab has enabled it in Settings (case-insensitive)
              return normalizedActive.includes(item.moduleTag.toLowerCase());
            }),
          };
        })
        // Remove entirely empty groups so you don't have blank headers
        .filter((group) => group.items.length > 0)
    );
  }, [rawNavigation, normalizedActive]);

  // ✅ 2. EXPANDED STATE TRACKING
  // We only track what the user explicitly closes.
  // If a group isn't in this state object, it defaults to TRUE (Open).
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [pathname, setIsOpen]);

  const toggleGroup = (title: string) => {
    setClosedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = async () => {
    const toastId = toast.loading("Logging out securely...");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });

      if (!res.ok) throw new Error("Failed to clear session");

      toast.success("Logged out successfully", { id: toastId });
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
            href="/workspace"
            className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="bg-primary/10 border border-blue-500/20 p-1.5 rounded-lg">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Patholab<span className="text-blue-500">.cloud</span>
            </span>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-muted-foreground/70 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Area */}
        <ScrollArea className="flex-1 py-6 px-4">
          <nav className="space-y-8">
            {/* Render the FILTERED navigation instead of rawNavigation */}
            {filteredNavigation.map((group, gIdx) => {
              // If it's NOT marked as closed, it is open!
              const isGroupOpen = !closedGroups[group.title];

              return (
                <div key={gIdx} className="space-y-2">
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-slate-300 transition-colors">
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
            className="w-full justify-start text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-xl"
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
  pathname,
}: {
  item: NavItem;
  subscription?: any; // Kept for interface compatibility, but ignored in logic
  pathname: string;
}) {
  
  // ✅ 1. REMOVED the old SaaS subscription checks. 
  // If the item survived the Sidebar filter, it is active and unlocked!
  const isLocked = false; 

  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const href = item.href;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 relative overflow-hidden",
        isActive
          ? "bg-primary/10 text-blue-400"
          : "text-muted-foreground/70 hover:bg-slate-800/50 hover:text-slate-100",
      )}>
      {/* Active State Left Accent Line */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/100 rounded-r-md" />
      )}

      <div className="flex items-center space-x-3 z-10">
        <Icon
          className={cn(
            "h-[18px] w-[18px] transition-colors duration-200",
            isActive
              ? "text-blue-500"
              : "text-muted-foreground group-hover:text-slate-300",
          )}
        />
        <span>{item.name}</span>
      </div>

      {item.badge && (
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide z-10 shadow-sm",
            isActive
              ? "bg-primary/100 text-white"
              : "bg-slate-700 text-slate-300",
          )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}
