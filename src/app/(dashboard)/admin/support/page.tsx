'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, User, Clock, CheckCircle2, AlertCircle, 
  Search, Filter, Send, Phone, Mail, Building2, MoreVertical 
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Separator } from '@/components/ui/separator';

export default function AdminSupportPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch Tickets List
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: async () => {
      // In a real app, we'd pass a header to identify as admin
      const res = await fetch(`/api/support?status=${statusFilter}`, {
        headers: { 'x-is-admin': 'true' }
      });
      return res.json();
    }
  });

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-4 p-8 bg-muted/5">
      
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Desk</h1>
          <p className="text-muted-foreground">Manage and resolve customer inquiries.</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets Grid */}
      <ScrollArea className="h-full">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="p-8 text-center col-span-full">Loading tickets...</div>
          ) : tickets?.map((ticket: any) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              onClick={() => setSelectedTicketId(ticket.id)} 
            />
          ))}
        </div>
      </ScrollArea>

      {/* Detail View (Slide Over) */}
      <TicketDetailSheet 
        ticketId={selectedTicketId} 
        onClose={() => setSelectedTicketId(null)} 
      />
    </div>
  );
}

// --- SUB-COMPONENT: TICKET CARD ---
function TicketCard({ ticket, onClick }: any) {
  const priorityColors = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  };

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors group relative overflow-hidden"
      onClick={onClick}
    >
      {/* Status Stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${ticket.status === 'OPEN' ? 'bg-red-500' : 'bg-green-500'}`} />
      
      <CardHeader className="pb-2 pl-6">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="font-mono text-[10px]">
            {ticket.ticketNumber}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(ticket.updatedAt), 'MMM dd')}
          </span>
        </div>
        <CardTitle className="text-base line-clamp-1 group-hover:text-primary">
          {ticket.subject}
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-6 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {ticket.description}
        </p>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">{ticket.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">{ticket.user.name}</span>
          <span className="text-xs text-muted-foreground">• {ticket.user.lab?.name || 'No Lab'}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Badge className={`text-[10px] border-none ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}>
            {ticket.priority}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {ticket.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// --- SUB-COMPONENT: TICKET DETAIL SHEET (The Chat Interface) ---
function TicketDetailSheet({ ticketId, onClose }: { ticketId: string | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  // 1. Fetch Full Details
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket-detail', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const res = await fetch(`/api/support/${ticketId}`);
      return res.json();
    },
    enabled: !!ticketId,
    refetchInterval: 5000 // Poll for new messages every 5s
  });

  // 2. Mutations
  const replyMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        body: JSON.stringify({
          message: reply,
          isStaff: true, // Admin replying
          senderName: 'Support Agent' // Use real admin name
        })
      });
    },
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['ticket-detail'] });
      toast.success('Reply sent');
    }
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await fetch(`/api/support/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('Status updated');
    }
  });

  if (!ticketId || !ticket) return null;

  return (
    <Sheet open={!!ticketId} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col gap-0 bg-muted/10">
        
        {/* Header Section */}
        <SheetHeader className="p-6 bg-background border-b">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{ticket.ticketNumber}</Badge>
                <Badge className={ticket.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                  {ticket.status}
                </Badge>
              </div>
              <SheetTitle className="text-xl">{ticket.subject}</SheetTitle>
            </div>
            
            <Select 
              defaultValue={ticket.status} 
              onValueChange={(v) => statusMutation.mutate(v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING_FOR_CUSTOMER">Waiting</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Context */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm border grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">{ticket.user.name}</span>
                <span className="text-xs text-muted-foreground">{ticket.user.role}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">{ticket.user.lab?.name || 'N/A'}</span>
                <span className="text-xs text-muted-foreground">Tenant</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${ticket.user.email}`} className="hover:underline">{ticket.user.email}</a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{ticket.user.phone || 'N/A'}</span>
            </div>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {ticket.messages.map((msg: any) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.isStaff ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className={msg.isStaff ? 'bg-primary text-primary-foreground' : ''}>
                    {msg.senderName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[80%] ${msg.isStaff ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{msg.senderName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </span>
                  </div>
                  <div className={`p-3 rounded-lg text-sm ${
                    msg.isStaff 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-white border rounded-tl-none shadow-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Reply Box */}
        <div className="p-4 bg-background border-t">
          <div className="flex gap-2">
            <Textarea 
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex flex-col gap-2">
              <Button 
                size="icon" 
                onClick={() => replyMutation.mutate()}
                disabled={!reply.trim() || replyMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
              {/* Optional: Add Internal Note Button */}
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex justify-between">
            <span>Press Enter to send</span>
            <span>Visible to customer</span>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}