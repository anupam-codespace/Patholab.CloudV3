import { Metadata } from "next";
import ContactModal from "@/components/landing/ContactModal"; // We will create this below
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us - Patholab",
  description: "Get in touch with our support team.",
};

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-600">
            Have questions about our pricing, features, or need technical
            support? We're here to help.
          </p>

          <div className="py-8 grid gap-6 md:grid-cols-3 text-left">
            <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900">Email</h3>
              <p className="text-sm text-slate-500">sales@globizpatholab.com</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900">Phone</h3>
              <p className="text-sm text-slate-500">+91 8402010207</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900">Office</h3>
              <p className="text-sm text-slate-500">Bangalore, India</p>
            </div>
          </div>

          {/* THE CONTACT MODAL TRIGGER */}
          <ContactModal>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-lg shadow-lg shadow-blue-200">
              Send a Message
            </Button>
          </ContactModal>
        </div>
      </section>
    </div>
  );
}
