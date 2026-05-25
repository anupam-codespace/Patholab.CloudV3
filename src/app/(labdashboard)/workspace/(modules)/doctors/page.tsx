import { getSession } from "@/lib/auth";
import { authorizeAccess } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import DoctorsClient from "./DoctorsClient";

export default async function DoctorsPage() {
  // 1. Get Session securely on the server
  const session = await getSession();

  if (!session || !session.userId || !session.labId) {
    redirect("/login");
  }

  // 2. ENTERPRISE GUARD: Physical Server Lock
  // Ensures only authorized staff can access the physician registry
  await authorizeAccess({
    userId: session.userId,
    labId: session.labId,
    // TIER 2: Check if this specific staff member has permission to manage partners
    // (Omit requiredFeature here because Doctors are typically available on all SaaS plans)
    // requiredPermission: "doctors:manage",
  });

  // 3. Render the Client UI if the guard passes
  return <DoctorsClient />;
}
