'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  Settings, Globe, Bell, Shield, Key, Save, 
  RefreshCw, AlertTriangle, Mail, Activity, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function AdvancedSettingsPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Current Settings
  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings');
      if(!res.ok) throw new Error('Failed to load');
      return res.json();
    }
  });

  // 2. Fetch Logs
  const { data: logs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs');
      return res.json();
    }
  });

  // 3. Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Configuration saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    },
    onError: () => toast.error('Failed to save settings')
  });

  // Universal Save Handler
  const handleSave = (data: any) => {
    updateMutation.mutate(data);
  };

  if (isLoading) return <div className="p-10 text-center font-medium text-slate-500">Loading System Configuration...</div>;

  return (
    <div className="space-y-6 p-4 md:p-8 min-h-screen bg-slate-50/50">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">System Settings</h1>
        <p className="text-slate-500 font-medium">Global configuration, integrations, and security controls.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        
        {/* Navigation */}
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="h-12 w-full justify-start gap-2 bg-transparent p-0">
            <TabTrigger value="general" icon={Settings} label="General" />
            <TabTrigger value="integrations" icon={Key} label="API & Integrations" />
            <TabTrigger value="landing" icon={Globe} label="Landing Page" />
            <TabTrigger value="notifications" icon={Bell} label="Notifications" />
            <TabTrigger value="security" icon={Shield} label="Security & Logs" />
          </TabsList>
        </div>

        {/* 1. GENERAL */}
        <TabsContent value="general">
          <GeneralSettingsForm defaultValues={config} onSave={handleSave} isSaving={updateMutation.isPending} />
        </TabsContent>

        {/* 2. API KEYS */}
        <TabsContent value="integrations">
          <IntegrationsForm defaultValues={config} onSave={handleSave} isSaving={updateMutation.isPending} />
        </TabsContent>

        {/* 3. LANDING PAGE */}
        <TabsContent value="landing">
          <LandingPageForm defaultValues={config} onSave={handleSave} isSaving={updateMutation.isPending} />
        </TabsContent>

        {/* 4. NOTIFICATIONS */}
        <TabsContent value="notifications">
          <NotificationRulesForm defaultValues={config} onSave={handleSave} isSaving={updateMutation.isPending} />
        </TabsContent>

        {/* 5. SECURITY */}
        <TabsContent value="security">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <AuditLogViewer logs={logs} />
            </div>
            <div>
              <SecurityControls defaultValues={config} onSave={handleSave} />
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TabTrigger({ value, icon: Icon, label }: any) {
  return (
    <TabsTrigger 
      value={value}
      className="data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-white text-slate-600 border border-slate-200 rounded-xl px-6 py-2 h-10 font-bold transition-all shadow-sm flex items-center gap-2"
    >
      <Icon className="h-4 w-4" />
      {label}
    </TabsTrigger>
  )
}

// 1. GENERAL FORM
function GeneralSettingsForm({ defaultValues, onSave, isSaving }: any) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-lg font-bold">Global Branding & Localization</CardTitle>
        <CardDescription>Settings that apply across the entire platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">System Name</Label>
            <Input {...register('systemName')} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Support Email</Label>
            <Input {...register('systemEmail')} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Currency Symbol</Label>
            <Input {...register('currencySymbol')} className="font-mono rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Default Tax Rate (%)</Label>
            <Input type="number" step="0.1" {...register('taxRate', { valueAsNumber: true })} className="rounded-xl" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Address (For Invoices)</Label>
          <Textarea {...register('systemAddress')} className="rounded-xl" />
        </div>
      </CardContent>
      <CardFooter className="justify-end bg-slate-50/50 border-t border-slate-100 py-4">
        <Button onClick={handleSubmit(onSave)} disabled={isSaving} className="rounded-xl font-bold">
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </CardFooter>
    </Card>
  )
}

// 2. INTEGRATIONS FORM
function IntegrationsForm({ defaultValues, onSave, isSaving }: any) {
  const { register, handleSubmit } = useForm({ defaultValues });
  
  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-lg font-bold">Third-Party Integrations</CardTitle>
        <CardDescription>Manage API keys for Payment and Email services.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Razorpay */}
        <div className="space-y-4 border border-slate-200 p-4 rounded-2xl bg-slate-50/30">
          <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800"><CreditCard className="h-4 w-4 text-indigo-600" /> Payment Gateway</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Key ID</Label>
              <Input type="password" {...register('razorpayKeyId')} className="rounded-xl bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Key Secret</Label>
              <Input type="password" {...register('razorpayKeySecret')} className="rounded-xl bg-white" />
            </div>
          </div>
        </div>

        {/* SMTP */}
        <div className="space-y-4 border border-slate-200 p-4 rounded-2xl bg-slate-50/30">
          <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800"><Mail className="h-4 w-4 text-blue-600" /> SMTP Email</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Host</Label>
              <Input {...register('smtpHost')} className="rounded-xl bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Port</Label>
              <Input type="number" {...register('smtpPort', { valueAsNumber: true })} className="rounded-xl bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Password</Label>
              <Input type="password" {...register('smtpPassword')} className="rounded-xl bg-white" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end bg-slate-50/50 border-t border-slate-100 py-4">
        <Button onClick={handleSubmit(onSave)} disabled={isSaving} className="rounded-xl font-bold">Save API Keys</Button>
      </CardFooter>
    </Card>
  )
}

// 3. LANDING PAGE FORM
function LandingPageForm({ defaultValues, onSave, isSaving }: any) {
  const { register, handleSubmit, watch, setValue } = useForm({ 
    defaultValues: {
      landingPage: defaultValues?.landingPage || {}
    } 
  });

  const showPricing = watch('landingPage.showPricing');
  const showSignups = watch('landingPage.showSignups');

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-bold">Landing Page Content</CardTitle>
            <CardDescription>Customize the public facing homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Hero Headline</Label>
              <Input {...register('landingPage.heroTitle')} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Hero Subtext</Label>
              <Textarea {...register('landingPage.heroSubtext')} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Announcement Banner</Label>
              <Input {...register('landingPage.announcement')} placeholder="e.g. New Features Live!" className="rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-slate-700">Show Pricing</Label>
                <Switch checked={showPricing} onCheckedChange={(c) => setValue('landingPage.showPricing', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-bold text-slate-700">Allow Signups</Label>
                <Switch checked={showSignups} onCheckedChange={(c) => setValue('landingPage.showSignups', c)} />
              </div>
            </CardContent>
          </div>
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-4">
            <Button type="submit" className="w-full rounded-xl font-bold" disabled={isSaving}>Save Content</Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}

// 4. NOTIFICATIONS FORM
function NotificationRulesForm({ defaultValues, onSave, isSaving }: any) {
  const { handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      notifications: defaultValues?.notifications || {
        newLabEmail: true,
        paymentFailedEmail: true,
        supportTicketEmail: true
      }
    }
  });

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-lg font-bold">Notification Preferences</CardTitle>
        <CardDescription>Control when Super Admins receive alerts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {[
          { id: 'newLabEmail', label: 'New Lab Registration' },
          { id: 'paymentFailedEmail', label: 'Subscription Payment Failed' },
          { id: 'supportTicketEmail', label: 'New Support Ticket Created' },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Mail className="h-4 w-4" />
              </div>
              <Label className="font-bold text-slate-800">{item.label}</Label>
            </div>
            <Switch 
              checked={watch(`notifications.${item.id}`)} 
              onCheckedChange={(c) => setValue(`notifications.${item.id}`, c)} 
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end bg-slate-50/50 border-t border-slate-100 py-4">
        <Button onClick={handleSubmit(onSave)} disabled={isSaving} className="rounded-xl font-bold">Update Preferences</Button>
      </CardFooter>
    </Card>
  )
}

// 5. SECURITY CONTROLS
function SecurityControls({ defaultValues, onSave }: any) {
  const handleToggle = (key: string, value: boolean) => {
    onSave({ 
      securityConfig: {
        ...defaultValues?.securityConfig,
        [key]: value
      }
    });
  };

  const config = defaultValues?.securityConfig || {};

  return (
    <Card className="border-rose-200 bg-rose-50/30 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-rose-50/50 border-b border-rose-100">
        <CardTitle className="flex items-center gap-2 text-rose-700 text-lg font-bold">
          <AlertTriangle className="h-5 w-5" /> Emergency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="font-bold text-slate-900">Maintenance Mode</Label>
            <p className="text-xs text-slate-500 font-medium">Block non-admin access</p>
          </div>
          <Switch 
            checked={config.maintenanceMode} 
            onCheckedChange={(c) => handleToggle('maintenanceMode', c)} 
          />
        </div>
        <Separator className="bg-rose-100" />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="font-bold text-slate-900">Disable Registrations</Label>
            <p className="text-xs text-slate-500 font-medium">Stop new signups</p>
          </div>
          <Switch 
            checked={config.disableRegistrations} 
            onCheckedChange={(c) => handleToggle('disableRegistrations', c)} 
          />
        </div>
        <Separator className="bg-rose-100" />
        <Button variant="destructive" className="w-full rounded-xl font-bold bg-rose-600 hover:bg-rose-700">
          <RefreshCw className="mr-2 h-4 w-4" /> Flush All Sessions
        </Button>
      </CardContent>
    </Card>
  )
}

function AuditLogViewer({ logs }: any) {
  return (
    <Card className="h-full border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-lg font-bold">Activity Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[480px] w-full p-6">
          <div className="space-y-4">
            {logs?.map((log: any) => (
              <div key={log.id} className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800">{log.action}</span>
                  <span className="text-xs font-mono text-slate-400">{format(new Date(log.createdAt), 'MMM dd, HH:mm')}</span>
                </div>
                <p className="text-xs text-slate-600">{log.description}</p>
              </div>
            ))}
            {!logs?.length && <div className="text-center py-12 text-slate-400 font-medium">No logs found.</div>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}