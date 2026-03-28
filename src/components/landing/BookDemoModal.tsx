'use client';

import { useState } from 'react';
import { 
  Loader2, CheckCircle2, User, Mail, Phone, Building2, MessageSquare 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'react-hot-toast';

export default function BookDemoModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      // Calls the API route we created earlier
      const res = await fetch('/api/book-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.ok) {
        setSuccess(true);
        toast.success("Request sent successfully!");
      } else {
        throw new Error(json.error || 'Failed to send request');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset state when closing
  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setTimeout(() => setSuccess(false), 300); // Reset after animation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                 Book a Free Demo
              </DialogTitle>
              <DialogDescription>
                Fill in your details below. Our sales team will give you a personalized walkthrough of Globiz Patholab.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase text-gray-500">Full Name</Label>
                <div className="relative">
                   <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                   <Input id="name" name="name" required placeholder="Dr. John Doe" className="pl-9" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase text-gray-500">Email</Label>
                  <div className="relative">
                     <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                     <Input id="email" name="email" type="email" required placeholder="john@lab.com" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase text-gray-500">Phone</Label>
                  <div className="relative">
                     <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                     <Input id="phone" name="phone" required placeholder="9876543210" className="pl-9" maxLength={10} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="labName" className="text-xs font-bold uppercase text-gray-500">Lab / Diagnostic Center Name</Label>
                <div className="relative">
                   <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                   <Input id="labName" name="labName" placeholder="e.g. City Diagnostics" className="pl-9" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold uppercase text-gray-500">Specific Requirements (Optional)</Label>
                <div className="relative">
                   <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                   <Textarea id="message" name="message" placeholder="I am looking for features like..." className="pl-9 min-h-[80px] resize-none" />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-md font-bold shadow-lg shadow-blue-200" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Sending Request...
                    </>
                  ) : (
                    'Schedule My Demo'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 shadow-sm">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Request Received!</h2>
              <p className="text-gray-500 mt-2 max-w-[300px] mx-auto">
                Thank you for your interest. Our sales team has been notified and will contact you shortly.
              </p>
            </div>
            <Button onClick={() => setOpen(false)} variant="outline" className="mt-6 min-w-[150px]">
              Close Window
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}