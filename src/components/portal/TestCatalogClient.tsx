"use client";

import { useState } from "react";
import {
  Search,
  ShoppingCart,
  Clock,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import PublicBookingForm from "./PublicBookingForm"; // The form we built in the previous step

interface TestCatalogClientProps {
  portalSlug: string;
  lab: {
    name: string;
    logo: string | null;
    city: string | null;
    phone: string;
    upiId: string | null;
    upiQrCode: string | null;
  };
  tests: any[];
}

export default function TestCatalogClient({
  portalSlug,
  lab,
  tests,
}: TestCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);

  // Filter tests based on search query
  const filteredTests = tests.filter(
    (test) =>
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.category?.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const toggleCart = (test: any) => {
    const exists = cart.find((item) => item.id === test.id);
    if (exists) {
      setCart(cart.filter((item) => item.id !== test.id));
    } else {
      setCart([...cart, test]);
    }
  };

  // --- CHECKOUT VIEW ---
  if (isCheckout) {
    return (
      <div className="max-w-4xl mx-auto pt-8 pb-20 px-4">
        <button
          onClick={() => setIsCheckout(false)}
          className="flex items-center text-blue-600 font-medium mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Catalog
        </button>
        <PublicBookingForm portalSlug={portalSlug} cartItems={cart} lab={lab} />
      </div>
    );
  }

  // --- CATALOG VIEW ---
  return (
    <div className="max-w-5xl mx-auto pb-32">
      {/* 1. Header & Lab Branding */}
      <header className="bg-white border-b sticky top-0 z-40 px-4 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          {lab.logo ? (
            <img
              src={lab.logo}
              alt={lab.name}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="h-10 w-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
              {lab.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg text-slate-800">{lab.name}</h1>
            <p className="text-xs text-slate-500">{lab.city}</p>
          </div>
        </div>
      </header>

      {/* 2. Search & Hero */}
      <div className="px-4 py-8 bg-blue-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">Book Your Lab Tests Online</h2>
        <p className="text-blue-100 mb-8">
          Home collection & Lab Visit options available
        </p>

        <div className="relative max-w-2xl mx-auto text-left">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search for blood tests, profiles, or conditions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* 3. Test Grid */}
      <div className="px-4 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTests.map((test) => {
          const inCart = cart.some((item) => item.id === test.id);
          return (
            <div
              key={test.id}
              className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="mb-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">
                  {test.category?.name || "General"}
                </span>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1 leading-tight">
                {test.name}
              </h3>
              {test.description && (
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                  {test.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {test.tatHours ? `${test.tatHours} hrs TAT` : "Standard TAT"}
                </div>
                {test.preRequistes && (
                  <div
                    className="flex items-center gap-1 text-amber-600"
                    title={test.preRequistes}>
                    <AlertCircle className="w-3.5 h-3.5" /> Fasting
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xl font-black text-slate-900">
                  ₹{test.price}
                </div>
                <button
                  onClick={() => toggleCart(test)}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                    inCart
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}>
                  {inCart ? "Remove" : "+ Add"}
                </button>
              </div>
            </div>
          );
        })}

        {filteredTests.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500">
            No tests found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* 4. Floating Cart Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
          <div className="max-w-5xl mx-auto bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between border border-slate-700 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-4">
              <div className="relative bg-slate-800 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Cart Total</p>
                <p className="text-xl font-bold">₹{cartTotal}</p>
              </div>
            </div>

            <button
              onClick={() => setIsCheckout(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
              Proceed to Book <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
