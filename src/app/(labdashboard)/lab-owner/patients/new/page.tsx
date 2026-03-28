'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query'; // ✅ Added for dynamic fetching
import { 
  User, Calendar, Phone, ScanLine, Camera, 
  ChevronRight, X, Loader2, Mail, Fingerprint, ScanBarcode, 
  ChevronsUpDown, Check, Stethoscope, Briefcase, Banknote, UserCheck, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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

// --- VALIDATION SCHEMA ---
const patientSchema = z.object({
  title: z.string().default('Mr.'),
  name: z.string().min(2, "Name is required"),
  age: z.coerce.number().min(1, "Age is required"),
  ageUnit: z.enum(['Years', 'Months', 'Days']).default('Years'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  
  phone: z.string().min(10, "10 digits required").max(10, "10 digits maximum"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  address: z.string().optional(),
  
  doctorName: z.string().optional(), 
  agencyName: z.string().optional(), 
  paymentMode: z.string().default('Cash'),
  
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

  // Map database records to the format the combobox expects
  const liveDoctors = [
    { label: "Self (No Doctor)", value: "Self" },
    ...(doctorsData?.map(d => ({ label: d.name, value: d.id })) || [])
  ];

  const liveAgencies = [
    { label: "Direct Walk-in", value: "Direct" },
    ...(agenciesData?.map(a => ({ label: a.agencyName, value: a.id })) || [])
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
      doctorName: 'Self', // ✅ Set smart defaults
      agencyName: 'Direct', // ✅ Set smart defaults
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
          // We pass these exactly as they are (they now hold the UUID or "Self"/"Direct")
          doctorId: data.doctorName, 
          agencyId: data.agencyName
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
           if(confirm("Patient exists. Load profile?")) {
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
        throw new Error(result.error || "Failed to register");
      }

      toast.success("Patient Registered");
      
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

  // Minimized Section Header
  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-100">
        <div className="p-0.5 bg-blue-50/80 rounded-md text-blue-600">
            <Icon className="h-3 w-3" />
        </div>
        <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
    </div>
  );

  // Minimized Label
  const InputLabel = ({ label, required }: { label: string, required?: boolean }) => (
    <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5 block">
        {label} {required && <span className="text-red-500">*</span>}
    </Label>
  );

  const CreatableCombobox = ({ value, onChange, options, placeholder, icon: Icon }: any) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
              <Icon className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 z-10" />
              <Button
                type="button" 
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  "w-full h-8 pl-7 pr-2 justify-between font-normal bg-slate-50 border-slate-200 focus:bg-white hover:bg-white text-left text-xs",
                  !value && "text-muted-foreground"
                )}
              >
                <span className="truncate">{value 
                  ? options.find((opt: any) => opt.value === value)?.label || value 
                  : placeholder}</span>
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput 
                placeholder={placeholder} 
                onValueChange={(search) => setInputValue(search)}
                className="h-8 text-xs"
            />
            <CommandList>
              <CommandEmpty>
                  <div className="p-2 text-xs text-slate-500">
                     <p>No record found.</p>
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="mt-1 h-auto py-1 w-full justify-start text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 hover:text-blue-700 text-xs"
                        onClick={() => {
                           // If the user types a new doctor that isn't in the DB, 
                           // we still allow it as plain text. 
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
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3 w-3", value === opt.value ? "opacity-100" : "opacity-0")}/>
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
      // ✅ 1. SCREEN FIT LAYOUT
      <div className="flex flex-col min-h-[85vh] bg-slate-50/50 font-sans">
        
        {/* COMPACT HEADER (h-12) */}
        <div className="flex-none h-12 bg-white border-b flex items-center justify-between px-4 z-20 shadow-sm">
           <div className="flex items-center gap-3">
             <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} className="h-7 w-7 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4"/>
             </Button>
             <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-800 tracking-tight">New Patient</h1>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-200">Draft</Badge>
             </div>
           </div>
           
           <div className="hidden md:flex items-center gap-1 text-[9px] font-bold tracking-wider opacity-70 scale-90">
              <div className="px-2 py-0.5 bg-blue-600 text-white rounded-full">01 DETAILS</div>
              <div className="w-4 h-px bg-slate-200"></div>
              <div className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full">02 TESTS</div>
              <div className="w-4 h-px bg-slate-200"></div>
              <div className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full">03 BILLING</div>
           </div>
        </div>

        {/* CONTENT AREA - Auto Scale */}
        <div className="flex-1 min-h-0 p-2 md:p-3 mb-0">
          <form id="patient-form" onSubmit={form.handleSubmit(onSubmit)} className="max-w-6xl mx-auto h-fit flex flex-col justify-center">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-fit">
                
                {/* LEFT: DEMOGRAPHICS (Dense) */}
                <div className="lg:col-span-8 flex flex-col gap-3">
                    <Card className="shadow-sm border-slate-200/60 overflow-hidden">
                        <CardContent className="p-3">
                            <SectionHeader icon={User} title="Demographics" />
                            <div className="grid grid-cols-12 gap-2">
                                {/* Title */}
                                <div className="col-span-3 md:col-span-2">
                                    <InputLabel label="Title" />
                                    <Controller name="title" control={control} render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="h-8 bg-slate-50 border-slate-200 focus:bg-white text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Baby'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}/>
                                </div>
                                {/* Full Name */}
                                <div className="col-span-9 md:col-span-5">
                                    <InputLabel label="Full Name" required />
                                    <Input {...register('name')} className="h-8 bg-slate-50 border-slate-200 focus:bg-white font-medium text-slate-800 text-xs" placeholder="e.g. Rahul Sharma" />
                                    {errors.name && <p className="text-[9px] text-red-500 mt-0.5">{errors.name.message}</p>}
                                </div>
                                {/* Age & Gender Group */}
                                <div className="col-span-12 md:col-span-5 grid grid-cols-3 gap-2">
                                    <div>
                                        <InputLabel label="Age" required />
                                        <Input type="number" {...register('age')} className="h-8 bg-slate-50 border-slate-200 focus:bg-white text-xs" />
                                    </div>
                                    <div>
                                        <InputLabel label="Unit" />
                                        <Controller name="ageUnit" control={control} render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-8 bg-slate-50 border-slate-200 focus:bg-white text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Years" className="text-xs">Yrs</SelectItem>
                                                    <SelectItem value="Months" className="text-xs">Mths</SelectItem>
                                                    <SelectItem value="Days" className="text-xs">Days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}/>
                                    </div>
                                    <div>
                                        <InputLabel label="Gender" required />
                                        <Controller name="gender" control={control} render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-8 bg-slate-50 border-slate-200 focus:bg-white text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MALE" className="text-xs">Male</SelectItem>
                                                    <SelectItem value="FEMALE" className="text-xs">Female</SelectItem>
                                                    <SelectItem value="OTHER" className="text-xs">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}/>
                                    </div>
                                </div>

                                {/* Phone & Email */}
                                <div className="col-span-12 md:col-span-6">
                                    <InputLabel label="Phone" required />
                                    <div className="relative">
                                        <Phone className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                        <Input {...register('phone')} className="h-8 pl-7 bg-slate-50 border-slate-200 focus:bg-white font-mono text-xs" placeholder="9876543210" maxLength={10} />
                                    </div>
                                    {errors.phone && <p className="text-[9px] text-red-500 mt-0.5">{errors.phone.message}</p>}
                                </div>
                                <div className="col-span-12 md:col-span-6">
                                    <InputLabel label="Email" />
                                    <div className="relative">
                                        <Mail className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                        <Input {...register('email')} className="h-8 pl-7 bg-slate-50 border-slate-200 focus:bg-white text-xs" placeholder="Optional" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200/60 flex-1">
                        <CardContent className="p-3">
                            <SectionHeader icon={Fingerprint} title="Address & Identity" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                                <div className="h-full">
                                    <InputLabel label="Address" />
                                    <Textarea {...register('address')} className="h-[88px] bg-slate-50 border-slate-200 focus:bg-white resize-none text-xs" placeholder="Enter full address..." />
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <InputLabel label="ABHA No." />
                                        <div className="relative">
                                            <ScanBarcode className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                            <Input {...register('abhaNumber')} className="h-8 pl-7 bg-slate-50 border-slate-200 focus:bg-white text-xs" placeholder="XXXX-XXXX-XXXX" />
                                        </div>
                                    </div>
                                    <div>
                                        <InputLabel label="Passport / SRF" />
                                        <div className="relative">
                                            <CreditCard className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                            <Input {...register('passport')} className="h-8 pl-7 bg-slate-50 border-slate-200 focus:bg-white text-xs" placeholder="Optional" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: VISIT INFO (Dense) */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                    <Card className="shadow-sm border-slate-200 h-full flex flex-col">
                        <CardContent className="p-3 flex-1 flex flex-col">
                            <SectionHeader icon={Calendar} title="Visit Information" />
                            
                            <div className="space-y-3 flex-1">
                                <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-100/50">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <InputLabel label="Date" />
                                            <Input type="date" {...register('collectionDate')} className="h-8 bg-white border-blue-200 focus:border-blue-300 text-[10px]" />
                                        </div>
                                        <div>
                                            <InputLabel label="Time" />
                                            <Input type="time" {...register('collectionTime')} className="h-8 bg-white border-blue-200 focus:border-blue-300 text-[10px]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <InputLabel label="Referring Doctor" />
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

                                    <div>
                                        <InputLabel label="Agency / Client" />
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

                                    <div>
                                        <InputLabel label="Collected By" />
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

                                    <div>
                                        <InputLabel label="Payment Mode" />
                                        <Controller name="paymentMode" control={control} render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="h-8 bg-slate-50 border-slate-200 focus:bg-white pl-7 relative text-xs">
                                                    <Banknote className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cash" className="text-xs">Cash</SelectItem>
                                                    <SelectItem value="UPI" className="text-xs">UPI / QR</SelectItem>
                                                    <SelectItem value="Card" className="text-xs">Card</SelectItem>
                                                    <SelectItem value="Credit" className="text-xs">Credit</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}/>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-100">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button type="button" variant="outline" className="h-8 text-[10px] gap-2 border-slate-200 text-slate-600 bg-slate-50">
                                        <ScanLine className="h-3 w-3" /> Scan ID
                                    </Button>
                                    <Button type="button" variant="outline" className="h-8 text-[10px] gap-2 border-slate-200 text-slate-600 bg-slate-50">
                                        <Camera className="h-3 w-3" /> Photo
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
          </form>
        </div>

        {/* FOOTER (Compact) */}
        <div className="flex-none h-14 bg-white border-t px-4 flex items-center justify-between z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
           <div className="text-[10px] text-slate-400 font-medium hidden md:block">
              <span className="text-red-500">*</span> Required Fields
           </div>

           <div className="flex gap-2 w-full md:w-auto">
              <Button type="button" variant="outline" onClick={() => router.back()} className="h-9 px-6 border-slate-300 text-slate-600 hover:bg-slate-50 font-medium text-xs">
                 Cancel
              </Button>
              <Button 
                 type="submit" 
                 form="patient-form" 
                 disabled={isSubmitting}
                 className="bg-blue-600 hover:bg-blue-700 h-9 px-8 font-semibold shadow-md transition-all active:scale-95 flex-1 md:flex-none text-white text-xs"
              >
                 {isSubmitting ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <span className="flex items-center">Save & Proceed <ChevronRight className="ml-2 h-3 w-3"/></span>}
              </Button>
           </div>
        </div>

      </div>
  );
}