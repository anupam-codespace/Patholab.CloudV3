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
};

// Wrap your config with the PWA plugin
module.exports = withPWA(nextConfig);