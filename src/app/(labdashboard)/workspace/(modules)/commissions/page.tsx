import { getSession } from "@/lib/auth";
import { authorizeAccess } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import CommissionsClient from "./CommissionsClient";

export default async function CommissionsPage() {
  // 1. Get Session
  const session = await getSession();
  if (!session || !session.userId || !session.labId) {
    redirect("/login");
  }

  // 2. ENTERPRISE GUARD: Physical Server Lock
  // Ensures only authorized staff can access the financial ledger
  await authorizeAccess({
    userId: session.userId,
    labId: session.labId,
    // TIER 1: Lab must be subscribed to the B2B/Finance module (based on your Plan schema)
    requiredFeature: "hasB2bBilling",
    // TIER 2: Staff must have finance permissions (Skip this line if you want all staff to see it)
    requiredPermission: "finance:view",
  });

  // 3. Render the Client UI if the guard passes
  return <CommissionsClient />;
}
