import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Checkout');

export default function OrderCheckoutLayout({children}: {children: React.ReactNode}) {
  return children;
}
