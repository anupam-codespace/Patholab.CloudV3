// FILE: src/app/(dashboard)/layout.tsx
// Dashboard Layout with Sidebar and Header
// ==========================================
'use client';

import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/common/Loader';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
  
        <main className="p-6">
          {children}
        </main>
      </div>
    
  );
}