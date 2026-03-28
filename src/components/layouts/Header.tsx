"use client";

import Link from "next/link";
import {
  LogOut,
  User,
  Settings,
  CreditCard,
  FlaskConical,
  ChevronRight,
  HelpCircle,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  UserPlus,
  Receipt,
  TestTube,
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
  user: {
    name: string;
    email: string;
    avatar?: string | null;
    role?: string;
    lab?: { name: string } | null;
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

  // ✅ FIX: Added fallback to prevent .split() crash
  const userName = user?.name || "User";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const labName = user?.lab?.name || "Super Admin";

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pl-16 pr-6 shadow-sm">
      {/* 1. LEFT SIDE: BRANDING & BREADCRUMBS */}
      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
        <Link
          href="/lab-owner/patients"
          className="flex items-center gap-2 text-red-600 hover:opacity-80 transition-opacity">
          <FlaskConical className="h-5 w-5 fill-current" />
          <span className="text-lg font-bold tracking-tight hidden md:inline-block">
            Patholab
          </span>
        </Link>

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        <span className="font-semibold text-sm text-slate-700 uppercase tracking-wide hidden sm:inline-block">
          {labName}
        </span>

        <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />

        <span className="text-sm text-slate-500 font-medium hidden sm:flex items-center gap-1">
          {currentPage}
        </span>
      </div>

      {/* 2. CENTER/RIGHT: ACTIONS */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* ⚡ QUICK ACTIONS BAR */}
        <div className="hidden md:flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
          <TooltipProvider>
            {/* Action 1: New Patient */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/lab-owner/registration">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>New Registration</TooltipContent>
            </Tooltip>

            {/* Action 2: Create Bill */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/lab-owner/billing">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600 hover:text-green-600 hover:bg-green-50">
                    <Receipt className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Create Invoice</TooltipContent>
            </Tooltip>

            {/* Action 3: Add Test */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/lab-owner/test-management">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600 hover:text-purple-600 hover:bg-purple-50">
                    <TestTube className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Manage Tests</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          {/* 🟢 HELP / SUPPORT POPUP */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-blue-600 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 shadow-xl border-slate-200">
              <div className="bg-slate-50 p-4 border-b border-slate-100">
                <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                  Need Assistance?
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Contact support or view guides.
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Call Us
                    </p>
                    <p className="text-xs text-slate-500">+91 8402010207</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Email Support
                    </p>
                    <p className="text-xs text-slate-500">support@Patholab</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Operating Hours
                    </p>
                    <p className="text-xs text-slate-500">
                      Mon-Sat, 9:00 AM - 7:00 PM
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <Link href="/lab-owner/support" passHref>
                  <Button className="w-full h-9 text-xs" variant="default">
                    Go to Support Center
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* 🔔 NOTIFICATION DROPDOWN */}
          <NotificationDropdown />

          {/* 👤 USER DROPDOWN (With Fixed Links) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full ml-1 ring-2 ring-transparent hover:ring-slate-200 transition-all">
                <Avatar className="h-9 w-9 border border-slate-200">
                  <AvatarImage src={user?.avatar || ""} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-blue-400 text-white font-medium text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 mt-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-3 bg-slate-50/50 border-b">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-slate-800 leading-none">
                    {userName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <Badge
                      variant="secondary"
                      className="mt-2 w-fit text-[10px] uppercase tracking-wider font-bold">
                      {user.role.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>

              <div className="p-1">
                <DropdownMenuGroup>
                  <Link href="/lab-owner/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4 text-slate-500" />{" "}
                      <span>My Profile</span>
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/lab-owner/subscription">
                    <DropdownMenuItem className="cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4 text-slate-500" />{" "}
                      <span>Billing & Plans</span>
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/lab-owner/settings?tab=general">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4 text-slate-500" />{" "}
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> <span>Log out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
