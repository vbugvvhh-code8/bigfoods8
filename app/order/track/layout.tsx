import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Track your order');

export default function OrderTrackLayout({children}: {children: React.ReactNode}) {
  return children;
}
