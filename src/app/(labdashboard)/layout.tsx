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

      // 3. Subscription & Trial Expiry Check
      // Only verify this for Lab Owners (Admins/Staff usually don't pay directly)
      if (user.role === "LAB_OWNER") {
        try {
          const res = await fetch("/api/workspace/subscription/details");

          if (res.ok) {
            const data = await res.json();
            const currentPlan = data?.currentPlan;

            if (currentPlan?.endDate) {
              const expiryDate = new Date(currentPlan.endDate);
              const now = new Date();

              // If today is past the end date
              if (expiryDate < now) {
                const isTrial = currentPlan.status === "TRIAL";

                toast.error(
                  isTrial
                    ? "Free Trial Ended. Please upgrade to continue."
                    : "Subscription Expired. Please renew your plan.",
                );

                // Redirect to the standalone upgrade page
                router.replace("/upgrade");
                return;
              }
            }
          }
        } catch (error) {
          console.error("Subscription check failed", error);
        }
      }

      // If we pass all checks, stop the loading state
      setIsChecking(false);
    };

    checkAccess();
  }, [isLoading, isAuthenticated, router, user]);

  // Show loader while checking Auth OR Subscription status
  // This prevents the dashboard from "flashing" before redirecting expired users
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
        {/* Removed p-6 from main so page components can handle their own edge-to-edge designs if needed */}
        <main className="flex-1 overflow-y-auto w-full relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
