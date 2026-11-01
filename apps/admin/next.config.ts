import type { NextConfig } from 'next';

/**
 * Where the API lives, for proxying. With API_ORIGIN set, the browser calls
 * /v1/* on this app's own origin and Next forwards it, so the API's refresh
 * cookie belongs to this app's domain: the app and API can sit on unrelated
 * domains (e.g. two *.onrender.com hosts). NEXT_PUBLIC_API_URL instead makes
 * the browser call the API directly, which needs the two to be same-site.
 */
const apiOrigin = process.env.API_ORIGIN?.replace(/\/$/, '');
if (!apiOrigin && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'Set API_ORIGIN (proxy the API through this app) or NEXT_PUBLIC_API_URL (call it directly). See .env.example.',
  );
}

const config: NextConfig = {
  // Workspace packages ship TypeScript source
  transpilePackages: ['@trustedhands/ui', '@trustedhands/api', '@trustedhands/session'],
  async rewrites() {
    return apiOrigin ? [{ source: '/v1/:path*', destination: `${apiOrigin}/v1/:path*` }] : [];
  },
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
