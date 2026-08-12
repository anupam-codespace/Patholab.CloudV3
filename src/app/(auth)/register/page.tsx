"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    labName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pwdStrength, setPwdStrength] = useState({
    score: 0,
    text: "",
    color: "bg-slate-200",
  });

  // Handle Input Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Password Strength Calculator
  useEffect(() => {
    const pwd = formData.password;
    if (!pwd) {
      setPwdStrength({ score: 0, text: "", color: "bg-slate-200" });
      return;
    }

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1)
      setPwdStrength({ score: 1, text: "Weak", color: "bg-red-500" });
    else if (score === 2)
      setPwdStrength({ score: 2, text: "Fair", color: "bg-amber-500" });
    else if (score === 3)
      setPwdStrength({ score: 3, text: "Good", color: "bg-blue-500" });
    else setPwdStrength({ score: 4, text: "Strong", color: "bg-emerald-500" });
  }, [formData.password]);

  // Client-side Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.labName.trim()) errors.labName = "Lab name is required";
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      errors.email = "Valid email is required";
    // Made phone number mandatory and validated
    if (!formData.phone.trim() || !/^[6-9]\d{9}$/.test(formData.phone.trim()))
      errors.phone = "Valid 10-digit mobile number is required";

    if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labName: formData.labName,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      // Redirect to verification with the email
      router.push(`/verify?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setGlobalError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans overflow-hidden">
      {/* ========================================================= */}
      {/* LEFT COLUMN: Registration Form (Mobile Friendly)            */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 sm:px-12 md:px-20 py-8 lg:py-10 relative z-10 bg-white overflow-y-auto">
        {/* 1. TOP LOGO AREA */}
        <div className="flex items-center gap-3 mb-8 lg:mb-0">
          <img
            src="/images/patholab-logo.jpg"
            alt="Patholab.cloud Logo"
            className="h-10 md:h-12 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement?.classList.add("fallback-logo");
            }}
          />
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight hidden fallback-logo-text">
            Patholab.cloud
          </span>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Join 500+ premium labs scaling with the Patholab ecosystem.
            </p>
          </div>

          {/* Global API Error */}
          {globalError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-800">
                  Registration Failed
                </h3>
                <p className="text-xs text-red-600 mt-1">{globalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Lab Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Lab / Organization Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="labName"
                  value={formData.labName}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 transition-all outline-none
                    ${fieldErrors.labName ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  placeholder="e.g. Apex Diagnostics"
                />
              </div>
              {fieldErrors.labName && (
                <p className="text-red-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.labName}
                </p>
              )}
            </div>

            {/* Row: Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 transition-all outline-none
                      ${fieldErrors.name ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"}`}
                    placeholder="Dr. John Doe"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-red-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                {/* Made phone field mandatory in UI */}
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 transition-all outline-none
                      ${fieldErrors.phone ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"}`}
                    placeholder="98765 43210"
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-red-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 transition-all outline-none
                    ${fieldErrors.email ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  placeholder="admin@apexdiagnostics.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-red-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Row: Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 transition-all outline-none
                      ${fieldErrors.password ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="mt-2 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-100">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 transition-colors duration-500 ${pwdStrength.score >= level ? pwdStrength.color : "bg-transparent"}`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${pwdStrength.score < 2 ? "text-red-500" : pwdStrength.score < 4 ? "text-amber-500" : "text-emerald-500"}`}>
                      {pwdStrength.text}
                    </p>
                  </div>
                )}
                {fieldErrors.password && (
                  <p className="text-red-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 transition-all outline-none
                      ${fieldErrors.confirmPassword ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }>
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{" "}
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex justify-center items-center mt-8 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Free Account"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-2">
                Log in here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer & Trust Badges */}
        <div className="mt-8 lg:mt-0 space-y-8">
          {/* 2. MAKE IN INDIA & ISO LOGO GRID */}
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8 opacity-75 grayscale hover:grayscale-0 transition-all duration-500 select-none">
            {/* Make in India */}
            <img
              src="/images/make-in-india.png"
              alt="Make in India"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
            {/* ISO 9001:2015 */}
            <img
              src="/images/iso-9001.png"
              alt="ISO 9001:2015"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
            {/* ISO/IEC 27001:2022 */}
            <img
              src="/images/iso-27001.png"
              alt="ISO/IEC 27001:2022"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
            {/* ISO 20000-1:2018 */}
            <img
              src="/images/iso-20000.png"
              alt="ISO 20000-1:2018"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
          </div>

          {/* YOUR SPECIFIC FOOTER LINKS APPLIED HERE */}
          <div className="flex items-center justify-center gap-5 text-[12px] font-semibold text-slate-400">
            <Link
              href="https://patholab.cloud/privacy-policy"
              className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <Link
              href="https://patholab.cloud/terms-and-conditions"
              className="hover:text-slate-600 transition-colors">
              Terms of Service
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <Link
              href="https://wa.me/918402010207?text=Hi,%20I%20am%20interested%20in%20Patholab.cloud%20software.%20I%20want%20to%20book%20a%20free%20demo."
              className="hover:text-slate-600 transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Desktop Image & Marketing                   */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        {/* 3. YOUR CUSTOM DESKTOP BACKGROUND IMAGE */}
        <div className="absolute inset-0">
          <img
            src="/images/login-bg.jpg"
            alt="Patholab Cloud UI"
            className="w-full h-full object-cover opacity-50 mix-blend-overlay transition-opacity duration-1000"
          />
          {/* Subtle gradient overlay to make the text pop */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-blue-900/30"></div>
        </div>

        {/* Marketing Content overlaying the image */}
        <div className="relative w-full flex flex-col justify-end p-16 z-10 text-white pb-24">
          <div className="max-w-lg">
            <span className="inline-flex items-center py-1.5 px-3.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold mb-6 backdrop-blur-md uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-4 h-4 mr-2 text-blue-300" />
              Start For Free
            </span>

            <h2 className="text-4xl font-extrabold tracking-tight mb-4 leading-tight text-white drop-shadow-md">
              Scale your lab with zero subscriptions.
            </h2>

            <p className="text-lg text-slate-300 mb-10 leading-relaxed font-medium drop-shadow-sm">
              Experience the first enterprise LIMS in India that scales
              dynamically with you. Load your wallet and pay a flat ₹2.5 per
              patient.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-100">
                  Zero setup fees, start in minutes
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-100">
                  Unlimited branches and staff users
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-100">
                  Enterprise-grade LIMS & RIS included
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
