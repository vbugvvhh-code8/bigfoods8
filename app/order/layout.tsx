import type {Metadata} from 'next';
import {pageMetadata} from '@/lib/seo';
import {OrderShellClient} from '@/components/customer/shell/OrderShellClient';

// Scoped to app/order and its children only — the root splash, admin, and
// restaurant-portal pages don't inherit this, so they're unaffected.
// Icons come from the root app/icon.png and app/apple-icon.png (BigFoods logo).
export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Order food near you',
    description: 'Order from restaurants and home kitchens near you. Browse menus, pay securely and track your rider live.',
    path: '/order',
    card: 'order',
  }),
  manifest: '/order-manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BigFoods',
  },
};

export default function OrderLayout({children}: {children: React.ReactNode}) {
  return <OrderShellClient>{children}</OrderShellClient>;
}
