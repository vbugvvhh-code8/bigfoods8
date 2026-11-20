import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Your orders');

export default function OrderHistoryLayout({children}: {children: React.ReactNode}) {
  return children;
}
