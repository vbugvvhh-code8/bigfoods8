import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Receipt');

export default function OrderReceiptLayout({children}: {children: React.ReactNode}) {
  return children;
}
