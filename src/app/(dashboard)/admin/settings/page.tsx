'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  Settings, Globe, Bell, Shield, Key, Save, 
  RefreshCw, AlertTriangle, Mail, Activity
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

  if (isLoading) return <div className="p-10 text-center">Loading System Configuration...</div>;

  return (
    <div className="space-y-6 p-8 min-h-screen bg-muted/5">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Global configuration, integrations, and security controls.</p>
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

        {/* 3. LANDING PAGE (Fixed) */}
        <TabsContent value="landing">
          <LandingPageForm defaultValues={config} onSave={handleSave} isSaving={updateMutation.isPending} />
        </TabsContent>

        {/* 4. NOTIFICATIONS (Fixed) */}
        <TabsContent value="notifications">
          <NotificationRulesForm defaultValues={config} onSave={handleSave} isSaving={updateMutation.isPending} />
        </TabsContent>

        {/* 5. SECURITY (Fixed) */}
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
      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2 h-10 rounded-full border border-muted-foreground/20"
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </TabsTrigger>
  )
}

// 1. GENERAL FORM
function GeneralSettingsForm({ defaultValues, onSave, isSaving }: any) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Branding & Localization</CardTitle>
        <CardDescription>Settings that apply across the entire platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>System Name</Label>
            <Input {...register('systemName')} />
          </div>
          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input {...register('systemEmail')} />
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Input {...register('currencySymbol')} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Default Tax Rate (%)</Label>
            <Input type="number" step="0.1" {...register('taxRate', { valueAsNumber: true })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address (For Invoices)</Label>
          <Textarea {...register('systemAddress')} />
        </div>
      </CardContent>
      <CardFooter className="justify-end bg-muted/10">
        <Button onClick={handleSubmit(onSave)} disabled={isSaving}>
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
    <Card>
      <CardHeader>
        <CardTitle>Third-Party Integrations</CardTitle>
        <CardDescription>Manage API keys for Payment and Email services.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Razorpay */}
        <div className="space-y-4 border p-4 rounded-lg">
          <h3 className="font-semibold flex items-center gap-2"><CreditCardIcon className="h-4 w-4" /> Payment Gateway</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Key ID</Label>
              <Input type="password" {...register('razorpayKeyId')} />
            </div>
            <div className="space-y-2">
              <Label>Key Secret</Label>
              <Input type="password" {...register('razorpayKeySecret')} />
            </div>
          </div>
        </div>

        {/* SMTP */}
        <div className="space-y-4 border p-4 rounded-lg">
          <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> SMTP Email</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Host</Label>
              <Input {...register('smtpHost')} />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input type="number" {...register('smtpPort', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" {...register('smtpPassword')} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end bg-muted/10">
        <Button onClick={handleSubmit(onSave)} disabled={isSaving}>Save API Keys</Button>
      </CardFooter>
    </Card>
  )
}

// 3. LANDING PAGE FORM (Fixed to use React Hook Form)
function LandingPageForm({ defaultValues, onSave, isSaving }: any) {
  // Use nested default values
  const { register, handleSubmit, watch, setValue } = useForm({ 
    defaultValues: {
      // Map flat fields or nested JSON if API returns it
      landingPage: defaultValues.landingPage || {}
    } 
  });

  // Watch toggles for realtime switch UI
  const showPricing = watch('landingPage.showPricing');
  const showSignups = watch('landingPage.showSignups');

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Landing Page Content</CardTitle>
            <CardDescription>Customize the public facing homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hero Headline</Label>
              <Input {...register('landingPage.heroTitle')} />
            </div>
            <div className="space-y-2">
              <Label>Hero Subtext</Label>
              <Textarea {...register('landingPage.heroSubtext')} />
            </div>
            <div className="space-y-2">
              <Label>Announcement Banner</Label>
              <Input {...register('landingPage.announcement')} placeholder="e.g. New Features Live!" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Show Pricing</Label>
              <Switch checked={showPricing} onCheckedChange={(c) => setValue('landingPage.showPricing', c)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Signups</Label>
              <Switch checked={showSignups} onCheckedChange={(c) => setValue('landingPage.showSignups', c)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSaving}>Save Content</Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}

// 4. NOTIFICATIONS FORM (Fixed)
function NotificationRulesForm({ defaultValues, onSave, isSaving }: any) {
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      notifications: defaultValues.notifications || {
        newLabEmail: true,
        paymentFailedEmail: true,
        supportTicketEmail: true
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Control when Super Admins receive alerts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {[
          { id: 'newLabEmail', label: 'New Lab Registration' },
          { id: 'paymentFailedEmail', label: 'Subscription Payment Failed' },
          { id: 'supportTicketEmail', label: 'New Support Ticket Created' },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label>{item.label}</Label>
            </div>
            <Switch 
              checked={watch(`notifications.${item.id}`)} 
              onCheckedChange={(c) => setValue(`notifications.${item.id}`, c)} 
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end bg-muted/10">
        <Button onClick={handleSubmit(onSave)} disabled={isSaving}>Update Preferences</Button>
      </CardFooter>
    </Card>
  )
}

// 5. SECURITY CONTROLS (Fixed)
function SecurityControls({ defaultValues, onSave }: any) {
  // Use local state or form, simple toggles usually fine with immediate save
  const handleToggle = (key: string, value: boolean) => {
    onSave({ 
      securityConfig: {
        ...defaultValues.securityConfig,
        [key]: value
      }
    });
  };

  const config = defaultValues.securityConfig || {};

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" /> Emergency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Maintenance Mode</Label>
            <p className="text-xs text-muted-foreground">Block non-admin access</p>
          </div>
          <Switch 
            checked={config.maintenanceMode} 
            onCheckedChange={(c) => handleToggle('maintenanceMode', c)} 
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Disable Registrations</Label>
            <p className="text-xs text-muted-foreground">Stop new signups</p>
          </div>
          <Switch 
            checked={config.disableRegistrations} 
            onCheckedChange={(c) => handleToggle('disableRegistrations', c)} 
          />
        </div>
        <Separator />
        <Button variant="destructive" className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" /> Flush All Sessions
        </Button>
      </CardContent>
    </Card>
  )
}

function AuditLogViewer({ logs }: any) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Activity Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full pr-4">
          <div className="space-y-4">
            {logs?.map((log: any) => (
              <div key={log.id} className="flex flex-col gap-1 border-b pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{log.action}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), 'MMM dd, HH:mm')}</span>
                </div>
                <p className="text-sm text-muted-foreground">{log.description}</p>
              </div>
            ))}
            {!logs?.length && <div className="text-center py-10 text-muted-foreground">No logs found.</div>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function CreditCardIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
  )
}