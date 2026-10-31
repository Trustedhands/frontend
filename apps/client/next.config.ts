import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source
  transpilePackages: ['@trustedhands/ui', '@trustedhands/api'],
  async headers() {
    return [
      {
        // The service worker must never be served stale
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default config;
