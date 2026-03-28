/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    domains: ['blogger.googleusercontent.com'],
  },
  typescript: {
    // Warning: this will hide all type errors on build
    ignoreBuildErrors: true,
  },
  experimental: {
    // serverActions: true,
  },
}

module.exports = nextConfig
