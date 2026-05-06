import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    // Detecta automaticamente o ambiente
    NEXT_PUBLIC_API_URL:
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_PRODUCTION_API_URL ||
          'https://barbearia-backend-caneladas-projects.vercel.app'
        : process.env.NEXT_PUBLIC_API_URL ?? '',
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:3001/health',
      },
    ];
  },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');
    return config;
  },
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
};

export default nextConfig;
