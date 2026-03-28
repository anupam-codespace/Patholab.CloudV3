// FILE: src/app/pricing/page.tsx
// Pricing Page with Plans
// ==========================================
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function PricingPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await fetch('/api/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return response.json();
    },
  });

  const handleSelectPlan = (planId: string) => {
    // Check if user is logged in
    const token = document.cookie.includes('token=');
    if (!token) {
      toast.error('Please login to subscribe');
      router.push('/login');
      return;
    }
    router.push(`/checkout?planId=${planId}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Select the perfect plan for your laboratory
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {data?.plans?.map((plan: any) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.isPopular ? 'border-primary shadow-lg' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="mb-4">
                  <span className="text-4xl font-bold">₹{plan.price}</span>
                  <span className="text-muted-foreground">
                    /{plan.billingCycle.toLowerCase()}
                  </span>
                </div>

                <ul className="space-y-2">
                  {JSON.parse(plan.features).map((feature: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <Check className="mr-2 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.isPopular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}