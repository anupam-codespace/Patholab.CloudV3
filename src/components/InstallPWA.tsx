"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Listen for the browser's install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent Chrome's default mini-infobar
      setDeferredPrompt(e); // Save the event so we can trigger it later
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
      setIsInstallable(false);
    }

    // Clear the saved prompt since it can't be used again
    setDeferredPrompt(null);
  };

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-card rounded-xl shadow-2xl border border-border p-4 w-80 flex gap-4 items-start relative">
        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground/70 hover:text-muted-foreground">
          <X size={16} />
        </button>

        {/* App Icon Mockup */}
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner">
          <Download className="text-white w-6 h-6" />
        </div>

        <div className="flex-1 pt-1">
          <h4 className="font-bold text-foreground text-sm">
            Install Patholab.cloud App
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3 leading-snug">
            Install on your device for faster access and offline capabilities.
          </p>
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="w-full bg-primary hover:bg-primary/90 h-8 text-xs font-bold shadow-sm">
            Install Now
          </Button>
        </div>
      </div>
    </div>
  );
}
