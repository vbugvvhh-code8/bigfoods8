import {pageMetadata} from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Search food and restaurants',
  description: 'Find dishes and restaurants near you on BigFoods, from jollof rice to suya.',
  path: '/order/search',
  card: 'order',
});

export default function OrderSearchLayout({children}: {children: React.ReactNode}) {
  return children;
}
