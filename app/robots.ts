import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Public marketing, menu and guide pages are crawlable; signed-in areas,
// checkout and account pages are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/staff',
          '/api/',
          '/restaurant-portal',
          '/rider-portal/dashboard',
          '/rider-portal/deliveries',
          '/rider-portal/onboarding',
          '/rider-portal/login',
          '/rider-portal/forgot-password',
          '/rider-portal/reset-password',
          '/order/checkout',
          '/order/orders',
          '/order/profile',
          '/order/track',
          '/order/receipt',
          '/order/pay',
          '/order/login',
          '/order/signup',
          '/order/forgot-password',
          '/order/reset-password',
          '/track',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
