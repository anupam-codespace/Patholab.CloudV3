import type { Metadata } from "next";
import LandingClient from "@/components/landing/LandingClient";

export const metadata: Metadata = {
  title: "Patholab | Enterprise Cloud LIMS for High-Volume Labs",
  description:
    "The operating system for modern pathology labs. Automate reporting, billing, inventory, and machine interfacing with Patholab.",
  keywords: [
    "LIMS Software",
    "Pathology Lab Management",
    "Medical Billing",
    "Cloud LIMS",
    "Patholab",
  ],
  openGraph: {
    title: "Patholab - The Future of Diagnostics",
    description:
      "Scale your lab with AI-powered reporting and multi-center management.",
    url: "https://Patholab.cloud",
    siteName: "Patholab",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "en_IN",
    type: "website",
  },
  alternates: {
    canonical: "https://Patholab.cloud",
  },
};

export default function Page() {
  return <LandingClient />;
}
