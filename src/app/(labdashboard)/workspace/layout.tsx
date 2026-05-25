// app/workspace/layout.tsx
import { redirect } from "next/navigation";
import { authorizeAccess } from "@/lib/auth-guard";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !session.userId || !session.labId) {
    redirect("/login");
  }

  // BASE Guard: Only checks if user is valid and lab exists.
  // It DOES NOT check for specific modules here.
  const auth = await authorizeAccess({
    userId: session.userId,
    labId: session.labId,
  });

  if (!auth.authorized) redirect("/login");

  const { staff, subscription } = auth;
  const user = staff.user;

  // Subscription Expiry Check
  if (user.role === "LAB_OWNER" && subscription) {
    const expiryDate = new Date(subscription.endDate);
    if (expiryDate < new Date()) {
      const isTrial = subscription.status === "TRIAL";
      redirect(
        `/upgrade?reason=${isTrial ? "trial_ended" : "subscription_expired"}`,
      );
    }
  }

  // 👇 Transparent wrapper! No duplicate Sidebar or Header.
  return <>{children}</>;
}
