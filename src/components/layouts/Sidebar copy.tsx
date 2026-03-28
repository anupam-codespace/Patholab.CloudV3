'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  TestTube,
  FileText,
  Settings,
  CreditCard,
  LifeBuoy,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  role: 'SUPER_ADMIN' | 'LAB_OWNER' | 'TECHNICIAN' | 'RECEPTIONIST';
}

const navigation = {
  SUPER_ADMIN: [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Labs', href: '/admin/labs', icon: Building2 },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { name: 'Plans', href: '/admin/plans', icon: FileText },
    { name: 'Analytics', href: '/admin/analytics', icon: LayoutDashboard },
    { name: 'Support', href: '/admin/support', icon: LifeBuoy },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  LAB_OWNER: [
    { name: 'Dashboard', href: '/lab-owner', icon: LayoutDashboard },
    { name: 'Patients', href: '/lab-owner/patients', icon: Users },
    { name: 'Tests', href: '/lab-owner/tests', icon: TestTube },
    { name: 'Staff', href: '/lab-owner/staff', icon: Users },
    { name: 'Reports', href: '/lab-owner/reports', icon: FileText },
    { name: 'Billing', href: '/lab-owner/billing', icon: CreditCard },
    { name: 'Subscription', href: '/lab-owner/subscription', icon: CreditCard },
    { name: 'Settings', href: '/lab-owner/settings', icon: Settings },
  ],
  TECHNICIAN: [
    { name: 'Dashboard', href: '/technician', icon: LayoutDashboard },
    { name: 'Tests', href: '/technician/tests', icon: TestTube },
    { name: 'Samples', href: '/technician/samples', icon: TestTube },
    { name: 'Reports', href: '/technician/reports', icon: FileText },
  ],
  RECEPTIONIST: [
    { name: 'Dashboard', href: '/receptionist', icon: LayoutDashboard },
    { name: 'Appointments', href: '/receptionist/appointments', icon: FileText },
    { name: 'Patients', href: '/receptionist/patients', icon: Users },
    { name: 'Billing', href: '/receptionist/billing', icon: CreditCard },
  ],
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = navigation[role];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center space-x-2">
          <TestTube className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Globiz Patholab</span>
        </Link>
      </div>
      
      <nav className="space-y-1 p-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}