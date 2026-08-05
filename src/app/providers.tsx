"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient instance
  // We use useState to ensure the client is only created once per session
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("CapacitorApp")) {
      document.documentElement.classList.add("is-native-app");
      document.documentElement.classList.add("is-capacitor");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Adds Toast notifications globally */}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
