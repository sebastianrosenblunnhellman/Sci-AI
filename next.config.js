/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [], // Agrega aquí dominios para imágenes externas si los necesitas
    // Necesario para compatibilidad con Cloudflare Pages
    loader: 'default',
    remotePatterns: [],
  },
  // Optimización para producción
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Aumenta el límite de tamaño de página para PDF grandes
  experimental: {
    largePageDataBytes: 128 * 1000, // 128KB por defecto, aumentar si es necesario
    // Optimiza compatibilidad con Cloudflare
    optimizeCss: true,
    scrollRestoration: true,
    forceSwcTransforms: true, // Force SWC transforms even with custom Babel config
  },
  // Configuración de headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig;