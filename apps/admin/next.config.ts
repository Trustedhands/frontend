import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source
  transpilePackages: ['@trustedhands/ui', '@trustedhands/api', '@trustedhands/session'],
  async headers() {
    // Staff-only tool: keep it out of search engines and other sites' frames
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default config;
