"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Monitor, BookOpen } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "DICOM Config", path: "/workspace/radiology/settings/dicom", icon: Monitor },
    { name: "Letterhead", path: "/workspace/radiology/settings/letterhead", icon: FileText },
    { name: "Macros", path: "/workspace/radiology/settings/macros", icon: BookOpen },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Horizontal Navigation Bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.path);
            return (
              <Link 
                key={tab.path} 
                href={tab.path}
                className={`flex items-center gap-2 pb-4 pt-2 font-bold text-sm border-b-2 transition-colors ${
                  isActive 
                    ? "border-indigo-600 text-indigo-700" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page Content */}
      <main className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {children}
      </main>
    </div>
  );
}