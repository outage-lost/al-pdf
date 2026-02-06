/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  // Deshabilitar Vercel Analytics para evitar errores 404
  telemetry: false,
  experimental: {
    webpackBuildWorker: false,
  },
}

export default nextConfig
