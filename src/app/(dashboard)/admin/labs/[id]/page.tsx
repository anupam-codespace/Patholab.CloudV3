'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building2, Mail, Phone, MapPin, Calendar, CreditCard, 
  Users, TestTube, Activity, ShieldAlert, Lock, LogIn, 
  CheckCircle2, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import toast from 'react-hot-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Utils
const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

export default function LabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const labId = params.id as string;

  // 1. Fetch Data
  const { data: lab, isLoading } = useQuery({
    queryKey: ['lab-detail', labId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/labs/${labId}`);
      if (!res.ok) throw new Error('Lab not found');
      return res.json();
    },
  });

  if (isLoading) return <DetailPageSkeleton />;
  if (!lab) return <div className="p-8">Lab not found</div>;

  return (
    <div className="space-y-6 p-8 min-h-screen bg-muted/5">
      {/* --- HEADER --- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={lab.logo} />
            <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
              {lab.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{lab.name}</h1>
              <Badge variant={lab.isActive ? "default" : "destructive"}>
                {lab.isActive ? 'Active' : 'Suspended'}
              </Badge>
              {lab.subscription?.plan?.displayName && (
                <Badge variant="outline" className="text-primary border-primary/20">
                  {lab.subscription.plan.displayName}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <Building2 className="h-3 w-3" /> License: {lab.licenseNumber} • 
              <MapPin className="h-3 w-3" /> {lab.city}, {lab.state}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ResetPasswordDialog userId={lab.ownerId} userName={lab.owner.name} />
          <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
            <LogIn className="mr-2 h-4 w-4" /> Impersonate
          </Button>
        </div>
      </div>

      {/* --- KPI SUMMARY --- */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(lab.stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Processed</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lab._count.tests.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lab._count.staff}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(new Date(lab.createdAt), 'MMM yyyy')}</div>
          </CardContent>
        </Card>
      </div>

      {/* --- TABS CONTENT --- */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials & Plan</TabsTrigger>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="settings" className="text-red-500 data-[state=active]:text-red-600">
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            
            {/* Owner Details Card */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
                <CardDescription>Primary contact for this tenant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{lab.owner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{lab.owner.name}</p>
                    <p className="text-sm text-muted-foreground">Lab Owner & Admin</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lab.owner.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lab.owner.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Graph */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Activity</CardTitle>
                <CardDescription>Income generated by this lab over time</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lab.stats.revenueGraph}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px' }} 
                        formatter={(value: any) => [`₹${value}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#2563eb" fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. FINANCIALS TAB */}
        <TabsContent value="financials">
          <div className="grid gap-4 md:grid-cols-3">
             {/* Current Plan */}
             <Card>
               <CardHeader>
                 <CardTitle>Current Subscription</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 {lab.subscription ? (
                   <>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-muted-foreground">Plan</span>
                       <span className="font-bold">{lab.subscription.plan.displayName}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-muted-foreground">Status</span>
                       <Badge>{lab.subscription.status}</Badge>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-muted-foreground">Renews On</span>
                       <span>{format(new Date(lab.subscription.endDate), 'MMM dd, yyyy')}</span>
                     </div>
                   </>
                 ) : (
                   <div className="text-sm text-muted-foreground">No active subscription</div>
                 )}
               </CardContent>
             </Card>

             {/* Payment History */}
             <Card className="col-span-2">
               <CardHeader>
                 <CardTitle>Recent Payments</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   {lab.subscription?.payments?.map((payment: any, i: number) => (
                     <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Subscription Renewal</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                       </div>
                       <div className="font-bold">{formatCurrency(payment.amount)}</div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* 3. STAFF TAB */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Accounts</CardTitle>
              <CardDescription>Users with access to this laboratory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lab.staff.map((member: any) => (
                  <div key={member.userId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar>
                         <AvatarImage src={member.user.avatar} />
                         <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{member.position}</Badge>
                      <Badge variant="outline">{member.department || 'General'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. SETTINGS (DANGER) TAB */}
        <TabsContent value="settings">
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <div>
                  <p className="font-medium">Suspend Laboratory</p>
                  <p className="text-sm text-muted-foreground">
                    This will block all access for the owner and staff immediately.
                  </p>
                </div>
                <Button variant="destructive">Suspend Access</Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <div>
                  <p className="font-medium">Delete Tenant Data</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this lab and all associated patient records. This cannot be undone.
                  </p>
                </div>
                <Button variant="destructive">Delete Data</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ResetPasswordDialog({ userId, userName }: { userId: string, userName: string }) {
  const [open, setOpen] = useState(false);
  
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.loading('Resetting password...');
    // API Call would go here
    setTimeout(() => {
      toast.dismiss();
      toast.success('Password reset email sent to owner.');
      setOpen(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Lock className="mr-2 h-4 w-4" /> Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password for {userName}</DialogTitle>
          <DialogDescription>
            Are you sure? This will invalidate the current password and send a reset link to the owner's email.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleReset}>Confirm Reset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailPageSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}