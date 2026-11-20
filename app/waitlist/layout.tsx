import {pageMetadata} from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Join the waitlist',
  description: 'Be first to know when BigFoods launches in your area.',
  path: '/waitlist',
  card: 'default',
});

export default function WaitlistLayout({children}: {children: React.ReactNode}) {
  return children;
}
