'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Added useParams
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  User, Calendar, MapPin, Phone, CreditCard, ScanLine, Camera, 
  ChevronRight, Save, Search, X, Loader2
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';

// --- VALIDATION SCHEMA (Same as Create) ---
const patientSchema = z.object({
  title: z.string().default('Mr.'),
  name: z.string().min(2, "Name is required"),
  age: z.coerce.number().min(0, "Age required"),
  ageUnit: z.enum(['Years', 'Months', 'Days']).default('Years'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().optional(),
  
  // Contact
  phone: z.string().min(10, "Invalid Phone").max(10),
  email: z.string().optional().or(z.literal('')),
  address: z.string().optional(),
  
  // Referral
  doctorId: z.string().optional(),
  agencyId: z.string().optional(),
  
  // IDs
  abhaNumber: z.string().optional(),
  passport: z.string().optional(),
  srfId: z.string().optional(),

  // Collection
  collectionDate: z.string().default(() => format(new Date(), 'yyyy-MM-dd')),
  collectionTime: z.string().default(() => format(new Date(), 'HH:mm')),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams(); // Get ID from URL
  const patientId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      title: 'Mr.',
      ageUnit: 'Years',
      gender: 'MALE',
      collectionDate: format(new Date(), 'yyyy-MM-dd'),
      collectionTime: format(new Date(), 'HH:mm'),
      doctorId: 'Self',
      agencyId: 'Direct'
    }
  });

  // --- 1. FETCH EXISTING DATA ---
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/lab-owner/patients/${patientId}`); 
        if (!res.ok) throw new Error("Failed to load patient");
        
        const json = await res.json();
        const data = json.data; // Assuming your GET API returns { data: ... }

        // Pre-fill form
        form.reset({
            title: data.title || 'Mr.',
            name: data.name,
            age: data.age,
            ageUnit: data.ageUnit || 'Years',
            gender: data.gender,
            phone: data.phone,
            email: data.email || '',
            address: data.address || '',
            doctorId: data.doctorId || 'Self',
            agencyId: data.agencyId || 'Direct',
            abhaNumber: data.abhaNumber || '',
            passport: data.passport || '',
            srfId: data.srfId || '',
            // If you stored collection date separately, map it here, otherwise default to today
            collectionDate: data.collectionDate ? format(new Date(data.collectionDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            collectionTime: data.collectionTime || format(new Date(), 'HH:mm'),
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
  const watchedDob = watch('dob');
  const watchedAge = watch('age');

  useEffect(() => {
    if (watchedDob) {
      const age = differenceInYears(new Date(), new Date(watchedDob));
      if (age !== watchedAge) setValue('age', age);
    }
  }, [watchedDob]);

  // --- 2. SUBMIT HANDLER (PATCH) ---
  const onSubmit = async (data: PatientFormValues) => {
    setIsSubmitting(true);
    try {
      // Use PATCH method and specific ID URL
      const res = await fetch(`/api/lab-owner/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to update");
      }

      toast.success("Patient Updated Successfully!");
      router.back(); // Go back to list
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600"/></div>
  }

  return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        
        {/* --- TOP HEADER --- */}
        <div className="flex items-center justify-between px-6 py-3 bg-amber-50 border-b border-amber-200 sticky top-0 z-20">
           <div className="flex gap-4 items-center">
             <h1 className="text-lg font-bold text-amber-900">Edit Patient Details</h1>
             <div className="flex bg-white/50 rounded-md p-1">
                <span className="text-xs font-mono text-amber-700 px-2 py-1">Editing Record: {patientId}</span>
             </div>
           </div>
           <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.back()}><X className="h-4 w-4"/></Button>
           </div>
        </div>

        {/* --- SCROLLABLE FORM AREA --- */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-6xl mx-auto space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               
               {/* LEFT COLUMN: PERSONAL INFO */}
               <div className="space-y-4">
                  <div className="flex gap-2">
                     <div className="w-24">
                        <Label className="text-xs font-bold text-slate-500">Title <span className="text-red-500">*</span></Label>
                        <Select onValueChange={(v) => setValue('title', v)} value={watch('title')}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Title" /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="Mr.">Mr.</SelectItem>
                             <SelectItem value="Mrs.">Mrs.</SelectItem>
                             <SelectItem value="Ms.">Ms.</SelectItem>
                             <SelectItem value="Baby">Baby</SelectItem>
                          </SelectContent>
                        </Select>
                     </div>
                     <div className="flex-1">
                        <Label className="text-xs font-bold text-slate-500">Name <span className="text-red-500">*</span></Label>
                        <Input {...form.register('name')} className="h-9 border-slate-300 focus:border-blue-500" placeholder="Full Name" />
                        {form.formState.errors.name && <p className="text-[10px] text-red-500 mt-1">Required</p>}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-bold text-slate-500">Age <span className="text-red-500">*</span></Label>
                          <Input {...form.register('age')} type="number" className="h-9" />
                        </div>
                        <div>
                           <Label className="text-xs font-bold text-slate-500">Unit</Label>
                           <Select value={watch('ageUnit')} onValueChange={(v) => setValue('ageUnit', v as any)}>
                              <SelectTrigger className="h-9"><SelectValue/></SelectTrigger>
                              <SelectContent><SelectItem value="Years">Yrs</SelectItem><SelectItem value="Months">Mths</SelectItem></SelectContent>
                           </Select>
                        </div>
                     </div>
                     <div>
                        <Label className="text-xs font-bold text-slate-500">Sex <span className="text-red-500">*</span></Label>
                        <Select value={watch('gender')} onValueChange={(v) => setValue('gender', v as any)}>
                          <SelectTrigger className="h-9"><SelectValue/></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="MALE">Male</SelectItem>
                             <SelectItem value="FEMALE">Female</SelectItem>
                             <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                     </div>
                  </div>

                  <div>
                     <Label className="text-xs font-bold text-slate-500">Birth Date</Label>
                     <Input type="date" {...form.register('dob')} className="h-9" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Label className="text-xs font-bold text-slate-500">Referring Doctor</Label>
                        <div className="relative">
                           <Input {...form.register('doctorId')} placeholder="Self" className="h-9 pr-8" />
                           <Search className="absolute right-2 top-2.5 h-4 w-4 text-slate-400 cursor-pointer" />
                        </div>
                     </div>
                     <div>
                        <Label className="text-xs font-bold text-slate-500">Agency</Label>
                        <div className="relative">
                           <Input {...form.register('agencyId')} placeholder="DIRECT" className="h-9 pr-8" />
                           <Search className="absolute right-2 top-2.5 h-4 w-4 text-slate-400 cursor-pointer" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* RIGHT COLUMN: CONTACT & LOGISTICS */}
               <div className="space-y-4">
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <Label className="text-xs font-bold text-slate-500">Collection Date</Label>
                         <Input type="date" {...form.register('collectionDate')} className="h-9" />
                      </div>
                      <div>
                         <Label className="text-xs font-bold text-slate-500">Collection Time</Label>
                         <Input type="time" {...form.register('collectionTime')} className="h-9" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <Label className="text-xs font-bold text-slate-500">Phone 1 <span className="text-red-500">*</span></Label>
                         <div className="relative">
                            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input {...form.register('phone')} className="h-9 pl-9" placeholder="9876543210" maxLength={10}/>
                         </div>
                         {form.formState.errors.phone && <p className="text-[10px] text-red-500 mt-1">10 Digits Req</p>}
                      </div>
                      <div>
                         <Label className="text-xs font-bold text-slate-500">SRF / Govt ID</Label>
                         <Input {...form.register('srfId')} className="h-9" placeholder="Optional" />
                      </div>
                   </div>

                   <div>
                      <Label className="text-xs font-bold text-slate-500">Address</Label>
                      <Textarea {...form.register('address')} className="min-h-[74px] resize-none" placeholder="House No, Street Area..." />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <Label className="text-xs font-bold text-slate-500">Aadhar No.</Label>
                         <Input {...form.register('abhaNumber')} className="h-9" placeholder="XXXX-XXXX-XXXX" />
                      </div>
                      <div>
                         <Label className="text-xs font-bold text-slate-500">Passport No.</Label>
                         <Input {...form.register('passport')} className="h-9" placeholder="Optional" />
                      </div>
                   </div>

               </div>
            </div>

          </form>
        </div>

        {/* --- BOTTOM ACTION BAR --- */}
        <div className="border-t bg-white p-4 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <div className="flex gap-3">
             <Button variant="outline" size="sm" className="h-9 text-xs gap-2" disabled>
                <ScanLine className="h-4 w-4" /> Scan Aadhar QR (Locked)
             </Button>
           </div>
           
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
             <Button 
               onClick={form.handleSubmit(onSubmit)} 
               className="bg-amber-600 hover:bg-amber-700 w-40 h-10 font-bold"
               disabled={isSubmitting}
             >
                {isSubmitting ? 'Updating...' : 'Save Changes'} <Save className="ml-1 h-4 w-4" />
             </Button>
           </div>
        </div>

      </div>
  );
}