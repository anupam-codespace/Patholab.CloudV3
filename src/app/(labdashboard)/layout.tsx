"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Header } from "@/components/layouts/Header";
import { PageLoader } from "@/components/common/Loader";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import {
  MoreHorizontal,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  Wallet,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count periodically
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread notifications count", err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // Poll wallet details periodically for real-time header balance updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchWallet = async () => {
      try {
        const res = await fetch("/api/workspace/wallet/details");
        if (res.ok) {
          const data = await res.json();
          const activeWallet = data.wallet;
          if (activeWallet && activeWallet.balance !== undefined) {
            setLiveWalletBalance(Number(activeWallet.balance));
          }
        }
      } catch (err) {
        console.error("Failed to fetch wallet details", err);
      }
    };
    fetchWallet();
    const interval = setInterval(fetchWallet, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isCap =
        (window as any).Capacitor || 
        navigator.userAgent.includes("Capacitor") || 
        navigator.userAgent.includes("CapacitorApp");
      setIsCapacitor(!!isCap);
      
      const isNative = !!isCap && (
        navigator.userAgent.includes("iPhone") || 
        navigator.userAgent.includes("iPad") || 
        navigator.userAgent.includes("iPod") ||
        navigator.userAgent.includes("Android")
      );
      setIsNativeApp(isNative);
      
      if (isCap) {
        document.documentElement.classList.add("is-capacitor");
      }
      if (isNative) {
        document.documentElement.classList.add("is-native-app");
      }
    }
  }, []);

  const [liveWalletBalance, setLiveWalletBalance] = useState<number>(0);
  const [liveLabName, setLiveLabName] = useState<string>("");

  useEffect(() => {
    const checkAccess = async () => {
      if (isLoading) return;

      if (!isAuthenticated || !user) {
        router.push("/login");
        return;
      }

      if (user.role === "LAB_OWNER") {
        try {
          const res = await fetch("/api/workspace/wallet/details");

          if (res.ok) {
            const data = await res.json();
            const activeWallet = data.wallet;

            if (activeWallet) {
              if (activeWallet.labName) {
                setLiveLabName(activeWallet.labName);
              }

              if (
                activeWallet.status !== "NO_WALLET" &&
                activeWallet.status !== "PENDING_SETUP"
              ) {
                if (activeWallet.balance !== undefined) {
                  setLiveWalletBalance(Number(activeWallet.balance));
                }

                if (activeWallet.validityEndDate) {
                  const expiryDate = new Date(activeWallet.validityEndDate);
                  if (expiryDate < new Date()) {
                    toast.error(
                      "Wallet validity expired. Please recharge your wallet to resume clinical operations.",
                      { id: "wallet-expired", duration: 6000 }
                    );
                  }
                }

                if (Number(activeWallet.balance) <= 0) {
                  toast.error(
                    "Wallet balance is empty. Paid actions like Patient Registration are currently locked. Please recharge.",
                    { id: "wallet-empty", duration: 6000 }
                  );
                }
              }
            }
          }
        } catch (error) {
          console.error("Wallet validation check failed", error);
        }
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [isLoading, isAuthenticated, router, user]);

  if (
    isLoading ||
    (isAuthenticated && user?.role === "LAB_OWNER" && isChecking)
  ) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  const headerUserData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
    role: user?.role || "LAB_OWNER",
    employeeId: user?.employeeId || null,
    labName: liveLabName || user?.lab?.name || "Patholab Cloud",
    // Use liveWalletBalance if fetched, otherwise fall back to the enriched user object
    walletBalance: liveWalletBalance || user?.walletBalance || 0,
    currencySymbol: user?.currencySymbol || "₹",
    currentBranchName: user?.currentBranch?.name || "Main Branch",
    branches: user?.branches || user?.lab?.branches || [],
  };

  const pageTitleMap: Array<[string, string]> = [
    ["/workspace/test-management", "Categories"],
    ["/workspace/registration", "Registration"],
    ["/workspace/billing", "Billing"],
    ["/workspace/appointments", "Appointments"],
    ["/workspace/analytics", "Analytics"],
    ["/workspace/logistics", "Logistics"],
    ["/workspace/wallet", "Wallet"],
    ["/workspace/reports", "Reports"],
    ["/workspace/settings", "Settings"],
    ["/workspace/samples", "Samples"],
    ["/workspace/accession", "Accession"],
    ["/workspace/patients", "Patients"],
    ["/workspace", "Dashboard"],
  ];
  const pageTitle =
    pageTitleMap.find(([key]) => pathname.startsWith(key))?.[1] ?? "Dashboard";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeBranchName = user?.currentBranch?.name || "Main Branch";
      const rawBalance = liveWalletBalance || user?.walletBalance || 0;
      const isLowBalance = rawBalance <= 500;
      const isZeroBalance = rawBalance <= 0;
      const canSwitch =
        user?.role === "LAB_OWNER" ||
        user?.role === "SUPER_ADMIN" ||
        user?.role === "LAB_MANAGER";
      const listBranches = user?.branches || user?.lab?.branches || [];

      (window as any).patholabHeaderState = {
        branchName: activeBranchName,
        pageName: pageTitle,
        balance: rawBalance,
        isLow: isLowBalance,
        isZero: isZeroBalance,
        canSwitchBranch: canSwitch,
        availableBranches: listBranches,
        unreadCount: unreadCount
      };
    }
  }, [user, liveWalletBalance, pageTitle, unreadCount]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar
        role={user.role}
        subscription={user.subscription || null}
        activeModules={user?.lab?.activeModules || []}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div
        className={`flex flex-1 flex-col overflow-hidden relative transition-all duration-300 ease-in-out ${
          isSidebarOpen && !isCapacitor ? "lg:ml-[280px]" : "ml-0"
        }`}
      >
        {/* Desktop: existing Header — completely unchanged */}
        {!isCapacitor && !isNativeApp && (
          <Header
            userData={headerUserData}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}

        {/* Mobile (Capacitor fallback on mobile browser): premium custom header */}
        {isCapacitor && !isNativeApp && (
          <MobileHeader
            userData={headerUserData}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}

        <main className="flex-1 overflow-y-auto w-full relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 📱  MOBILE HEADER
//     Renders exclusively inside Capacitor native app viewports.
//     The web version remains 100% untouched.
// ─────────────────────────────────────────────────────────────────────────────
function MobileHeader({
  userData,
  toggleSidebar,
}: {
  userData: any;
  toggleSidebar: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ordered from most-specific to least-specific path
  const pageTitleMap: Array<[string, string]> = [
    ["/workspace/test-management", "Categories"],
    ["/workspace/registration", "Registration"],
    ["/workspace/billing", "Billing"],
    ["/workspace/appointments", "Appointments"],
    ["/workspace/analytics", "Analytics"],
    ["/workspace/logistics", "Logistics"],
    ["/workspace/wallet", "Wallet"],
    ["/workspace/reports", "Reports"],
    ["/workspace/settings", "Settings"],
    ["/workspace/samples", "Samples"],
    ["/workspace/accession", "Accession"],
    ["/workspace/patients", "Patients"],
    ["/workspace", "Dashboard"],
  ];

  const pageTitle =
    pageTitleMap.find(([key]) => pathname.startsWith(key))?.[1] ?? "Dashboard";

  const balance = Number(userData.walletBalance);
  const currency = userData.currencySymbol || "₹";
  const isLow = balance <= 500;
  const isEmpty = balance <= 0;

  return (
    <div className="mobile-app-header-web-component w-full bg-white dark:bg-slate-950 shadow-sm border-b border-slate-100 dark:border-slate-900">
      {/* Row 1: ⋯ | Branch & page title | Bell · Moon · Help */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        {/* Left: three-dot button + label */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            aria-label="Open menu"
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          <div className="flex flex-col min-w-0 leading-none">
            <span className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-slate-400 dark:text-slate-500 truncate">
              {userData.currentBranchName}
            </span>
            <span className="mt-0.5 text-[15px] font-black text-slate-900 dark:text-white tracking-tight truncate">
              {pageTitle}
            </span>
          </div>
        </div>

        {/* Right: icon action row */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Notification Bell */}
          <button
            aria-label="Notifications"
            className="relative h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-950" />
          </button>

          {/* Dark / Light toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle dark mode"
              className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5 text-amber-400" />
              )}
            </button>
          )}

          {/* Help */}
          <Link
            href="/workspace/support"
            aria-label="Help"
            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Row 2: Gradient Wallet Balance Card — only for Lab Owners */}
      {userData.role === "LAB_OWNER" && (
        <div className="px-4 pb-4">
          <Link href="/workspace/wallet" className="block">
            <div
              className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden transition-all active:scale-[0.98] ${
                isEmpty
                  ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-lg shadow-red-200 dark:shadow-red-950/40"
                  : isLow
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-200 dark:shadow-amber-950/40"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-950/40"
              }`}
            >
              {/* Decorative background circles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                <div className="absolute right-8 -bottom-6 h-16 w-16 rounded-full bg-white/10" />
              </div>

              {/* Icon */}
              <div className="relative shrink-0 h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                {isEmpty || isLow ? (
                  <AlertTriangle className="h-5 w-5 text-white" />
                ) : (
                  <Wallet className="h-5 w-5 text-white" />
                )}
              </div>

              {/* Balance text */}
              <div className="relative flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/70 leading-none">
                  Wallet Balance
                </p>
                <p className="mt-0.5 text-[18px] font-black text-white leading-none">
                  {currency}
                  {balance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-white/75 leading-none">
                  {isEmpty
                    ? "⚠ Balance empty — actions locked"
                    : isLow
                    ? "Low balance — tap to add funds"
                    : "Active & funded"}
                </p>
              </div>

              {/* Chevron arrow */}
              <div className="relative shrink-0">
                <ChevronRight className="h-5 w-5 text-white/60" />
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
