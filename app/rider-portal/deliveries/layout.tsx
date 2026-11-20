import RiderDashboardLayout from '../dashboard/layout';
import { privateMetadata } from '@/lib/seo';

export const metadata = privateMetadata('Deliveries');

export default function RiderDeliveriesLayout({ children }: { children: React.ReactNode }) {
  return <RiderDashboardLayout>{children}</RiderDashboardLayout>;
}
