/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@google/generative-ai', '@radix-ui'],
  swcMinify: true, // Cambiar a true para usar SWC en lugar de Terser
  webpack: (config, { isServer }) => {
    // Fix syntax issues with certain packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true 
  },
  experimental: {
    forceSwcTransforms: true,
    esmExternals: 'loose',
    scrollRestoration: true
  }
};

module.exports = nextConfig;