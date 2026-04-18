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
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";

// IMPORT THE CONFIGURATION
import { roleNavMap, NavGroup } from "@/config/navigation";

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const rawNavigation: NavGroup[] = roleNavMap[role] || [];

  // We start with 'true' so it renders open on Desktop by default
  const [isOpen, setIsOpen] = useState(true);
  const [modules, setModules] = useState<Record<string, boolean>>({});

  // Dynamically open all menus by default based on available data
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initialState: Record<string, boolean> = {};
      rawNavigation.forEach((group) => {
        initialState[group.title] = true;
      });
      return initialState;
    },
  );

  // --- EVENT LISTENERS & RESPONSIVENESS ---
  useEffect(() => {
    // 1. Auto-close on mobile load, auto-open on desktop load
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    handleResize(); // Run once on mount

    // 2. Listen for the Hamburger Menu click from the Header
    const toggleSidebarListener = () => {
      setIsOpen((prev) => !prev);
    };

    document.addEventListener("toggle-sidebar", toggleSidebarListener);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("toggle-sidebar", toggleSidebarListener);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // --- DYNAMIC MODULE FETCHING ---
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch("/api/workspace/settings");
        if (res.ok) {
          const data = await res.json();
          const plan = data?.lab?.subscription?.plan || {};

          setModules({
            hasInventory: !!plan.hasInventory,
            hasRadiology: !!plan.hasRadiology,
            hasMachineIoT: !!plan.hasMachineIoT,
            hasB2bBilling: !!plan.hasB2bBilling,
            hasLogistics: !!plan.hasLogistics,
          });
        }
      } catch (error) {
        console.error("Failed to load active modules:", error);
      }
    };

    fetchModules();
    window.addEventListener("modules-updated", fetchModules);
    return () => window.removeEventListener("modules-updated", fetchModules);
  }, []);

  const navigation = rawNavigation
    .map((group) => {
      if (group.reqModule && !modules[group.reqModule]) return null;
      const filteredItems = group.items.filter((item) => {
        if (item.reqModule && !modules[item.reqModule]) return false;
        return true;
      });
      if (filteredItems.length === 0) return null;
      return { ...group, items: filteredItems };
    })
    .filter(Boolean) as NavGroup[];

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    try {
      toast.loading("Securely logging out...");
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (e) {
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* --- OVERLAY FOR MOBILE ONLY --- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- SIDEBAR DRAWER --- */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 w-[280px] bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col transition-all duration-300 ease-in-out shrink-0",
          isOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0 lg:-ml-[280px]", // The magic CSS trick for desktop hiding
        )}>
        {/* BRAND HEADER */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800/60 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg">
              <FlaskConical className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              patholab<span className="text-emerald-400">.cloud</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl h-8 w-8 transition-colors">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* NAVIGATION LIST */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-6 px-3">
            {navigation.map((group, groupIndex) => {
              const isGroupOpen = expandedGroups[group.title];
              return (
                <div key={groupIndex} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors rounded-lg focus:outline-none">
                    {group.title}
                    {isGroupOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  <div
                    className={cn(
                      "space-y-1 overflow-hidden transition-all duration-300 ease-in-out pl-2 border-l border-slate-800 ml-3",
                      isGroupOpen
                        ? "max-h-[800px] opacity-100 mt-1"
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
                          onClick={() => {
                            if (window.innerWidth < 1024) setIsOpen(false);
                          }}
                          className={cn(
                            "group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-200",
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
                                "flex items-center justify-center rounded-full text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider",
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

        {/* PROFILE FOOTER */}
        <div className="border-t border-slate-800/60 p-4 bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs text-white font-black shadow-lg">
                {role.charAt(0)}
              </div>
              <div className="space-y-0.5 max-w-[120px]">
                <p className="text-sm font-bold text-white leading-none truncate">
                  Workspace
                </p>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold truncate">
                  {role.replace("_", " ")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
