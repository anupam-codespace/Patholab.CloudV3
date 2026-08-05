"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import {
  User,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  ScanLine,
  Camera,
  ChevronRight,
  Save,
  Search,
  X,
  Loader2,
  Mail,
  Stethoscope,
  Building2,
  Clock,
  Hash,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- VALIDATION SCHEMA (Fixed: Removed .default() to prevent TS Type Collisions) ---
const patientSchema = z.object({
  title: z.string(),
  name: z.string().min(2, "Name is required"),
  age: z.coerce.number().min(0, "Age required"),
  ageUnit: z.enum(["Years", "Months", "Days"]),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().optional(),

  // Contact
  phone: z.string().min(10, "Invalid Phone").max(10),
  email: z.string().optional().or(z.literal("")),
  address: z.string().optional(),

  // Referral
  doctorId: z.string().optional(),
  agencyId: z.string().optional(),

  // IDs
  abhaNumber: z.string().optional(),
  passport: z.string().optional(),
  srfId: z.string().optional(),

  // Collection
  collectionDate: z.string(),
  collectionTime: z.string(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- REACT HOOK FORM (Initialization handles the defaults now) ---
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      title: "Mr.",
      ageUnit: "Years",
      gender: "MALE",
      collectionDate: format(new Date(), "yyyy-MM-dd"),
      collectionTime: format(new Date(), "HH:mm"),
      doctorId: "Self",
      agencyId: "Direct",
    },
  });

  // --- 1. FETCH EXISTING DATA ---
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/workspace/patients/${patientId}`);
        if (!res.ok) throw new Error("Failed to load patient");

        const json = await res.json();
        const data = json.data;

        form.reset({
          title: data.title || "Mr.",
          name: data.name,
          age: data.age,
          ageUnit: data.ageUnit || "Years",
          gender: data.gender,
          phone: data.phone,
          email: data.email || "",
          address: data.address || "",
          doctorId: data.doctorId || "Self",
          agencyId: data.agencyId || "Direct",
          abhaNumber: data.abhaNumber || "",
          passport: data.passport || "",
          srfId: data.srfId || "",
          collectionDate: data.collectionDate
            ? format(new Date(data.collectionDate), "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
          collectionTime: data.collectionTime || format(new Date(), "HH:mm"),
        });
      } catch (error) {
        toast.error("Could not load patient details");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    if (patientId) fetchPatient();
  }, [patientId, form, router]);

  // --- AUTO CALCULATION LOGIC ---
  const { watch, setValue } = form;
  const watchedDob = watch("dob");
  const watchedAge = watch("age");

  useEffect(() => {
    if (watchedDob) {
      const age = differenceInYears(new Date(), new Date(watchedDob));
      if (age !== watchedAge) setValue("age", age);
    }
  }, [watchedDob]);

  // --- 2. SUBMIT HANDLER (PATCH) ---
  const onSubmit = async (data: PatientFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to update");
      }

      toast.success("Patient Updated Successfully!");
      router.back();
    } catch (error: any) {
      toast.error(error.message || "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-muted/30">
        <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading patient record...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col font-sans selection:bg-indigo-100 relative">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* --- FLOATING HEADER --- */}
      <header className="sticky top-0 z-30 bg-card/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-primary rounded-xl flex items-center justify-center shadow-inner">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
                Edit Patient
              </h1>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wider mt-0.5">
                ID:{" "}
                <span className="font-mono text-primary font-bold">
                  {patientId}
                </span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-muted text-muted-foreground"
            onClick={() => router.back()}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* --- FORM AREA --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
        <form
          id="patient-edit-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8">
          {/* LEFT COLUMN: Core Identity & Contact (Spans 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Panel 1: Personal Identity */}
            <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Patient Identity
                </h2>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-28 space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      onValueChange={(v) => setValue("title", v)}
                      value={watch("title")}>
                      <SelectTrigger className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl">
                        <SelectValue placeholder="Title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mr.">Mr.</SelectItem>
                        <SelectItem value="Mrs.">Mrs.</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                        <SelectItem value="Ms.">Ms.</SelectItem>
                        <SelectItem value="Baby">Baby</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...form.register("name")}
                      className="h-11 bg-muted/30 border-border focus:ring-primary/20 focus:bg-card rounded-xl transition-colors"
                      placeholder="e.g. John Doe"
                    />
                    {form.formState.errors.name && (
                      <p className="text-[10px] font-medium text-red-500 mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-5 grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Age <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        {...form.register("age")}
                        type="number"
                        className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl text-center"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Unit
                      </Label>
                      <Select
                        value={watch("ageUnit")}
                        onValueChange={(v) => setValue("ageUnit", v as any)}>
                        <SelectTrigger className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Years">Yrs</SelectItem>
                          <SelectItem value="Months">Mos</SelectItem>
                          <SelectItem value="Days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Sex <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={watch("gender")}
                      onValueChange={(v) => setValue("gender", v as any)}>
                      <SelectTrigger className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-3 space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Birth Date
                    </Label>
                    <Input
                      type="date"
                      {...form.register("dob")}
                      className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl px-3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Contact Details */}
            <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Contact & Location
                </h2>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        {...form.register("phone")}
                        className="h-11 pl-10 bg-muted/30 border-border focus:ring-primary/20 rounded-xl"
                        placeholder="10-digit number"
                        maxLength={10}
                      />
                    </div>
                    {form.formState.errors.phone && (
                      <p className="text-[10px] font-medium text-red-500 mt-1">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        {...form.register("email")}
                        className="h-11 pl-10 bg-muted/30 border-border focus:ring-primary/20 rounded-xl"
                        placeholder="patient@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Home Address
                  </Label>
                  <Textarea
                    {...form.register("address")}
                    className="min-h-[80px] bg-muted/30 border-border focus:ring-primary/20 rounded-xl resize-none py-3"
                    placeholder="Apartment, Street, City..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Clinical & Logistics (Spans 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Panel 3: Logistics & Referrals */}
            <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Clinical Routing
                </h2>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Referring Doctor
                  </Label>
                  <div className="relative group">
                    <Input
                      {...form.register("doctorId")}
                      placeholder="Self"
                      className="h-11 pr-10 bg-muted/30 border-border focus:ring-primary/20 rounded-xl transition-colors"
                    />
                    <Search className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground/70 group-hover:text-indigo-500 transition-colors cursor-pointer" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Sourcing Agency
                  </Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      {...form.register("agencyId")}
                      placeholder="Direct"
                      className="h-11 pl-10 pr-10 bg-muted/30 border-border focus:ring-primary/20 rounded-xl transition-colors"
                    />
                    <Search className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground/70 group-hover:text-indigo-500 transition-colors cursor-pointer" />
                  </div>
                </div>

                <div className="h-px w-full bg-muted my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Sample Date
                    </Label>
                    <div className="relative">
                      <Input
                        type="date"
                        {...form.register("collectionDate")}
                        className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Sample Time
                    </Label>
                    <div className="relative">
                      <Clock className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                      <Input
                        type="time"
                        {...form.register("collectionTime")}
                        className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl pr-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 4: Government IDs */}
            <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Identification
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Aadhar Number
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      {...form.register("abhaNumber")}
                      className="h-11 pl-10 bg-muted/30 border-border focus:ring-primary/20 rounded-xl font-mono text-sm"
                      placeholder="XXXX-XXXX-XXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Passport
                    </Label>
                    <Input
                      {...form.register("passport")}
                      className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl font-mono text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      SRF ID
                    </Label>
                    <Input
                      {...form.register("srfId")}
                      className="h-11 bg-muted/30 border-border focus:ring-primary/20 rounded-xl font-mono text-sm"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* --- STICKY BOTTOM ACTION BAR --- */}
      <div className="sticky bottom-0 z-40 bg-card border-t border-border p-4 sm:px-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto h-12 rounded-xl border-border text-muted-foreground bg-muted/30 hover:bg-muted font-medium"
            disabled>
            <ScanLine className="h-4 w-4 mr-2" /> Scan Aadhar QR (Locked)
          </Button>

          <div className="flex w-full sm:w-auto gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 sm:flex-none h-12 rounded-xl text-muted-foreground hover:bg-muted font-medium"
              onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="patient-edit-form"
              className="flex-1 sm:w-48 h-12 rounded-xl bg-gradient-to-r from-primary to-primary hover:from-indigo-700 hover:to-violet-700 text-primary-foreground font-bold shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
              disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Save Changes <Save className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
