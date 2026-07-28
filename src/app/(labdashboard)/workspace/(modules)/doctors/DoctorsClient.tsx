"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "@/actions/doctor-management";
import { getTests } from "@/actions/test-catalog";

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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Microscope,
  UserPlus,
  ChevronRight,
  Target,
  Activity,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

export default function DoctorsClient() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Modals State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [viewingDoctor, setViewingDoctor] = useState<any>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    clinic: "",
    commissionRate: 0,
    commissionType: "PERCENTAGE",
  });

  const [customCommissions, setCustomCommissions] = useState<any[]>([]);
  const [testSearch, setTestSearch] = useState("");

  /** 🔒 RULE 1: PRESERVE ALL LOGIC */
  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => await getDoctors(),
  });

  const { data: allTests } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => await getTests(),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
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
    setCustomCommissions([]);
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
      commissionRate: doc.commissionRate || 0,
      commissionType: doc.commissionType,
    });
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
    saveMutation.mutate({
      ...formData,
      commissionRate: Number(formData.commissionRate),
      customCommissions: customCommissions,
    });
  };

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
    setTestSearch("");
  };

  const updateCustomRate = (index: number, field: string, value: any) => {
    const updated = [...customCommissions];
    updated[index][field] = value;
    setCustomCommissions(updated);
  };

  const removeCustomRate = (index: number) => {
    setCustomCommissions(customCommissions.filter((_, i) => i !== index));
  };

  const filteredDoctors =
    doctors?.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm),
    ) || [];

  /** 🎨 RULE 2: REIMAGINED UI */
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 p-4 md:p-8 lg:p-12 font-sans selection:bg-indigo-100">
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800">
            <Stethoscope className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
              Network Management
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Referral{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Partners
            </span>
          </h1>
          <p className="text-slate-500 font-medium italic">
            patholab.cloud — Managing B2B Physician Relations
          </p>
        </div>

        <Button
          onClick={handleAddNew}
          className="h-14 px-8 bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 group">
          <UserPlus className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-lg">Add New Doctor</span>
        </Button>
      </header>

      {/* SEARCH & FILTER BAR */}
      <div className="mb-8 relative max-w-xl group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input
          type="text"
          placeholder="Search by name, specialization, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-14 pl-12 pr-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-2xl text-lg focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-medium placeholder:text-slate-300"
        />
      </div>

      {/* MAIN TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
              <TableRow className="border-none">
                <TableHead className="py-6 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">
                  Physician Profile
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">
                  Contact & Clinic
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">
                  Commission Engine
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">
                  Performance
                </TableHead>
                <TableHead className="text-right px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-24 text-slate-400 italic font-medium">
                    Accessing physician registry...
                  </TableCell>
                </TableRow>
              ) : filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-24 text-slate-400 italic font-medium">
                    No partners found in this segment.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDoctors.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="group border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                          <Stethoscope className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 dark:text-white tracking-tight">
                            {doc.name}
                          </div>
                          <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                            {doc.specialization || "General Practice"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Phone className="h-3 w-3 opacity-30" />{" "}
                          {doc.phone || "N/A"}
                        </div>
                        <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
                          <MapPin className="h-3 w-3 opacity-30" />{" "}
                          {doc.clinic || "Private Clinic"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <Badge
                          variant="outline"
                          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-7 px-3 text-[10px] font-black uppercase tracking-tighter">
                          {doc.commissionType === "PERCENTAGE" ? (
                            <Percent className="h-3 w-3 mr-1.5 text-indigo-500" />
                          ) : (
                            <IndianRupee className="h-3 w-3 mr-1.5 text-emerald-500" />
                          )}
                          {doc.commissionRate}{" "}
                          {doc.commissionType === "PERCENTAGE" ? "%" : "Flat"}{" "}
                          (Global)
                        </Badge>
                        {doc.customTestCommissions?.length > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-tighter border border-amber-100 dark:border-amber-900/40">
                            <Zap className="w-2.5 h-2.5" />
                            {doc.customTestCommissions.length} Override Rules
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-black text-slate-900 dark:text-white tabular-nums text-sm">
                          {doc._count?.tests || 0} Cases
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter italic">
                          Yield: ₹{(doc as any).totalCommission?.toFixed(0)}
                        </div>
                      </div>
                    </TableCell>    
                    <TableCell className="px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(doc)}
                          className="h-10 w-10 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(doc)}
                          className="h-10 w-10 rounded-xl text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                          className="h-10 w-10 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all">
                          <Trash2 className="h-5 w-5" />
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

      {/* VIEW MODAL (Ledger) */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl p-0 bg-white dark:bg-slate-950 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-slate-900 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 bg-white/10 text-indigo-400 rounded-[22px] flex items-center justify-center shadow-inner">
                <Stethoscope className="h-8 w-8" />
              </div>
              <div>
                <DialogTitle className="text-white text-2xl font-black tracking-tight">
                  {viewingDoctor?.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">
                  {viewingDoctor?.specialization} • {viewingDoctor?.clinic}
                </DialogDescription>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">
                  Total Cases
                </p>
                <p className="text-xl font-black text-white tabular-nums">
                  {viewingDoctor?._count?.tests || 0}
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl backdrop-blur-md">
                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">
                  Lifetime Yield
                </p>
                <p className="text-xl font-black text-emerald-400 tabular-nums">
                  ₹{viewingDoctor?.totalCommission?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                Transaction Ledger
              </h3>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">
                      Timestamp
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">
                      Subject
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">
                      Investigation
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">
                      Margin
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingDoctor?.commissions?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-20 text-slate-400 italic">
                        No activity logs recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    viewingDoctor?.commissions?.map((comm: any) => (
                      <TableRow
                        key={comm.id}
                        className="border-slate-50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="text-[11px] font-bold text-slate-400 tabular-nums py-4">
                          {new Date(comm.test.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-black text-sm text-slate-800 dark:text-slate-200">
                          {comm.test.patient?.name || "Anonymous"}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-400">
                            {comm.test.testName}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 uppercase">
                            {comm.test.testNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 dark:text-white tabular-nums">
                          ₹{comm.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {comm.status === "PAID" ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Settled
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[9px] font-black uppercase">
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

      {/* ADD / EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 bg-white dark:bg-slate-950 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-indigo-600 p-8 flex items-center gap-5">
            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center text-white">
              <UserPlus className="h-7 w-7" />
            </div>
            <div>
              <DialogTitle className="text-white text-2xl font-black tracking-tight">
                {editingDoctor ? "Modify Profile" : "Partner Onboarding"}
              </DialogTitle>
              <p className="text-indigo-100 text-xs font-medium">
                Configure identity and financial override rules.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <Tabs defaultValue="basic" className="w-full">
              <div className="px-8 border-b border-slate-100 dark:border-slate-800">
                <TabsList className="bg-transparent w-full justify-start p-0 h-auto gap-8 rounded-none">
                  <TabsTrigger
                    value="basic"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent py-4 px-1 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600">
                    Identity & Core Rules
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent py-4 px-1 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600 flex items-center gap-2">
                    Custom Margins{" "}
                    <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px] h-4 px-1.5">
                      {customCommissions.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: BASIC */}
              <TabsContent value="basic" className="p-8 space-y-6 m-0">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Legal Name *
                    </Label>
                    <Input
                      placeholder="Dr. John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Specialization
                    </Label>
                    <Input
                      placeholder="e.g. Oncology"
                      value={formData.specialization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialization: e.target.value,
                        })
                      }
                      className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Primary Contact
                    </Label>
                    <Input
                      placeholder="+91 0000000000"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Clinic Entity
                    </Label>
                    <Input
                      placeholder="LifeCare Diagnostics"
                      value={formData.clinic}
                      onChange={(e) =>
                        setFormData({ ...formData, clinic: e.target.value })
                      }
                      className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-[24px] space-y-5 text-white">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Global Profile Default
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Rule Type
                      </Label>
                      <Select
                        value={formData.commissionType}
                        onValueChange={(v) =>
                          setFormData({ ...formData, commissionType: v })
                        }>
                        <SelectTrigger className="h-11 bg-white/10 border-white/10 text-white rounded-xl font-bold uppercase text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem
                            value="PERCENTAGE"
                            className="text-[10px] font-black uppercase">
                            Percentage (%)
                          </SelectItem>
                          <SelectItem
                            value="FIXED"
                            className="text-[10px] font-black uppercase">
                            Flat Rate (₹)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Global Margin
                      </Label>
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
                        className="h-11 bg-white/10 border-white/10 text-white rounded-xl font-black text-lg text-center"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: CUSTOM */}
              <TabsContent
                value="custom"
                className="p-8 space-y-6 m-0 h-[420px] flex flex-col">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <Input
                    placeholder="Search investigations to set override rules..."
                    className="h-14 pl-12 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold placeholder:text-slate-300"
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                  />
                  {testSearch && (
                    <div className="absolute top-16 left-0 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-50 p-2 custom-scrollbar">
                      {allTests
                        ?.filter((t: any) =>
                          t.name
                            .toLowerCase()
                            .includes(testSearch.toLowerCase()),
                        )
                        .slice(0, 8)
                        .map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => addCustomTestRate(t)}
                            className="p-4 text-sm rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer flex justify-between items-center group/item transition-colors">
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {t.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter tabular-nums">
                                List: ₹{t.price}
                              </span>
                              <Plus className="w-4 h-4 text-indigo-500 opacity-0 group-hover/item:opacity-100 transition-all" />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 border border-slate-100 dark:border-slate-800 rounded-[24px] bg-slate-50 dark:bg-slate-900/50 overflow-hidden shadow-inner">
                  <Table>
                    <TableHeader className="bg-white/50 dark:bg-slate-800/50">
                      <TableRow className="border-none">
                        <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 px-6">
                          Investigation
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 w-32">
                          Rule Type
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 w-28 text-right">
                          Margin
                        </TableHead>
                        <TableHead className="h-10 w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customCommissions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-20 text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">
                            No custom overrides active.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customCommissions.map((cc, index) => (
                          <TableRow
                            key={index}
                            className="border-slate-100 dark:border-slate-800">
                            <TableCell className="font-bold text-xs px-6 py-4 text-slate-700 dark:text-slate-300">
                              {cc.testName}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={cc.commissionType}
                                onValueChange={(v) =>
                                  updateCustomRate(index, "commissionType", v)
                                }>
                                <SelectTrigger className="h-9 text-[10px] font-black uppercase bg-white dark:bg-slate-800 border-none rounded-lg shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                  <SelectItem
                                    value="PERCENTAGE"
                                    className="text-[10px] font-black uppercase">
                                    Percentage (%)
                                  </SelectItem>
                                  <SelectItem
                                    value="FIXED"
                                    className="text-[10px] font-black uppercase">
                                    Flat Rate (₹)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-9 text-xs font-black text-right bg-white dark:bg-slate-800 border-none rounded-lg shadow-sm tabular-nums"
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
                                className="h-8 w-8 text-slate-300 hover:text-red-600 transition-colors">
                                <Trash2 className="h-4 h-4" />
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

            <div className="flex justify-end gap-3 p-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="h-12 px-6 rounded-2xl font-bold text-slate-400">
                Discard Changes
              </Button>
              <Button
                type="submit"
                className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none transition-all"
                disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                {editingDoctor ? "Authorize Updates" : "Confirm Onboarding"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
