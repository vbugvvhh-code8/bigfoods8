import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Staff');

export default function StaffLayout({children}: {children: React.ReactNode}) {
  return children;
}
