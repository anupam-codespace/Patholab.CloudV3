"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  AlertCircle,
  TestTube,
  CreditCard,
  Info,
  RefreshCw,
  Megaphone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Helper: Get Icon & Color based on type
const getNotificationStyle = (type?: string) => {
  switch (type) {
    case "PAYMENT":
      return { icon: CreditCard, color: "text-green-600 bg-green-100" };
    case "TEST":
      return { icon: TestTube, color: "text-blue-600 bg-blue-100" };
    case "LAB_UPDATE":
      return { icon: RefreshCw, color: "text-purple-600 bg-purple-100" };
    case "SYSTEM":
      return { icon: AlertCircle, color: "text-amber-600 bg-amber-100" };
    case "PROMOTION":
      return { icon: Megaphone, color: "text-pink-600 bg-pink-100" };
    default:
      return { icon: Info, color: "text-slate-600 bg-slate-100" };
  }
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // 1. Fetch Notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // 2. Mark as Read Mutation
  const markReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/mark-read", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      markReadMutation.mutate(); // Auto-mark read when opened
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:text-blue-600">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-xl border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h4 className="font-semibold text-sm text-slate-700">
            Notifications
          </h4>
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              {unreadCount} New
            </Badge>
          )}
        </div>

        {/* List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="grid divide-y divide-slate-100">
              {notifications.map((notif: any) => {
                const style = getNotificationStyle(notif.type);
                const Icon = style.icon;

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex gap-3 p-4 transition-colors hover:bg-slate-50 items-start",
                      !notif.isRead ? "bg-blue-50/30" : "bg-white",
                    )}>
                    {/* Icon */}
                    <div
                      className={cn(
                        "mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        style.color,
                      )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p
                        className={cn(
                          "text-sm font-medium leading-tight",
                          !notif.isRead ? "text-slate-900" : "text-slate-700",
                        )}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* ✨ Rich Media: Image */}
                      {notif.imageUrl && (
                        <div className="relative w-full h-32 mt-2 rounded-md overflow-hidden border border-slate-100 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={notif.imageUrl}
                            alt="Notification Attachment"
                            className="object-cover w-full h-full"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* ✨ Rich Media: Link */}
                      {notif.link && (
                        <div className="pt-2">
                          <a
                            href={notif.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                            onClick={(e) => e.stopPropagation()}>
                            <Badge
                              variant="outline"
                              className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200 cursor-pointer transition-colors">
                              View Details &rarr;
                            </Badge>
                          </a>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 font-medium pt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {/* Unread Dot */}
                    {!notif.isRead && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-slate-100 bg-slate-50/50">
          <Button
            variant="ghost"
            className="w-full text-xs h-8 text-slate-500 hover:text-blue-600"
            onClick={() => markReadMutation.mutate()}
            disabled={unreadCount === 0}>
            <Check className="h-3 w-3 mr-2" /> Mark all as read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
