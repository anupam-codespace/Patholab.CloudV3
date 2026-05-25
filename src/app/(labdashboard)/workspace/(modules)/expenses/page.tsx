import { getSession } from "@/lib/auth";
import { authorizeAccess } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  // 1. Get Session securely on the server
  const session = await getSession();

  if (!session || !session.userId || !session.labId) {
    redirect("/login");
  }

  // 2. ENTERPRISE GUARD: Physical Server Lock
  // Ensures only authorized staff can access the financial outflow ledger
  await authorizeAccess({
    userId: session.userId,
    labId: session.labId,
    // TIER 1: Lab must be subscribed to the Expenses module (based on your Plan schema)
    requiredFeature: "hasExpenses",
    // TIER 2: Staff must have finance permissions (Uncomment to enforce staff-level restriction)
    // requiredPermission: "finance:view",
  });

  // 3. Render the Client UI if the guard passes
  return <ExpensesClient />;
}
