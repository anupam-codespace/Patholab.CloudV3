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
      // We check this silently. We DO NOT redirect if expired or empty,
      // because the owner needs access to the dashboard to recharge.
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
    // 1. Outer wrapper locks the screen height to 100vh and uses flex-row
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* 2. Sidebar sits on the left (relative on desktop, fixed on mobile) */}
      <Sidebar role={user.role} />

      {/* 3. Main content area takes up the rest of the width and stacks vertically */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* 4. Topbar/Header is pinned to the top of this column */}
        <Header user={user} />

        {/* 5. Children (the page content) scrolls independently underneath the Header */}
        <main className="flex-1 overflow-y-auto w-full relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
