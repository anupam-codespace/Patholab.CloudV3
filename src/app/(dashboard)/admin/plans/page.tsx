'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Edit, Trash2, Save, Check, Database, Users, 
  TestTube, Zap, MoreVertical 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- UTILS (Defined locally to prevent import errors) ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- TYPES ---
interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  billingCycle: string;
  features: string[] | string; // Handle both DB formats
  maxTests: number;
  maxStaff: number;
  maxStorageGB: number;
  hasAnalytics: boolean;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  isActive: boolean;
  isPopular: boolean;
}

export default function AdminPlansPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Initial Form State
  const initialFormState = {
    name: '',
    displayName: '',
    description: '',
    price: 0,
    billingCycle: 'MONTHLY',
    features: '',
    maxTests: 100,
    maxStaff: 5,
    storageGB: 5, 
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    isActive: true,
    isPopular: false,
  };

  const [formData, setFormData] = useState(initialFormState);

  // 1. Fetch Plans
  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
  });

  // 2. Mutations Configuration
  const mutationConfig = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success(editingId ? 'Plan updated successfully' : 'Plan created successfully');
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Operation failed'),
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    ...mutationConfig
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    ...mutationConfig
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success('Plan deleted');
    },
    onError: (err: any) => toast.error(err.message)
  });

  // 3. Handlers
  const resetForm = () => {
    setFormData(initialFormState);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (plan: Plan) => {
    setEditingId(plan.id);
    
    // Safely handle features parsing
    let featuresStr = '';
    if (Array.isArray(plan.features)) {
      featuresStr = plan.features.join('\n');
    } else if (typeof plan.features === 'string') {
      try {
        const parsed = JSON.parse(plan.features);
        if (Array.isArray(parsed)) featuresStr = parsed.join('\n');
      } catch (e) {
        featuresStr = plan.features; // Fallback
      }
    }

    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: featuresStr,
      maxTests: plan.maxTests,
      maxStaff: plan.maxStaff,
      storageGB: plan.maxStorageGB, // Note mapping here
      hasAnalytics: plan.hasAnalytics,
      hasApiAccess: plan.hasApiAccess,
      hasWhiteLabel: plan.hasWhiteLabel,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
    });
    setIsCreating(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const featuresArray = formData.features.split('\n').filter((f) => f.trim().length > 0);
    
    const payload = {
      ...formData,
      features: JSON.stringify(featuresArray),
      price: Number(formData.price),
      maxTests: Number(formData.maxTests),
      maxStaff: Number(formData.maxStaff),
      storageGB: Number(formData.storageGB),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading plans configuration...</div>;

  return (
    <div className="space-y-8 p-8 min-h-screen bg-muted/5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="text-muted-foreground">Configure SaaS tiers, pricing, and feature limits.</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Create New Plan
          </Button>
        )}
      </div>

      {/* --- CREATE / EDIT FORM --- */}
      {isCreating && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle>{editingId ? 'Edit Plan Configuration' : 'Design New Plan'}</CardTitle>
              <CardDescription>Set pricing, limits, and toggle features.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Section 1: Basic Info */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Display Name <span className="text-red-500">*</span></Label>
                    <Input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="e.g. Enterprise Gold" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Internal ID (Slug) <span className="text-red-500">*</span></Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. gold_monthly" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₹) <span className="text-red-500">*</span></Label>
                    <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
                      value={formData.billingCycle}
                      onChange={e => setFormData({...formData, billingCycle: e.target.value})}
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Short Description</Label>
                    <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Best for scaling labs..." />
                  </div>
                </div>

                <div className="h-[1px] bg-border" />

                {/* Section 2: Limits */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Database className="h-4 w-4" /> Resource Limits</h3>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Max Tests/Mo (-1 for Unlimited)</Label>
                      <Input type="number" value={formData.maxTests} onChange={e => setFormData({...formData, maxTests: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Staff Accounts</Label>
                      <Input type="number" value={formData.maxStaff} onChange={e => setFormData({...formData, maxStaff: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Storage Limit (GB)</Label>
                      <Input type="number" value={formData.storageGB} onChange={e => setFormData({...formData, storageGB: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-border" />

                {/* Section 3: Features */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Feature List (One per line)</Label>
                    <textarea 
                      className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.features}
                      onChange={e => setFormData({...formData, features: e.target.value})}
                      placeholder="• 24/7 Priority Support&#10;• Custom Branding&#10;• AI Insights"
                    />
                    <p className="text-xs text-muted-foreground">These will appear as checkmarks on the pricing card.</p>
                  </div>
                  
                  <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                    <Label>Advanced Capabilities</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleItem label="Analytics Module" checked={formData.hasAnalytics} onChange={c => setFormData({...formData, hasAnalytics: c})} />
                      <ToggleItem label="API Access" checked={formData.hasApiAccess} onChange={c => setFormData({...formData, hasApiAccess: c})} />
                      <ToggleItem label="White Labeling" checked={formData.hasWhiteLabel} onChange={c => setFormData({...formData, hasWhiteLabel: c})} />
                      <div className="h-[1px] col-span-2 bg-border my-1" />
                      <ToggleItem label="Mark as Popular" checked={formData.isPopular} onChange={c => setFormData({...formData, isPopular: c})} />
                      <ToggleItem label="Plan Active" checked={formData.isActive} onChange={c => setFormData({...formData, isActive: c})} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {editingId ? 'Save Changes' : 'Create Plan'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* --- PLAN CARDS GRID --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.plans?.map((plan: Plan) => (
          <motion.div 
            key={plan.id} 
            whileHover={{ y: -5 }} 
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className={`relative flex flex-col h-full overflow-hidden ${plan.isPopular ? 'border-primary shadow-md' : 'hover:border-primary/50'}`}>
              
              {/* Popular Ribbon */}
              {plan.isPopular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Most Popular
                  </div>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant={plan.isActive ? 'outline' : 'destructive'} className="text-[10px] font-normal">
                    {plan.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(plan)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Configuration
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => deleteMutation.mutate(plan.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardTitle className="text-xl font-bold">{plan.displayName}</CardTitle>
                <CardDescription className="line-clamp-2 h-10 mt-1">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                {/* Price */}
                <div className="flex items-baseline">
                  <span className="text-3xl font-extrabold">{formatCurrency(plan.price)}</span>
                  <span className="text-muted-foreground text-sm ml-1">/{plan.billingCycle.toLowerCase()}</span>
                </div>

                {/* Limits Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TestTube className="h-4 w-4 text-primary" />
                    <span>{plan.maxTests === -1 ? '∞' : plan.maxTests} Tests</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{plan.maxStaff === -1 ? '∞' : plan.maxStaff} Staff</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Database className="h-4 w-4 text-primary" />
                    <span>{plan.maxStorageGB} GB</span>
                  </div>
                  {plan.hasApiAccess && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>API</span>
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-2 border-t pt-4">
                  {(Array.isArray(plan.features) ? plan.features : []).slice(0, 4).map((feat: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-green-600" />
                      </div>
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                  {/* Handle JSON/String Features if mixing DB versions */}
                  {(!Array.isArray(plan.features) && typeof plan.features === 'string') && (
                     <p className="text-xs text-muted-foreground italic">Custom features set</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="bg-muted/20 pt-4">
                <Button variant={plan.isPopular ? 'default' : 'outline'} className="w-full" onClick={() => handleEdit(plan)}>
                  Manage Plan
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- HELPER ---
function ToggleItem({ label, checked, onChange }: { label: string, checked: boolean, onChange: (c: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={`toggle-${label}`} className="text-sm cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} id={`toggle-${label}`} />
    </div>
  );
}