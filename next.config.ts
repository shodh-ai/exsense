import type { NextConfig } from "next";

// File: exsense/next.config.ts



const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:path*', 
        headers: [
          {
            key: 'Content-Security-Policy',
            // A slightly more permissive but still very secure alternative
            value: `connect-src 'self' https: wss: ws://34.93.14.200:6901;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
