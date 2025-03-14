/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [], // Agrega aquí dominios para imágenes externas si los necesitas
    unoptimized: process.env.NODE_ENV === 'development',
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
  // Si se detecta Cloudflare Pages como entorno de ejecución
  // Esta configuración ayuda con el manejo de workers
  output: process.env.CF_PAGES ? 'standalone' : undefined,
}

module.exports = nextConfig