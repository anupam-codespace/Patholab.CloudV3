"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit,
  User,
  Phone,
  ShieldCheck,
  Tag,
  Loader2,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Server Actions (Ensure you have these exported from your agency-management.ts)
import {
  getAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
} from "@/actions/agency-management";

export default function AgencyManagementPage() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [testCatalog, setTestCatalog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Date & Reporting States
  const [dateFilter, setDateFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<any | null>(null);

  const { register, handleSubmit, control, reset, watch, setValue } = useForm({
    defaultValues: {
      agencyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      panNumber: "",
      commissionRate: 0,
      commissionType: "PERCENTAGE",
      customCommissions: [] as any[],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "customCommissions",
  });
  const watchCommissionType = watch("commissionType");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agencyData, catalogRes] = await Promise.all([
        getAgencies(),
        fetch("/api/workspace/test-catalog").then((r) =>
          r.ok ? r.json() : { data: [] },
        ),
      ]);
      setAgencies(agencyData);
      setTestCatalog(catalogRes.data || catalogRes.tests || []);
    } catch (error) {
      toast.error("Failed to load agencies.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- FILTERS ---
  const filteredAgencies = agencies.filter((a) => {
    const matchesSearch =
      a.agencyName.toLowerCase().includes(search.toLowerCase()) ||
      (a.contactPerson &&
        a.contactPerson.toLowerCase().includes(search.toLowerCase()));

    let matchesDate = true;
    if (dateFilter === "CUSTOM" && startDate && endDate) {
      const created = new Date(a.createdAt);
      matchesDate =
        created >= new Date(startDate) && created <= new Date(endDate);
    }

    return matchesSearch && matchesDate;
  });

  // --- EXPORT LOGIC ---
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Agency B2B Ledger Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [
        ["Agency Name", "Contact", "Tier", "Volume (Mo)", "Total Billed / Due"],
      ],
      body: filteredAgencies.map((a) => [
        a.agencyName,
        `${a.contactPerson || "-"} \n${a.phone || ""}`,
        a.agencyTier,
        a.monthlyVolume.toString(),
        `Rs. ${a.totalCommission?.toFixed(2) || "0.00"}`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save("Agency_Report.pdf");
    toast.success("PDF Downloaded!");
  };

  const exportExcel = () => {
    const data = filteredAgencies.map((a) => ({
      "Agency Name": a.agencyName,
      "Contact Person": a.contactPerson || "-",
      Phone: a.phone || "-",
      Tier: a.agencyTier,
      "Monthly Volume": a.monthlyVolume,
      "Total Commission/Due (Rs)": a.totalCommission || 0,
      "Joined Date": new Date(a.createdAt).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agencies");
    XLSX.writeFile(wb, "Agency_Report.xlsx");
    toast.success("Excel Downloaded!");
  };

  // --- FORM LOGIC ---
  const openModal = (agency: any = null) => {
    if (agency) {
      setEditingAgency(agency);
      reset({
        agencyName: agency.agencyName,
        contactPerson: agency.contactPerson || "",
        phone: agency.phone || "",
        email: agency.email || "",
        panNumber: agency.panNumber || "",
        commissionRate: agency.commissionRate || 0,
        commissionType: agency.commissionType,
        customCommissions: agency.customTestCommissions || [],
      });
    } else {
      setEditingAgency(null);
      reset({
        agencyName: "",
        contactPerson: "",
        phone: "",
        email: "",
        panNumber: "",
        commissionRate: 0,
        commissionType: "PERCENTAGE",
        customCommissions: [],
      });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    const loadingToast = toast.loading(
      editingAgency ? "Updating Agency..." : "Adding Agency...",
    );
    try {
      if (editingAgency) await updateAgency(editingAgency.id, data);
      else await createAgency(data);

      toast.success(
        `Agency ${editingAgency ? "updated" : "created"} successfully!`,
        { id: loadingToast },
      );
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("An error occurred.", { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agency?")) return;
    try {
      await deleteAgency(id);
      toast.success("Agency deleted.");
      loadData();
    } catch (error) {
      toast.error("Failed to delete agency.");
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      {/* 🌟 TOP ACTION BAR & REPORTING */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            B2B Agencies & Tiers
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manage agency pricing, tiers, and commissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="h-10 px-3">
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-10 w-[140px] font-bold text-xs bg-slate-50">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Time</SelectItem>
              <SelectItem value="CUSTOM">Custom Dates</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "CUSTOM" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-10 text-xs w-[130px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                className="h-10 text-xs w-[130px]"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportExcel}
              className="h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportPDF}
              className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>

          <Button
            onClick={() => openModal()}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold px-5">
            <Plus className="w-4 h-4 mr-2" /> Add Agency
          </Button>
        </div>
      </div>

      {/* 🔍 SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Search by agency name or contact person..."
          className="pl-12 h-14 bg-white border-slate-200 rounded-xl text-base shadow-sm focus:border-indigo-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 📊 DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Agency Details</th>
                <th className="p-4">Tier & Volume</th>
                <th className="p-4">Base Commission</th>
                <th className="p-4">Custom Rates</th>
                <th className="p-4 text-right">Total Due / Billed</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />{" "}
                    Loading agencies...
                  </td>
                </tr>
              ) : filteredAgencies.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-400 font-medium">
                    No agencies found.
                  </td>
                </tr>
              ) : (
                filteredAgencies.map((agency) => (
                  <tr
                    key={agency.id}
                    className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-base">
                        {agency.agencyName}
                      </p>
                      <div className="flex items-center text-xs text-slate-500 mt-1 gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />{" "}
                          {agency.contactPerson || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {agency.phone || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        className={
                          agency.agencyTier === "GOLD"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : agency.agencyTier === "SILVER"
                              ? "bg-slate-200 text-slate-700 border-slate-300"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }>
                        {agency.agencyTier} TIER
                      </Badge>
                      <p className="text-xs font-bold text-slate-500 mt-1.5">
                        {agency.monthlyVolume} Patients/mo
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700 text-base">
                        {agency.commissionType === "FLAT" ? "₹" : ""}
                        {agency.commissionRate}
                        {agency.commissionType === "PERCENTAGE" ? "%" : ""}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className="font-bold text-xs bg-slate-50">
                        {agency.customTestCommissions?.length || 0} Special
                        Rates
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-emerald-600 text-lg">
                        ₹{agency.totalCommission?.toFixed(2) || "0.00"}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openModal(agency)}
                        className="text-indigo-600 hover:bg-indigo-50">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(agency.id)}
                        className="text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
          <div className="bg-slate-50 p-6 border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-black text-slate-800">
                {editingAgency ? "Edit B2B Agency" : "Register New Agency"}
              </DialogTitle>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Configure standard commissions and fixed B2B Net Prices.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
            {/* 1. Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> General Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Agency / Hospital Name *
                  </label>
                  <Input
                    {...register("agencyName", { required: true })}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Contact Person
                  </label>
                  <Input
                    {...register("contactPerson")}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Phone Number
                  </label>
                  <Input
                    {...register("phone")}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    {...register("email")}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* 2. Global Commission */}
            <div className="space-y-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                <Target className="w-4 h-4" /> Global Commission Rate
              </h3>
              <p className="text-xs text-indigo-500 font-medium mb-3">
                This rate applies to all tests unless a custom B2B Net Price is
                set below.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-900">
                    Type
                  </label>
                  <Select
                    onValueChange={(v) => setValue("commissionType", v)}
                    defaultValue={watchCommissionType}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FLAT">Flat Rate (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-900">
                    Value
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("commissionRate")}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 3. Custom B2B Rates */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Custom B2B Net Prices
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      testTemplateId: "",
                      commissionRate: null,
                      netPrice: null,
                      commissionType: "NET_PRICE",
                    })
                  }
                  className="h-8 text-xs font-bold text-indigo-600">
                  <Plus className="w-3 h-3 mr-1" /> Add Test Rule
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-medium text-sm">
                  No custom rates applied. The global commission will be used
                  for all tests.
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const cType = watch(
                      `customCommissions.${index}.commissionType`,
                    );
                    return (
                      <div
                        key={field.id}
                        className="flex flex-col md:flex-row gap-3 items-end bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex-1 w-full space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500">
                            Select Test
                          </label>
                          <Select
                            onValueChange={(v) =>
                              setValue(
                                `customCommissions.${index}.testTemplateId`,
                                v,
                              )
                            }
                            defaultValue={field.testTemplateId}>
                            <SelectTrigger className="bg-slate-50">
                              <SelectValue placeholder="Select test..." />
                            </SelectTrigger>
                            <SelectContent>
                              {testCatalog.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} ({t.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-full md:w-[150px] space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500">
                            Pricing Logic
                          </label>
                          <Select
                            onValueChange={(v) =>
                              setValue(
                                `customCommissions.${index}.commissionType`,
                                v,
                              )
                            }
                            defaultValue={field.commissionType || "NET_PRICE"}>
                            <SelectTrigger className="bg-slate-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NET_PRICE">
                                Net Price (₹)
                              </SelectItem>
                              <SelectItem value="PERCENTAGE">
                                Discount (%)
                              </SelectItem>
                              <SelectItem value="FLAT">Flat Cut (₹)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-full md:w-[120px] space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500">
                            Value
                          </label>
                          {cType === "NET_PRICE" ? (
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 150"
                              {...register(
                                `customCommissions.${index}.netPrice`,
                              )}
                              className="bg-emerald-50 border-emerald-200 font-bold text-emerald-700"
                            />
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 20"
                              {...register(
                                `customCommissions.${index}.commissionRate`,
                              )}
                              className="bg-indigo-50 border-indigo-200 font-bold text-indigo-700"
                            />
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-rose-500 hover:bg-rose-50 mb-0.5 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="font-bold">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 shadow-md">
                {editingAgency ? "Save Changes" : "Register Agency"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
