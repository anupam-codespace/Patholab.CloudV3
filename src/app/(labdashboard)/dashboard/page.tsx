import { headers } from "next/headers";
import { redirect } from "next/navigation";

// We will create these components in the next step
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import TechnicianDashboard from "@/components/dashboards/TechnicianDashboard";
import ReceptionistDashboard from "@/components/dashboards/ReceptionistDashboard";

export default function UnifiedDashboardPage() {
  // Read the role and lab context directly from the secure middleware headers
  const headersList = headers();
  const role = headersList.get("x-user-role");
  const labId = headersList.get("x-lab-id");

  if (!role || !labId) {
    redirect("/login");
  }

  // The Switchboard: Render the exact UI this user needs based on their role
  return (
    <div className="h-full w-full bg-slate-50">
      {role === "LAB_OWNER" ||
      role === "LAB_MANAGER" ||
      role === "SUPER_ADMIN" ? (
        <AdminDashboard labId={labId} role={role} />
      ) : role === "TECHNICIAN" ? (
        <TechnicianDashboard labId={labId} />
      ) : role === "RECEPTIONIST" ? (
        <ReceptionistDashboard labId={labId} />
      ) : (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center text-slate-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Welcome to Patholab Cloud
            </h2>
            <p>
              Your role ({role}) does not have a designated dashboard view yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
