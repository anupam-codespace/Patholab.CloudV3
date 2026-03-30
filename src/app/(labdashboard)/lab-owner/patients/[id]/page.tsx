"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPatientFullDetails,
  updatePatientDetails,
} from "@/actions/patient-details";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Activity,
  Save,
  Edit2,
  X,
  AlertCircle,
  FlaskConical,
  BadgeIndianRupee,
  History,
  Droplet,
  Receipt,
  Hash,
  Loader2,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // 1. Fetch Data
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatientFullDetails(patientId),
  });

  // 2. Initialize Form Data
  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name,
        phone: patient.phone,
        email: patient.email || "",
        age: patient.age,
        ageUnit: patient.ageUnit || "Years",
        gender: patient.gender,
        address: patient.address || "",
        bloodGroup: patient.bloodGroup || "",
        srfId: patient.srfId || "",
        passportNumber: patient.passportNumber || "",
        medicalHistory: patient.medicalHistory || {},
      });
    }
  }, [patient]);

  // 3. Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) =>
      await updatePatientDetails(patientId, data),
    onSuccess: () => {
      toast.success("Patient details updated successfully.");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
    },
    onError: (error: any) =>
      toast.error(error.message || "Failed to update patient details."),
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          Loading patient profile...
        </p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Patient Not Found</h2>
        <p className="text-slate-500 mb-6">
          The requested patient record does not exist or has been removed.
        </p>
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  // Generate Initials for Avatar
  const initials = patient.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 relative pb-10">
      {/* Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* --- FLOATING HEADER --- */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-full hover:bg-slate-100 text-slate-500 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-inner text-white font-bold text-lg shrink-0">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight flex items-center gap-2">
                  {patient.name}
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold tracking-wider ${patient.gender === "MALE" ? "bg-blue-50 text-blue-700 border-blue-200" : patient.gender === "FEMALE" ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}
                  >
                    {patient.gender}
                  </Badge>
                </h1>
                <p className="text-xs font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider mt-0.5">
                  PID:{" "}
                  <span className="font-mono text-indigo-600 font-bold">
                    {patient.patientId}
                  </span>
                  <span className="text-slate-300">•</span>
                  Reg: {format(new Date(patient.createdAt), "dd MMM yyyy")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({ ...patient });
                  }}
                  className="flex-1 sm:flex-none text-slate-500 hover:text-slate-700 hover:bg-slate-100 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold h-11 rounded-xl shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full sm:w-auto h-11 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium transition-colors"
              >
                <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: IDENTITY & CLINICAL SIDEBAR (Spans 4) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <CardTitle className="text-sm font-semibold text-slate-800 tracking-wide uppercase flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-500" /> Core Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* LOCKED FIELDS (Visual distinction for security) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Full Name
                    </Label>
                    <p className="text-sm font-semibold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm opacity-70 cursor-not-allowed">
                      {formData.name}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> Verified Phone
                    </Label>
                    <p className="text-sm font-semibold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm opacity-70 cursor-not-allowed font-mono">
                      {formData.phone}
                    </p>
                  </div>
                </div>

                {/* EDITABLE FIELDS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Age
                    </Label>
                    <Input
                      type="number"
                      value={formData.age}
                      onChange={(e) =>
                        setFormData({ ...formData, age: e.target.value })
                      }
                      disabled={!isEditing}
                      className={`h-11 rounded-xl transition-colors ${isEditing ? "bg-white border-indigo-200 focus:ring-indigo-500/20" : "bg-slate-50 border-transparent text-slate-700"}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Unit
                    </Label>
                    <Select
                      value={formData.ageUnit}
                      onValueChange={(v) =>
                        setFormData({ ...formData, ageUnit: v })
                      }
                      disabled={!isEditing}
                    >
                      <SelectTrigger
                        className={`h-11 rounded-xl transition-colors ${isEditing ? "bg-white border-indigo-200 focus:ring-indigo-500/20" : "bg-slate-50 border-transparent text-slate-700"}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Years">Years</SelectItem>
                        <SelectItem value="Months">Months</SelectItem>
                        <SelectItem value="Days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-3.5 h-4 w-4 transition-colors ${isEditing ? "text-indigo-400" : "text-slate-400"}`}
                    />
                    <Input
                      className={`h-11 pl-10 rounded-xl transition-colors ${isEditing ? "bg-white border-indigo-200 focus:ring-indigo-500/20" : "bg-slate-50 border-transparent text-slate-700"}`}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="patient@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Home Address
                  </Label>
                  <div className="relative">
                    <MapPin
                      className={`absolute left-3 top-3 h-4 w-4 transition-colors ${isEditing ? "text-indigo-400" : "text-slate-400"}`}
                    />
                    <Textarea
                      className={`pl-10 min-h-[80px] py-3 rounded-xl resize-none transition-colors ${isEditing ? "bg-white border-indigo-200 focus:ring-indigo-500/20" : "bg-slate-50 border-transparent text-slate-700"}`}
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="Street, City, Zip..."
                    />
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-4" />

                {/* IDs & Clinical Baseline (Fixed: Now actually rendered) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Droplet className="h-3 w-3 text-red-500" /> Blood Grp
                    </Label>
                    <Select
                      value={formData.bloodGroup || "UNKNOWN"}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          bloodGroup: v === "UNKNOWN" ? "" : v,
                        })
                      }
                      disabled={!isEditing}
                    >
                      <SelectTrigger
                        className={`h-11 rounded-xl font-bold transition-colors ${isEditing ? "bg-white border-indigo-200 focus:ring-indigo-500/20" : "bg-slate-50 border-transparent text-slate-700"}`}
                      >
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNKNOWN">Unknown</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      SRF ID
                    </Label>
                    <Input
                      className={`h-11 font-mono text-sm rounded-xl transition-colors ${isEditing ? "bg-white border-indigo-200 focus:ring-indigo-500/20" : "bg-slate-50 border-transparent text-slate-700"}`}
                      value={formData.srfId}
                      onChange={(e) =>
                        setFormData({ ...formData, srfId: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="-"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Passport No.
                  </Label>
                  <Input
                    className={`h-11 font-mono text-sm rounded-xl transition-colors ${isEditing ? "bg-white border-indigo-200 focus:ring-indigo-500/20" : "bg-slate-50 border-transparent text-slate-700"}`}
                    value={formData.passportNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passportNumber: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                    placeholder="-"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: WORKFLOW TABS (Spans 8) */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs defaultValue="tests" className="w-full">
              {/* Premium Pill Tabs */}
              <div className="bg-slate-100/80 p-1.5 rounded-2xl inline-flex w-full sm:w-auto shadow-inner border border-slate-200/50 mb-6">
                <TabsList className="grid w-full sm:w-[500px] grid-cols-3 bg-transparent p-0 gap-1 h-auto">
                  <TabsTrigger
                    value="tests"
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm font-semibold transition-all text-slate-500"
                  >
                    <Activity className="h-4 w-4 mr-2" /> Tests
                  </TabsTrigger>
                  <TabsTrigger
                    value="billing"
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm font-semibold transition-all text-slate-500"
                  >
                    <Receipt className="h-4 w-4 mr-2" /> Billing
                  </TabsTrigger>
                  <TabsTrigger
                    value="samples"
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm font-semibold transition-all text-slate-500"
                  >
                    <FlaskConical className="h-4 w-4 mr-2" /> Samples
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: TEST HISTORY */}
              <TabsContent
                value="tests"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-white px-6 py-5">
                    <CardTitle className="text-base font-bold text-slate-800">
                      Laboratory History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {patient.tests?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <History className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">
                          No Tests Found
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                          This patient has not been registered for any tests
                          yet.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {patient.tests?.map((test: any) => (
                          <div
                            key={test.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-50/50 transition-colors gap-4"
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className={`p-3 rounded-xl shrink-0 ${test.status === "APPROVED" ? "bg-emerald-100 text-emerald-600" : test.status === "COMPLETED" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}
                              >
                                <Activity className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 leading-tight">
                                  {test.testName}{" "}
                                  <span className="text-xs font-mono font-normal text-slate-400 ml-1">
                                    [{test.testCode}]
                                  </span>
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />{" "}
                                    {format(
                                      new Date(test.createdAt),
                                      "dd MMM yyyy, HH:mm",
                                    )}
                                  </span>
                                  <span className="text-slate-300 hidden sm:inline">
                                    •
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Stethoscope className="h-3 w-3" /> Ref:{" "}
                                    {test.doctor?.user?.name || "Self"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                              <Badge
                                className={`px-2.5 py-1 uppercase tracking-wider text-[10px] font-bold ${
                                  test.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"
                                    : test.status === "COMPLETED"
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"
                                }`}
                              >
                                {test.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() =>
                                  router.push(
                                    `/lab-owner/workflow/results/${patient.id}`,
                                  )
                                }
                              >
                                View Results{" "}
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: BILLING & INVOICES */}
              <TabsContent
                value="billing"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-white px-6 py-5">
                    <CardTitle className="text-base font-bold text-slate-800">
                      Financial History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {patient.invoices?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <Receipt className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">
                          No Invoices
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                          No billing records exist for this patient.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {patient.invoices?.map((inv: any) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200/60">
                                <BadgeIndianRupee className="h-5 w-5 text-slate-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 font-mono">
                                  #{inv.invoiceNumber}
                                </p>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                  {format(
                                    new Date(inv.createdAt),
                                    "dd MMM yyyy",
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right hidden sm:block">
                                <p className="text-base font-black text-slate-900">
                                  ₹{inv.grandTotal?.toFixed(2)}
                                </p>
                                <p
                                  className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${inv.status === "PAID" ? "text-emerald-600" : "text-red-500"}`}
                                >
                                  • {inv.status}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg border-slate-200 text-slate-600"
                                onClick={() =>
                                  router.push(`/lab-owner/billing/${inv.id}`)
                                }
                              >
                                Receipt
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: SAMPLES */}
              <TabsContent
                value="samples"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-white px-6 py-5">
                    <CardTitle className="text-base font-bold text-slate-800">
                      Specimen Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!patient.samples || patient.samples.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <FlaskConical className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">
                          No Samples Logged
                        </h3>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {patient.samples?.map((sample: any) => (
                          <div
                            key={sample.id}
                            className="flex items-center p-5 hover:bg-slate-50/50 transition-colors gap-4"
                          >
                            <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                              <FlaskConical className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {sample.sampleType}
                              </p>
                              <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                                <Hash className="h-3 w-3" /> {sample.sampleId}
                                <span className="text-slate-300">•</span>
                                Tube: {sample.containerType || "N/A"}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`shrink-0 uppercase tracking-wider text-[10px] font-bold ${
                                sample.status === "COLLECTED"
                                  ? "border-blue-200 text-blue-700 bg-blue-50"
                                  : sample.status === "RECEIVED"
                                    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                                    : sample.status === "REJECTED"
                                      ? "border-red-200 text-red-700 bg-red-50"
                                      : "border-slate-200 text-slate-600"
                              }`}
                            >
                              {sample.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
