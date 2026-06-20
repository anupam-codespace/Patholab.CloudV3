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
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ✅ ADDED: States to catch real data from your API route
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

            // Extract the nested wallet object built in your API route
            const activeWallet = data.wallet;

            if (activeWallet) {
              // ✅ 1. Safely catch the Lab Name from the API response
              if (activeWallet.labName) {
                setLiveLabName(activeWallet.labName);
              }

              if (
                activeWallet.status !== "NO_WALLET" &&
                activeWallet.status !== "PENDING_SETUP"
              ) {
                // ✅ 2. Safely catch the real Wallet Balance
                if (activeWallet.balance !== undefined) {
                  setLiveWalletBalance(Number(activeWallet.balance));
                }

                // Expiration Check
                if (activeWallet.validityEndDate) {
                  const expiryDate = new Date(activeWallet.validityEndDate);
                  if (expiryDate < new Date()) {
                    toast.error(
                      "Wallet validity expired. Please recharge your wallet to resume clinical operations.",
                      { id: "wallet-expired", duration: 6000 },
                    );
                  }
                }

                // Empty Balance Check
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

  // ✅ Maps data to Header: Prioritizes data fetched directly from API, then user object, then fallback strings
  const headerUserData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
    role: user?.role || "LAB_OWNER",
    employeeId: user?.employeeId || null,

    // 👇 Injects the exact lab name & wallet balance caught from your API
    labName: liveLabName || user?.lab?.name || "Patholab Cloud",
    walletBalance: liveWalletBalance,

    currencySymbol: user?.lab?.currencySymbol || user?.currencySymbol || "₹",
    currentBranchName: user?.currentBranch?.name || "Main Branch",
    branches: user?.branches || user?.lab?.branches || [],
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar
        role={user.role}
        subscription={user.subscription || null}
        activeModules={user?.lab?.activeModules || []} // ✅ Pass the DB array down
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div
        className={`flex flex-1 flex-col overflow-hidden relative transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "lg:ml-[280px]" : "ml-0"
        }`}>
        <Header
          userData={headerUserData}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto w-full relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
