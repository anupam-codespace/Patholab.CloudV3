"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "@/actions/doctor-management";
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
  Stethoscope,
  Phone,
  Percent,
  IndianRupee,
  MapPin,
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

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Modals State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [viewingDoctor, setViewingDoctor] = useState<any>(null);

  // Form States (Basic)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    clinic: "",
    commissionRate: 0,
    commissionType: "PERCENTAGE",
  });

  // ✅ NEW: State for Custom Test Commissions
  const [customCommissions, setCustomCommissions] = useState<any[]>([]);
  const [testSearch, setTestSearch] = useState("");

  // Queries
  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => await getDoctors(),
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
      if (editingDoctor) {
        await updateDoctor(editingDoctor.id, payload);
      } else {
        await createDoctor(payload);
      }
    },
    onSuccess: () => {
      toast.success(
        editingDoctor ? "Doctor updated!" : "Doctor added successfully!",
      );
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => toast.error("Failed to save doctor details."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteDoctor(id),
    onSuccess: () => {
      toast.success("Doctor deleted");
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });

  // Handlers
  const handleAddNew = () => {
    setEditingDoctor(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      specialization: "",
      clinic: "",
      commissionRate: 10,
      commissionType: "PERCENTAGE",
    });
    setCustomCommissions([]); // Reset custom rates
    setIsDialogOpen(true);
  };

  const handleEdit = (doc: any) => {
    setEditingDoctor(doc);
    setFormData({
      name: doc.name,
      phone: doc.phone || "",
      email: doc.email || "",
      specialization: doc.specialization || "",
      clinic: doc.clinic || "",
      commissionRate: Number(doc.commissionRate || 0),
      commissionType: doc.commissionType,
    });
    // Load existing custom rates from doctor if they exist (requires backend update to fetch them)
    setCustomCommissions(doc.customTestCommissions || []);
    setIsDialogOpen(true);
  };

  const handleView = (doc: any) => {
    setViewingDoctor(doc);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this doctor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Doctor name is required");

    // Combine basic data with custom rates array
    saveMutation.mutate({
      ...formData,
      commissionRate: Number(formData.commissionRate),
      customCommissions: customCommissions, // ✅ Pass the array to the backend
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

  const filteredDoctors =
    doctors?.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm),
    ) || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Doctors & Referrals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your network of referring doctors and their commission rules.
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
          <Plus className="h-4 w-4 mr-2" /> Add Doctor
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by doctor name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
        />
      </div>

      {/* DOCTORS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">
                  Doctor Profile
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  Contact & Clinic
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
                    Loading doctors...
                  </TableCell>
                </TableRow>
              ) : filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-slate-500">
                    No doctors found in your network.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDoctors.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 text-primary rounded-full flex items-center justify-center font-bold">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {doc.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {doc.specialization || "General Physician"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />{" "}
                        {doc.phone || "-"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />{" "}
                        {doc.clinic || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${doc.commissionType === "PERCENTAGE" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-primary"}`}>
                          {doc.commissionType === "PERCENTAGE" ? (
                            <Percent className="h-3 w-3 mr-1" />
                          ) : (
                            <IndianRupee className="h-3 w-3 mr-1" />
                          )}
                          {Number(doc.commissionRate || 0)}{" "}
                          {doc.commissionType === "PERCENTAGE" ? "%" : "Flat"}{" "}
                          (Profile Default)
                        </span>
                        {/* ✅ SHOW BADGE IF THEY HAVE CUSTOM RATES */}
                        {doc.customTestCommissions?.length > 0 && (
                          <span className="text-[10px] text-primary font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {doc.customTestCommissions.length} Custom Test Rates
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800">
                        {doc._count?.tests || 0} Tests
                      </div>
                      <div className="text-xs text-slate-500 font-bold text-orange-600">
                        Lifetime Generated: ₹
                        {Number(
                          (doc as any).lifetimeCommission ||
                            (doc as any).totalCommission ||
                            0,
                        ).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(doc)}
                          className="text-slate-400 hover:text-primary bg-indigo-50/0 hover:bg-indigo-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(doc)}
                          className="text-slate-400 hover:text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
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
              <div className="h-12 w-12 bg-indigo-100 text-primary rounded-full flex items-center justify-center">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {viewingDoctor?.name}
                </DialogTitle>
                <DialogDescription>
                  {viewingDoctor?.specialization} | {viewingDoctor?.clinic}
                </DialogDescription>
              </div>
            </div>

            <div className="flex gap-6 mt-4">
              <div className="bg-slate-50 px-4 py-2 rounded-lg border">
                <p className="text-[10px] text-slate-500 font-bold uppercase">
                  Total Referrals
                </p>
                <p className="text-lg font-black text-slate-800">
                  {viewingDoctor?._count?.tests || 0}
                </p>
              </div>
              <div className="bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
                <p className="text-[10px] text-orange-600 font-bold uppercase">
                  Lifetime Commission Generated
                </p>
                <p className="text-lg font-black text-orange-700">
                  ₹
                  {Number(
                    viewingDoctor?.lifetimeCommission ||
                      viewingDoctor?.totalCommission ||
                      0,
                  ).toLocaleString()}
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
                  {viewingDoctor?.commissions?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-slate-400">
                        No referrals logged yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    viewingDoctor?.commissions?.map((comm: any) => (
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
                          ₹{Number(comm.amount || 0).toLocaleString()}
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
              {editingDoctor ? "Edit Doctor Profile" : "Add New Doctor"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <Tabs defaultValue="basic" className="w-full">
              <div className="px-6 border-b border-slate-100">
                <TabsList className="bg-slate-50/50 w-full justify-start p-0 h-auto gap-4 rounded-none">
                  <TabsTrigger
                    value="basic"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1 text-sm font-semibold">
                    Basic & Default Margins
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1 text-sm font-semibold flex items-center gap-2 text-primary">
                    Custom Test Rates{" "}
                    <Badge className="bg-indigo-100 text-primary border-none text-[10px] h-4 px-1.5">
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
                      Doctor Name *
                    </label>
                    <Input
                      placeholder="Dr. John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Specialization
                    </label>
                    <Input
                      placeholder="e.g. Cardiologist"
                      value={formData.specialization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialization: e.target.value,
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
                      Clinic / Hospital Name
                    </label>
                    <Input
                      placeholder="City Hospital"
                      value={formData.clinic}
                      onChange={(e) =>
                        setFormData({ ...formData, clinic: e.target.value })
                      }
                    />
                  </div>
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
                              ₹{Number(t.price || 0).toFixed(2)}
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
                                value={Number(cc.commissionRate || 0)}
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
                className="bg-primary hover:bg-primary/90 shadow-md"
                disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingDoctor ? "Update Profile" : "Save Doctor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
