"use client";
import { useState } from "react";
import toast from "react-hot-toast";

interface BookingFormProps {
  portalSlug: string;
  cartItems: { id: string; name: string; price: number }[];
}

export default function PublicBookingForm({
  portalSlug,
  cartItems,
}: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "", // Will hold user input
    gender: "MALE",
    dateOfBirth: "",
    collectionMode: "LAB_VISIT",
    address: "",
    pincode: "",
    appointmentDate: "",
    timeSlot: "08:00 AM - 10:00 AM",
  });

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.price),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Generate fallback email if the user left the email field blank
    const finalEmail =
      formData.email.trim() !== ""
        ? formData.email
        : `patient_${formData.phone || Date.now()}@no-email.com`;

    try {
      const response = await fetch(`/api/public/${portalSlug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: finalEmail, // 2. Override the empty state with the final email
          testTemplateIds: cartItems.map((item) => item.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to book");
      }

      toast.success("Appointment Booked Successfully!");
      // TODO: Redirect to Payment Gateway (Razorpay) using data.payableAmount and data.invoiceId
      window.location.href = `/payment?invoice=${data.invoiceId}`;
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow-md border">
      <h2 className="text-2xl font-bold mb-6">Book Your Tests</h2>

      {/* Cart Summary */}
      <div className="bg-primary/10 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          Selected Tests ({cartItems.length})
        </h3>
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>{item.name}</span>
            <span className="font-medium">₹{item.price}</span>
          </div>
        ))}
        <div className="border-t border-primary/20 mt-2 pt-2 flex justify-between font-bold">
          <span>Total Payable:</span>
          <span>₹{totalAmount}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              required
              type="text"
              className="w-full border p-2 rounded"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number
            </label>
            <input
              required
              type="tel"
              className="w-full border p-2 rounded"
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div>
            {/* 3. New Optional Email Field */}
            <label className="block text-sm font-medium mb-1">
              Email{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              className="w-full border p-2 rounded"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
        </div>

        {/* Collection Mode */}
        <div>
          <label className="block text-sm font-medium mb-2">
            How would you like to give your sample?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-muted/30 flex-1">
              <input
                type="radio"
                name="mode"
                value="LAB_VISIT"
                checked={formData.collectionMode === "LAB_VISIT"}
                onChange={() =>
                  setFormData({ ...formData, collectionMode: "LAB_VISIT" })
                }
              />
              Visit Laboratory
            </label>
            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-muted/30 flex-1">
              <input
                type="radio"
                name="mode"
                value="HOME_COLLECTION"
                checked={formData.collectionMode === "HOME_COLLECTION"}
                onChange={() =>
                  setFormData({
                    ...formData,
                    collectionMode: "HOME_COLLECTION",
                  })
                }
              />
              Home Collection
            </label>
          </div>
        </div>

        {/* Dynamic Address Fields */}
        {formData.collectionMode === "HOME_COLLECTION" && (
          <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded border">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Complete Address
              </label>
              <input
                required
                type="text"
                className="w-full border p-2 rounded"
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pincode</label>
              <input
                required
                type="text"
                className="w-full border p-2 rounded"
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Preferred Date
            </label>
            <input
              required
              type="date"
              className="w-full border p-2 rounded"
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) =>
                setFormData({ ...formData, appointmentDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time Slot</label>
            <select
              className="w-full border p-2 rounded"
              onChange={(e) =>
                setFormData({ ...formData, timeSlot: e.target.value })
              }>
              <option>08:00 AM - 10:00 AM</option>
              <option>10:00 AM - 12:00 PM</option>
              <option>02:00 PM - 04:00 PM</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || cartItems.length === 0}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg mt-6 hover:bg-primary/90 disabled:opacity-50">
          {loading ? "Processing..." : `Proceed to Pay ₹${totalAmount}`}
        </button>
      </form>
    </div>
  );
}
