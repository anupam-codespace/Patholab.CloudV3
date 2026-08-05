"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Search,
  HelpCircle,
  Plus,
  Settings,
  Activity,
  LogOut,
  Command,
  Loader2,
  Building2,
  Users,
  Receipt,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface AdminHeaderProps {
  user: { name: string; role: string; avatar?: string };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();

  // --- Search State ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    labs: any[];
    users: any[];
    invoices: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Search Effect
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(query)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search error", error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <header className="bg-card border-b border-border h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
      {/* ================= LEFT SIDE: SEARCH ================= */}
      <div className="flex items-center gap-4 w-full max-w-md md:max-w-xl lg:w-1/2">
        {/* Environment Badge */}
        <Badge
          variant="outline"
          className="bg-emerald-50 text-primary border-emerald-200 hidden md:flex font-mono text-[10px] font-bold tracking-widest uppercase shrink-0">
          Production
        </Badge>

        {/* SEARCH WRAPPER */}
        <div className="relative w-full group" ref={searchRef}>
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-emerald-500 transition-colors" />
          )}

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            placeholder="Search labs, invoices, or users..."
            className="pl-9 pr-12 bg-muted/30 border-border focus:bg-card focus:ring-2 focus:ring-emerald-100 transition-all rounded-lg w-full"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 bg-card border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground/70 shadow-sm pointer-events-none">
            <Command className="h-3 w-3" />K
          </div>

          {/* SEARCH RESULTS DROPDOWN */}
          {showResults && results && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
              {/* Labs Section */}
              {results.labs?.length > 0 && (
                <div className="p-2">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                    <Building2 className="h-3 w-3" /> Labs
                  </h3>
                  {results.labs.map((lab) => (
                    <button
                      key={lab.id}
                      onClick={() => {
                        router.push(`/admin/labs/${lab.id}`);
                        setShowResults(false);
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/30 rounded-md transition-colors flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">
                        {lab.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        License: {lab.licenseNumber || "N/A"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Invoices Section */}
              {results.invoices?.length > 0 && (
                <div className="p-2 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                    <Receipt className="h-3 w-3" /> Invoices
                  </h3>
                  {results.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => {
                        router.push(`/admin/invoices/${inv.id}`);
                        setShowResults(false);
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/30 rounded-md transition-colors flex justify-between items-center">
                      <div>
                        <span className="text-sm font-semibold text-slate-800">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          Status: {inv.status}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        ₹{inv.grandTotal}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Users Section */}
              {results.users?.length > 0 && (
                <div className="p-2 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                    <Users className="h-3 w-3" /> Users
                  </h3>
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        router.push(`/admin/users/${u.id}`);
                        setShowResults(false);
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/30 rounded-md transition-colors flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">
                        {u.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {results.labs?.length === 0 &&
                results.invoices?.length === 0 &&
                results.users?.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No results found for "{query}"
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT SIDE: ACTIONS & PROFILE ================= */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-4">
        {/* Quick Add Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:flex items-center gap-2 rounded-lg shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="font-bold">Quick Action</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              Platform Economics
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link
                href="/admin/wallet/credit"
                className="cursor-pointer flex items-center gap-2 font-medium">
                <Wallet className="h-4 w-4 text-primary" /> Manual Wallet
                Credit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              Tenants
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link
                href="/admin/labs/new"
                className="cursor-pointer flex items-center gap-2 font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Onboard New Lab
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Action Icons (Help & Notifications) */}
        <div className="flex items-center gap-1 border-r border-border pr-2 md:pr-3 mr-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-emerald-50 rounded-full h-9 w-9 hidden md:inline-flex">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Support Docs
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-emerald-50 rounded-full h-9 w-9 relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Notifications
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 pl-2 pr-2 md:pr-3 py-1 h-auto hover:bg-muted/30 rounded-full border border-transparent hover:border-border transition-all focus-visible:ring-0 focus-visible:ring-offset-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-primary-foreground font-bold text-xs shadow-sm shadow-emerald-200 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-bold text-foreground/80 leading-none truncate max-w-[120px]">
                  {user?.name || "Admin"}
                </p>
                <p className="text-[10px] text-primary font-bold uppercase mt-1 tracking-widest">
                  {user?.role ? user.role.replace("_", " ") : "SUPER ADMIN"}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <div className="px-2 py-1.5 mb-1">
              <p className="text-sm font-bold text-foreground truncate">
                {user?.name || "Admin"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-0.5">
                Root Access Granted
              </p>
            </div>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="cursor-pointer font-medium">
              <Link href="/admin/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Global Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer font-medium">
              <Link href="/admin/activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <span>My Activity Logs</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full text-left cursor-pointer outline-none font-bold">
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
