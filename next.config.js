const withPWAInit = require("@ducanh2912/next-pwa").default;

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disables PWA caching in dev mode so you can code without stale cache
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  images: {
    // ✅ FIXED: Combined into a single array
    domains: ['localhost', 'blogger.googleusercontent.com'], 
  },
  
  typescript: {
    // Warning: this will hide all type errors on build
    ignoreBuildErrors: true,
  },
  
  experimental: {
    // serverActions: true, // Note: If you are on Next.js 14+, this is enabled by default!
  },
  async headers() {
  return [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ];
}
};

// Wrap your config with the PWA plugin
module.exports = withPWA(nextConfig);