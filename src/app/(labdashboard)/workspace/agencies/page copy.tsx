"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
} from "@/actions/agency-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // ✅ Added Tabs
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Building2,
  Phone,
  Percent,
  IndianRupee,
  UserCircle,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  Check,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

// ✅ Mock fetcher for tests (You will need to import your real getTests action here)
import { getTests } from "@/actions/test-catalog";

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Modals State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [editingAgency, setEditingAgency] = useState<any>(null);
  const [viewingAgency, setViewingAgency] = useState<any>(null); // State for the Ledger View

  // Form States (Basic)
  const [formData, setFormData] = useState({
    agencyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    panNumber: "",
    commissionRate: 0,
    commissionType: "PERCENTAGE",
  });

  // ✅ NEW: State for Custom Test Commissions
  const [customCommissions, setCustomCommissions] = useState<any[]>([]);
  const [testSearch, setTestSearch] = useState("");

  // Queries
  const { data: agencies, isLoading } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => await getAgencies(),
  });

  // ✅ NEW: Query to fetch all lab tests for the search bar
  const { data: allTests } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => await getTests(),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      // We pass the basic data AND the array of custom commissions
      if (editingAgency) {
        await updateAgency(editingAgency.id, payload);
      } else {
        await createAgency(payload);
      }
    },
    onSuccess: () => {
      toast.success(
        editingAgency ? "Agency updated!" : "Agency added successfully!",
      );
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
    onError: () => toast.error("Failed to save agency details."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteAgency(id),
    onSuccess: () => {
      toast.success("Agency deleted");
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });

  // Handlers
  const handleAddNew = () => {
    setEditingAgency(null);
    setFormData({
      agencyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      panNumber: "",
      commissionRate: 5,
      commissionType: "PERCENTAGE",
    });
    setCustomCommissions([]); // Reset custom rates
    setIsDialogOpen(true);
  };

  const handleEdit = (agency: any) => {
    setEditingAgency(agency);
    setFormData({
      agencyName: agency.agencyName,
      contactPerson: agency.contactPerson || "",
      phone: agency.phone || "",
      email: agency.email || "",
      panNumber: agency.panNumber || "",
      commissionRate: agency.commissionRate || 0,
      commissionType: agency.commissionType,
    });
    // ✅ Load existing custom rates from agency if they exist
    setCustomCommissions(agency.customTestCommissions || []);
    setIsDialogOpen(true);
  };

  const handleView = (agency: any) => {
    setViewingAgency(agency);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this agency? All historical data will be retained for accounting.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyName) return toast.error("Agency name is required");

    // ✅ Combine basic data with custom rates array
    saveMutation.mutate({
      ...formData,
      commissionRate: Number(formData.commissionRate),
      customCommissions: customCommissions,
    });
  };

  // ✅ NEW: Add a specific test to the Custom Rates list
  const addCustomTestRate = (test: any) => {
    if (customCommissions.some((c) => c.testTemplateId === test.id)) {
      return toast.error("This test already has a custom rate.");
    }
    setCustomCommissions([
      ...customCommissions,
      {
        testTemplateId: test.id,
        testName: test.name,
        commissionRate: 0,
        commissionType: "FIXED",
      },
    ]);
    setTestSearch(""); // Clear search
  };

  // ✅ NEW: Update a specific test rate
  const updateCustomRate = (index: number, field: string, value: any) => {
    const updated = [...customCommissions];
    updated[index][field] = value;
    setCustomCommissions(updated);
  };

  // ✅ NEW: Remove a custom rate
  const removeCustomRate = (index: number) => {
    setCustomCommissions(customCommissions.filter((_, i) => i !== index));
  };

  const filteredAgencies =
    agencies?.filter(
      (a: any) =>
        a.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.phone?.includes(searchTerm),
    ) || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            B2B Agencies
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage collection centers, hospitals, and their payout rules.
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <Plus className="h-4 w-4 mr-2" /> Add Agency
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by agency name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
        />
      </div>

      {/* AGENCIES TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">
                  Agency Details
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Contact Person
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Commission Rule
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Total Referrals
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-slate-500">
                    Loading agencies...
                  </TableCell>
                </TableRow>
              ) : filteredAgencies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-slate-500">
                    No B2B agencies found in your network.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgencies.map((agency: any) => (
                  <TableRow key={agency.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {agency.agencyName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            PAN: {agency.panNumber || "N/A"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <UserCircle className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {agency.contactPerson || "-"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <Phone className="h-3 w-3 text-slate-400" />{" "}
                        {agency.phone || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${agency.commissionType === "PERCENTAGE" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {agency.commissionType === "PERCENTAGE" ? (
                            <Percent className="h-3 w-3 mr-1" />
                          ) : (
                            <IndianRupee className="h-3 w-3 mr-1" />
                          )}
                          {agency.commissionRate}{" "}
                          {agency.commissionType === "PERCENTAGE"
                            ? "%"
                            : "Flat"}{" "}
                          (Profile Default)
                        </span>
                        {/* ✅ SHOW BADGE IF THEY HAVE CUSTOM RATES */}
                        {agency.customTestCommissions?.length > 0 && (
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {agency.customTestCommissions.length} Custom Test
                            Rates
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800">
                        {agency._count?.tests || 0} Tests
                      </div>
                      <div className="text-xs text-slate-500 font-bold text-orange-600">
                        Lifetime Generated: ₹
                        {(agency as any).totalCommission.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(agency)}
                          className="text-slate-400 hover:text-indigo-600 bg-indigo-50/0 hover:bg-indigo-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(agency)}
                          className="text-slate-400 hover:text-blue-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(agency.id)}
                          className="text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* DETAILED VIEW MODAL (LEDGER) - UNCHANGED */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl bg-slate-50">
          <DialogHeader className="bg-white p-4 -mx-6 -mt-6 border-b rounded-t-lg shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {viewingAgency?.agencyName}
                </DialogTitle>
                <DialogDescription>
                  {viewingAgency?.contactPerson} | {viewingAgency?.phone}
                </DialogDescription>
              </div>
            </div>

            <div className="flex gap-6 mt-4">
              <div className="bg-slate-50 px-4 py-2 rounded-lg border">
                <p className="text-[10px] text-slate-500 font-bold uppercase">
                  Total Referrals
                </p>
                <p className="text-lg font-black text-slate-800">
                  {viewingAgency?._count?.tests || 0}
                </p>
              </div>
              <div className="bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
                <p className="text-[10px] text-orange-600 font-bold uppercase">
                  Lifetime Commission Generated
                </p>
                <p className="text-lg font-black text-orange-700">
                  ₹{viewingAgency?.totalCommission?.toLocaleString()}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Referral & Commission Ledger
            </h3>
            <div className="bg-white rounded-xl border shadow-sm max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Patient</TableHead>
                    <TableHead className="text-xs">Test Name</TableHead>
                    <TableHead className="text-xs text-right">
                      Commission Earned
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Payment Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingAgency?.commissions?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-slate-400">
                        No referrals logged yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    viewingAgency?.commissions?.map((comm: any) => (
                      <TableRow key={comm.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {new Date(comm.test.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-sm text-slate-800">
                          {comm.test.patient?.name || "Unknown Patient"}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-700">
                            {comm.test.testName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {comm.test.testNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800">
                          ₹{comm.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {comm.status === "PAID" ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200">
                              <Clock className="w-3 h-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ UPDATED ADD / EDIT MODAL WITH TABS */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              {editingAgency ? "Edit Agency Profile" : "Add New Agency"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <Tabs defaultValue="basic" className="w-full">
              <div className="px-6 border-b border-slate-100">
                <TabsList className="bg-slate-50/50 w-full justify-start p-0 h-auto gap-4 rounded-none">
                  <TabsTrigger
                    value="basic"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-3 px-1 text-sm font-semibold">
                    Basic & Default Margins
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-3 px-1 text-sm font-semibold flex items-center gap-2 text-indigo-600">
                    Custom Test Rates{" "}
                    <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px] h-4 px-1.5">
                      {customCommissions.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: BASIC PROFILE */}
              <TabsContent value="basic" className="p-6 pt-4 space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Agency Name *
                    </label>
                    <Input
                      placeholder="e.g. City Care Hospital"
                      value={formData.agencyName}
                      onChange={(e) =>
                        setFormData({ ...formData, agencyName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Contact Person
                    </label>
                    <Input
                      placeholder="e.g. Mr. Sharma"
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPerson: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Phone Number
                    </label>
                    <Input
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="agency@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    PAN Number
                  </label>
                  <Input
                    placeholder="ABCDE1234F"
                    className="uppercase font-mono"
                    value={formData.panNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        panNumber: e.target.value.toUpperCase(),
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-500">
                    Optional: Used for corporate TDS accounting.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 mt-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    Profile Default Commission
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Commission Type
                      </label>
                      <Select
                        value={formData.commissionType}
                        onValueChange={(v) =>
                          setFormData({ ...formData, commissionType: v })
                        }>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">
                            Percentage (%)
                          </SelectItem>
                          <SelectItem value="FIXED">Flat Rate (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Rate / Amount
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.commissionRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commissionRate: Number(e.target.value),
                          })
                        }
                        className="bg-white font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    This is the fallback rate. If a test does not have a
                    specific custom rate assigned in the next tab, this default
                    rule will apply.
                  </p>
                </div>
              </TabsContent>

              {/* TAB 2: CUSTOM TEST RATES */}
              <TabsContent value="custom" className="p-6 pt-4 space-y-4 m-0">
                <div className="relative z-10">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search to add a specific test..."
                    className="pl-9 bg-slate-50 border-slate-200"
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                  />
                  {testSearch && (
                    <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                      {allTests
                        ?.filter((t: any) =>
                          t.name
                            .toLowerCase()
                            .includes(testSearch.toLowerCase()),
                        )
                        .slice(0, 10)
                        .map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => addCustomTestRate(t)}
                            className="p-3 text-sm border-b last:border-0 hover:bg-indigo-50 cursor-pointer flex justify-between items-center">
                            <span className="font-semibold text-slate-700">
                              {t.name}
                            </span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                              ₹{t.price}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="border rounded-xl bg-white overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold h-9">
                          Test Name
                        </TableHead>
                        <TableHead className="text-xs font-bold h-9 w-32">
                          Type
                        </TableHead>
                        <TableHead className="text-xs font-bold h-9 w-28">
                          Margin
                        </TableHead>
                        <TableHead className="h-9 w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customCommissions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-6 text-sm text-slate-500 bg-slate-50/30">
                            No custom rates. The profile default will be used
                            for all tests.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customCommissions.map((cc, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-semibold text-sm">
                              {cc.testName}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={cc.commissionType}
                                onValueChange={(v) =>
                                  updateCustomRate(index, "commissionType", v)
                                }>
                                <SelectTrigger className="h-8 text-xs bg-slate-50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PERCENTAGE">
                                    Percentage (%)
                                  </SelectItem>
                                  <SelectItem value="FIXED">
                                    Flat (₹)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-xs font-bold"
                                value={cc.commissionRate}
                                onChange={(e) =>
                                  updateCustomRate(
                                    index,
                                    "commissionRate",
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCustomRate(index)}
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 p-6 pt-4 border-t border-slate-100 bg-slate-50/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 shadow-md"
                disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingAgency ? "Update Profile" : "Save Agency"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
