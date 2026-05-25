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
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";
import { roleNavMap, NavGroup, NavItem } from "@/config/navigation";

interface SidebarProps {
  role: string;
  subscription: any;
}

export function Sidebar({ role, subscription }: SidebarProps) {
  const pathname = usePathname();
  const rawNavigation: NavGroup[] = roleNavMap[role] || [];

  const [isOpen, setIsOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initialState: Record<string, boolean> = {};
      rawNavigation.forEach((group) => (initialState[group.title] = true));
      return initialState;
    },
  );

  useEffect(() => {
    const handleResize = () => setIsOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    toast.loading("Logging out...");
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside
      className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50 w-[280px] bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full lg:-ml-[280px]",
      )}>
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800/60 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg">
            <FlaskConical className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-lg font-extrabold text-white">
            patholab<span className="text-emerald-400">.cloud</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {rawNavigation.map((group, gIdx) => {
            const isGroupOpen = expandedGroups[group.title];
            return (
              <div key={gIdx} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300">
                  {group.title}
                  {isGroupOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>

                <div
                  className={cn(
                    "space-y-1 pl-2 border-l border-slate-800 ml-3 transition-all",
                    isGroupOpen ? "max-h-[800px]" : "max-h-0 overflow-hidden",
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

      {/* Footer */}
      <div className="border-t border-slate-800/60 p-4 bg-slate-900/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white"
          onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Log Out
        </Button>
      </div>
    </aside>
  );
}

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
  // Using optional chaining (?.) for safety
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
        "group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-semibold transition-all",
        isActive
          ? "bg-emerald-500/10 text-emerald-400"
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
        isLocked && "opacity-50 cursor-pointer hover:opacity-100",
      )}>
      <div className="flex items-center space-x-3">
        <Icon
          className={cn(
            "h-4 w-4",
            isActive
              ? "text-emerald-400"
              : "text-slate-500 group-hover:text-slate-300",
          )}
        />
        <span>{item.name}</span>
      </div>

      {isLocked ? (
        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">
          Upgrade
        </span>
      ) : (
        item.badge && (
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase",
              isActive
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-800 text-slate-400",
            )}>
            {item.badge}
          </span>
        )
      )}
    </Link>
  );
}
