import { RestaurantServiceWorkerRegister } from '@/components/restaurant/shell/ServiceWorkerRegister';

export const metadata = {
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
