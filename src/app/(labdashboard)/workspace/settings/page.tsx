"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Upload,
  Save,
  Palette,
  CreditCard,
  Loader2,
  Landmark,
  Network,
  FileText,
  Image as ImageIcon,
  Briefcase,
  Plus,
  CheckCircle2,
  LayoutTemplate,
  ScanLine,
  Cpu,
  Package,
  Truck,
  X,
  Webhook,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// List of App Modules for the Sidebar Toggle Screen
const APP_MODULES = [
  {
    id: "inventory",
    name: "Inventory & Stock",
    icon: Package,
    desc: "Manage reagents, stock levels, and automated deductions.",
  },
  {
    id: "radiology",
    name: "Radiology (RIS)",
    icon: ScanLine,
    desc: "Complete RIS and PACS viewer for X-Rays, MRI, and CT scans.",
  },
  {
    id: "iot",
    name: "Machine Interfacing (IoT)",
    icon: Cpu,
    desc: "Bi-directional zero-latency connection to blood analyzers.",
  },
  {
    id: "b2b",
    name: "B2B Agencies & Referrals",
    icon: Briefcase,
    desc: "Manage outsourced samples and commission waterfalls.",
  },
  {
    id: "logistics",
    name: "Logistics & Trips",
    icon: Truck,
    desc: "Track home collection phlebotomists and branch routing.",
  },
];

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile Data
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Lab Settings
  const [labSettings, setLabSettings] = useState({
    name: "",
    licenseNumber: "",
    registrationNo: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    logo: "",
    letterhead: "",
    footer: "",
    signature: "",
    gstNumber: "",
    panNumber: "",
    entityType: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolder: "",
    upiId: "",
    upiQrCode: "",
    defaultDoctorCommission: 10,
    defaultAgencyCommission: 5,
    commissionType: "PERCENTAGE",
    syncMainBranch: false,
    whatsappApiKey: "",
    whatsappPhoneId: "",
    smsApiKey: "",
    smsSenderId: "",
  });

  // Enterprise Data
  const [branches, setBranches] = useState<any[]>([]);

  // App Modules Visibility State
  const [activeModules, setActiveModules] = useState<string[]>([
    "inventory",
    "b2b",
  ]);

  // Branch Modal State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    isMainBranch: false,
    isActive: true,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const [profileRes, labRes] = await Promise.all([
        fetch("/api/users/profile"),
        fetch("/api/workspace/settings"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        const user = data.user || {};

        let cleanPhone = user.phone || "";
        let cleanEmail = user.email || "";
        if (cleanPhone.includes("@")) {
          if (!cleanEmail) cleanEmail = cleanPhone;
          cleanPhone = "";
        }

        setProfileData((prev) => ({
          ...prev,
          ...user,
          phone: cleanPhone,
          email: cleanEmail,
        }));
      }

      if (labRes.ok) {
        const data = await labRes.json();
        const lab = data.lab || {};

        setBranches(lab.branches || []);

        // ✅ CRITICAL FIX: Load saved active modules from database
        if (lab.activeModules && Array.isArray(lab.activeModules)) {
          setActiveModules(lab.activeModules);
        }

        setLabSettings((prev) => ({
          ...prev,
          ...lab,
          defaultDoctorCommission: lab.defaultDoctorCommission ?? 10,
          defaultAgencyCommission: lab.defaultAgencyCommission ?? 5,
          commissionType: lab.commissionType || "PERCENTAGE",
          syncMainBranch: false,
          whatsappApiKey: lab.whatsappApiKey || "",
          whatsappPhoneId: lab.whatsappPhoneId || "",
          smsApiKey: lab.smsApiKey || "",
          smsSenderId: lab.smsSenderId || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load settings data.");
    } finally {
      setLoading(false);
    }
  };

  // --- SAVE HANDLERS ---
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (res.ok) toast.success("Profile updated successfully!");
      else toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLabSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labSettings),
      });

      if (res.ok) toast.success("Settings updated successfully!");
      else toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  // ✅ CRITICAL FIX: Save the App Modules to your DB
  const handleSaveModules = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/settings/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeModules }),
      });

      if (res.ok) toast.success("App modules updated successfully!");
      else toast.error("Failed to update modules");
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (profileData.newPassword !== profileData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
        }),
      });

      if (res.ok) {
        toast.success("Password changed successfully!");
        setProfileData({
          ...profileData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to change password");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, field: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const loadId = toast.loading("Uploading...");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      if (field.startsWith("lab.")) {
        setLabSettings((prev) => ({
          ...prev,
          [field.replace("lab.", "")]: data.url,
        }));
      } else {
        setProfileData((prev) => ({ ...prev, [field]: data.url }));
      }
      toast.success("Upload successful!", { id: loadId });
    } catch (error) {
      toast.error("Failed to upload file", { id: loadId });
    }
  };

  // --- BRANCH MODAL HANDLERS ---
  const openAddBranchModal = () => {
    setEditingBranch(null);
    setBranchForm({
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      isMainBranch: false,
      isActive: true,
    });
    setIsBranchModalOpen(true);
  };

  const openEditBranchModal = (branch: any) => {
    setEditingBranch(branch);
    setBranchForm({ ...branch });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async () => {
    const isNew = !editingBranch;
    const method = isNew ? "POST" : "PUT";
    const payload = isNew
      ? branchForm
      : { id: editingBranch.id, ...branchForm };

    setSaving(true);
    const loadId = toast.loading(
      isNew ? "Adding location..." : "Updating location...",
    );

    try {
      const res = await fetch("/api/workspace/branches", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Branch saved successfully!", {
          id: loadId,
        });

        if (isNew) {
          setBranches([...branches, data.branch]);
        } else {
          setBranches(
            branches.map((b) => (b.id === data.branch.id ? data.branch : b)),
          );
        }
        setIsBranchModalOpen(false);
      } else {
        toast.error(data.error || "Failed to save branch", { id: loadId });
      }
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error("An unexpected error occurred", { id: loadId });
    } finally {
      setSaving(false);
    }
  };

  // ✅ Instantly updates the state, saves to the database, and forces the Auth hook to resync
  const toggleModule = async (moduleId: string) => {
    // 1. Calculate the new array of modules
    const newModules = activeModules.includes(moduleId)
      ? activeModules.filter((id) => id !== moduleId)
      : [...activeModules, moduleId];

    // 2. Immediately update the UI state so the switch flips instantly
    setActiveModules(newModules);

    // 3. Fire the save request to the backend
    try {
      const res = await fetch("/api/workspace/settings/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeModules: newModules }),
      });

      if (res.ok) {
        toast.success("Sidebar updated!");

        // ✅ CRITICAL FIX: Forces your `useAuth` hook to dump its cache and grab the new modules
        window.location.reload();
      } else {
        toast.error("Failed to save module state.");
        // Revert the toggle if the server fails
        setActiveModules(activeModules);
      }
    } catch (error) {
      toast.error("Network error while saving.");
      // Revert the toggle if there is a network crash
      setActiveModules(activeModules);
    }
  };

  // --- UI NAVIGATION TABS ---
  const TABS = [
    { id: "profile", name: "My Profile", icon: User, group: "Personal" },
    {
      id: "general",
      name: "General Details",
      icon: Building2,
      group: "Workspace",
    },
    {
      id: "legal",
      name: "Legal & Banking",
      icon: Landmark,
      group: "Workspace",
    },
    {
      id: "branding",
      name: "Branding & Print",
      icon: Palette,
      group: "Workspace",
    },
    {
      id: "branches",
      name: "Locations & Branches",
      icon: Network,
      group: "Workspace",
    },
    {
      id: "modules",
      name: "App Modules",
      icon: LayoutTemplate,
      group: "Workspace",
    },
    {
      id: "commissions",
      name: "Commission Rules",
      icon: Briefcase,
      group: "Workspace",
    },
    {
      id: "integrations",
      name: "Integrations & APIs",
      icon: Webhook,
      group: "Workspace",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-emerald-500" />
        <p className="text-sm font-bold text-slate-500 animate-pulse tracking-widest uppercase">
          Loading Settings...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Configuration Console
          </h1>
          <p className="text-slate-500 font-medium">
            Manage your personal profile, lab workspace, and enterprise
            settings.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* === LEFT SIDEBAR NAVIGATION === */}
          <div className="lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sticky top-24">
              {["Personal", "Workspace"].map((groupName) => (
                <div key={groupName} className="mb-6 last:mb-0">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">
                    {groupName}
                  </h4>
                  <div className="space-y-1">
                    {TABS.filter((t) => t.group === groupName).map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 shadow-sm"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}>
                          <Icon
                            className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`}
                          />
                          {tab.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === RIGHT CONTENT AREA === */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px]">
              {/* === TAB: PROFILE === */}
              {activeTab === "profile" && (
                <div className="p-6 sm:p-10 space-y-10">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Personal Profile
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Manage your personal details and security.
                    </p>
                  </div>
                  <div className="flex items-center gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="relative group">
                      {profileData.avatar ? (
                        <img
                          src={profileData.avatar}
                          alt="Avatar"
                          className="w-24 h-24 rounded-2xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-3xl font-black shadow-md">
                          {profileData.name?.charAt(0) || "U"}
                        </div>
                      )}
                      <label className="absolute -bottom-3 -right-3 bg-white border border-slate-200 text-slate-700 p-2 rounded-xl cursor-pointer hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                        <Upload className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            handleFileUpload(e.target.files[0], "avatar")
                          }
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {profileData.name || "Your Name"}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {profileData.email || "your.email@example.com"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Full Name
                      </Label>
                      <Input
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            name: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Email Address
                      </Label>
                      <Input
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            email: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold transition-all shadow-md">
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}{" "}
                      Save Profile
                    </Button>
                  </div>
                  {/* Password Section */}
                  <div className="pt-10 border-t border-slate-200 space-y-6">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        Security
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        Update your password to keep your account secure.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Current Password
                        </Label>
                        <Input
                          type="password"
                          value={profileData.currentPassword}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              currentPassword: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          New Password
                        </Label>
                        <Input
                          type="password"
                          value={profileData.newPassword}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              newPassword: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Confirm Password
                        </Label>
                        <Input
                          type="password"
                          value={profileData.confirmPassword}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              confirmPassword: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end mt-2">
                        <Button
                          onClick={handlePasswordChange}
                          disabled={saving}
                          variant="outline"
                          className="h-12 px-8 rounded-xl font-bold border-slate-300 text-slate-700 hover:bg-slate-100">
                          Update Password
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB: GENERAL === */}
              {activeTab === "general" && (
                <div className="p-6 sm:p-10 space-y-10">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Workspace Details
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Core contact and operational information for your
                      laboratory.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Laboratory Name
                      </Label>
                      <Input
                        value={labSettings.name}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            name: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-bold text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Official Email
                      </Label>
                      <Input
                        type="email"
                        value={labSettings.email}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            email: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Office Phone
                      </Label>
                      <Input
                        type="tel"
                        value={labSettings.phone}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            phone: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-6 pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Headquarters Address
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2 md:col-span-3">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Street Address
                        </Label>
                        <Input
                          value={labSettings.address}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              address: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          City
                        </Label>
                        <Input
                          value={labSettings.city}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              city: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          State
                        </Label>
                        <Input
                          value={labSettings.state}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              state: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Pincode
                        </Label>
                        <Input
                          value={labSettings.pincode}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              pincode: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                    {/* Smart Sync Option */}
                    <div className="flex items-start space-x-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <Checkbox
                        id="syncBranch"
                        checked={labSettings.syncMainBranch}
                        onCheckedChange={(checked) =>
                          setLabSettings({
                            ...labSettings,
                            syncMainBranch: !!checked,
                          })
                        }
                        className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div>
                        <label
                          htmlFor="syncBranch"
                          className="text-sm font-bold text-emerald-900 cursor-pointer block">
                          Sync with Main Branch
                        </label>
                        <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                          Checking this will automatically update the physical
                          address of your "Main Branch" location to match the
                          details above.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button
                      onClick={handleSaveLabSettings}
                      disabled={saving}
                      className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold transition-all shadow-md">
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}{" "}
                      Save Details
                    </Button>
                  </div>
                </div>
              )}

              {/* === TAB: LEGAL & BANKING === */}
              {activeTab === "legal" && (
                <div className="p-6 sm:p-10 space-y-10">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Legal & Financial
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Registration details required for B2B billing and
                      compliance.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Business Entity Type
                      </Label>
                      <select
                        value={labSettings.entityType}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            entityType: e.target.value,
                          })
                        }
                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium outline-none transition-all">
                        <option value="">Select Type</option>
                        <option value="Proprietorship">
                          Sole Proprietorship
                        </option>
                        <option value="Partnership">Partnership Firm</option>
                        <option value="LLP">LLP</option>
                        <option value="Private Limited">
                          Private Limited (Pvt Ltd)
                        </option>
                        <option value="Trust">Trust / NGO</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Clinical Est. License No.
                      </Label>
                      <Input
                        value={labSettings.licenseNumber}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            licenseNumber: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        GST Number
                      </Label>
                      <Input
                        value={labSettings.gstNumber}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            gstNumber: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        PAN Number
                      </Label>
                      <Input
                        value={labSettings.panNumber}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            panNumber: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-medium uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-6 pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-500" /> Bank
                      Account Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Account Holder Name
                        </Label>
                        <Input
                          value={labSettings.accountHolder}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              accountHolder: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Bank Name
                        </Label>
                        <Input
                          value={labSettings.bankName}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              bankName: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Account Number
                        </Label>
                        <Input
                          value={labSettings.accountNumber}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              accountNumber: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          IFSC Code
                        </Label>
                        <Input
                          value={labSettings.ifscCode}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              ifscCode: e.target.value,
                            })
                          }
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium uppercase"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          UPI ID for Patient Payments
                        </Label>
                        <Input
                          value={labSettings.upiId}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              upiId: e.target.value,
                            })
                          }
                          placeholder="example@upi"
                          className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          UPI QR Code
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="h-32 w-32 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                            {labSettings.upiQrCode ? (
                              <img
                                src={labSettings.upiQrCode}
                                alt="UPI QR Code"
                                className="h-full w-full object-contain p-2"
                              />
                            ) : (
                              <CreditCard className="h-8 w-8 text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col justify-center gap-3">
                            <p className="text-sm font-medium text-slate-600">
                              This QR will be shown to patients during public home collection payment.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex w-fit cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                                Upload QR
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    e.target.files?.[0] &&
                                    handleFileUpload(e.target.files[0], "lab.upiQrCode")
                                  }
                                />
                              </label>
                              {labSettings.upiQrCode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLabSettings((prev) => ({
                                      ...prev,
                                      upiQrCode: null,
                                    }))
                                  }
                                  className="inline-flex w-fit cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-5 py-2 text-xs font-bold uppercase tracking-widest text-rose-700 shadow-sm transition-colors hover:bg-rose-100"
                                >
                                  Remove QR
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button
                      onClick={handleSaveLabSettings}
                      disabled={saving}
                      className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold transition-all shadow-md">
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}{" "}
                      Save Legal Data
                    </Button>
                  </div>
                </div>
              )}

              {/* === TAB: BRANDING & PRINT === */}
              {activeTab === "branding" && (
                <div className="p-6 sm:p-10 space-y-10">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Brand Assets
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Upload images to be used on reports, invoices, and the
                      patient portal.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                      <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden mb-4 shadow-sm">
                        {labSettings.logo ? (
                          <img
                            src={labSettings.logo}
                            alt="Logo"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-slate-300" />
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        Company Logo
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        Recommended: Square, transparent PNG
                      </p>
                      <label className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 uppercase tracking-widest shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            handleFileUpload(e.target.files[0], "lab.logo")
                          }
                        />
                      </label>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                      <div className="w-48 h-24 bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden mb-4 shadow-sm">
                        {labSettings.signature ? (
                          <img
                            src={labSettings.signature}
                            alt="Signature"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        Authorized Signature
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        Used for digital report signing. Transparent PNG.
                      </p>
                      <label className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 uppercase tracking-widest shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
                        Upload Signature
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            handleFileUpload(e.target.files[0], "lab.signature")
                          }
                        />
                      </label>
                    </div>
                    <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-1">
                        Pre-Printed Letterhead (Digital Fallback)
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        If you email reports, upload a high-res image of your
                        letterhead header to be injected into the PDF.
                      </p>
                      <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden mb-4 relative group">
                        {labSettings.letterhead ? (
                          <img
                            src={labSettings.letterhead}
                            alt="Letterhead"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <span className="text-slate-400 font-medium text-sm">
                            No header uploaded
                          </span>
                        )}
                      </div>
                      <label className="inline-flex px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 uppercase tracking-widest shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
                        Upload Letterhead
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            handleFileUpload(
                              e.target.files[0],
                              "lab.letterhead",
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button
                      onClick={handleSaveLabSettings}
                      disabled={saving}
                      className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold transition-all shadow-md">
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}{" "}
                      Save Assets
                    </Button>
                  </div>
                </div>
              )}

              {/* === TAB: BRANCHES === */}
              {activeTab === "branches" && (
                <div className="p-6 sm:p-10 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Locations & Branches
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        Manage physical locations for sample collection and
                        operations.
                      </p>
                    </div>
                    <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                        Wallet Era
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700 text-sm font-bold border-0">
                        Unlimited Branches
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-emerald-200 transition-colors shadow-sm">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-xl ${branch.isMainBranch ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            <MapPin className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-lg font-bold text-slate-900">
                                {branch.name}
                              </h4>
                              {branch.isMainBranch && (
                                <Badge className="bg-slate-900 text-white border-0 text-[10px] uppercase tracking-widest px-2 py-0.5">
                                  Headquarters
                                </Badge>
                              )}
                              {!branch.isActive && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase tracking-widest text-slate-400">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 font-medium">
                              {branch.address}, {branch.city} - {branch.pincode}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {branch.email} • {branch.phone}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => openEditBranchModal(branch)}
                          className="rounded-xl font-bold text-slate-700 w-full md:w-auto h-10">
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add Branch Action */}
                  <div className="pt-6 border-t border-slate-200 flex flex-col items-center justify-center p-8 bg-slate-50 border-dashed rounded-2xl">
                    <Button
                      onClick={openAddBranchModal}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-12 px-8 shadow-md">
                      <Plus className="w-5 h-5 mr-2" /> Add New Location
                    </Button>
                  </div>
                </div>
              )}

              {/* === TAB: APP MODULES === */}
              {activeTab === "modules" && (
                <div className="p-6 sm:p-10 space-y-8">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      App Modules
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      Toggle specific features to customize your workspace
                      sidebar.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {APP_MODULES.map((module) => {
                      const isToggledOn = activeModules.includes(module.id);
                      return (
                        <div
                          key={module.id}
                          className={`relative p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col ${
                            isToggledOn
                              ? "border-emerald-500 bg-emerald-50/30 shadow-md"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}>
                          <div className="flex items-start gap-4 mb-6">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600`}>
                              <module.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                {module.name}
                              </h3>
                              <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                                {module.desc}
                              </p>
                            </div>
                          </div>
                          <div className="mt-auto pt-4 border-t border-slate-100/80 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                              {isToggledOn
                                ? "Visible in Sidebar"
                                : "Hidden from Sidebar"}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isToggledOn}
                                onChange={() => toggleModule(module.id)}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* ✅ Added Save Modules Button */}
                  <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button
                      onClick={handleSaveModules}
                      disabled={saving}
                      className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold transition-all shadow-md">
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}{" "}
                      Save App Modules
                    </Button>
                  </div>
                </div>
              )}

              {/* === TAB: COMMISSIONS === */}
              {activeTab === "commissions" && (
                <div className="p-6 sm:p-10 space-y-10">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Commission Logic
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Set the global default payout rates for doctors and B2B
                      agencies.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Commission Logic
                      </Label>
                      <select
                        value={labSettings.commissionType}
                        onChange={(e) =>
                          setLabSettings({
                            ...labSettings,
                            commissionType: e.target.value,
                          })
                        }
                        className="w-full h-12 px-4 rounded-xl bg-white border-slate-200 focus:bg-white focus:border-emerald-500 font-bold outline-none">
                        <option value="PERCENTAGE">
                          Percentage (%) of Test Price
                        </option>
                        <option value="FIXED">Flat Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <User className="w-3 h-3" /> Default Doctor Rate
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={labSettings.defaultDoctorCommission}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              defaultDoctorCommission:
                                e.target.value === ""
                                  ? 0
                                  : parseFloat(e.target.value),
                            })
                          }
                          className="h-12 pl-10 rounded-xl bg-white border-slate-200 focus:bg-white focus:border-emerald-500 font-bold"
                          step="0.01"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          {labSettings.commissionType === "PERCENTAGE"
                            ? "%"
                            : "₹"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> Default Agency Rate
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={labSettings.defaultAgencyCommission}
                          onChange={(e) =>
                            setLabSettings({
                              ...labSettings,
                              defaultAgencyCommission:
                                e.target.value === ""
                                  ? 0
                                  : parseFloat(e.target.value),
                            })
                          }
                          className="h-12 pl-10 rounded-xl bg-white border-slate-200 focus:bg-white focus:border-emerald-500 font-bold"
                          step="0.01"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          {labSettings.commissionType === "PERCENTAGE"
                            ? "%"
                            : "₹"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-900 mb-1">
                        How the Commission Waterfall Works
                      </h4>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                        These are your global fallbacks. If a doctor refers a
                        patient, the system first checks if you have set a
                        custom rate for that specific test for that specific
                        doctor. If not, it applies this global default rate.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button
                      onClick={handleSaveLabSettings}
                      disabled={saving}
                      className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold transition-all shadow-md">
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}{" "}
                      Save Commission Rules
                    </Button>
                  </div>
                </div>
              )}

              {/* === TAB: INTEGRATIONS & APIS === */}
              {activeTab === "integrations" && (
                <div className="p-6 sm:p-10 space-y-10">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Integrations & APIs
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Configure WhatsApp and SMS gateways for patient
                      notifications.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-500" />{" "}
                        WhatsApp API Settings
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            WhatsApp Access Token / API Key
                          </Label>
                          <Input
                            type="password"
                            value={labSettings.whatsappApiKey}
                            onChange={(e) =>
                              setLabSettings({
                                ...labSettings,
                                whatsappApiKey: e.target.value,
                              })
                            }
                            className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                            placeholder="Enter Meta / 3rd Party API Key"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            WhatsApp Phone ID
                          </Label>
                          <Input
                            value={labSettings.whatsappPhoneId}
                            onChange={(e) =>
                              setLabSettings({
                                ...labSettings,
                                whatsappPhoneId: e.target.value,
                              })
                            }
                            className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                            placeholder="e.g. 10934812039123"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Webhook className="w-5 h-5 text-emerald-500" /> SMS
                        Gateway Settings
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            SMS API Key
                          </Label>
                          <Input
                            type="password"
                            value={labSettings.smsApiKey}
                            onChange={(e) =>
                              setLabSettings({
                                ...labSettings,
                                smsApiKey: e.target.value,
                              })
                            }
                            className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium"
                            placeholder="Enter SMS Gateway API Key"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            Sender ID
                          </Label>
                          <Input
                            value={labSettings.smsSenderId}
                            onChange={(e) =>
                              setLabSettings({
                                ...labSettings,
                                smsSenderId: e.target.value,
                              })
                            }
                            className="h-12 rounded-xl bg-white border-slate-200 focus:border-emerald-500 font-medium uppercase"
                            placeholder="e.g. LABMSG"
                            maxLength={6}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button
                      onClick={handleSaveLabSettings}
                      disabled={saving}
                      className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold transition-all shadow-md">
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}{" "}
                      Save API Keys
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === ADD / EDIT BRANCH MODAL === */}
      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 rounded-3xl overflow-hidden border-0 shadow-2xl">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-black">
                {editingBranch ? "Edit Location" : "Add New Location"}
              </DialogTitle>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Manage physical branch details and address.
              </p>
            </div>
            <button
              onClick={() => setIsBranchModalOpen(false)}
              className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Branch Name
                </Label>
                <Input
                  value={branchForm.name}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, name: e.target.value })
                  }
                  placeholder="e.g. South City Clinic"
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 font-bold"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Full Address
                </Label>
                <Input
                  value={branchForm.address}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, address: e.target.value })
                  }
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  City
                </Label>
                <Input
                  value={branchForm.city}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, city: e.target.value })
                  }
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  State
                </Label>
                <Input
                  value={branchForm.state}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, state: e.target.value })
                  }
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Pincode
                </Label>
                <Input
                  value={branchForm.pincode}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, pincode: e.target.value })
                  }
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Phone
                </Label>
                <Input
                  value={branchForm.phone}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, phone: e.target.value })
                  }
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Checkbox
                  id="isMainBranch"
                  checked={branchForm.isMainBranch}
                  onCheckedChange={(checked) =>
                    setBranchForm({ ...branchForm, isMainBranch: !!checked })
                  }
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <label
                  htmlFor="isMainBranch"
                  className="text-sm font-bold text-slate-700 cursor-pointer">
                  Mark as Headquarters / Main Branch
                </label>
              </div>
              <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Checkbox
                  id="isActive"
                  checked={branchForm.isActive}
                  onCheckedChange={(checked) =>
                    setBranchForm({ ...branchForm, isActive: !!checked })
                  }
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-bold text-slate-700 cursor-pointer">
                  Branch is active and operational
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsBranchModalOpen(false)}
                className="h-12 rounded-xl font-bold text-slate-600">
                Cancel
              </Button>
              <Button
                onClick={handleSaveBranch}
                disabled={saving}
                className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingBranch ? (
                  "Save Changes"
                ) : (
                  "Add Location"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
