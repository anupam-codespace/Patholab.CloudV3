"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Header } from "@/components/layouts/Header";
import { PageLoader } from "@/components/common/Loader";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, lab, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // ✅ Changed: Default to true, but handle actual screen size in useEffect
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // States to catch real data from your API route
  const [liveWalletBalance, setLiveWalletBalance] = useState<number>(0);
  const [liveLabName, setLiveLabName] = useState<string>("");

  // ✅ ADDED: Auto-handle Sidebar state based on screen size (Mobile vs Desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false); // Auto-close on mobile/tablet
      } else {
        setIsSidebarOpen(true); // Auto-open on desktop
      }
    };

    // Trigger on initial load
    handleResize();

    // Listen for window resize
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
                      { id: "wallet-expired", duration: 6000 },
                    );
                  }
                }

                if (Number(activeWallet.balance) <= 0) {
                  toast.error(
                    "Wallet balance is empty. Paid actions like Patient Registration are currently locked. Please recharge.",
                    { id: "wallet-empty", duration: 6000 },
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
    walletBalance: liveWalletBalance,
    currencySymbol: user?.lab?.currencySymbol || user?.currencySymbol || "₹",
    currentBranchName: user?.currentBranch?.name || "Main Branch",
    branches: user?.branches || user?.lab?.branches || [],
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      
      {/* ✅ ADDED: Mobile Overlay Backdrop. Clicking this closes the sidebar on mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        role={user.role}
        subscription={user.subscription || null}
        activeModules={(lab?.activeModules as string[]) ?? []}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* ✅ CHANGED: Dynamic margin applied to push content ONLY when sidebar is open */}
      <div
        className={`flex flex-1 flex-col overflow-hidden relative transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "lg:ml-[280px]" : "ml-0"
        }`}
      >
        <Header
          userData={headerUserData}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto w-full relative z-0 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}