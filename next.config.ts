import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'wqtoahrekijirxxpbfqg.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/admin/payments', destination: '/admin/finance/payables', permanent: false },
      { source: '/admin/payments/new', destination: '/admin/finance/payables/new', permanent: false },
      { source: '/admin/payments/by-project', destination: '/admin/finance/by-project', permanent: false },
      { source: '/admin/payments/by-payee', destination: '/admin/finance/by-person', permanent: false },
      { source: '/admin/payments/:id', destination: '/admin/finance/payables/:id', permanent: false },
    ];
  },
};

export default nextConfig;
