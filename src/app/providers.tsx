"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient instance
  // We use useState to ensure the client is only created once per session
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Adds Toast notifications globally */}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
