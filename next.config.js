/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    // bigfoods.app opens on the restaurant page.
    return [{ source: '/', destination: '/restaurant', permanent: false }];
  },
};

module.exports = nextConfig;
