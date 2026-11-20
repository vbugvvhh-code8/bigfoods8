import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Pay for an order');

export default function OrderPayLayout({children}: {children: React.ReactNode}) {
  return children;
}
