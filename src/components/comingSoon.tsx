// components/ComingSoon.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Rocket,
  Bell,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComingSoonProps {
  featureName?: string;
  description?: string;
  highlights?: string[];
  showNotification?: boolean;
  onNotifyClick?: () => void;
  dashboardText?: string;
  dashboardHref?: string;
  funFact?: string;
}

export default function ComingSoon({
  featureName = "Coming Soon",
  description = "We're working hard to bring you this exciting new feature!",
  highlights = [
    "Enhanced functionality designed with you in mind",
    "Streamlined workflows to save you time",
    "Powerful tools to improve your lab management",
    "Seamless integration with existing features",
  ],
  showNotification = true,
  onNotifyClick,
  dashboardText = "Back to Dashboard",
  dashboardHref = "/workspace",
  funFact = "Innovation in lab technology has reduced testing times by up to 80% in recent years!",
}: ComingSoonProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleNotifyClick = () => {
    if (onNotifyClick) {
      onNotifyClick();
    } else {
      // Default behavior - you can customize this
      alert("Notification feature coming soon!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="text-[150px] md:text-[200px] font-bold text-purple-500/10 dark:text-purple-500/5 select-none">
            SOON
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="animate-bounce">
                <Rocket className="w-24 h-24 md:w-32 md:h-32 text-purple-500" />
              </div>
              <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
            {featureName}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {description}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Good things take time, just like perfecting lab results! 🔬
          </p>
        </div>

        {/* Feature Highlights */}
        {highlights.length > 0 && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              What's on the way:
            </h2>
            <ul className="text-left space-y-3 text-gray-700 dark:text-gray-300">
              {highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-purple-500 font-bold">✨</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notification Signup (Optional) */}
        {showNotification && (
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Want to be notified?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We'll let you know as soon as this feature is ready to use!
            </p>
            <Button
              onClick={handleNotifyClick}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all">
              <Bell className="w-4 h-4 mr-2" />
              Notify Me
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Button 1: Dashboard */}
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
            <Link href={dashboardHref} className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              {dashboardText}
            </Link>
          </Button>

          {/* Button 2: Go Back */}
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-purple-500 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 transition-all"
            onClick={() => router.back()}>
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </div>
          </Button>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center gap-4 text-gray-300 dark:text-gray-700">
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full animate-pulse"></div>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full animate-pulse delay-75"></div>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent rounded-full animate-pulse delay-150"></div>
        </div>

        {/* Fun Fact */}
        {funFact && (
          <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-800 dark:text-purple-300">
              <span className="font-semibold">💡 Did you know?</span> {funFact}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
