import {OrderShellClient} from '@/components/customer/shell/OrderShellClient';
import {pageMetadata} from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Meal subscriptions',
  description: 'Get your regular meals delivered on a schedule from kitchens near you.',
  path: '/subscriptions',
  card: 'order',
});

export default function SubscriptionLayout({children}: {children: React.ReactNode}) {
  return <OrderShellClient>{children}</OrderShellClient>;
}
