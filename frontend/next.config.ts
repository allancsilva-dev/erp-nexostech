import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://backend:3001/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
