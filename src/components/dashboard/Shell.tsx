"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TestTube,
  FileText,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  LogOut,
  Search,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/workspace" },
  { label: "Accession", icon: TestTube, href: "/workspace/accession" },
  { label: "Patients", icon: Users, href: "/workspace/patients" },
  { label: "Finance", icon: FileText, href: "/workspace/finance" },
  { label: "Settings", icon: Settings, href: "/workspace/settings" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* SIDEBAR (Desktop) */}
      <aside
        className={`hidden md:flex flex-col border-r bg-white h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}>
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl overflow-hidden">
            <Activity className="h-6 w-6 shrink-0" />
            <span
              className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
              Patholab
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-6 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start mb-1 ${isCollapsed ? "px-2 justify-center" : "px-4"}`}
                  title={isCollapsed ? item.label : undefined}>
                  <item.icon
                    className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-slate-500"} ${isCollapsed ? "" : "mr-3"}`}
                  />
                  {!isCollapsed && (
                    <span
                      className={
                        isActive
                          ? "text-slate-900 font-medium"
                          : "text-slate-600"
                      }>
                      {item.label}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Footer Toggle */}
        <div className="p-4 border-t flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* MOBILE OVERLAY SIDEBAR */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}>
          <div
            className="w-64 h-full bg-white p-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-lg text-blue-600">Patholab</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <item.icon className="h-5 w-5 mr-3 text-slate-500" />{" "}
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            {/* Global Search */}
            <div className="relative hidden md:block w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patients, Test IDs, or Mobile..."
                className="pl-9 bg-slate-50 border-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
            </Button>

            <div className="h-8 w-px bg-slate-200 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 hover:bg-slate-100 rounded-full">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium leading-none">
                      Dr. Admin
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      ZN Diagnostics
                    </p>
                  </div>
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src="/avatar-placeholder.png" />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      ZN
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
