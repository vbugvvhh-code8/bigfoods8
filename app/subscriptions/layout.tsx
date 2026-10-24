import {OrderShellClient} from '@/components/customer/shell/OrderShellClient';

export default function SubscriptionLayout({children}: {children: React.ReactNode}) {
  return <OrderShellClient>{children}</OrderShellClient>;
}
