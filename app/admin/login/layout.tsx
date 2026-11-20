import {privateMetadata} from '@/lib/seo';

export const metadata = privateMetadata('Admin log in');

export default function AdminLoginLayout({children}: {children: React.ReactNode}) {
  return children;
}
