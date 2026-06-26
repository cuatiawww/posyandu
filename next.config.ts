import type { NextConfig } from "next";

const backendBaseUrl = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  serverExternalPackages: ['svg-captcha'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  async rewrites() {
    return {
      fallback: [
        // Semua /api/* yang tidak ada dedicated route.ts → proxy ke backend utama (web.php)
        {
          source: '/api/:path*',
          destination: `${backendBaseUrl}/api/:path*`,
        },
      ],
    }
  },
};

export default nextConfig;
