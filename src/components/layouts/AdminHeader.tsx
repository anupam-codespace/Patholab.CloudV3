"use client";

import { Bell, Search, HelpCircle, User } from "lucide-react";
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

interface AdminHeaderProps {
  user: { name: string; role: string };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 h-16 px-8 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Search Bar */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search labs, users, or reports..."
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Actions */}
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-blue-600">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-blue-600 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
          </Button>
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 pl-2 pr-4 py-1 h-auto hover:bg-slate-50 rounded-full border border-transparent hover:border-slate-200 transition-all">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-slate-700 leading-none">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">
                  {user.role.replace("_", " ")}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>System Logs</DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="w-full text-left cursor-pointer">
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  Log out
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
