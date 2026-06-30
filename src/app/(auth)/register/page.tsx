"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  CheckCircle2,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
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
    color: "bg-gray-200",
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
      setPwdStrength({ score: 0, text: "", color: "bg-gray-200" });
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
      setPwdStrength({ score: 2, text: "Fair", color: "bg-yellow-500" });
    else if (score === 3)
      setPwdStrength({ score: 3, text: "Good", color: "bg-blue-500" });
    else setPwdStrength({ score: 4, text: "Strong", color: "bg-green-500" });
  }, [formData.password]);

  // Client-side Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.labName.trim()) errors.labName = "Lab name is required";
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      errors.email = "Valid email is required";
    if (!formData.phone.trim() || formData.phone.length < 10)
      errors.phone = "Valid phone number is required";

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
      // NOTE: Ensure your API route expects 'labName' in the payload
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

      // Redirect to verification with the userId
      router.push(`/verify?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setGlobalError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50 font-sans">
      {/* LEFT: Marketing / Value Prop */}
      <div className="hidden lg:flex lg:w-5/12 bg-blue-900 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

        <div className="flex items-center gap-2 relative z-10">
          <Activity className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold">Patholab.cloud</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            Start your lab's digital journey today.
          </h2>
          <div className="space-y-6 text-blue-50">
            {[
              "Zero setup fees, start in minutes",
              "Flat ₹2.5 per patient pay-as-you-go",
              "Unlimited branches and staff users",
              "Enterprise-grade LIMS & RIS included",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                <span className="text-lg">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-300 text-sm font-medium">
            Join 500+ premium labs scaling with Patholab.
          </p>
        </div>
      </div>

      {/* RIGHT: Registration Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-xl bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create your account
            </h1>
            <p className="text-gray-500">
              Get full access to the Patholab ecosystem.
            </p>
          </div>

          {/* Global API Error */}
          {globalError && (
            <div className="mb-6 p-4 flex items-start gap-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p>{globalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Row 1: Lab Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Lab / Organization Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="labName"
                  value={formData.labName}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all focus:bg-white
                    ${fieldErrors.labName ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"}`}
                  placeholder="e.g. Apex Diagnostics"
                />
              </div>
              {fieldErrors.labName && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.labName}
                </p>
              )}
            </div>

            {/* Row 2: Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all focus:bg-white
                      ${fieldErrors.name ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"}`}
                    placeholder="Dr. John Doe"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all focus:bg-white
                      ${fieldErrors.phone ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"}`}
                    placeholder="98765 43210"
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all focus:bg-white
                    ${fieldErrors.email ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"}`}
                  placeholder="admin@apexdiagnostics.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Row 4: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all focus:bg-white
                      ${fieldErrors.password ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Strength Meter */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-gray-100">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 transition-colors duration-300 ${pwdStrength.score >= level ? pwdStrength.color : "bg-transparent"}`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-[11px] mt-1 font-medium ${pwdStrength.score < 2 ? "text-red-500" : pwdStrength.score < 4 ? "text-yellow-600" : "text-green-600"}`}>
                      {pwdStrength.text} Password
                    </p>
                  </div>
                )}
                {fieldErrors.password && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all focus:bg-white
                      ${fieldErrors.confirmPassword ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }>
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Creating
                  Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 font-bold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
