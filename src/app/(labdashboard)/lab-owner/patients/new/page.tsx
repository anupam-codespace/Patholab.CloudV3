'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query'; 
import { 
  User, Calendar, Phone, ScanLine, Camera, 
  ChevronRight, X, Loader2, Mail, Fingerprint, ScanBarcode, 
  ChevronsUpDown, Check, Stethoscope, Briefcase, Banknote, UserCheck, CreditCard,
  MapPin, Activity, ShieldCheck, Clock
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

// ✅ Import Server Actions
import { getDoctors } from '@/actions/doctor-management';
import { getAgencies } from '@/actions/agency-management';

// --- VALIDATION SCHEMA (Fixed: Removed .default() to prevent TS Type Collisions) ---
const patientSchema = z.object({
  title: z.string(),
  name: z.string().min(2, "Name is required"),
  age: z.coerce.number().min(1, "Age is required"),
  ageUnit: z.enum(['Years', 'Months', 'Days']),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  
  phone: z.string().min(10, "10 digits required").max(10, "10 digits maximum"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  address: z.string().optional(),
  
  doctorName: z.string().optional(), 
  agencyName: z.string().optional(), 
  paymentMode: z.string(),
  
  collectedBy: z.string().optional(), 

  abhaNumber: z.string().optional(),
  passport: z.string().optional(),
  collectionDate: z.string(),
  collectionTime: z.string(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const COLLECTORS = [
  { label: "Lab Phlebotomist", value: "Lab Phlebotomist" },
  { label: "Home Collection Agent", value: "Home Collection Agent" },
  { label: "Self (Patient)", value: "Self" },
];

export default function CreatePatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') || '';
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ FETCH LIVE DOCTORS & AGENCIES
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => await getDoctors()
  });

  const { data: agenciesData } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => await getAgencies()
  });

  const liveDoctors = [
    { label: "Self (No Doctor)", value: "Self" },
    ...(doctorsData?.map((d: any) => ({ label: d.name, value: d.id })) || [])
  ];

  const liveAgencies = [
    { label: "Direct Walk-in", value: "Direct" },
    ...(agenciesData?.map((a: any) => ({ label: a.agencyName, value: a.id })) || [])
  ];

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      title: 'Mr.',
      ageUnit: 'Years',
      gender: 'MALE',
      phone: phoneParam,
      collectionDate: format(new Date(), 'yyyy-MM-dd'),
      collectionTime: format(new Date(), 'HH:mm'),
      doctorName: 'Self', 
      agencyName: 'Direct', 
      paymentMode: 'Cash',
      collectedBy: '' 
    }
  });

  const { control, register, formState: { errors } } = form;

  const onSubmit = async (data: PatientFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/lab-owner/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          doctorId: data.doctorName, 
          agencyId: data.agencyName
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
           if(confirm("Patient already exists. Load their profile?")) {
              const params = new URLSearchParams({
                 patientId: result.patient?.id,
                 doc: data.doctorName || 'Self',
                 agency: data.agencyName || 'Direct',
                 pay: data.paymentMode || 'Cash',
                 colBy: data.collectedBy || '' 
              });
              router.push(`/lab-owner/accession?${params.toString()}`);
              return;
           }
           throw new Error("Duplicate ignored.");
        }
        throw new Error(result.error || "Failed to register patient");
      }

      toast.success("Patient Registered Successfully");
      
      const params = new URLSearchParams({
         patientId: result.id, 
         doc: data.doctorName || 'Self', 
         agency: data.agencyName || 'Direct',
         pay: data.paymentMode,
         colBy: data.collectedBy || '' 
      });
      router.push(`/lab-owner/accession?${params.toString()}`);
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modern Combobox Component
  const CreatableCombobox = ({ value, onChange, options, placeholder, icon: Icon }: any) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative group cursor-pointer">
              <Icon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors z-10" />
              <Button
                type="button" 
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  "w-full h-11 pl-10 pr-4 justify-between font-normal bg-slate-50 border-slate-200 hover:bg-white focus:bg-white text-left text-sm rounded-xl transition-all shadow-sm",
                  !value && "text-slate-500"
                )}
              >
                <span className="truncate">{value 
                  ? options.find((opt: any) => opt.value === value)?.label || value 
                  : placeholder}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 shadow-2xl border-slate-100 rounded-xl overflow-hidden" align="start">
          <Command>
            <CommandInput 
                placeholder={`Search or type new...`} 
                onValueChange={(search) => setInputValue(search)}
                className="h-11 text-sm border-none focus:ring-0"
            />
            <CommandList className="max-h-[250px] custom-scrollbar">
              <CommandEmpty>
                  <div className="p-3 text-sm text-slate-500 text-center">
                     <p className="mb-2">No record found.</p>
                     <Button 
                        type="button" 
                        variant="secondary" 
                        className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-bold"
                        onClick={() => {
                           onChange(inputValue); 
                           setOpen(false);
                        }}>
                        + Add "{inputValue}"
                     </Button>
                  </div>
              </CommandEmpty>
              <CommandGroup>
                {options.map((opt: any) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label} 
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="text-sm py-2.5 cursor-pointer hover:bg-slate-50"
                  >
                    <Check className={cn("mr-2 h-4 w-4 text-indigo-600", value === opt.value ? "opacity-100" : "opacity-0")}/>
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 relative">
        
        {/* Decorative Background Mesh */}
        <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-transparent pointer-events-none z-0" />

        {/* --- FLOATING HEADER --- */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 text-slate-500 shrink-0" onClick={() => router.back()}>
                <X className="h-5 w-5"/>
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight flex items-center gap-2">
                  New Registration
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 uppercase tracking-wider text-[10px] font-bold">Draft</Badge>
                </h1>
              </div>
            </div>
            
            {/* Premium Step Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-full border border-slate-200/50 shadow-inner">
               <div className="px-4 py-1.5 bg-white text-indigo-700 rounded-full shadow-sm text-xs font-bold tracking-wide flex items-center gap-2">
                 <div className="h-5 w-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">1</div> Details
               </div>
               <div className="px-4 py-1.5 text-slate-400 text-xs font-bold tracking-wide flex items-center gap-2 opacity-70">
                 <div className="h-5 w-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] text-slate-500">2</div> Tests
               </div>
               <div className="px-4 py-1.5 text-slate-400 text-xs font-bold tracking-wide flex items-center gap-2 opacity-70">
                 <div className="h-5 w-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] text-slate-500">3</div> Billing
               </div>
            </div>

          </div>
        </header>

        {/* --- FORM AREA --- */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 pb-32">
          <form id="patient-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8">
            
            {/* LEFT COLUMN: Demographics & Contact (Spans 8) */}
            <div className="lg:col-span-8 space-y-6">
               
               {/* Panel 1: Personal Identity */}
               <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center gap-2 space-y-0">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    <CardTitle className="text-sm font-semibold text-slate-800 tracking-wide uppercase">Patient Demographics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                       <div className="w-full sm:w-32 space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Title <span className="text-red-500">*</span></Label>
                          <Controller name="title" control={control} render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                      {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Baby'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          )}/>
                       </div>
                       <div className="flex-1 space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></Label>
                          <Input {...register('name')} className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 transition-all text-sm font-medium" placeholder="e.g. Rahul Sharma" />
                          {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.name.message}</p>}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                       <div className="sm:col-span-5 grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Age <span className="text-red-500">*</span></Label>
                              <Input type="number" {...register('age')} className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 text-center" />
                          </div>
                          <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Unit</Label>
                              <Controller name="ageUnit" control={control} render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="Years">Yrs</SelectItem>
                                          <SelectItem value="Months">Mos</SelectItem>
                                          <SelectItem value="Days">Days</SelectItem>
                                      </SelectContent>
                                  </Select>
                              )}/>
                          </div>
                       </div>
                       <div className="sm:col-span-4 space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Gender <span className="text-red-500">*</span></Label>
                          <Controller name="gender" control={control} render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="MALE">Male</SelectItem>
                                      <SelectItem value="FEMALE">Female</SelectItem>
                                      <SelectItem value="OTHER">Other</SelectItem>
                                  </SelectContent>
                              </Select>
                          )}/>
                       </div>
                    </div>
                  </CardContent>
               </Card>

               {/* Panel 2: Contact Details */}
               <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center gap-2 space-y-0">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    <CardTitle className="text-sm font-semibold text-slate-800 tracking-wide uppercase">Contact & IDs</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone Number <span className="text-red-500">*</span></Label>
                          <div className="relative">
                              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                              <Input {...register('phone')} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-mono text-sm" placeholder="9876543210" maxLength={10} />
                          </div>
                          {errors.phone && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.phone.message}</p>}
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</Label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                              <Input {...register('email')} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20" placeholder="patient@example.com" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Home Address</Label>
                       <Textarea {...register('address')} className="min-h-[80px] rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 resize-none py-3" placeholder="Apartment, Street, City..." />
                    </div>

                    <div className="h-px bg-slate-100 my-2" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">ABHA Number</Label>
                          <div className="relative">
                              <ScanBarcode className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                              <Input {...register('abhaNumber')} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-mono text-sm" placeholder="XXXX-XXXX-XXXX" />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Passport / SRF</Label>
                          <div className="relative">
                              <ShieldCheck className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                              <Input {...register('passport')} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20" placeholder="Optional" />
                          </div>
                       </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="h-10 rounded-xl text-xs gap-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                            <ScanLine className="h-4 w-4" /> Scan Aadhar QR
                        </Button>
                        <Button type="button" variant="outline" className="h-10 rounded-xl text-xs gap-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Camera className="h-4 w-4" /> Capture Photo
                        </Button>
                    </div>

                  </CardContent>
               </Card>
            </div>

            {/* RIGHT COLUMN: Clinical Routing (Spans 4) */}
            <div className="lg:col-span-4 space-y-6">
               <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center gap-2 space-y-0">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <CardTitle className="text-sm font-semibold text-slate-800 tracking-wide uppercase">Visit Routing</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    
                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Date</Label>
                                <Input type="date" {...register('collectionDate')} className="h-11 rounded-xl bg-white border-indigo-200 focus:ring-indigo-500/20" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Time</Label>
                                <div className="relative">
                                   <Clock className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                   <Input type="time" {...register('collectionTime')} className="h-11 rounded-xl bg-white border-indigo-200 focus:ring-indigo-500/20 pr-10" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Referring Doctor</Label>
                            <Controller name="doctorName" control={control} render={({ field }) => (
                                <CreatableCombobox 
                                    value={field.value} 
                                    onChange={field.onChange} 
                                    options={liveDoctors} 
                                    placeholder="Select Doctor..." 
                                    icon={Stethoscope}
                                />
                            )}/>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Agency / Client</Label>
                            <Controller name="agencyName" control={control} render={({ field }) => (
                                <CreatableCombobox 
                                    value={field.value} 
                                    onChange={field.onChange} 
                                    options={liveAgencies} 
                                    placeholder="Select Agency..." 
                                    icon={Briefcase}
                                />
                            )}/>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Collected By</Label>
                            <Controller name="collectedBy" control={control} render={({ field }) => (
                                <CreatableCombobox 
                                    value={field.value} 
                                    onChange={field.onChange} 
                                    options={COLLECTORS} 
                                    placeholder="Select Collector..." 
                                    icon={UserCheck}
                                />
                            )}/>
                        </div>

                        <div className="h-px bg-slate-100 my-2" />

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Mode</Label>
                            <Controller name="paymentMode" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 pl-10 relative">
                                        <Banknote className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="UPI">UPI / QR</SelectItem>
                                        <SelectItem value="Card">Card</SelectItem>
                                        <SelectItem value="Credit">Credit (Due)</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}/>
                        </div>
                    </div>

                  </CardContent>
               </Card>
            </div>
          </form>
        </main>

        {/* --- STICKY BOTTOM ACTION BAR --- */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40">
           <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                 <span className="text-red-500 font-bold">*</span> Indicates a required field
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                 <Button type="button" variant="ghost" onClick={() => router.back()} className="flex-1 sm:flex-none h-12 rounded-xl text-slate-600 hover:bg-slate-100 font-medium px-6">
                    Cancel
                 </Button>
                 <Button 
                    type="submit" 
                    form="patient-form" 
                    disabled={isSubmitting}
                    className="flex-1 sm:w-56 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
                 >
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Saving...</>
                    ) : (
                      <>Save & Continue <ChevronRight className="ml-2 h-5 w-5"/></>
                    )}
                 </Button>
              </div>
           </div>
        </div>

      </div>
  );
}