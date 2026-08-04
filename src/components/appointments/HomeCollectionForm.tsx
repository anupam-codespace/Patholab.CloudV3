"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Navigation, User, Loader2, CheckCircle, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import Select from "react-select"; // 🚀 Added for Searchable Multi-Select

export default function HomeCollectionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 🚀 New States for Tests
  const [testOptions, setTestOptions] = useState<{value: string, label: string}[]>([]);
  const [selectedTests, setSelectedTests] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    patientId: "", 
    appointmentDate: "",
    timeSlot: "",
    collectionAddress: "",
    pincode: "",
  });

  // 🚀 Fetch available tests when the component loads
  useEffect(() => {
    const fetchTests = async () => {
      try {
        // NOTE: Ensure this matches your actual endpoint for fetching test templates
        const res = await fetch("/api/workspace/tests"); 
        const data = await res.json();
        
        if (data.success && data.tests) {
          // Format data for react-select: { value: id, label: name }
          const formattedOptions = data.tests.map((t: any) => ({
            value: t.id,
            label: `${t.name} (₹${t.price || 0})`
          }));
          setTestOptions(formattedOptions);
        }
      } catch (error) {
        console.error("Failed to fetch test templates:", error);
        toast.error("Failed to load test list.");
      }
    };
    
    fetchTests();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🚀 Validation: Ensure at least one test is selected
    if (selectedTests.length === 0) {
      toast.error("Please select at least one test for this booking.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/workspace/appointments/home-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          source: "RECEPTION_DESK", // Updated source for clarity
          testTemplateIds: selectedTests.map(t => t.value), // 🚀 Send the selected test IDs
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to book appointment");
      }

      toast.success("Home Collection Booked & Invoice Created!");
      setIsSuccess(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          patientId: "",
          appointmentDate: "",
          timeSlot: "",
          collectionAddress: "",
          pincode: "",
        });
        setSelectedTests([]); // Reset selected tests
      }, 3000);

    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto rounded-xl shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-6">
        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Navigation className="w-6 h-6 text-indigo-600" />
          Book Home Collection
        </CardTitle>
        <CardDescription className="text-slate-500 font-medium">
          Schedule a phlebotomist and generate an invoice.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Booking Confirmed!</h3>
            <p className="text-slate-500 mt-2">Tests attached and Invoice generated successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Patient ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Patient Phone or ID
              </label>
              <Input 
                name="patientId" 
                placeholder="Enter 10-digit Phone Number" 
                value={formData.patientId}
                onChange={handleChange}
                required
                className="bg-slate-50"
              />
              <p className="text-[10px] text-slate-500">
                Enter the patient's registered phone number to link this booking.
              </p>
            </div>

            {/* 🚀 NEW: Test Selection Dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <TestTube className="w-4 h-4 text-slate-400" /> Select Tests
              </label>
              <Select
                isMulti
                name="tests"
                options={testOptions}
                value={selectedTests}
                onChange={(selected) => setSelectedTests(selected as any[])}
                className="basic-multi-select text-sm"
                classNamePrefix="select"
                placeholder="Search and select tests..."
                noOptionsMessage={() => "No tests found or loading..."}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> Date
                </label>
                <Input 
                  type="date"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {/* Time Slot */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Preferred Time
                </label>
                <select 
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select a slot</option>
                  <option value="06:00 AM - 08:00 AM">06:00 AM - 08:00 AM</option>
                  <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
                  <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                  <option value="12:00 PM - 02:00 PM">12:00 PM - 02:00 PM</option>
                  <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> Complete Address
              </label>
              <Textarea 
                name="collectionAddress"
                placeholder="House Number, Building Name, Street..." 
                value={formData.collectionAddress}
                onChange={handleChange}
                required
                className="resize-none h-24"
              />
            </div>

            {/* Pincode */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Pincode</label>
              <Input 
                name="pincode"
                placeholder="e.g. 781001" 
                value={formData.pincode}
                onChange={handleChange}
                required
                maxLength={6}
                pattern="[0-9]{6}"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-base mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Booking...
                </>
              ) : (
                "Confirm Booking & Generate Invoice"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}