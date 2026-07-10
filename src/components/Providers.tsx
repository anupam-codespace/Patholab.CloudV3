'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { KeyboardHelpOverlay } from '@/components/common/KeyboardHelpOverlay';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
  }));

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false} storageKey="patholab-theme">
      <QueryClientProvider client={queryClient}>
        {children}
        <KeyboardHelpOverlay />
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '0.375rem', fontSize: '0.875rem' },
          success: { iconTheme: { primary: 'hsl(var(--success))', secondary: '#fff' } },
          error: { iconTheme: { primary: 'hsl(var(--destructive))', secondary: '#fff' } },
        }} />
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
