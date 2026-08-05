'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function LeadsPage() {
  const queryClient = useQueryClient();

  // Fetch Leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: async () => {
      const res = await fetch('/api/admin/leads');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  // Update Status Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await fetch('/api/admin/leads', {
        method: 'PATCH',
        body: JSON.stringify({ id, status })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      toast.success('Status updated');
    }
  });

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads & Requests</h1>
          <p className="text-muted-foreground">Manage incoming demo requests from the landing page.</p>
        </div>
        <div className="bg-card px-4 py-2 rounded-lg border shadow-sm">
            <span className="text-sm font-bold text-muted-foreground uppercase mr-2">Total Leads</span>
            <span className="text-xl font-bold text-primary">{leads?.length || 0}</span>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Contact Info</TableHead>
                <TableHead>Lab Details</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((lead: any) => (
                <TableRow key={lead.id} className="group">
                  <TableCell>
                    <div className="font-bold text-foreground">{lead.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3"/> {lead.email}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3"/> {lead.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{lead.labName || '-'}</div>
                    <Badge variant="outline" className="text-[10px] mt-1">{lead.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground max-w-xs truncate" title={lead.message}>
                        {lead.message || 'No message provided'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                        defaultValue={lead.status} 
                        onValueChange={(val) => statusMutation.mutate({ id: lead.id, status: val })}
                    >
                        <SelectTrigger className={`h-8 w-32 border-0 font-bold text-xs ${
                            lead.status === 'NEW' ? 'bg-blue-100 text-primary' :
                            lead.status === 'CONTACTED' ? 'bg-orange-100 text-orange-700' :
                            lead.status === 'CONVERTED' ? 'bg-green-100 text-green-700' :
                            'bg-muted text-slate-600'
                        }`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NEW">New</SelectItem>
                            <SelectItem value="CONTACTED">Contacted</SelectItem>
                            <SelectItem value="CONVERTED">Converted</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground font-mono">
                        {format(new Date(lead.createdAt), 'dd MMM yyyy')}
                        <div className="text-[10px] opacity-70">{format(new Date(lead.createdAt), 'hh:mm a')}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leads?.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No leads found yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}