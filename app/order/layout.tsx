import type {Metadata} from 'next';
import {OrderShellClient} from '@/components/customer/shell/OrderShellClient';

const ICON_URL = 'https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.4568313681357089.webp';

// Scoped to app/order and its children only — the root splash, admin, and
// restaurant-portal pages don't inherit this, so they're unaffected.
export const metadata: Metadata = {
  title: 'BigFoods',
  description: 'Order food from local restaurants — fast delivery, real-time tracking, pay by card.',
  manifest: '/order-manifest.webmanifest',
  themeColor: '#FF7A1A',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BigFoods',
  },
  icons: {
    icon: ICON_URL,
    apple: ICON_URL,
  },
};

export default function OrderLayout({children}: {children: React.ReactNode}) {
  return <OrderShellClient>{children}</OrderShellClient>;
}
