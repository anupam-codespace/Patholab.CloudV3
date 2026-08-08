import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import InstallPWA from "@/components/InstallPWA"; // ✅ ADDED PWA Component
import { prisma } from "@/lib/prisma"; // Adjust this path to your Prisma client
import { GoogleAnalytics } from "@next/third-parties/google"; // npm i @next/third-parties

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#2196F3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Recommended for a native app feel
};

// 1. DYNAMIC METADATA GENERATION
export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await prisma.systemConfig.findFirst();

    // Fallbacks if the Super Admin hasn't set anything up yet
    const title = config?.seoTitle || config?.systemName || "Patholab Cloud";
    const description =
      config?.seoDescription || "Advanced Lab Management System";
    const faviconUrl = config?.favicon || "/favicon.ico";

    return {
      title: title,
      description: description,
      keywords:
        config?.seoKeywords || "LIMS, Pathology Software, Cloud Lab, RIS",
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      ),
      // ✅ ADDED PWA MANIFEST & APPLE APP SETTINGS
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: config?.systemName || "Patholab",
      },
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
      openGraph: {
        title: title,
        description: description,
        siteName: config?.systemName || "Patholab Cloud",
        images: config?.ogImage ? [{ url: config.ogImage }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description,
        images: config?.ogImage ? [config.ogImage] : [],
      },
    };
  } catch (error) {
    // Safe fallback if the database connection fails during build/render
    return {
      title: "Patholab | Cloud LIMS Software",
      description: "Advanced Lab Management System",
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      ),
      manifest: "/manifest.json", // Ensure it's in the fallback too
    };
  }
}

// 2. ROOT LAYOUT COMPONENT
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch config again to inject global branding & scripts
  // (Next.js automatically caches this, so it won't hit the DB twice)
  let config = null;
  try {
    config = await prisma.systemConfig.findFirst();
  } catch (error) {
    console.error("Failed to load system config in layout:", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {config && (
          <style>
            {`
              :root {
                --brand-primary: ${config.primaryColor || "#2196F3"};
                --brand-secondary: ${config.secondaryColor || "#8b5cf6"};
              }
            `}
          </style>
        )}
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Wrap everything in the Client-Side Provider */}
        <Providers>{children}</Providers>

        {/* ✅ INJECT PWA INSTALL POPUP */}
        <InstallPWA />

        {/* Inject Google Analytics if the Super Admin provided an ID */}
        {config?.googleAnalyticsId && (
          <GoogleAnalytics gaId={config.googleAnalyticsId} />
        )}
      </body>
    </html>
  );
}
