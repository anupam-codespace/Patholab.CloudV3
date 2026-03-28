'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatientFullDetails, updatePatientDetails } from '@/actions/patient-details';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, 
  FileText, Activity, Save, Edit2, X, AlertCircle, 
  FlaskConical, BadgeIndianRupee, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // 1. Fetch Data
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientFullDetails(patientId)
  });

  // 2. Initialize Form Data
  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name,
        phone: patient.phone,
        email: patient.email || '',
        age: patient.age,
        ageUnit: patient.ageUnit,
        gender: patient.gender,
        address: patient.address || '',
        bloodGroup: patient.bloodGroup || '',
        srfId: patient.srfId || '',
        passportNumber: patient.passportNumber || '',
        medicalHistory: patient.medicalHistory || {}
      });
    }
  }, [patient]);

  // 3. Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => await updatePatientDetails(patientId, data),
    onSuccess: () => {
      toast.success("Patient details updated");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
    onError: () => toast.error("Failed to update")
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Skeleton className="w-[800px] h-[600px] rounded-xl" /></div>;
  if (!patient) return <div className="p-10 text-center">Patient not found</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-slate-500"/>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {patient.name}
              <Badge variant={patient.gender === 'MALE' ? 'default' : 'secondary'} className="text-[10px]">
                {patient.gender}
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 font-mono">PID: {patient.patientId} • Registered: {format(new Date(patient.createdAt), "dd MMM yyyy")}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-red-500 hover:bg-red-50"><X className="h-4 w-4 mr-2"/> Cancel</Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2"/> Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Edit2 className="h-4 w-4 mr-2"/> Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PROFILE EDITABLE */}
        <div className="col-span-4 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                <User className="h-4 w-4"/> Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              {/* NON-EDITABLE FIELDS */}
              <div className="grid grid-cols-1 gap-4 p-3 bg-slate-100 rounded border border-slate-200 opacity-80">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 flex items-center gap-1"><User className="h-3 w-3"/> Full Name (Locked)</Label>
                  <Input value={formData.name} disabled className="bg-white border-slate-200 text-slate-700 font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3"/> Phone Number (Locked)</Label>
                  <Input value={formData.phone} disabled className="bg-white border-slate-200 text-slate-700 font-semibold" />
                </div>
              </div>

              {/* EDITABLE FIELDS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Age</Label>
                  <Input 
                    type="number" 
                    value={formData.age} 
                    onChange={(e) => setFormData({...formData, age: e.target.value})} 
                    disabled={!isEditing} 
                    className={isEditing ? "bg-white border-blue-300" : "bg-slate-50"}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Select value={formData.ageUnit} onValueChange={(v) => setFormData({...formData, ageUnit: v})} disabled={!isEditing}>
                    <SelectTrigger className={isEditing ? "bg-white border-blue-300" : "bg-slate-50"}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Years">Years</SelectItem>
                      <SelectItem value="Months">Months</SelectItem>
                      <SelectItem value="Days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"/>
                  <Input 
                    className={`pl-9 ${isEditing ? "bg-white border-blue-300" : "bg-slate-50"}`}
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    disabled={!isEditing} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"/>
                  <Textarea 
                    className={`pl-9 min-h-[80px] resize-none ${isEditing ? "bg-white border-blue-300" : "bg-slate-50"}`}
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                    disabled={!isEditing} 
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <Label className="text-xs">SRF ID</Label>
                    <Input value={formData.srfId} onChange={(e) => setFormData({...formData, srfId: e.target.value})} disabled={!isEditing} />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Passport No</Label>
                    <Input value={formData.passportNumber} onChange={(e) => setFormData({...formData, passportNumber: e.target.value})} disabled={!isEditing} />
                 </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: HISTORY & LOGS */}
        <div className="col-span-8 space-y-6">
          
          <Tabs defaultValue="tests" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white p-1 border border-slate-200 rounded-lg">
              <TabsTrigger value="tests" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Test History</TabsTrigger>
              <TabsTrigger value="billing" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">Billing & Invoices</TabsTrigger>
              <TabsTrigger value="samples" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">Samples Log</TabsTrigger>
            </TabsList>

            <TabsContent value="tests" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Laboratory History</CardTitle></CardHeader>
                <CardContent>
                  {patient.tests.length === 0 ? (
                    <div className="text-center p-10 text-slate-400 text-sm">No test history available.</div>
                  ) : (
                    <div className="space-y-4">
                      {patient.tests.map((test: any) => (
                        <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${test.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                              <Activity className="h-5 w-5"/>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800">{test.testName} <span className="text-xs font-normal text-slate-500">({test.testCode})</span></h4>
                              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                <Calendar className="h-3 w-3"/> {format(new Date(test.createdAt), "dd MMM yyyy, h:mm a")}
                                <span className="text-slate-300">|</span>
                                Doc: {test.doctor?.user?.name || 'Self'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={`mb-2 ${test.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                              {test.status}
                            </Badge>
                            <br/>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => router.push(`/lab-owner/workflow/results/${patient.id}`)}>
                              View Results &gt;
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Financial History</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patient.invoices.length === 0 ? <p className="text-center text-slate-400 p-6 text-sm">No invoices generated.</p> : 
                      patient.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center p-3 border border-dashed border-slate-300 rounded bg-slate-50/50">
                           <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded border border-slate-200">
                                <BadgeIndianRupee className="h-4 w-4 text-slate-600"/>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">Inv #{inv.invoiceNumber}</p>
                                <p className="text-[10px] text-slate-500">{format(new Date(inv.createdAt), "dd MMM yyyy")}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">₹{inv.grandTotal}</p>
                                <Badge className={inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}>{inv.status}</Badge>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => router.push(`/lab-owner/billing/${inv.id}`)}>View</Button>
                           </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="samples" className="mt-4">
               <Card>
                  <CardHeader><CardTitle className="text-base">Collected Samples</CardTitle></CardHeader>
                  <CardContent>
                     {patient.samples.map((sample: any) => (
                        <div key={sample.id} className="flex items-center gap-3 p-3 border-b last:border-0">
                           <FlaskConical className="h-4 w-4 text-purple-500"/>
                           <div className="flex-1">
                              <p className="text-sm font-medium">{sample.sampleType} <span className="text-slate-400 text-xs">({sample.containerType})</span></p>
                              <p className="text-[10px] text-slate-500 font-mono">{sample.sampleId}</p>
                           </div>
                           <Badge variant="outline" className="text-[10px]">{sample.status}</Badge>
                        </div>
                     ))}
                  </CardContent>
               </Card>
            </TabsContent>

          </Tabs>
        </div>

      </div>
    </div>
  );
}