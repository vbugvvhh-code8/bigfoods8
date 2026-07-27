import { RiderServiceWorkerRegister } from '@/components/rider/shell/ServiceWorkerRegister';

export const metadata = {
  manifest: '/rider-manifest.webmanifest',
};

export default function RiderPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RiderServiceWorkerRegister />
      {children}
    </>
  );
}
