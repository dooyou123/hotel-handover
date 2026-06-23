import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // npm workspaces: 루트·web lockfile 공존 시 추적 루트를 명시
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.officetown.kr',
        port: '10444',
        pathname: '/mall/**',
      },
    ],
  },
};

export default nextConfig;
