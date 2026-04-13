"use client";

import Link from "next/link";
import {
  LogOut,
  User,
  Settings,
  CreditCard,
  FlaskConical,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  UserPlus,
  Receipt,
  TestTube,
  LifeBuoy,
  Building2,
  MapPin,
  Check,
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

// ✅ UPDATED: Added Branch typings to the Header Props
interface HeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
    role?: string;
    lab?: { name: string } | null;
    currentBranch?: { id: string; name: string; isMainBranch?: boolean } | null;
    branches?: { id: string; name: string; isMainBranch?: boolean }[];
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        toast.success("Logged out successfully");
        window.location.href = "/login";
      } else {
        document.cookie = "token=; Max-Age=0; path=/;";
        window.location.href = "/login";
      }
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  // ✅ Branch Switching Logic (Placeholder for your state/context manager)
  const handleSwitchBranch = (branchId: string, branchName: string) => {
    // Here you would typically set a cookie, update a global context, or append a ?branchId= query param
    toast.success(`Switched workspace to ${branchName}`);
    // router.refresh(); // Refresh to load data for the new branch
  };

  // Fallback to prevent .split() crash
  const userName = user?.name || "User";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const labName = user?.lab?.name || "Super Admin";
  const currentBranchName = user?.currentBranch?.name || "Main Branch";
  // Fallback branches array if not provided by backend yet
  const availableBranches = user?.branches || [
    { id: "1", name: "Main Branch", isMainBranch: true },
  ];

  const getPageTitle = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    const routeMap: Record<string, string> = {
      "lab-owner": "Dashboard",
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
    };

    if (!lastSegment) return "Dashboard";

    return (
      routeMap[lastSegment] ||
      lastSegment.charAt(0).toUpperCase() +
        lastSegment.slice(1).replace(/-/g, " ")
    );
  };

  const currentPage = getPageTitle(pathname);

  return (
    <div className="sticky top-4 z-40 px-4 md:px-8 pointer-events-none">
      {/* Floating Header Container */}
      <header className="pointer-events-auto h-16 w-full max-w-screen-2xl mx-auto flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm pr-4 pl-14 sm:pr-6 md:pl-16">
        {/* 1. LEFT SIDE: BRANDING, BRANCH SWITCHER & BREADCRUMBS */}
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <Link
            href="/lab-owner/patients"
            className="flex items-center justify-center h-10 w-10 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group transition-all hover:bg-emerald-500/20 mr-1">
            <FlaskConical className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            {/* ✅ NEW: BRANCH SWITCHER DROPDOWN */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-all text-left">
                  <div className="bg-slate-100 p-1.5 rounded-lg hidden lg:block">
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                      {labName}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                      {currentBranchName}{" "}
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 rounded-2xl shadow-xl border border-slate-200 p-2 animate-in zoom-in-95 duration-200">
                <DropdownMenuLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 pb-2">
                  Switch Workspace
                </DropdownMenuLabel>
                <div className="space-y-1">
                  {availableBranches.map((branch) => {
                    const isActive = currentBranchName === branch.name;
                    return (
                      <DropdownMenuItem
                        key={branch.id}
                        onClick={() =>
                          handleSwitchBranch(branch.id, branch.name)
                        }
                        className={`cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between transition-colors ${isActive ? "bg-emerald-50 text-emerald-900 focus:bg-emerald-50" : "hover:bg-slate-50 focus:bg-slate-50"}`}>
                        <div className="flex items-center gap-3">
                          <MapPin
                            className={`h-4 w-4 ${isActive ? "text-emerald-500" : "text-slate-400"}`}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-sm leading-none">
                              {branch.name}
                            </span>
                            {branch.isMainBranch && (
                              <span className="text-[10px] text-slate-400 font-medium mt-1">
                                Main Headquarters
                              </span>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <Check className="h-4 w-4 text-emerald-600" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
                <DropdownMenuSeparator className="my-2 bg-slate-100" />
                <Link href="/lab-owner/settings?tab=branches">
                  <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-50 font-bold text-sm flex items-center">
                    <Settings className="w-4 h-4 mr-2 text-slate-400" />
                    Manage Branches
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            <ChevronRight className="h-4 w-4 text-slate-300" />

            <span className="text-sm font-semibold text-slate-500 flex items-center">
              {currentPage}
            </span>
          </div>

          {/* Mobile Fallback Title (Shows Branch + Page) */}
          <div className="sm:hidden flex flex-col justify-center max-w-[140px]">
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-0.5 truncate">
              {currentBranchName}
            </span>
            <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none truncate">
              {currentPage}
            </span>
          </div>
        </div>

        {/* 2. CENTER/RIGHT: ACTIONS */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* ⚡ QUICK ACTIONS BAR (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 mr-2">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/lab-owner/registration">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-0 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl">
                  New Patient
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/lab-owner/billing">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <Receipt className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-0 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl">
                  Create Invoice
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/lab-owner/test-management">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <TestTube className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-0 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl">
                  Test Catalog
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 🟢 HELP / SUPPORT POPUP */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 shadow-2xl border-0 rounded-2xl overflow-hidden animate-in zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
              <div className="bg-slate-900 p-5">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-emerald-400" /> Need Help?
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
                  <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Email Support
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      support@patholab
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Operating Hours
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      Mon-Sat, 9am - 7pm
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <Link href="/lab-owner/support" passHref>
                  <Button className="w-full h-10 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm font-bold text-xs transition-all">
                    Open Support Center{" "}
                    <ExternalLink className="h-3 w-3 ml-2 text-slate-400" />
                  </Button>
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* 🔔 NOTIFICATION DROPDOWN */}
          <div className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 transition-colors">
            <NotificationDropdown />
          </div>

          {/* 👤 USER DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-xl p-0 ml-1 border border-slate-200 shadow-sm hover:ring-4 ring-emerald-500/10 transition-all overflow-hidden">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage
                    src={user?.avatar || ""}
                    alt={userName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-slate-900 text-white font-bold text-xs rounded-none">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-72 mt-3 p-0 rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
              align="end"
              forceMount>
              {/* Premium Dark Header */}
              <DropdownMenuLabel className="font-normal p-5 bg-slate-900 text-white">
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
                    {user?.role && (
                      <Badge className="mt-1.5 w-fit bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] uppercase tracking-widest font-black rounded-md px-1.5 py-0.5">
                        {user.role.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>

              <div className="p-2 bg-white">
                <DropdownMenuGroup>
                  <Link href="/lab-owner/settings">
                    <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                      <div className="bg-slate-100 p-1.5 rounded-lg mr-3">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      <span className="font-bold text-sm text-slate-700">
                        My Profile
                      </span>
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/lab-owner/subscription">
                    <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                      <div className="bg-slate-100 p-1.5 rounded-lg mr-3">
                        <CreditCard className="h-4 w-4 text-slate-600" />
                      </div>
                      <span className="font-bold text-sm text-slate-700">
                        Billing & Plans
                      </span>
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/lab-owner/settings?tab=general">
                    <DropdownMenuItem className="cursor-pointer rounded-xl py-3 px-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors">
                      <div className="bg-slate-100 p-1.5 rounded-lg mr-3">
                        <Settings className="h-4 w-4 text-slate-600" />
                      </div>
                      <span className="font-bold text-sm text-slate-700">
                        Lab Settings
                      </span>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuGroup>

                <div className="h-px bg-slate-100 my-1 mx-2" />

                <DropdownMenuItem
                  className="cursor-pointer rounded-xl py-3 px-3 text-red-600 focus:text-red-700 focus:bg-red-50 transition-colors"
                  onClick={handleLogout}>
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
