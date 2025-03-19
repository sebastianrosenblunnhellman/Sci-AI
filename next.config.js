/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing code...
  env: {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  },
  // Add this to ensure images are served correctly
  images: {
    domains: ['localhost'],
    // You can also specify other image optimization options here
  },
  // ...existing code...
}

module.exports = nextConfig
