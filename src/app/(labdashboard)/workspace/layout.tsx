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

  // 1. We NO LONGER check for `!session.labId` here.
  // Newly registered Lab Owners will have a null labId until they finish the Setup Modal.
  if (!session || !session.userId) {
    redirect("/login");
  }

  // 2. BASE Guard: Authenticates the user and maps them to their Lab/Branch.
  // We rely on the newly updated authorizeAccess to handle the onboarding bypass safely.
  const auth = await authorizeAccess({
    userId: session.userId,
    labId: session.labId,
  });

  if (!auth.authorized) {
    redirect("/login");
  }

  // 3. 🚨 REMOVED THE SUBSCRIPTION LOCKOUT 🚨
  // In a Wallet system, you NEVER lock a user completely out of the workspace,
  // otherwise, they cannot reach the /workspace/wallet page to add funds!
  //
  // Paid actions (like creating a patient) are now blocked at the page/API level
  // via the auth-guard's `requiredPermission: 'patient:create'` check.

  // 👇 Transparent wrapper! No duplicate Sidebar or Header.
  return <>{children}</>;
}
