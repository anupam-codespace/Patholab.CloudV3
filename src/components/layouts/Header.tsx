"use client";

import Link from "next/link";
import {
  LogOut,
  User,
  Settings,
  CreditCard,
  Activity, // Changed from FlaskConical to match Sidebar branding
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Phone,
  Mail,
  UserPlus,
  Receipt,
  Scan,
  LifeBuoy,
  Building2,
  MapPin,
  Check,
  Menu,
  Users,
  BarChart3,
  Hash,
  FlaskConical,
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

// --- PROPS ---
interface HeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
    role?: string;
    employeeId?: string | null;
    lab?: { name: string } | null;
    currentBranch?: { id: string; name: string; isMainBranch?: boolean } | null;
    branches?: { id: string; name: string; isMainBranch?: boolean }[];
  };
  // ✅ Added toggleSidebar prop to connect with WorkspaceLayout
  toggleSidebar: () => void;
}

// --- DYNAMIC SHORTCUTS GENERATOR ---
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

export function Header({ user, toggleSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const shortcuts = getQuickShortcuts(user?.role);

  // ✅ Only Owners and Super Admins can switch branches
  const canSwitchBranch =
    user?.role === "LAB_OWNER" || user?.role === "SUPER_ADMIN";

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
      // Fallback cleanup if server fails
      document.cookie = "token=; Max-Age=0; path=/;";
      toast.success("Logged out", { id: toastId });
      window.location.href = "/login";
    }
  };

  // ✅ Actually switch the branch by setting a cookie the backend can read
  const handleSwitchBranch = (branchId: string, branchName: string) => {
    if (branchId === "ALL") {
      document.cookie = "activeBranchId=; Max-Age=0; path=/;"; // Clear cookie to view all
      toast.success(`Switched to Master God-View`);
    } else {
      document.cookie = `activeBranchId=${branchId}; path=/; max-age=86400`; // 1 day
      toast.success(`Switched workspace to ${branchName}`);
    }
    router.refresh(); // Refresh the page to trigger new data fetch
  };

  const userName = user?.name || "User";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const labName = user?.lab?.name || "Patholab Cloud";
  const currentBranchName = user?.currentBranch?.name || "Main Branch";
  const availableBranches = user?.branches || [];

  const getPageTitle = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    const routeMap: Record<string, string> = {
      workspace: "Dashboard",
      patients: "Patient Worklist",
      registration: "New Registration",
      billing: "Billing & Invoices",
      tests: "Test Menu",
      inventory: "Inventory",
      settings: "Settings",
      technician: "Technician Dashboard",
      receptionist: "Front Desk",
      analyzers: "Analyzer Management",
      subscription: "Subscription Plan",
      support: "Help & Support",
      staff: "Staff Directory",
    };

    if (!lastSegment) return "Dashboard";

    return (
      routeMap[lastSegment] ||
      lastSegment.charAt(0).toUpperCase() +
        lastSegment.slice(1).replace(/-/g, " ")
    );
  };

  const currentPage = getPageTitle(pathname);

  // --- BRANCH BADGE COMPONENT ---
  const BranchDisplay = () => (
    <div
      className={`h-10 px-2.5 py-1.5 flex items-center gap-2 rounded-xl border border-transparent transition-all text-left ${canSwitchBranch ? "hover:bg-slate-100 hover:border-slate-200" : ""}`}>
      <div className="bg-slate-100 p-1.5 rounded-lg hidden lg:block">
        <Building2 className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex flex-col items-start justify-center">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
          {labName}
        </span>
        <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
          {currentBranchName}
          {canSwitchBranch && (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </span>
      </div>
    </div>
  );

  return (
    <div className="sticky top-0 z-40 px-2 sm:px-6 py-3 pointer-events-none">
      <header className="pointer-events-auto h-16 w-full mx-auto flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm pr-3 pl-2 sm:pr-5 sm:pl-3 transition-all duration-300">
        {/* 1. LEFT SIDE: HAMBURGER, BRANDING & BREADCRUMBS */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden whitespace-nowrap">
          {/* ✅ Integrated toggleSidebar Prop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl h-10 w-10 shrink-0 transition-colors">
            <Menu className="h-5 w-5" />
          </Button>

          {/* ✅ Updated to Match Sidebar Blue/Slate Theme */}
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
                    {/* Master View Option for Owners */}
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
                            See all lab data
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
                                  Headquarters
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

          {/* Mobile Fallback Title */}
          <div className="sm:hidden flex flex-col justify-center max-w-[140px] ml-1">
            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-0.5 truncate">
              {currentBranchName}
            </span>
            <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none truncate">
              {currentPage}
            </span>
          </div>
        </div>

        {/* 2. CENTER/RIGHT: ACTIONS */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl h-10 mr-1 shadow-sm">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 tracking-wider font-mono">
              {user?.employeeId ? (
                user.employeeId
              ) : (
                <span className="text-amber-600">PENDING</span>
              )}
            </span>
          </div>

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
                  <TooltipContent className="bg-slate-900 border-0 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl">
                    {shortcut.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 shadow-2xl border-0 rounded-2xl overflow-hidden animate-in zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
              <div className="bg-[#0f172a] p-5">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-blue-400" /> Need Help?
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  We're here to support your laboratory operations.
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
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
            <NotificationDropdown />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-xl p-0 ml-1 border border-slate-200 shadow-sm hover:ring-4 ring-blue-500/10 transition-all overflow-hidden shrink-0">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage
                    src={user?.avatar || ""}
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
              {/* ✅ Matched Profile Header to Sidebar Background */}
              <DropdownMenuLabel className="font-normal p-5 bg-[#0B1120] text-white relative">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-slate-700 rounded-xl shadow-inner">
                    <AvatarImage src={user?.avatar || ""} alt={userName} />
                    <AvatarFallback className="bg-slate-800 text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-extrabold leading-none">
                      {userName}
                    </p>
                    <p className="text-xs font-medium text-slate-400 truncate max-w-[150px]">
                      {user?.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {user?.role && (
                        <Badge className="w-fit bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] uppercase tracking-widest font-black rounded-md px-1.5 py-0.5">
                          {user.role.replace("_", " ")}
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

                  {user?.role === "LAB_OWNER" && (
                    <Link href="/workspace/subscription">
                      <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                        <div className="bg-slate-100 p-1.5 rounded-lg mr-3">
                          <CreditCard className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-bold text-sm text-slate-700">
                          Billing & Plans
                        </span>
                      </DropdownMenuItem>
                    </Link>
                  )}

                  {(user?.role === "LAB_OWNER" ||
                    user?.role === "LAB_MANAGER") && (
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
