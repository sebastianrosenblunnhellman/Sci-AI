/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@google/generative-ai', '@radix-ui'],
  webpack: (config, { isServer }) => {
    // Fix syntax issues with certain packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Handle problematic files with different configuration
      if (config.optimization && config.optimization.minimizer) {
        config.optimization.minimizer.forEach(minimizer => {
          if (minimizer.constructor.name === 'TerserPlugin') {
            minimizer.options.terserOptions = {
              ...minimizer.options.terserOptions,
              keep_classnames: true,
              keep_fnames: true,
              safari10: true,
              ecma: 5
            };
          }
        });
      }
    }
    
    return config;
  },
  // Completely disable minification
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    // Additional experimental settings that might help
    forceSwcTransforms: true,
    esmExternals: 'loose'
  }
};

module.exports = nextConfig;
