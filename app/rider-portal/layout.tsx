import {pageMetadata} from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Become a delivery rider',
  description: 'Deliver food with BigFoods and earn on your own schedule. Sign up, get verified and start taking delivery offers in your zone.',
  path: '/rider-portal',
  card: 'rider',
});

export default function RiderPortalLayout({children}: {children: React.ReactNode}) {
  return children;
}
