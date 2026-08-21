'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  MessageSquare, Plus, HelpCircle, Clock, CheckCircle2, AlertCircle, Send
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

// --- TYPESCRIPT INTERFACES & SCHEMA ---
export interface Message {
  id: string;
  ticketId: string;
  message: string;
  isStaff: boolean;
  senderName: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED';
  category: 'TECHNICAL' | 'BILLING';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  _count?: { messages: number };
  messages?: Message[];
}

const createTicketSchema = z.object({
  category: z.enum(['TECHNICAL', 'BILLING']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(10, "Please provide a bit more detail (min 10 characters)"),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

// --- MAIN COMPONENT ---
function LabSupportContent() {
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState<'TECHNICAL' | 'BILLING'>('TECHNICAL');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Automatically open ticket modal when navigating via deep-link or action query param
  useEffect(() => {
    const action = searchParams?.get('action');
    const newTicket = searchParams?.get('newTicket');
    const create = searchParams?.get('create');
    const category = searchParams?.get('category');

    if (action === 'new-ticket' || action === 'new' || newTicket === 'true' || create === 'true') {
      if (category === 'BILLING') {
        setInitialCategory('BILLING');
      } else {
        setInitialCategory('TECHNICAL');
      }
      setIsCreateOpen(true);
    }
  }, [searchParams]);
  
  // Fetch Tickets
  const { data: tickets, isLoading, isError } = useQuery<Ticket[]>({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await fetch('/api/support'); 
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const stats = {
    open: tickets?.filter((t) => t.status === 'OPEN').length || 0,
    progress: tickets?.filter((t) => t.status === 'IN_PROGRESS').length || 0,
    resolved: tickets?.filter((t) => t.status === 'RESOLVED').length || 0,
  };

  return (
    <div className="space-y-6 p-8 min-h-screen bg-muted/5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">Get assistance with your lab operations.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg bg-blue-600 hover:bg-blue-700">
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
                ) : isError ? (
                  <div className="text-center py-8 text-red-500 flex flex-col items-center">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>Failed to load tickets. Please refresh the page.</p>
                  </div>
                ) : tickets?.length && tickets.length > 0 ? (
                  tickets.map((ticket) => (
                    <div 
                      key={ticket.id} 
                      onClick={() => setSelectedTicketId(ticket.id)}
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

      <CreateTicketDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        initialCategory={initialCategory} 
      />
      <TicketDetailSheet ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
    </div>
  );
}

export default function LabSupportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading support center...</div>}>
      <LabSupportContent />
    </Suspense>
  );
}

// --- SUB-COMPONENTS ---

function TicketItem({ ticket }: { ticket: Ticket }) {
  const statusStyles: Record<string, string> = {
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

// CHAT SHEET COMPONENT (Optimistic Updates Included)
function TicketDetailSheet({ ticketId, onClose }: { ticketId: string | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data: ticket } = useQuery<Ticket>({
    queryKey: ['ticket-detail', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const res = await fetch(`/api/support/${ticketId}`);
      if (!res.ok) throw new Error('Failed to fetch ticket detail');
      return res.json();
    },
    enabled: !!ticketId,
    refetchInterval: 5000 
  });

  const replyMutation = useMutation({
    mutationFn: async (newMessage: string) => {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage, isStaff: false, senderName: 'You' })
      });
      if (!res.ok) throw new Error('Failed to send');
      return res.json();
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ['ticket-detail', ticketId] });
      const previousTicket = queryClient.getQueryData<Ticket>(['ticket-detail', ticketId]);

      if (previousTicket) {
        queryClient.setQueryData<Ticket>(['ticket-detail', ticketId], {
          ...previousTicket,
          messages: [
            ...(previousTicket.messages || []),
            {
              id: `temp-${Date.now()}`,
              ticketId: ticketId as string,
              message: newMessage,
              isStaff: false,
              senderName: 'You',
              createdAt: new Date().toISOString()
            }
          ]
        });
      }
      return { previousTicket };
    },
    onError: (err, newMsg, context) => {
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket-detail', ticketId], context.previousTicket);
      }
      toast.error('Failed to send reply');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] }); 
    }
  });

  const handleSendReply = () => {
    if (!reply.trim()) return;
    replyMutation.mutate(reply);
    setReply(''); 
  };

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
            {ticket.messages?.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${!msg.isStaff ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className={!msg.isStaff ? 'bg-blue-600 text-white' : 'bg-slate-200'}>
                    {msg.isStaff ? 'S' : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[80%] ${!msg.isStaff ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{msg.senderName || (msg.isStaff ? 'Support' : 'You')}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                  </div>
                  <div className={`p-3 rounded-lg text-sm shadow-sm ${!msg.isStaff ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border rounded-tl-none'}`}>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder="Type your reply..."
              className="min-h-[80px] resize-none"
            />
            <Button size="icon" onClick={handleSendReply} disabled={!reply.trim() || replyMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ZOD POWERED CREATE DIALOG
function CreateTicketDialog({ 
  open, 
  onOpenChange,
  initialCategory = 'TECHNICAL'
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  initialCategory?: 'TECHNICAL' | 'BILLING';
}) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      category: initialCategory,
      priority: 'MEDIUM',
      subject: '',
      description: ''
    }
  });

  useEffect(() => {
    if (open) {
      setValue('category', initialCategory);
    }
  }, [open, initialCategory, setValue]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateTicketFormData) => {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Ticket submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to submit ticket');
    }
  });

  const onSubmit = (data: CreateTicketFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
          <DialogDescription>Describe your issue and our team will help you shortly.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch('category')} onValueChange={(v: any) => setValue('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICAL">Technical Issue / Bug Report</SelectItem>
                  <SelectItem value="BILLING">Billing / Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={watch('priority')} onValueChange={(v: any) => setValue('priority', v)}>
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
            <Label>Subject <span className="text-red-500">*</span></Label>
            <Input {...register('subject')} className={errors.subject ? "border-red-500" : ""} />
            {errors.subject && <p className="text-[10px] text-red-500">{errors.subject.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea {...register('description')} className={`min-h-[100px] ${errors.description ? "border-red-500" : ""}`} />
            {errors.description && <p className="text-[10px] text-red-500">{errors.description.message}</p>}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}