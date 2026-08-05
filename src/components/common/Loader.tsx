import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Loader({ size = 'md', className }: LoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center">
      <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
    </div>
  );
}

import { useState, useEffect } from "react";
import { DotmSquare8 } from "@/components/ui/dotm-square-8";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";
import { DotmSquare16 } from "@/components/ui/dotm-square-16";
import { DotmCircular6 } from "@/components/ui/dotm-circular-6";

// Full page loader: replaced with premium dot-matrix animated loading indicators
export function PageLoader() {
  const [loaderIndex, setLoaderIndex] = useState<number | null>(null);

  useEffect(() => {
    // Pick a loader randomly on mount to keep things fresh and premium
    setLoaderIndex(Math.floor(Math.random() * 4));
  }, []);

  const renderLoader = () => {
    if (loaderIndex === null) return null;

    switch (loaderIndex) {
      case 0:
        return (
          <div className="flex flex-col items-center gap-5">
            <DotmSquare8 size={56} dotSize={6} colorPreset="grad-sunset" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse uppercase tracking-wider">
              Syncing Clinical Workspace...
            </span>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col items-center gap-5">
            <DotmSquare12 size={56} dotSize={5} colorPreset="grad-ocean" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse uppercase tracking-wider">
              Loading Diagnostics...
            </span>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center gap-5">
            <DotmSquare16 size={56} dotSize={5} colorPreset="grad-aurora" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse uppercase tracking-wider">
              Fetching Patient Data...
            </span>
          </div>
        );
      case 3:
      default:
        return (
          <div className="flex flex-col items-center gap-5">
            <DotmCircular6 size={56} dotSize={6} colorPreset="grad-neon" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse uppercase tracking-wider">
              Securing Patholab Session...
            </span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground transition-colors duration-300">
      <div className="p-8 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center min-w-[280px] min-h-[140px]">
        {renderLoader()}
      </div>
    </div>
  );
}
