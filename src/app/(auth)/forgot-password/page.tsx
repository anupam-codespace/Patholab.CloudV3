'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Activity, Loader2, Mail, ArrowRight, Lock, KeyRound, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

// Schemas
const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  otp: z.string().min(6),
  newPassword: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string()
}).refine(d => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: "Mismatch" });

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Email, 2: Reset
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [timer, setTimer] = useState(0);

  // Forms
  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Actions
  const onSendOtp = async (data: any) => {
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      // Always show success for security
      toast.success(`If account exists, OTP sent to ${data.email}`);
      setEmail(data.email);
      setStep(2);
      setTimer(60);
    } catch (e) { toast.error("Error sending code"); }
    finally { setLoading(false); }
  };

  const onReset = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, ...data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success("Password updated!");
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-blob"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-white/50 backdrop-blur-md bg-white/80 z-10">
        <CardContent className="p-8 min-h-[400px]">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Recover Account</h1>
            <p className="text-sm text-muted-foreground">
              {step === 1 ? "Enter email to receive reset code" : `Code sent to ${email}`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            
            {/* STEP 1: EMAIL */}
            {step === 1 && (
              <motion.form 
                key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-6"
              >
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input {...emailForm.register('email')} className="pl-10" placeholder="john@lab.com" />
                  </div>
                  {emailForm.formState.errors.email && <p className="text-xs text-red-500">Valid email required</p>}
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Send Reset Code"}
                </Button>
              </motion.form>
            )}

            {/* STEP 2: RESET */}
            {step === 2 && (
              <motion.form 
                key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={resetForm.handleSubmit(onReset)} className="space-y-5"
              >
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input {...resetForm.register('otp')} className="text-center text-xl letter-spacing-4" placeholder="000000" maxLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" {...resetForm.register('newPassword')} placeholder="Min 8 chars" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" {...resetForm.register('confirmPassword')} />
                  {resetForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">Mismatch</p>}
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Reset Password"}
                </Button>

                <div className="text-center text-sm">
                  <button type="button" onClick={() => onSendOtp({ email })} disabled={timer > 0} className={`flex items-center justify-center gap-1 w-full ${timer > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'}`}>
                    {timer > 0 ? `Resend in ${timer}s` : <><RotateCcw className="h-3 w-3" /> Resend Code</>}
                  </button>
                </div>
              </motion.form>
            )}

          </AnimatePresence>

          <div className="mt-6 pt-6 border-t text-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-2">
              <ArrowRight className="h-4 w-4 rotate-180" /> Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}