"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, QrCode, Copy, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BookingFormProps {
  portalSlug: string;
  cartItems: { id: string; name: string; price: number }[];
}

interface PaymentInfo {
  upiId: string | null;
  upiQrCode: string | null;
  amount: number;
  note: string;
}

interface BookingResult {
  trackId: string;
  appointmentId: string;
  payableAmount: number;
  paymentInfo?: PaymentInfo;
}

export default function PublicBookingForm({
  portalSlug,
  cartItems,
}: BookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copied, setCopied] = useState(false);

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
  });

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.price),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
          email: finalEmail,
          testTemplateIds: cartItems.map((item) => item.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to book");
      }

      // ✅ v3.2.4: Stay on this page and show the UPI payment section
      // (previously redirected to /track immediately, but the patient
      // hadn't paid yet — they need to see the UPI ID/QR + submit their
      // transaction ID BEFORE leaving the booking form).
      setBookingResult({
        trackId: data.trackId,
        appointmentId: data.appointmentId,
        payableAmount: data.payableAmount || totalAmount,
        paymentInfo: data.paymentInfo,
      });

      toast.success("Booking received! Please complete payment below.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ v3.2.4: Submit the patient's payment reference (UTR/transaction ID)
  // to the lab. The lab owner will verify it manually from the dashboard.
  const handleSubmitPayment = async () => {
    if (!bookingResult) return;
    setSubmittingPayment(true);
    try {
      // We re-book with the paymentReference — but since the appointment is
      // already created, we use a separate PATCH endpoint to update the
      // transaction ID on the existing appointment.
      const res = await fetch(`/api/public/${portalSlug}/payment-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: bookingResult.trackId,
          paymentReference: paymentReference.trim(),
          paymentMode: "UPI",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit payment reference");

      toast.success("Payment reference submitted! Redirecting to tracking page...");
      setTimeout(() => {
        router.push(`/track/${bookingResult.trackId}`);
      }, 1200);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const copyUpiId = () => {
    if (bookingResult?.paymentInfo?.upiId) {
      navigator.clipboard?.writeText(bookingResult.paymentInfo.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ✅ v3.2.4: PAYMENT STEP — show UPI info + reference submission form
  if (bookingResult) {
    const upiId = bookingResult.paymentInfo?.upiId;
    const upiQrCode = bookingResult.paymentInfo?.upiQrCode;
    const amount = bookingResult.payableAmount;

    return (
      <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow-md border space-y-6">
        <div className="text-center">
          <div className="h-14 w-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Booking Confirmed!</h2>
          <p className="text-sm text-muted-foreground">
            Track ID: <span className="font-mono font-bold text-primary">{bookingResult.trackId}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Save this Track ID to check your status later.
          </p>
        </div>

        {/* UPI Payment Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-1">Complete Payment</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Pay ₹{amount.toFixed(2)} via UPI to confirm your booking.
          </p>

          {upiId ? (
            <div className="space-y-4">
              {/* UPI ID + QR */}
              <div className="flex flex-col md:flex-row gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Lab UPI ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-white px-3 py-2 rounded border">
                      {upiId}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyUpiId}>
                      {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Amount: ₹{amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Note: {bookingResult.paymentInfo?.note}</p>
                </div>
                {upiQrCode && (
                  <div className="flex-shrink-0">
                    <img src={upiQrCode} alt="UPI QR Code" className="h-32 w-32 border rounded" />
                  </div>
                )}
              </div>

              {/* UPI Deep Link (mobile-friendly) */}
              <a
                href={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=Lab&am=${amount}&cu=INR&tn=${encodeURIComponent(bookingResult.paymentInfo?.note || '')}`}
                className="block w-full text-center bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90"
              >
                Open UPI App to Pay
              </a>

              {/* Payment reference submission */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium">
                  Enter UPI Transaction ID / UTR <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  After paying, enter the 12-digit transaction reference number from your UPI app. The lab will verify it shortly.
                </p>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., 456123879012"
                  className="mb-3"
                />
                <Button
                  className="w-full"
                  onClick={handleSubmitPayment}
                  disabled={submittingPayment || !paymentReference.trim()}
                >
                  {submittingPayment ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Submit Payment Reference
                </Button>
              </div>

              {/* Skip for now */}
              <div className="text-center">
                <button
                  onClick={() => router.push(`/track/${bookingResult.trackId}`)}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  I'll pay later — go to tracking page
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                This lab hasn't set up UPI payments yet. Please call the lab to pay over the phone, then proceed to the tracking page.
              </p>
              <Button
                className="w-full mt-3"
                variant="outline"
                onClick={() => router.push(`/track/${bookingResult.trackId}`)}
              >
                Go to Tracking Page <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ BOOKING FORM (initial state)
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              required
              type="tel"
              className="w-full border p-2 rounded"
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              className="w-full border p-2 rounded"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                onChange={() => setFormData({ ...formData, collectionMode: "LAB_VISIT" })}
              />
              Visit Laboratory
            </label>
            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-muted/30 flex-1">
              <input
                type="radio"
                name="mode"
                value="HOME_COLLECTION"
                checked={formData.collectionMode === "HOME_COLLECTION"}
                onChange={() => setFormData({ ...formData, collectionMode: "HOME_COLLECTION" })}
              />
              Home Collection
            </label>
          </div>
        </div>

        {/* Dynamic Address Fields */}
        {formData.collectionMode === "HOME_COLLECTION" && (
          <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded border">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Complete Address</label>
              <input
                required
                type="text"
                className="w-full border p-2 rounded"
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pincode</label>
              <input
                required
                type="text"
                className="w-full border p-2 rounded"
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Preferred Date</label>
            <input
              required
              type="date"
              className="w-full border p-2 rounded"
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time Slot</label>
            <select
              className="w-full border p-2 rounded"
              onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
            >
              <option>08:00 AM - 10:00 AM</option>
              <option>10:00 AM - 12:00 PM</option>
              <option>02:00 PM - 04:00 PM</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || cartItems.length === 0}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg mt-6 hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </span>
          ) : (
            `Book Now — ₹${totalAmount}`
          )}
        </button>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          After booking, you'll see the lab's UPI ID to pay. Save your tracking ID to check status later.
        </p>
      </form>
    </div>
  );
}
