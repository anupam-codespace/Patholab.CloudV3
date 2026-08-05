"use client";

import Link from "next/link";
import {
  LogOut,
  User,
  Settings,
  Wallet,
  AlertTriangle,
  Activity,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Phone,
  Mail,
  UserPlus,
  Receipt,
  Scan,
  Building2,
  MapPin,
  Check,
  Menu,
  Users,
  BarChart3,
  Hash,
  FlaskConical,
  LifeBuoy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import NotificationDropdown from "@/components/layouts/NotificationDropdown";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface HeaderProps {
  toggleSidebar: () => void;
  userData: {
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    employeeId: string | null;
    labName: string;
    currencySymbol: string;
    walletBalance: number;
    currentBranchName: string;
    branches: any[];
  };
}

const getQuickShortcuts = (role?: string) => {
  switch (role) {
    case "LAB_OWNER":
    case "LAB_MANAGER":
    case "SUPER_ADMIN":
      return [
        {
          label: "NEW REGISTRATION",
          href: "/workspace/registration",
          icon: UserPlus,
          color: "text-primary",
          bg: "hover:bg-emerald-100",
          active: "bg-emerald-50",
        },
        // {
        //   label: "ADD STAFF",
        //   href: "/workspace/staff",
        //   icon: Users,
        //   color: "text-primary",
        //   bg: "hover:bg-blue-100",
        //   active: "bg-primary/10",
        // },
        {
          label: "REPORTS",
          href: "/workspace/reports",
          icon: BarChart3,
          color: "text-primary",
          bg: "hover:bg-indigo-100",
          active: "bg-indigo-50",
        },
      ];
    case "RECEPTIONIST":
      return [
        {
          label: "Register Patient",
          href: "/workspace/registration",
          icon: UserPlus,
          color: "text-primary",
          bg: "hover:bg-emerald-100",
          active: "bg-emerald-50",
        },
        {
          label: "Collect Payment",
          href: "/workspace/billing",
          icon: Receipt,
          color: "text-amber-600",
          bg: "hover:bg-amber-100",
          active: "bg-amber-50",
        },
      ];
    case "TECHNICIAN":
      return [
        {
          label: "Accession Sample",
          href: "/workspace/samples",
          icon: Scan,
          color: "text-primary",
          bg: "hover:bg-blue-100",
          active: "bg-primary/10",
        },
        {
          label: "Live Worklist",
          href: "/workspace/worklist",
          icon: FlaskConical,
          color: "text-rose-600",
          bg: "hover:bg-rose-100",
          active: "bg-rose-50",
        },
      ];
    default:
      return [];
  }
};

export function Header({ toggleSidebar, userData }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Added Greeting State
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("GOOD MORNING");
    else if (hour < 18) setGreeting("GOOD AFTERNOON");
    else setGreeting("GOOD EVENING");
  }, []);

  const shortcuts = getQuickShortcuts(userData?.role);

  const canSwitchBranch =
    userData?.role === "LAB_OWNER" ||
    userData?.role === "SUPER_ADMIN" ||
    userData?.role === "LAB_MANAGER";

  const isFinanceManager =
    userData?.role === "LAB_OWNER" || userData?.role === "SUPER_ADMIN";

  const handleLogout = async () => {
    const toastId = toast.loading("Logging out securely...");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        toast.success("Logged out successfully", { id: toastId });
        window.location.href = "/login";
      } else {
        throw new Error("Logout failed on server");
      }
    } catch (error) {
      document.cookie = "token=; Max-Age=0; path=/;";
      toast.success("Logged out", { id: toastId });
      window.location.href = "/login";
    }
  };

  const handleSwitchBranch = (branchId: string, branchName: string) => {
    if (branchId === "ALL") {
      document.cookie = "activeBranchId=; Max-Age=0; path=/;";
      toast.success(`Switched to Global Master View`);
    } else {
      document.cookie = `activeBranchId=${branchId}; path=/; max-age=86400`;
      toast.success(`Switched workspace to ${branchName}`);
    }
    router.refresh();
  };

  const userName = userData?.name || "User";
  const firstName = userName.split(" ")[0]; // ✅ Added First Name extraction
  const userEmail = userData?.email || "";
  const labName = userData?.labName || "Patholab Cloud";
  const currentBranchName = userData?.currentBranchName || "Main Branch";
  const availableBranches = userData?.branches || [];
  const currencySymbol = userData?.currencySymbol || "₹";

  const rawBalance = userData?.walletBalance ?? 0.0;
  const isZeroBalance = rawBalance <= 0;
  const isLowBalance = rawBalance > 0 && rawBalance < 100.0;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const getPageTitle = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    const routeMap: Record<string, string> = {
      workspace: "Dashboard",
      patients: "Patient Worklist",
      registration: "New Registration",
      billing: "Billing & Invoices",
      tests: "Test Menu",
      inventory: "Inventory Management",
      settings: "System Settings",
      analyzers: "Analyzer Interfacing",
      wallet: "Lab Wallet & Top-up",
      staff: "Staff Directory",
      samples: "Sample Track",
      support: "Help & Support",
    };

    if (!lastSegment) return "Dashboard";

    return (
      routeMap[lastSegment] ||
      lastSegment.charAt(0).toUpperCase() +
        lastSegment.slice(1).replace(/-/g, " ")
    );
  };

  const currentPage = getPageTitle(pathname);

  // ✅ UI UPDATE: Kept your layout, softened the fonts to match screenshot
  const BranchDisplay = () => (
    <div
      className={`h-11 px-2.5 py-1.5 flex items-center gap-2.5 rounded-xl border border-transparent transition-all text-left ${canSwitchBranch ? "hover:bg-muted hover:border-border cursor-pointer" : ""}`}>
      <div className="bg-primary/10 p-2 rounded-lg hidden lg:flex items-center justify-center">
        <Building2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col items-start justify-center">
        <span className="text-[11px] font-medium text-muted-foreground leading-none mb-1">
          {greeting}, {firstName} 👋
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold text-foreground tracking-tight leading-none font-sans">
            {labName}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none flex items-center gap-1 border border-border px-1.5 py-0.5 rounded ml-1">
            {currentBranchName}
            {canSwitchBranch && (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sticky top-0 z-40 px-2 sm:px-6 py-3 pointer-events-none w-full">
      <header className="pointer-events-auto min-h-[64px] h-auto py-2 w-full mx-auto flex items-center justify-between rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-sm pr-3 pl-2 sm:pr-5 sm:pl-3 transition-all duration-300 flex-wrap">
        {/* 1. LEFT SIDE: HAMBURGER, BRANDING & BREADCRUMBS */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden whitespace-nowrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl h-10 w-10 shrink-0 transition-colors">
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            href="/workspace"
            className="hidden sm:flex items-center justify-center h-10 w-10 bg-primary/10 rounded-xl border border-blue-500/20 group transition-all hover:bg-primary/20 mr-1 shrink-0">
            <Activity className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            {canSwitchBranch ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <BranchDisplay />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-64 rounded-2xl shadow-xl border border-border p-2 animate-in zoom-in-95 duration-200">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide px-2 pb-2">
                    Switch Workspace
                  </DropdownMenuLabel>
                  <div className="space-y-1">
                    <DropdownMenuItem
                      onClick={() => handleSwitchBranch("ALL", "All Branches")}
                      className={`cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between transition-colors ${currentBranchName === "All Branches" ? "bg-primary/10 text-blue-900" : "hover:bg-muted/30"}`}>
                      <div className="flex items-center gap-3">
                        <Building2
                          className={`h-4 w-4 ${currentBranchName === "All Branches" ? "text-blue-500" : "text-slate-400"}`}
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm leading-none">
                            Global Master View
                          </span>
                          <span className="text-[11px] text-muted-foreground/70 font-medium mt-1">
                            System-wide data access
                          </span>
                        </div>
                      </div>
                      {currentBranchName === "All Branches" && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 bg-muted" />

                    {availableBranches.map((branch) => {
                      const isActive = currentBranchName === branch.name;
                      return (
                        <DropdownMenuItem
                          key={branch.id}
                          onClick={() =>
                            handleSwitchBranch(branch.id, branch.name)
                          }
                          className={`cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between transition-colors ${isActive ? "bg-primary/10 text-blue-900 focus:bg-primary/10" : "hover:bg-muted/30 focus:bg-muted/30"}`}>
                          <div className="flex items-center gap-3">
                            <MapPin
                              className={`h-4 w-4 ${isActive ? "text-blue-500" : "text-slate-400"}`}
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm leading-none">
                                {branch.name}
                              </span>
                              {branch.isMainBranch && (
                                <span className="text-[11px] text-muted-foreground/70 font-medium mt-1">
                                  Primary Hub
                                </span>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                  <DropdownMenuSeparator className="my-2 bg-muted" />
                  <Link href="/workspace/settings?tab=branches">
                    <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 focus:bg-muted/30 font-semibold text-sm flex items-center">
                      <Settings className="w-4 h-4 mr-2 text-slate-400" />
                      Manage Branches
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <BranchDisplay />
            )}

            <ChevronRight className="h-4 w-4 text-slate-300" />

            <span className="text-sm font-medium text-muted-foreground flex items-center">
              {currentPage}
            </span>
          </div>

          <div className="sm:hidden flex flex-col justify-center max-w-[140px] ml-1">
            <span className="text-[10px] font-medium text-primary uppercase tracking-wide leading-none mb-0.5 truncate">
              {currentBranchName}
            </span>
            <span className="text-sm font-semibold text-foreground tracking-tight leading-none truncate">
              {currentPage}
            </span>
          </div>
        </div>

        {/* 2. CENTER/RIGHT: WALLET, HELPDESK & INTERACTIVE POPUPS */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isFinanceManager && (
            <div className="flex items-center mr-1 shrink-0">
              {isZeroBalance && (
                <Link href="/workspace/wallet?action=recharge">
                  <div className="h-9 px-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 animate-pulse transition-all shadow-sm hover:bg-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <div className="flex flex-col items-start justify-center">
                      <span className="text-[9px] font-semibold uppercase tracking-wider leading-none mb-0.5 text-red-500">
                        Zero Balance
                      </span>
                      <span className="text-xs font-semibold tracking-tight leading-none">
                        Recharge to use software
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {isLowBalance && (
                <Link href="/workspace/wallet?action=recharge">
                  <div className="h-9 px-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 transition-all shadow-sm hover:bg-amber-100/80 group">
                    <Wallet className="h-4 w-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col items-start justify-center">
                      <span className="text-[9px] font-semibold text-amber-500 uppercase tracking-wider leading-none mb-0.5">
                        Balance: {currencySymbol}
                        {rawBalance.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold tracking-tight leading-none animate-pulse">
                        Low Balance - Add Funds
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {!isZeroBalance && !isLowBalance && (
                <Link href="/workspace/wallet">
                  <div className="h-9 px-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 shadow-sm hover:bg-muted transition-all">
                    <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-col items-start justify-center">
                      <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wide leading-none mb-0.5">
                        Lab Wallet
                      </span>
                      <span className="text-xs font-semibold tracking-tight leading-none text-foreground font-mono">
                        {currencySymbol}
                        {rawBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* ✅ ADDED: Icons now have their labels next to them based on your request */}
          <div className="hidden xl:flex items-center gap-1.5 bg-muted/30 border border-border rounded-xl p-1 shadow-sm mr-1">
            {shortcuts.map((shortcut, idx) => {
              const isActive = pathname.startsWith(shortcut.href);
              return (
                <Link key={idx} href={shortcut.href}>
                  <Button
                    variant="ghost"
                    className={`h-8 px-2.5 rounded-lg text-muted-foreground transition-colors flex items-center gap-1.5 ${shortcut.bg} ${isActive ? shortcut.active : ""}`}>
                    <shortcut.icon className={`h-4 w-4 ${isActive ? shortcut.color : ""}`} />
                    <span className={`text-[13px] font-medium ${isActive ? shortcut.color : "text-foreground/80"}`}>
                      {shortcut.label}
                    </span>
                  </Button>
                </Link>
              );
            })}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-18 rounded-xl p-2 transition-all shrink-0 ${pathname === "/workspace/support" ? "bg-muted text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-muted"}`}>
                <HelpCircle className="h-5 w-5" /><span className="mr-2">HELP</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 shadow-2xl border border-border rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-[#0f172a] p-5">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-blue-400" /> Need
                  Assistance?
                </h4>
                <p className="text-xs text-muted-foreground/70 mt-1 font-medium">
                  We are here to support your daily laboratory operations.
                </p>
              </div>
              <div className="p-2 space-y-1 bg-card">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-medium text-muted-foreground/70 tracking-wide">
                      Priority Call
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      +91 8402010207
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-medium text-muted-foreground/70 tracking-wide">
                      Email Support
                    </p>
                    <p className="text-sm font-semibold text-foreground lowercase">
                      support@patholab.cloud
                    </p>
                  </div>
                </div>

                <DropdownMenuSeparator className="my-1 bg-muted" />

                <div className="p-1">
                  <Link href="/workspace/support">
                    <Button className="w-full justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium text-xs py-2 h-9 rounded-xl shadow-sm transition-colors">
                      Open Support Dashboard
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-muted transition-colors shrink-0">
            <NotificationDropdown />
          </div>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-xl p-0 ml-1 border border-border shadow-sm hover:ring-4 ring-primary/10 transition-all overflow-hidden shrink-0">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage
                    src={userData?.avatar || ""}
                    alt={userName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-slate-800 text-white font-semibold text-xs rounded-none">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-72 mt-3 p-0 rounded-2xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
              align="end"
              forceMount>
              <DropdownMenuLabel className="font-normal p-5 bg-[#0B1120] text-white relative">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-slate-700 rounded-xl shadow-inner">
                    <AvatarImage src={userData?.avatar || ""} alt={userName} />
                    <AvatarFallback className="bg-slate-800 text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-[15px] font-semibold leading-none text-white">
                      {userName}
                    </p>
                    <p className="text-xs font-medium text-slate-400 truncate max-w-[150px]">
                      {userEmail}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {userData?.role && (
                        <Badge className="w-fit bg-primary/20 text-blue-400 border border-blue-500/30 text-[10px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5">
                          {userData.role.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <div className="p-2 bg-card">
                <DropdownMenuGroup>
                  <Link href="/workspace/settings">
                    <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-muted/30 focus:bg-muted/30 transition-colors">
                      <div className="bg-muted p-1.5 rounded-lg mr-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-sm text-foreground">
                        My Profile
                      </span>
                    </DropdownMenuItem>
                  </Link>

                  {userData?.role === "LAB_OWNER" && (
                    <Link href="/workspace/wallet">
                      <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-muted/30 focus:bg-muted/30 transition-colors">
                        <div className="bg-muted p-1.5 rounded-lg mr-3">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-sm text-foreground">
                          Lab Wallet & Billing
                        </span>
                      </DropdownMenuItem>
                    </Link>
                  )}

                  {(userData?.role === "LAB_OWNER" ||
                    userData?.role === "LAB_MANAGER") && (
                    <Link href="/workspace/settings?tab=general">
                      <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-muted/30 focus:bg-muted/30 transition-colors">
                        <div className="bg-muted p-1.5 rounded-lg mr-3">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-sm text-foreground">
                          Lab Settings
                        </span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuGroup>

                <div className="h-px bg-muted my-1 mx-2" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-xl py-3 px-3 text-red-600 focus:text-red-700 focus:bg-red-50 transition-colors">
                  <div className="bg-red-100 p-1.5 rounded-lg mr-3">
                    <LogOut className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="font-medium text-sm">Secure Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}