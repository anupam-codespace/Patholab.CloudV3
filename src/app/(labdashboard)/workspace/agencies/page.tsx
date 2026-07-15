"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
} from "@/actions/agency-management";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Download,
  RefreshCw,
  FileSpreadsheet,
  Key,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

// Export Libraries
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Date Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [editingAgency, setEditingAgency] = useState<any>(null);
  const [viewingAgency, setViewingAgency] = useState<any>(null);

  // Form States (Now includes Portal Login Details)
  const [formData, setFormData] = useState({
    agencyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    panNumber: "",
    agencyTier: "STANDARD",
    commissionRate: 0,
    commissionType: "PERCENTAGE",
    // Portal Access Fields
    createLogin: false,
    loginEmail: "",
    loginPassword: "",
  });

  // Custom Test Commissions (Net Prices)
  const [customCommissions, setCustomCommissions] = useState<any[]>([]);
  const [testSearch, setTestSearch] = useState("");

  // Queries
  const {
    data: agencies,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["agencies", dateFrom, dateTo],
    queryFn: async () => await getAgencies({ from: dateFrom, to: dateTo }),
  });

  const { data: allTests } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => await getTests(),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
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
    onError: (error: any) =>
      toast.error(error.message || "Failed to save agency details."),
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
      agencyTier: "STANDARD",
      commissionRate: 5,
      commissionType: "PERCENTAGE",
      createLogin: false,
      loginEmail: "",
      loginPassword: "",
    });
    setCustomCommissions([]);
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
      agencyTier: agency.agencyTier || "STANDARD",
      commissionRate: Number(agency.commissionRate || 0),
      commissionType: agency.commissionType,
      // If they already have a user attached, we can pre-fill the intent
      createLogin: !!agency.user,
      loginEmail: agency.user?.email || "",
      loginPassword: "", // Never show existing passwords
    });
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
        "Are you sure you want to delete this agency? Historical data will be retained for accounting.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyName) return toast.error("Agency name is required");

    // Validate Login Details if enabled
    if (formData.createLogin) {
      if (!formData.loginEmail) return toast.error("Portal Email is required");
      if (!editingAgency && !formData.loginPassword)
        return toast.error("Password is required for new portal accounts");
    }

    saveMutation.mutate({
      ...formData,
      commissionRate: Number(formData.commissionRate),
      customCommissions: customCommissions.map((c) => ({
        ...c,
        commissionRate:
          c.commissionType === "NET_PRICE" ? null : Number(c.commissionRate),
        netPrice: c.commissionType === "NET_PRICE" ? Number(c.netPrice) : null,
      })),
    });
  };

  // Custom Rate Controls
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
        netPrice: test.price,
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

  // EXPORT FUNCTIONS
  const exportToExcel = () => {
    if (!agencies || agencies.length === 0)
      return toast.error("No data to export");
    const exportData = agencies.map((a: any) => ({
      "Agency Name": a.agencyName,
      Tier: a.agencyTier || "Standard",
      "Contact Person": a.contactPerson || "-",
      Phone: a.phone || "-",
      "Portal Access": a.user ? "Yes" : "No",
      "Commission Rule": `${Number(a.commissionRate || 0)} ${a.commissionType === "PERCENTAGE" ? "%" : "Flat"}`,
      "Total Referrals": a._count?.tests || 0,
      "Lifetime Commission (Rs)": Number(
        a.lifetimeCommission || a.totalCommission || 0,
      ),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agencies");
    XLSX.writeFile(workbook, "B2B_Agencies_Report.xlsx");
  };

  const exportToPDF = () => {
    if (!agencies || agencies.length === 0)
      return toast.error("No data to export");
    const doc = new jsPDF();
    doc.text("B2B Agencies Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableData = agencies.map((a: any) => [
      a.agencyName,
      a.agencyTier || "Standard",
      a.phone || "-",
      `${Number(a.commissionRate || 0)} ${a.commissionType === "PERCENTAGE" ? "%" : "Flat"}`,
      a._count?.tests || 0,
      `Rs. ${Number(a.lifetimeCommission || a.totalCommission || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 28,
      head: [
        [
          "Agency Name",
          "Tier",
          "Phone",
          "Default Margin",
          "Referrals",
          "Commission Generated",
        ],
      ],
      body: tableData,
      theme: "grid",
    });

    doc.save("Agencies_Report.pdf");
  };

  const filteredAgencies =
    agencies?.filter(
      (a: any) =>
        a.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.phone?.includes(searchTerm),
    ) || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER & EXPORT CONTROLS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            B2B Agencies & Wallets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your network, tier settings, and agency portal access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center bg-slate-50 border rounded-lg px-2 shadow-sm mr-2">
            <Input
              type="date"
              className="border-0 bg-transparent text-xs h-9 w-[130px] shadow-none focus-visible:ring-0"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-slate-400 text-xs">to</span>
            <Input
              type="date"
              className="border-0 bg-transparent text-xs h-9 w-[130px] shadow-none focus-visible:ring-0"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Refresh Data">
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button
            variant="outline"
            onClick={exportToPDF}
            className="text-red-700 border-red-200 hover:bg-red-50">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md ml-2">
            <Plus className="h-4 w-4 mr-2" /> Add Agency
          </Button>
        </div>
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
                  Tier & Access
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
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />{" "}
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
                            <Phone className="h-3 w-3 inline mr-1" />
                            {agency.phone || "N/A"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        <Badge
                          variant="outline"
                          className={`
                          ${agency.agencyTier === "GOLD" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : ""}
                          ${agency.agencyTier === "SILVER" ? "bg-slate-100 text-slate-600 border-slate-300" : ""}
                          ${agency.agencyTier === "PLATINUM" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : ""}
                          ${!agency.agencyTier || agency.agencyTier === "STANDARD" ? "bg-gray-50 text-gray-600" : ""}
                        `}>
                          {agency.agencyTier || "STANDARD"}
                        </Badge>
                        {agency.user && (
                          <span className="text-[10px] flex items-center text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Portal
                            Active
                          </span>
                        )}
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
                          {Number(agency.commissionRate || 0)}{" "}
                          {agency.commissionType === "PERCENTAGE"
                            ? "%"
                            : "Flat"}{" "}
                          (Default)
                        </span>
                        {agency.customTestCommissions?.length > 0 && (
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {agency.customTestCommissions.length} Custom/Net
                            Prices
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800">
                        {agency._count?.tests || 0} Tests
                      </div>
                      <div className="text-xs text-slate-500 font-bold text-orange-600">
                        Generated: ₹
                        {Number(
                          agency.lifetimeCommission ||
                            agency.totalCommission ||
                            0,
                        ).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(agency)}
                          className="text-slate-400 hover:text-indigo-600">
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

      {/* ADD / EDIT MODAL WITH TABS */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
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
                    Basic Profile & Tiers
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-3 px-1 text-sm font-semibold flex items-center gap-2 text-indigo-600">
                    B2B Net Prices & Custom Rates
                    <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px] h-4 px-1.5">
                      {customCommissions.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: BASIC PROFILE */}
              <TabsContent
                value="basic"
                className="p-6 pt-4 space-y-4 m-0 h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-2">
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
                      Agency Tier
                    </label>
                    <Select
                      value={formData.agencyTier}
                      onValueChange={(v) =>
                        setFormData({ ...formData, agencyTier: v })
                      }>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="BRONZE">Bronze</SelectItem>
                        <SelectItem value="SILVER">Silver</SelectItem>
                        <SelectItem value="GOLD">Gold</SelectItem>
                        <SelectItem value="PLATINUM">Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </div>

                {/* ✅ NEW: PARTNER PORTAL ACCESS */}
                <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <Key className="w-4 h-4 text-indigo-600" /> Partner
                        Portal Login
                      </h3>
                      <p className="text-xs text-indigo-700/70 mt-1">
                        Allow this agency to log in and download their own
                        reports.
                      </p>
                    </div>
                    <Switch
                      checked={formData.createLogin}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          createLogin: checked,
                          // Auto-fill login email with primary email if empty
                          loginEmail:
                            checked && !formData.loginEmail
                              ? formData.email
                              : formData.loginEmail,
                        });
                      }}
                    />
                  </div>

                  {formData.createLogin && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-indigo-100/50">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-indigo-900">
                          Login Email *
                        </Label>
                        <Input
                          type="email"
                          placeholder="login@agency.com"
                          value={formData.loginEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              loginEmail: e.target.value,
                            })
                          }
                          className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-indigo-900">
                          {editingAgency && editingAgency.user
                            ? "Reset Password (Optional)"
                            : "Password *"}
                        </Label>
                        <Input
                          type="text"
                          placeholder={
                            editingAgency && editingAgency.user
                              ? "Leave blank to keep current"
                              : "Secure password"
                          }
                          value={formData.loginPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              loginPassword: e.target.value,
                            })
                          }
                          className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 mt-4">
                  <h3 className="text-sm font-bold text-slate-800">
                    Profile Default Commission
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase">
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
                      <label className="text-xs font-semibold text-slate-500 uppercase">
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
                  <p className="text-[11px] text-slate-500">
                    This is the fallback rate. If a test does not have a
                    specific custom rate assigned, this default rule applies.
                  </p>
                </div>
              </TabsContent>

              {/* TAB 2: CUSTOM TEST RATES & NET PRICES */}
              <TabsContent
                value="custom"
                className="p-6 pt-4 space-y-4 m-0 h-[60vh] overflow-y-auto">
                <div className="relative z-10">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search to add a specific test for custom pricing..."
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
                        <TableHead className="text-xs font-bold h-9 w-36">
                          Pricing Rule Type
                        </TableHead>
                        <TableHead className="text-xs font-bold h-9 w-32">
                          Value
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
                                    Commission (%)
                                  </SelectItem>
                                  <SelectItem value="FIXED">
                                    Commission (Flat ₹)
                                  </SelectItem>
                                  <SelectItem value="NET_PRICE">
                                    B2B Net Price (₹)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                className={`h-8 text-xs font-bold ${cc.commissionType === "NET_PRICE" ? "border-blue-300 bg-blue-50 text-blue-800" : ""}`}
                                value={
                                  cc.commissionType === "NET_PRICE"
                                    ? cc.netPrice || 0
                                    : cc.commissionRate || 0
                                }
                                onChange={(e) =>
                                  updateCustomRate(
                                    index,
                                    cc.commissionType === "NET_PRICE"
                                      ? "netPrice"
                                      : "commissionRate",
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

      {/* VIEW AGENCY MODAL */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-lg font-bold">
                  {viewingAgency?.agencyName}
                </div>
                <div className="text-xs text-slate-500">
                  {viewingAgency?.agencyTier || "Standard"} Tier
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold uppercase">
                  Tests
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {viewingAgency?._count?.tests || 0}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold uppercase">
                  Patients
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {viewingAgency?._count?.patients || 0}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-600 font-semibold uppercase">
                  Commission
                </p>
                <p className="text-xl font-bold text-orange-700">
                  ₹
                  {Number(
                    viewingAgency?.lifetimeCommission ||
                      viewingAgency?.totalCommission ||
                      0,
                  ).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Contact:</span>
                <span className="font-medium ml-2">
                  {viewingAgency?.contactPerson || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Phone:</span>
                <span className="font-medium ml-2">
                  {viewingAgency?.phone || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <span className="font-medium ml-2">
                  {viewingAgency?.email || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Commission:</span>
                <span className="font-medium ml-2">
                  {Number(viewingAgency?.commissionRate || 0)}{" "}
                  {viewingAgency?.commissionType === "PERCENTAGE"
                    ? "%"
                    : "Flat"}
                </span>
              </div>
            </div>

            {/* Custom Rates */}
            {viewingAgency?.customTestCommissions?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">
                  Custom B2B Rates
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {viewingAgency.customTestCommissions.map(
                    (cc: any, i: number) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs bg-slate-50 px-3 py-2 rounded">
                        <span className="font-medium">{cc.testName}</span>
                        <span className="text-slate-600">
                          {cc.netPrice
                            ? `₹${Number(cc.netPrice).toFixed(2)} (Net)`
                            : `${Number(cc.commissionRate || 0)} ${cc.commissionType === "PERCENTAGE" ? "%" : "Flat"}`}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Recent Commissions */}
            {viewingAgency?.commissions?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">
                  Recent Commissions
                </h4>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Patient</TableHead>
                        <TableHead className="text-xs">Test</TableHead>
                        <TableHead className="text-xs text-right">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingAgency.commissions
                        .slice(0, 10)
                        .map((comm: any) => (
                          <TableRow key={comm.id}>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(comm.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {comm.test?.patient?.name || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {comm.test?.testName || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-orange-600">
                              ₹{Number(comm.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              <Badge
                                variant="outline"
                                className={
                                  comm.status === "PAID"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-orange-50 text-orange-700"
                                }>
                                {comm.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
