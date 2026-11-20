/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    // bigfoods.app opens on the restaurant page. Permanent (308) so search
    // engines treat /restaurant as the home page and pass ranking to it.
    return [{ source: '/', destination: '/restaurant', permanent: true }];
  },
};

module.exports = nextConfig;
