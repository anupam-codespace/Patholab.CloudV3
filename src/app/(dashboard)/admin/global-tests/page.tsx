import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Database } from "lucide-react";
import { DeleteTestButton } from "./_components/DeleteTestButton";

export default async function GlobalTestsListPage() {
  // Fetch from DB directly for SSR speed
  const tests = await prisma.testTemplate.findMany({
    where: { isGlobal: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-500" /> Global Test Catalog
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the master catalog available to all SaaS tenants.
          </p>
        </div>
        <Link href="/admin/global-tests/new">
          <Button className="bg-primary hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Add Global Test
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-bold border-b border-border">
            <tr>
              <th className="px-6 py-4">Test Name & Code</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Default Price</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tests.map((test) => (
              <tr
                key={test.id}
                className="hover:bg-muted/50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{test.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {test.code}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="bg-card">
                    {test.type}
                  </Badge>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-700">
                  ₹{Number(test.price).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {test.isActive ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground hover:bg-muted border-none">
                      Archived
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <Link href={`/admin/global-tests/${test.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-primary hover:bg-primary/10">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  {/* Soft Delete Client Component */}
                  {test.isActive && <DeleteTestButton testId={test.id} />}
                </td>
              </tr>
            ))}
            {tests.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No global tests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
