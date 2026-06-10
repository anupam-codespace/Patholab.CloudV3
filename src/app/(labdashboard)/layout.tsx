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

  // ✅ ADDED: Sidebar toggle state (Hidden by default as requested)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. Wait for Auth to load
      if (isLoading) return;

      // 2. Authentication Check
      if (!isAuthenticated || !user) {
        router.push("/login");
        return;
      }

      // 3. Wallet Health Check (Pay-As-You-Go)
      if (user.role === "LAB_OWNER") {
        try {
          const res = await fetch("/api/workspace/wallet/details");

          if (res.ok) {
            const data = await res.json();

            // Skip checks if they haven't set up the lab yet
            if (
              data.status !== "NO_WALLET" &&
              data.status !== "PENDING_SETUP"
            ) {
              // A. Check Validity Expiration
              if (data.validityEndDate) {
                const expiryDate = new Date(data.validityEndDate);
                if (expiryDate < new Date()) {
                  toast.error(
                    "Wallet validity expired. Please recharge your wallet to resume clinical operations.",
                    { id: "wallet-expired", duration: 6000 },
                  );
                }
              }

              // B. Check Empty Balance
              if (Number(data.balance) <= 0) {
                toast.error(
                  "Wallet balance is empty. Paid actions like Patient Registration are currently locked. Please recharge.",
                  { id: "wallet-empty", duration: 6000 },
                );
              }
            }
          }
        } catch (error) {
          console.error("Wallet validation check failed", error);
        }
      }

      // 4. End loading state
      setIsChecking(false);
    };

    checkAccess();
  }, [isLoading, isAuthenticated, router, user]);

  // Show loader while checking Auth
  if (
    isLoading ||
    (isAuthenticated && user?.role === "LAB_OWNER" && isChecking)
  ) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* ✅ 1. SIDEBAR: Passed the state and setter */}
      <Sidebar
        role={user.role}
        subscription={user.subscription || null} // Pass subscription if you have it in user object
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* ✅ 2. MAIN CONTENT: Shifts right automatically on desktop when sidebar opens */}
      <div
        className={`flex flex-1 flex-col overflow-hidden relative transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "lg:ml-[280px]" : "ml-0"
        }`}>
        {/* ✅ 3. HEADER: Passed the toggle function */}
        <Header
          user={user}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto w-full relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
