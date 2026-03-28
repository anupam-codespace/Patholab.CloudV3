"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Phone,
  Lock,
  Search,
  FileText,
  Activity,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

export default function PatientPortalHome() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"LOGIN" | "TRACK">("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [loginData, setLoginData] = useState({ phone: "", password: "" });
  const [trackData, setTrackData] = useState({ id: "" });

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // API Call Simulation
      const res = await fetch("/api/patient/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login failed");

      toast.success("Welcome back!");
      router.push("/patient/dashboard"); // Redirect to dashboard
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quick Track
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackData.id)
      return toast.error("Please enter a Patient ID or Invoice Number");

    setIsLoading(true);
    // Simulate lookup delay
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to public report view
      window.open(`/report/${trackData.id}`, "_blank");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* NAVBAR */}
      <nav className="w-full bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            G
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-none">
              Globiz Patholab
            </h1>
            <p className="text-xs text-slate-500 font-medium">Patient Portal</p>
          </div>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-blue-600 transition-colors">
            Home Collection
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            Health Packages
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            Contact Support
          </a>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* LEFT SIDE: Hero / Info */}
        <div className="w-full md:w-1/2 lg:w-3/5 bg-slate-900 text-white p-8 md:p-16 flex flex-col justify-center relative overflow-hidden">
          {/* Abstract Background Graphic */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600 rounded-full blur-3xl opacity-20"></div>

          <div className="relative z-10 max-w-lg">
            <span className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-xs font-bold mb-6 tracking-wide">
              SECURE • FAST • RELIABLE
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Your Health Records, <br />
              <span className="text-blue-400">Accessible Anywhere.</span>
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Download your lab reports instantly, track status in real-time,
              and manage your family's health history securely from one place.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Smart Reports</h4>
                  <p className="text-xs text-slate-400">
                    Easy to read digital reports with historical trends.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Data Privacy</h4>
                  <p className="text-xs text-slate-400">
                    Your medical data is encrypted and secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Login / Action Form */}
        <div className="w-full md:w-1/2 lg:w-2/5 p-6 md:p-12 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* TABS */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
              <button
                onClick={() => setActiveTab("LOGIN")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  activeTab === "LOGIN"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                Patient Login
              </button>
              <button
                onClick={() => setActiveTab("TRACK")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  activeTab === "TRACK"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                Quick Track Report
              </button>
            </div>

            {/* FORM: LOGIN */}
            {activeTab === "LOGIN" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Welcome Back
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Enter your registered mobile number to access your
                    dashboard.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
                        className="pl-10"
                        value={loginData.phone}
                        onChange={(e) =>
                          setLoginData({ ...loginData, phone: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Password</Label>
                      <a
                        href="#"
                        className="text-xs text-blue-600 font-medium hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base"
                    disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Secure Login"
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm text-slate-500">
                  New to Globiz Patholab?{" "}
                  <a
                    href="#"
                    className="text-blue-600 font-bold hover:underline">
                    Book a Test
                  </a>
                </div>
              </div>
            )}

            {/* FORM: TRACK */}
            {activeTab === "TRACK" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Track Your Report
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    View your report status instantly without logging in.
                  </p>
                </div>

                <form onSubmit={handleTrack} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                    <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      You can find your <strong>Patient ID (PID)</strong> or{" "}
                      <strong>Invoice Number</strong> on the receipt provided
                      during sample collection.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trackId">Patient ID / Invoice No</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="trackId"
                        placeholder="e.g. P-00123 or INV-2025-1001"
                        className="pl-10 uppercase"
                        value={trackData.id}
                        onChange={(e) =>
                          setTrackData({ ...trackData, id: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 h-11 text-base"
                    disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center">
                        View Status <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; 2026 Globiz Patholab. All rights reserved. <br />
            <span className="mt-1 inline-block">
              ISO 9001:2015 Certified Lab
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
