// app/not-found.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Microscope, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="text-[150px] md:text-[200px] font-bold text-blue-500/10 dark:text-blue-500/5 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-bounce">
              <Microscope className="w-24 h-24 md:w-32 md:h-32 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Don't worry, even the best labs sometimes lose track of samples! 🧪
          </p>
        </div>

        {/* Suggestions */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Here's what you can do:
          </h2>
          <ul className="text-left space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">•</span>
              <span>Check if the URL is typed correctly</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">•</span>
              <span>Return to the dashboard and navigate from there</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">•</span>
              <span>Use the search feature to find what you need</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">•</span>
              <span>Contact support if you believe this is an error</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Button 1: Go to Dashboard */}
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Link href="/lab-owner" className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </Button>

          {/* Button 2: Go Back (History) */}
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
            onClick={() => router.back()}
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </div>
          </Button>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center gap-4 text-gray-300 dark:text-gray-700">
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full animate-pulse"></div>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full animate-pulse delay-75"></div>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent rounded-full animate-pulse delay-150"></div>
        </div>

        {/* Fun Fact */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">💡 Fun Fact:</span> In a typical lab, over 70% of medical decisions are based on laboratory test results!
          </p>
        </div>
      </div>
    </div>
  );
}