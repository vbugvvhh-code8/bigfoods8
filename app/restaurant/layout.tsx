import {pageMetadata} from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Sell your food online',
  description: 'Restaurants and home kitchens in Nigeria: list your menu on BigFoods, take orders, get delivery riders and get paid.',
  path: '/restaurant',
  card: 'restaurant',
});

export default function RestaurantLandingLayout({children}: {children: React.ReactNode}) {
  return children;
}
