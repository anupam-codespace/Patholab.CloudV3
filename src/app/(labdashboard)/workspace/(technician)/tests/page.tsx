"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  MoreHorizontal,
  FlaskConical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Microscope,
  Edit,
  Trash2,
  Layers,
  Settings2,
  TestTube2,
  FolderOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TestMasterDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Departments for the filter dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/departments");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Build query params
  const queryParams = new URLSearchParams({
    page: page.toString(),
    search: debouncedSearch,
    department: departmentFilter,
    type: typeFilter,
  }).toString();

  // Fetch Test Templates
  const { data, isLoading } = useQuery({
    queryKey: ["test-templates", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/tests?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch test directory");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const tests = data?.data || [];
  const totalRecords = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pages || 1;

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspace/tests/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete test");
    },
    onSuccess: () => {
      toast.success("Test deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["test-templates"] });
    },
    onError: () => toast.error("Cannot delete a test that has been processed."),
  });

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this test? It will be removed from your catalog.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const getTestTypeBadge = (type: string) => {
    switch (type) {
      case "PROFILE":
      case "BUNDLE":
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none px-2 text-[10px] uppercase tracking-wider shadow-sm">
            <Layers className="h-3 w-3 mr-1" /> Profile
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 px-2 text-[10px] uppercase tracking-wider">
            <TestTube2 className="h-3 w-3 mr-1" /> Single
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 font-sans relative overflow-hidden selection:bg-indigo-100">
      {/* Decorative Background */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 z-10 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* --- HEADER --- */}
        <div className="flex-none mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Microscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 leading-tight">
                Test Directory
                <Badge
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 font-mono text-xs">
                  {totalRecords} Total
                </Badge>
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Manage your laboratory's complete test menu and pricing.
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push("/workspace/tests/new")}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 h-10 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-1.5" /> Add New Test
          </Button>
        </div>

        {/* --- FILTERS --- */}
        <div className="flex-none mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Test Name or Code..."
              className="pl-9 h-10 bg-white border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20 shadow-sm text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[200px] h-10 bg-white border-slate-200 rounded-xl shadow-sm text-sm font-medium">
              <div className="flex items-center gap-2 text-slate-600">
                <FolderOpen className="h-4 w-4" />
                <SelectValue placeholder="All Departments" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200 rounded-xl shadow-sm text-sm font-medium">
              <div className="flex items-center gap-2 text-slate-600">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Test Type" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="SINGLE">Single Tests</SelectItem>
              <SelectItem value="PROFILE">Profiles / Panels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* --- DATA TABLE --- */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200/80 overflow-hidden rounded-2xl bg-white">
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-[100px]">Test Code</th>
                  <th className="px-4 py-4 min-w-[250px]">
                    Test Name & Details
                  </th>
                  <th className="px-4 py-4 w-[180px]">Department</th>
                  <th className="px-4 py-4 w-[150px]">Sample Type</th>
                  <th className="px-4 py-4 w-[120px] text-right">M.R.P (₹)</th>
                  <th className="px-4 py-4 w-[100px] text-center">Status</th>
                  <th className="px-6 py-4 text-right w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                        <span className="text-xs font-medium uppercase tracking-widest animate-pulse">
                          Loading Catalog...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : tests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <Search className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-600">
                            No tests found
                          </p>
                          <p className="text-xs mt-1 max-w-xs mx-auto">
                            Try adjusting your filters or add a new test to your
                            catalog.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tests.map((test: any) => (
                    <tr
                      key={test.id}
                      className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {test.code}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col min-w-0">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-2">
                            {test.name}
                            {getTestTypeBadge(test.type)}
                          </div>
                          {test.description && (
                            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[300px] mt-0.5">
                              {test.description}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-600 font-medium">
                        {test.department?.name || (
                          <span className="text-slate-400 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <FlaskConical className="h-3.5 w-3.5 text-rose-400" />
                          <span className="text-slate-700 font-medium text-xs">
                            {test.sampleType?.name || "-"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="font-black text-slate-800 text-[15px]">
                          {/* Using Number().toFixed() safely formats the decimal price */}
                          ₹{Number(test.price || 0).toFixed(2)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {test.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] px-2 uppercase tracking-wider font-bold">
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-slate-400 border-dashed text-[10px] px-2 uppercase tracking-wider font-bold bg-slate-50">
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 data-[state=open]:bg-indigo-50 data-[state=open]:text-indigo-600 transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 p-1.5 shadow-xl border-slate-100 rounded-xl">
                            <Link
                              href={`/workspace/tests/${test.id}/parameters`}>
                              <DropdownMenuItem className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                <Settings2 className="mr-2 h-4 w-4 text-indigo-500" />{" "}
                                Config Parameters
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/workspace/tests/${test.id}`}>
                              <DropdownMenuItem className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                <Edit className="mr-2 h-4 w-4 text-blue-500" />{" "}
                                Edit Test Details
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator className="bg-slate-100 my-1" />
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer font-bold rounded-lg py-2"
                              onClick={() => handleDelete(test.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* --- PAGINATION FOOTER --- */}
          <div className="flex-none px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white z-20">
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              Showing Page <span className="text-slate-900">{page}</span> of{" "}
              <span className="text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
