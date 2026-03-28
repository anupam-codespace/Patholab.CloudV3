'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Building2, MapPin, Upload, Save, Bell, Shield, Palette, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile Data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Lab Settings (for Lab Owners)
  const [labSettings, setLabSettings] = useState({
    name: '',
    licenseNumber: '',
    registrationNo: '',
    taxId: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    logo: '',
    gstNumber: '', 
    panNumber: '', 
    defaultDoctorCommission: 10,
    defaultAgencyCommission: 5,
    commissionType: 'PERCENTAGE',
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const [profileRes, labRes] = await Promise.all([
        fetch('/api/users/profile'),
        fetch('/api/lab-owner/settings'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        const user = data.user || {};

        // --- 🟢 FIX: SANITIZE CORRUPTED DATA ---
        // If the phone number stored in DB looks like an email, fix it here.
        let cleanPhone = user.phone || '';
        let cleanEmail = user.email || '';

        if (cleanPhone.includes('@')) {
            // If the actual email field is empty, move the 'phone-email' to the email spot
            if (!cleanEmail) cleanEmail = cleanPhone;
            // Clear the phone field so the user can enter a real number
            cleanPhone = '';
        }

        setProfileData(prev => ({ 
            ...prev, 
            ...user,
            phone: cleanPhone,
            email: cleanEmail
        }));
      }

      if (labRes.ok) {
        const data = await labRes.json();
        const lab = data.lab || {};

        setLabSettings(prev => ({
          ...prev,
          ...lab,
          // Handle numbers carefully
          defaultDoctorCommission: lab.defaultDoctorCommission ?? 10,
          defaultAgencyCommission: lab.defaultAgencyCommission ?? 5,
          commissionType: lab.commissionType || 'PERCENTAGE',
        }));
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error("Failed to load settings data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (res.ok) {
        toast.success('Profile updated successfully!');
        // Refresh data to ensure clean state
        fetchUserData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLabSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/lab-owner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labSettings),
      });

      if (res.ok) {
        toast.success('Lab settings updated successfully!');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (profileData.newPassword !== profileData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    setSaving(true);
    try {
      // Assuming this path is correct based on your setup
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
        }),
      });

      if (res.ok) {
        toast.success('Password changed successfully!');
        setProfileData({ ...profileData, currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, field: string) => {
    const formData = new FormData();
    formData.append('file', file);

    const loadId = toast.loading("Uploading...");

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      if (field.startsWith('lab.')) {
        const labField = field.replace('lab.', '');
        setLabSettings(prev => ({ ...prev, [labField]: data.url }));
      } else {
        setProfileData(prev => ({ ...prev, [field]: data.url }));
      }
      toast.success("Upload successful!", { id: loadId });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file', { id: loadId });
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'lab', name: 'Lab Settings', icon: Building2 },
  ];

  if (loading) {
      return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600"/></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your profile, lab settings, and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              
              {/* --- Profile Tab --- */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Profile Information
                    </h2>

                    {/* Avatar Upload */}
                    <div className="flex items-center gap-6 mb-6">
                      <div className="relative group">
                        {profileData.avatar ? (
                          <img
                            src={profileData.avatar}
                            alt="Avatar"
                            className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                            {profileData.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'avatar')}
                          />
                        </label>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {profileData.name || 'Your Name'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {profileData.email || 'your.email@example.com'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          // Allow editing email now to fix data issues
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          placeholder="Enter valid phone number"
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Change Password Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      Change Password
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={profileData.currentPassword}
                          onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={profileData.newPassword}
                          onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={profileData.confirmPassword}
                          onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handlePasswordChange}
                      disabled={saving}
                      className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* --- Lab Settings Tab --- */}
              {activeTab === 'lab' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Laboratory Settings
                  </h2>

                  {/* Logo Upload */}
                  <div className="flex items-center gap-6 mb-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                    <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                        {labSettings.logo ? (
                        <img src={labSettings.logo} alt="Lab Logo" className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="w-10 h-10 text-gray-300" />
                        )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Laboratory Logo
                      </label>
                      <p className="text-xs text-gray-500 mb-3">Recommended size: 200x200px. Max size: 2MB.</p>
                      <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New Logo
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'lab.logo')}
                            className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Lab Name</label>
                      <input
                        type="text"
                        value={labSettings.name}
                        onChange={(e) => setLabSettings({ ...labSettings, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">License Number</label>
                      <input
                        type="text"
                        value={labSettings.licenseNumber}
                        onChange={(e) => setLabSettings({ ...labSettings, licenseNumber: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Registration No</label>
                      <input
                        type="text"
                        value={labSettings.registrationNo}
                        onChange={(e) => setLabSettings({ ...labSettings, registrationNo: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Tax ID / GSTIN</label>
                      <input
                        type="text"
                        value={labSettings.taxId}
                        onChange={(e) => setLabSettings({ ...labSettings, taxId: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">GST Number</label>
                        <input
                            type="text"
                            value={labSettings.gstNumber || ''}
                            onChange={(e) => setLabSettings({ ...labSettings, gstNumber: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">PAN Number</label>
                        <input
                            type="text"
                            value={labSettings.panNumber || ''}
                            onChange={(e) => setLabSettings({ ...labSettings, panNumber: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Address</label>
                      <textarea
                        value={labSettings.address}
                        onChange={(e) => setLabSettings({ ...labSettings, address: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">City</label>
                      <input
                        type="text"
                        value={labSettings.city}
                        onChange={(e) => setLabSettings({ ...labSettings, city: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">State</label>
                      <input
                        type="text"
                        value={labSettings.state}
                        onChange={(e) => setLabSettings({ ...labSettings, state: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Pincode</label>
                      <input
                        type="text"
                        value={labSettings.pincode}
                        onChange={(e) => setLabSettings({ ...labSettings, pincode: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <input
                        type="tel"
                        value={labSettings.phone}
                        onChange={(e) => setLabSettings({ ...labSettings, phone: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={labSettings.email}
                        onChange={(e) => setLabSettings({ ...labSettings, email: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Commission Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-bold mb-4">Default Commission Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Commission Type</label>
                        <select
                          value={labSettings.commissionType}
                          onChange={(e) => setLabSettings({ ...labSettings, commissionType: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PERCENTAGE">Percentage (%)</option>
                          <option value="FIXED">Fixed Amount (₹)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Doctor Commission</label>
                        <input
                          type="number"
                          value={labSettings.defaultDoctorCommission}
                          // Handle empty string to prevent NaN error
                          onChange={(e) => {
                             const val = e.target.value;
                             setLabSettings({ ...labSettings, defaultDoctorCommission: val === '' ? 0 : parseFloat(val) })
                          }}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Agency Commission</label>
                        <input
                          type="number"
                          value={labSettings.defaultAgencyCommission}
                          // Handle empty string to prevent NaN error
                          onChange={(e) => {
                             const val = e.target.value;
                             setLabSettings({ ...labSettings, defaultAgencyCommission: val === '' ? 0 : parseFloat(val) })
                          }}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t">
                    <button
                      onClick={handleSaveLabSettings}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}