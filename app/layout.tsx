import './globals.css';
import type {Metadata} from 'next';
import {Inter, Space_Grotesk} from 'next/font/google';
import {CartProvider} from '@/hooks/useCart';

const inter = Inter({subsets: ['latin'], variable: '--font-inter'});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'BigFoods — Order Food Across Nigeria',
  description: 'Order delicious food from local restaurants near you across Nigeria. Free dispatch, fast delivery.',
  openGraph: {
    title: 'BigFoods — Order Food Across Nigeria',
    description: 'Order delicious food from local restaurants near you across Nigeria.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className}`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
