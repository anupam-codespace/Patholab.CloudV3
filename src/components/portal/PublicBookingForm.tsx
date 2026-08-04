"use client";
import { useState } from "react";
import toast from "react-hot-toast";

interface BookingFormProps {
  portalSlug: string;
  cartItems: { id: string; name: string; price: number }[]; // Passed from your test catalog page
  lab: {
    name: string;
    phone: string;
    upiId: string | null;
    upiQrCode: string | null;
  };
}

export default function PublicBookingForm({
  portalSlug,
  cartItems,
  lab,
}: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "MALE",
    dateOfBirth: "",
    collectionMode: "LAB_VISIT",
    address: "",
    pincode: "",
    appointmentDate: "",
    timeSlot: "08:00 AM - 10:00 AM",
    transactionId: "",
  });

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.price),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.collectionMode === "HOME_COLLECTION" && !lab.upiQrCode) {
      toast.error("This lab has not configured a UPI QR yet. Please contact the lab.");
      return;
    }

    if (formData.collectionMode === "HOME_COLLECTION" && !formData.transactionId.trim()) {
      toast.error("Please enter your UPI transaction ID / UTR.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/public/${portalSlug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          testTemplateIds: cartItems.map((item) => item.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to book");
      }

      toast.success("Appointment Booked Successfully!");
      window.location.href = `/book/${portalSlug}/status/${data.appointmentId}?phone=${encodeURIComponent(formData.phone)}`;
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const whatsappPhone = lab.phone.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    `Hello ${lab.name}, I booked a home collection and completed UPI payment.\n\nPatient: ${formData.name || "Not filled yet"}\nPhone: ${formData.phone || "Not filled yet"}\nAmount: Rs. ${totalAmount}\nTransaction ID/UTR: ${formData.transactionId || "Not filled yet"}\nDate: ${formData.appointmentDate || "Not selected"}\nTime Slot: ${formData.timeSlot}\n\nI want to share my payment receipt because I am facing an issue. Please verify my payment and booking.`,
  );
  const whatsappReceiptUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`
    : `https://wa.me/?text=${whatsappMessage}`;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border">
      <h2 className="text-2xl font-bold mb-6">Book Your Tests</h2>

      {/* Cart Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          Selected Tests ({cartItems.length})
        </h3>
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>{item.name}</span>
            <span className="font-medium">₹{item.price}</span>
          </div>
        ))}
        <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between font-bold">
          <span>Total Payable:</span>
          <span>₹{totalAmount}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Details */}
        <div className="grid grid-cols-2 gap-4">
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
          {/* Add these inside the grid next to Name and Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <select
              required
              className="w-full border p-2 rounded bg-white"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Age / DOB</label>
            <input
              required
              type="text"
              placeholder="e.g. 28"
              className="w-full border p-2 rounded"
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
        </div>

        {/* Collection Mode */}
        <div>
          <label className="block text-sm font-medium mb-2">
            How would you like to give your sample?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-slate-50 flex-1">
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
            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-slate-50 flex-1">
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
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded border">
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

        {formData.collectionMode === "HOME_COLLECTION" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-4">
            <div>
              <h3 className="font-bold text-emerald-950">Pay by UPI</h3>
              <p className="text-sm text-emerald-800">
                Scan the QR, complete payment, then enter your transaction ID.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div className="h-40 w-40 rounded-lg bg-white border border-emerald-200 flex items-center justify-center overflow-hidden">
                {lab.upiQrCode ? (
                  <img src={lab.upiQrCode} alt={`${lab.name} UPI QR`} className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="px-4 text-center text-xs font-bold text-slate-400">QR not configured</span>
                )}
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-white border border-emerald-100 p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Amount</p>
                  <p className="text-2xl font-black text-slate-900">Rs. {totalAmount}</p>
                  {lab.upiId && <p className="text-sm font-medium text-slate-600 mt-1">UPI ID: {lab.upiId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Transaction ID / UTR</label>
                  <input
                    required
                    type="text"
                    className="w-full border p-2 rounded bg-white"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  />
                </div>
                <a
                  href={whatsappReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  Having payment issue? Share receipt on WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || cartItems.length === 0}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-6 hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Processing..." : `Proceed to Pay ₹${totalAmount}`}
        </button>
      </form>
    </div>
  );
}
