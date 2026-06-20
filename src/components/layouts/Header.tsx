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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import NotificationDropdown from "@/components/layouts/NotificationDropdown";

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
          label: "New Patient",
          href: "/workspace/registration",
          icon: UserPlus,
          color: "text-emerald-600",
          bg: "hover:bg-emerald-100",
          active: "bg-emerald-50",
        },
        {
          label: "Add Staff",
          href: "/workspace/staff",
          icon: Users,
          color: "text-blue-600",
          bg: "hover:bg-blue-100",
          active: "bg-blue-50",
        },
        {
          label: "Reports",
          href: "/workspace/reports",
          icon: BarChart3,
          color: "text-indigo-600",
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
          color: "text-emerald-600",
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
          color: "text-blue-600",
          bg: "hover:bg-blue-100",
          active: "bg-blue-50",
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

  // ✅ UI UPDATE: Lab name is now big & bold, Branch name is the smaller subtitle
  const BranchDisplay = () => (
    <div
      className={`h-10 px-2.5 py-1.5 flex items-center gap-2 rounded-xl border border-transparent transition-all text-left ${canSwitchBranch ? "hover:bg-slate-100 hover:border-slate-200" : ""}`}>
      <div className="bg-slate-100 p-1.5 rounded-lg hidden lg:block">
        <Building2 className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex flex-col items-start justify-center">
        <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none mb-0.5">
          {labName}
        </span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none flex items-center gap-1">
          {currentBranchName}
          {canSwitchBranch && (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </span>
      </div>
    </div>
  );

  return (
    <div className="sticky top-0 z-40 px-2 sm:px-6 py-3 pointer-events-none w-full">
      <header className="pointer-events-auto h-16 w-full mx-auto flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm pr-3 pl-2 sm:pr-5 sm:pl-3 transition-all duration-300">
        {/* 1. LEFT SIDE: HAMBURGER, BRANDING & BREADCRUMBS */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden whitespace-nowrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl h-10 w-10 shrink-0 transition-colors">
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            href="/workspace"
            className="hidden sm:flex items-center justify-center h-10 w-10 bg-blue-600/10 rounded-xl border border-blue-500/20 group transition-all hover:bg-blue-600/20 mr-1 shrink-0">
            <Activity className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
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
                  className="w-64 rounded-2xl shadow-xl border border-slate-200 p-2 animate-in zoom-in-95 duration-200">
                  <DropdownMenuLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 pb-2">
                    Switch Workspace
                  </DropdownMenuLabel>
                  <div className="space-y-1">
                    <DropdownMenuItem
                      onClick={() => handleSwitchBranch("ALL", "All Branches")}
                      className={`cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between transition-colors ${currentBranchName === "All Branches" ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"}`}>
                      <div className="flex items-center gap-3">
                        <Building2
                          className={`h-4 w-4 ${currentBranchName === "All Branches" ? "text-blue-500" : "text-slate-400"}`}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-sm leading-none">
                            Global Master View
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium mt-1">
                            System-wide data access
                          </span>
                        </div>
                      </div>
                      {currentBranchName === "All Branches" && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {availableBranches.map((branch) => {
                      const isActive = currentBranchName === branch.name;
                      return (
                        <DropdownMenuItem
                          key={branch.id}
                          onClick={() =>
                            handleSwitchBranch(branch.id, branch.name)
                          }
                          className={`cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between transition-colors ${isActive ? "bg-blue-50 text-blue-900 focus:bg-blue-50" : "hover:bg-slate-50 focus:bg-slate-50"}`}>
                          <div className="flex items-center gap-3">
                            <MapPin
                              className={`h-4 w-4 ${isActive ? "text-blue-500" : "text-slate-400"}`}
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-none">
                                {branch.name}
                              </span>
                              {branch.isMainBranch && (
                                <span className="text-[10px] text-slate-400 font-medium mt-1">
                                  Primary Hub
                                </span>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                  <DropdownMenuSeparator className="my-2 bg-slate-100" />
                  <Link href="/workspace/settings?tab=branches">
                    <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-50 font-bold text-sm flex items-center">
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

            <span className="text-sm font-bold text-slate-600 flex items-center">
              {currentPage}
            </span>
          </div>

          <div className="sm:hidden flex flex-col justify-center max-w-[140px] ml-1">
            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-0.5 truncate">
              {currentBranchName}
            </span>
            <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none truncate">
              {currentPage}
            </span>
          </div>
        </div>

        {/* 2. CENTER/RIGHT: WALLET, HELPDESK & INTERACTIVE POPUPS */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isFinanceManager && (
            <div className="flex items-center mr-1 shrink-0">
              {/* STATE 1: ZERO BALANCE WARNING DISPLAY */}
              {isZeroBalance && (
                <Link href="/workspace/wallet?action=recharge">
                  <div className="h-10 px-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 animate-pulse transition-all shadow-sm hover:bg-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <div className="flex flex-col items-start justify-center">
                      <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5 text-red-500">
                        Zero Balance
                      </span>
                      <span className="text-xs font-extrabold tracking-tight leading-none">
                        Recharge to use software
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* STATE 2: LOW BALANCE WARNING DISPLAY */}
              {isLowBalance && (
                <Link href="/workspace/wallet?action=recharge">
                  <div className="h-10 px-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 transition-all shadow-sm hover:bg-amber-100/80 group">
                    <Wallet className="h-4 w-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col items-start justify-center">
                      <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider leading-none mb-0.5">
                        Balance: {currencySymbol}
                        {rawBalance.toFixed(2)}
                      </span>
                      <span className="text-xs font-black tracking-tight leading-none animate-pulse">
                        Low Balance - Add Funds
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* STATE 3: HEALTHY WALLET BALANCE TRACKER */}
              {!isZeroBalance && !isLowBalance && (
                <Link href="/workspace/wallet">
                  <div className="h-10 px-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 shadow-sm hover:bg-slate-100 transition-all">
                    <Wallet className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col items-start justify-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                        Lab Wallet
                      </span>
                      <span className="text-xs font-black tracking-tight leading-none text-slate-900 font-mono">
                        {currencySymbol}
                        {rawBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}

          {userData?.employeeId && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl h-10 mr-1 shadow-sm">
              <Hash className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 tracking-wider font-mono">
                {userData.employeeId}
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 mr-1 shadow-sm">
            <TooltipProvider delayDuration={100}>
              {shortcuts.map((shortcut, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <Link href={shortcut.href}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-lg text-slate-500 transition-colors ${shortcut.bg} ${pathname.startsWith(shortcut.href) ? shortcut.active : ""}`}>
                        <shortcut.icon
                          className={`h-4 w-4 ${pathname.startsWith(shortcut.href) ? shortcut.color : ""}`}
                        />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-0 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl text-white">
                    {shortcut.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          {/* HELP SUPPORT MODULE POPUP CARD CONTAINER */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-xl transition-all shrink-0 ${pathname === "/workspace/support" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}>
                <HelpCircle className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 shadow-2xl border border-slate-200 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-[#0f172a] p-5">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-blue-400" /> Need
                  Assistance?
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  We are here to support your daily laboratory operations.
                </p>
              </div>
              <div className="p-2 space-y-1 bg-white">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Priority Call
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      +91 8402010207
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Email Support
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      support@patholab.cloud
                    </p>
                  </div>
                </div>

                <DropdownMenuSeparator className="my-1 bg-slate-100" />

                <div className="p-1">
                  <Link href="/workspace/support">
                    <Button className="w-full justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 h-9 rounded-xl shadow-sm transition-colors">
                      Open Support Dashboard
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
            <NotificationDropdown />
          </div>

          {/* USER ACCOUNT PROFILE SUB-SECTION SELECTION POPUP */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-xl p-0 ml-1 border border-slate-200 shadow-sm hover:ring-4 ring-blue-500/10 transition-all overflow-hidden shrink-0">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage
                    src={userData?.avatar || ""}
                    alt={userName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-slate-800 text-white font-bold text-xs rounded-none">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-72 mt-3 p-0 rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
              align="end"
              forceMount>
              <DropdownMenuLabel className="font-normal p-5 bg-[#0B1120] text-white relative">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-slate-700 rounded-xl shadow-inner">
                    <AvatarImage src={userData?.avatar || ""} alt={userName} />
                    <AvatarFallback className="bg-slate-800 text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-extrabold leading-none">
                      {userName}
                    </p>
                    <p className="text-xs font-medium text-slate-400 truncate max-w-[150px]">
                      {userEmail}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {userData?.role && (
                        <Badge className="w-fit bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] uppercase tracking-widest font-black rounded-md px-1.5 py-0.5">
                          {userData.role.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <div className="p-2 bg-white">
                <DropdownMenuGroup>
                  <Link href="/workspace/settings">
                    <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                      <div className="bg-slate-100 p-1.5 rounded-lg mr-3">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      <span className="font-bold text-sm text-slate-700">
                        My Profile
                      </span>
                    </DropdownMenuItem>
                  </Link>

                  {userData?.role === "LAB_OWNER" && (
                    <Link href="/workspace/wallet">
                      <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                        <div className="bg-slate-100 p-1.5 rounded-lg mr-3">
                          <Wallet className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-bold text-sm text-slate-700">
                          Lab Wallet & Billing
                        </span>
                      </DropdownMenuItem>
                    </Link>
                  )}

                  {(userData?.role === "LAB_OWNER" ||
                    userData?.role === "LAB_MANAGER") && (
                    <Link href="/workspace/settings?tab=general">
                      <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                        <div className="bg-slate-100 p-1.5 rounded-lg mr-3">
                          <Settings className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-bold text-sm text-slate-700">
                          Lab Settings
                        </span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuGroup>

                <div className="h-px bg-slate-100 my-1 mx-2" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-xl py-3 px-3 text-red-600 focus:text-red-700 focus:bg-red-50 transition-colors">
                  <div className="bg-red-100 p-1.5 rounded-lg mr-3">
                    <LogOut className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="font-bold text-sm">Secure Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
