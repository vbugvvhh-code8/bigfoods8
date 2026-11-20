import { privateMetadata } from '@/lib/seo';
import { RestaurantServiceWorkerRegister } from '@/components/restaurant/shell/ServiceWorkerRegister';

// The portal is behind a login, so keep it out of search results.
export const metadata = {
  ...privateMetadata('Restaurant portal'),
  manifest: '/restaurant-manifest.webmanifest',
};

export default function RestaurantPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RestaurantServiceWorkerRegister />
      {children}
    </>
  );
}
