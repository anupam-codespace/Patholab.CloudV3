export const dynamic = "force-dynamic";

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import AdminLayoutClient from "@/components/layouts/AdminLayoutClient";
import Providers from "@/app/providers"; // 👈 IMPORT THIS

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ... your existing auth logic ...
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");

  const userPayload = await verifyToken(token);

  if (!userPayload || userPayload.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  const user = {
    name: userPayload.name || "Admin",
    role: userPayload.role as string,
  };

  return (
    // 👇 WRAP EVERYTHING HERE
    <Providers>
      <AdminLayoutClient user={user}>{children}</AdminLayoutClient>
    </Providers>
  );
}
