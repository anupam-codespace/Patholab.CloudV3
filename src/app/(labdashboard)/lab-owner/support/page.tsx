'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, Plus, HelpCircle, Clock, CheckCircle2, AlertCircle, Send, User, X
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LabSupportPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // 1. Fetch Tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await fetch('/api/support'); 
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  // Calculate Stats
  const stats = {
    open: tickets?.filter((t: any) => t.status === 'OPEN').length || 0,
    progress: tickets?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0,
    resolved: tickets?.filter((t: any) => t.status === 'RESOLVED').length || 0,
  };

  return (
    <div className="space-y-6 p-8 min-h-screen bg-muted/5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">Get assistance with your lab operations.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg">
          <Plus className="mr-2 h-4 w-4" /> Create New Ticket
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-red-700">Open Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-800">{stats.open}</div></CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-yellow-700">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-800">{stats.progress}</div></CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-green-700">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-800">{stats.resolved}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* LEFT: Ticket List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>My Tickets</CardTitle>
            <CardDescription>Click on a ticket to view conversation.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tickets...</div>
                ) : tickets?.length > 0 ? (
                  tickets.map((ticket: any) => (
                    <div 
                      key={ticket.id} 
                      onClick={() => setSelectedTicketId(ticket.id)} // ✅ CLICK HANDLER ADDED
                    >
                      <TicketItem ticket={ticket} />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 flex flex-col items-center">
                    <HelpCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No support tickets found.</p>
                    <Button variant="link" onClick={() => setIsCreateOpen(true)}>Create your first ticket</Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* RIGHT: FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>Common Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Go to Settings &gt; Security to update your password.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Can I edit invoice settings?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Yes, under Settings &gt; Lab Profile you can update your invoice header.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* CREATE DIALOG */}
      <CreateTicketDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* ✅ DETAIL SHEET (CHAT) ADDED */}
      <TicketDetailSheet 
        ticketId={selectedTicketId} 
        onClose={() => setSelectedTicketId(null)} 
      />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TicketItem({ ticket }: any) {
  const statusStyles: any = {
    OPEN: 'bg-red-100 text-red-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    WAITING_FOR_CUSTOMER: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
  };

  return (
    <div className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium group-hover:text-primary">{ticket.subject}</span>
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">{ticket.ticketNumber}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {format(new Date(ticket.createdAt), 'MMM dd')}</span>
          <span className="flex items-center"><MessageSquare className="h-3 w-3 mr-1" /> {ticket._count?.messages || 0} msgs</span>
        </div>
      </div>
      <Badge className={`${statusStyles[ticket.status] || 'bg-gray-100'} border-none shadow-none`}>
        {ticket.status.replace(/_/g, ' ')}
      </Badge>
    </div>
  );
}

// CHAT SHEET COMPONENT
function TicketDetailSheet({ ticketId, onClose }: { ticketId: string | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket-detail', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const res = await fetch(`/api/support/${ticketId}`);
      return res.json();
    },
    enabled: !!ticketId,
    refetchInterval: 5000 
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        body: JSON.stringify({
          message: reply,
          isStaff: false, // User is sending this
          senderName: 'You' 
        })
      });
    },
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['ticket-detail'] });
      toast.success('Reply sent');
    }
  });

  if (!ticketId || !ticket) return null;

  return (
    <Sheet open={!!ticketId} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col gap-0 bg-muted/10">
        <SheetHeader className="p-6 bg-background border-b">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{ticket.ticketNumber}</Badge>
                <Badge>{ticket.status.replace(/_/g, ' ')}</Badge>
              </div>
              <SheetTitle className="text-xl">{ticket.subject}</SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {ticket.messages.map((msg: any) => (
              <div key={msg.id} className={`flex gap-3 ${!msg.isStaff ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className={!msg.isStaff ? 'bg-primary text-primary-foreground' : ''}>
                    {msg.isStaff ? 'S' : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[80%] ${!msg.isStaff ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{msg.senderName || (msg.isStaff ? 'Support' : 'You')}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                  </div>
                  <div className={`p-3 rounded-lg text-sm ${!msg.isStaff ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-white border rounded-tl-none shadow-sm'}`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 bg-background border-t">
          <div className="flex gap-2">
            <Textarea 
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              className="min-h-[80px] resize-none"
            />
            <Button size="icon" onClick={() => replyMutation.mutate()} disabled={!reply.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreateTicketDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      
      toast.success('Ticket submitted');
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
          <DialogDescription>Describe your issue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select name="category" defaultValue="TECHNICAL">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICAL">Technical</SelectItem>
                  <SelectItem value="BILLING">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue="MEDIUM">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input name="subject" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea name="description" required className="min-h-[100px]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>Submit Ticket</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}