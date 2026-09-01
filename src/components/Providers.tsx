'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from 'next-themes';

function ThemeBridge() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // Use a ref so the window function always closes over the latest theme value
  const themeRef = React.useRef(theme);
  const resolvedRef = React.useRef(resolvedTheme);
  const setThemeRef = React.useRef(setTheme);

  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { resolvedRef.current = resolvedTheme; }, [resolvedTheme]);
  useEffect(() => { setThemeRef.current = setTheme; }, [setTheme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).patholabToggleTheme = () => {
        const current = resolvedRef.current || themeRef.current || 'light';
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        setThemeRef.current(nextTheme);
        // Dispatch a native event so Swift observers can react immediately
        window.dispatchEvent(new CustomEvent('patholab-theme-changed', { detail: { theme: nextTheme } }));
        return nextTheme === 'dark';
      };
      (window as any).patholabGetTheme = () => resolvedRef.current || themeRef.current || 'light';
    }
  }, []); // run once – uses refs to always be current

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a client inside the component to ensure data isn't shared between users/requests
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent immediate refetching on window focus during hydration
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ThemeBridge />
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a client inside the component to ensure data isn't shared between users/requests
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent immediate refetching on window focus during hydration
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  const toastTop = useNativeToastTop();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ThemeBridge />
        {children}
        {/* Push toasts below the native Android/iOS header bar.
            toastTop is reactive — it updates once --native-top-padding is injected
            by MainActivity.java (Android) or MainViewController.swift (iOS). */}
        <Toaster
          position="top-center"
          toastOptions={{ duration: 4000 }}
          containerStyle={{ top: toastTop }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}