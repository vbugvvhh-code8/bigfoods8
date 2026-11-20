import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Your profile');

export default function OrderProfileLayout({children}: {children: React.ReactNode}) {
  return children;
}
