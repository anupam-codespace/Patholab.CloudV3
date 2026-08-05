'use client';

import { useState } from 'react';
import { Loader2, MessageSquare, User, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { toast } from 'react-hot-toast';

export default function ContactModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("Message sent! We'll get back to you soon.");
        setOpen(false);
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast.error('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary"/> Contact Support</DialogTitle>
          <DialogDescription>
            Leave us a message and we'll reply via email within 24 hours.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
           <div className="space-y-1">
              <Label>Name</Label>
              <div className="relative">
                 <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                 <Input name="name" required placeholder="Your Name" className="pl-9" />
              </div>
           </div>
           <div className="space-y-1">
              <Label>Email</Label>
              <div className="relative">
                 <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                 <Input name="email" type="email" required placeholder="you@example.com" className="pl-9" />
              </div>
           </div>
           <div className="space-y-1">
              <Label>Subject</Label>
              <Input name="subject" required placeholder="How can we help?" />
           </div>
           <div className="space-y-1">
              <Label>Message</Label>
              <Textarea name="message" required placeholder="Tell us more details..." className="resize-none min-h-[100px]" />
           </div>
           <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
              Send Message
           </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}