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
      
      // Disable terser for problematic files
      config.optimization.minimizer = config.optimization.minimizer.map(minimizer => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          return new minimizer.constructor({
            ...minimizer.options,
            terserOptions: {
              ...minimizer.options.terserOptions,
              keep_classnames: true,
              keep_fnames: true,
              safari10: true,
            },
          });
        }
        return minimizer;
      });
    }
    
    return config;
  },
  // Prevent optimization issues
  swcMinify: false,
  // Remove static export for Vercel deployment
  // output: 'export',  
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
