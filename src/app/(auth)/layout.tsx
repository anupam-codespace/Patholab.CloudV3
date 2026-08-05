'use client';

// FILE: src/app/(auth)/layout.tsx
// Auth Layout
// ==========================================
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}