/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing code...
  
  // Add this to ensure images are served correctly
  images: {
    domains: ['localhost'],
    // You can also specify other image optimization options here
  },
  
  // ...existing code...
}

module.exports = nextConfig
