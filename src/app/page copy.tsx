// ==========================================
// FILE: src/app/page.tsx
// Complete Landing Page with Animations & Dynamic Pricing
// ==========================================
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TestTube,
  Shield,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  Zap,
  BarChart3,
  Smartphone,
  Globe,
  Lock,
  HeartPulse,
  Activity,
  FileText,
  Check,
  ArrowRight,
  Star,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Fetch plans from database
  const { data: plansData, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const response = await fetch("/api/plans");
      if (!response.ok) throw new Error("Failed to fetch plans");
      return response.json();
    },
  });

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative">
              <TestTube className="h-8 w-8 text-primary" />
              <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-green-500" />
            </div>
            <span className="text-xl font-bold">Patholab</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="#features"
              className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium hover:text-primary transition-colors">
              Testimonials
            </Link>
            <Link
              href="#contact"
              className="text-sm font-medium hover:text-primary transition-colors">
              Contact
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute left-0 top-0 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl" />
          <div
            className="absolute right-0 bottom-0 h-96 w-96 animate-pulse rounded-full bg-secondary/10 blur-3xl"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="container px-4">
          <div
            className={`mx-auto max-w-4xl text-center transition-all duration-1000 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary animate-bounce">
              <Zap className="mr-2 h-4 w-4" />
              Trusted by 500+ Laboratories Worldwide
            </div>

            {/* Main Heading */}
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
              Transform Your Laboratory with
              <span className="block bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient">
                Patholab
              </span>
            </h1>

            <p className="mb-8 text-lg text-muted-foreground sm:text-xl md:text-2xl">
              Complete SaaS solution for modern laboratories. Streamline
              operations, manage tests, track patients, and grow your business
              with powerful analytics.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="text-base px-8 h-12 group">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-12">
                  View Pricing
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50 py-12">
        <div className="container px-4">
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { label: "Active Labs", value: "500+", icon: TestTube },
              { label: "Tests Processed", value: "1M+", icon: Activity },
              { label: "Countries", value: "25+", icon: Globe },
              { label: "Uptime", value: "99.9%", icon: Zap },
            ].map((stat, index) => (
              <div
                key={index}
                className="text-center transition-transform hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}>
                <stat.icon className="mx-auto mb-2 h-8 w-8 text-primary" />
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Powerful features designed specifically for modern laboratories
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: TestTube,
                title: "Complete Test Management",
                description:
                  "Manage entire workflow from sample collection to report delivery with automated tracking.",
                color: "text-blue-500",
              },
              {
                icon: Users,
                title: "Patient Management",
                description:
                  "Easy patient registration, history tracking, and appointment scheduling system.",
                color: "text-green-500",
              },
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description:
                  "Real-time insights with beautiful dashboards and comprehensive reports.",
                color: "text-purple-500",
              },
              {
                icon: Shield,
                title: "Secure & Compliant",
                description:
                  "HIPAA compliant with enterprise-grade security and data encryption.",
                color: "text-red-500",
              },
              {
                icon: Clock,
                title: "Real-time Updates",
                description:
                  "Get instant notifications on test status changes and important events.",
                color: "text-yellow-500",
              },
              {
                icon: Smartphone,
                title: "Mobile Friendly",
                description:
                  "Access your lab from anywhere with our responsive mobile interface.",
                color: "text-pink-500",
              },
              {
                icon: HeartPulse,
                title: "Quality Control",
                description:
                  "Built-in quality control measures and validation protocols.",
                color: "text-cyan-500",
              },
              {
                icon: FileText,
                title: "Report Generation",
                description:
                  "Professional report templates with customization options.",
                color: "text-orange-500",
              },
              {
                icon: Lock,
                title: "Role-Based Access",
                description:
                  "Granular permissions for different staff roles and responsibilities.",
                color: "text-indigo-500",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <feature.icon
                    className={`mb-2 h-10 w-10 ${feature.color} transition-transform group-hover:scale-110`}
                  />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/30 py-20">
        <div className="container px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Choose the perfect plan for your laboratory. All plans include
              14-day free trial.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {plansData?.plans?.map((plan: any, index: number) => {
                // --- FIX START ---
                let features = [];
                try {
                  // Check if it's a string before parsing.
                  // If it's already an array/object, use it directly.
                  features =
                    typeof plan.features === "string"
                      ? JSON.parse(plan.features)
                      : plan.features;

                  // specific check to ensure it ended up as an array
                  if (!Array.isArray(features)) features = [];
                } catch (error) {
                  console.error("Error parsing plan features:", error);
                  features = []; // Fallback to avoid crashing the UI
                }
                // --- FIX END ---
                return (
                  <Card
                    key={plan.id}
                    className={`relative transition-all hover:shadow-xl hover:-translate-y-2 ${
                      plan.isPopular ? "border-primary shadow-lg" : ""
                    }`}>
                    {plan.isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="flex items-center rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                          <Star className="mr-1 h-4 w-4" />
                          Most Popular
                        </span>
                      </div>
                    )}

                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-2xl">
                        {plan.displayName}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {plan.description}
                      </CardDescription>
                      <div className="mt-6">
                        <span className="text-5xl font-bold">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-muted-foreground">
                          /{plan.billingCycle.toLowerCase()}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <ul className="space-y-3">
                        {features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <Check className="mr-2 h-5 w-5 flex-shrink-0 text-primary" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Link href="/register" className="w-full">
                        <Button
                          className="w-full"
                          variant={plan.isPopular ? "default" : "outline"}>
                          Get Started
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="container px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Loved by Laboratories
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              See what our customers have to say about Patholab
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Dr. Rajesh Kumar",
                role: "Lab Director, HealthCare Diagnostics",
                content:
                  "Patholab transformed our laboratory operations. The automation saved us countless hours and improved accuracy significantly.",
                rating: 5,
              },
              {
                name: "Dr. Priya Sharma",
                role: "Owner, MediTest Lab",
                content:
                  "The analytics dashboard gives us insights we never had before. We can now make data-driven decisions to grow our business.",
                rating: 5,
              },
              {
                name: "Dr. Amit Patel",
                role: "Pathologist, CityLab Services",
                content:
                  "Customer support is exceptional. Any issues are resolved quickly, and the platform is constantly improving with new features.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <CardDescription className="text-base italic">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Ready to Transform Your Lab?
          </h2>
          <p className="mb-8 text-lg opacity-90">
            Join hundreds of laboratories already using Patholab
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-base px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="#contact">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <TestTube className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">Patholab</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Modern laboratory management system for the digital age.
              </p>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-muted-foreground hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            © 2026 Patholab. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
