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
      
      // COMPLETELY disable minimization - this is the key fix
      if (config.optimization) {
        config.optimization.minimize = false;
        
        // If still using Terser, configure it to do almost nothing
        if (config.optimization.minimizer) {
          for (const minimizer of config.optimization.minimizer) {
            if (minimizer.constructor.name === 'TerserPlugin') {
              minimizer.options.terserOptions = {
                ...minimizer.options.terserOptions,
                compress: false,
                mangle: false,
                keep_classnames: true,
                keep_fnames: true,
                safari10: true,
                ecma: 5
              };
            }
          }
        }
      }
    }
    
    return config;
  },
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    forceSwcTransforms: true,
    esmExternals: false, // Changed from 'loose' to false
    // Removed the invalid legacyBrowsers option
    optimizeCss: false,
    scrollRestoration: true
  }
};

module.exports = nextConfig;
