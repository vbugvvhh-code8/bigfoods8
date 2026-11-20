import './globals.css';
import type {Metadata} from 'next';
import {Inter, Space_Grotesk} from 'next/font/google';
import {CartProvider} from '@/hooks/useCart';
import {DEFAULT_DESCRIPTION, LOGO_PATH, SHARE_CARDS, SITE_NAME, SITE_URL} from '@/lib/seo';

const inter = Inter({subsets: ['latin'], variable: '--font-inter'});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

// Favicon, app icon and Apple touch icon come from app/favicon.ico,
// app/icon.png and app/apple-icon.png (all generated from the BigFoods logo).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BigFoods — Order Food Across Nigeria',
    template: '%s | BigFoods',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'food delivery Nigeria',
    'order food online',
    'Awka food delivery',
    'Anambra restaurants',
    'home kitchens',
    'BigFoods',
  ],
  themeColor: '#FF6A00',
  formatDetection: {telephone: false},
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_NG',
    url: '/',
    title: 'BigFoods — Order Food Across Nigeria',
    description: DEFAULT_DESCRIPTION,
    images: [{url: SHARE_CARDS.default.url, width: 1200, height: 630, alt: SHARE_CARDS.default.alt}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BigFoods — Order Food Across Nigeria',
    description: DEFAULT_DESCRIPTION,
    images: [SHARE_CARDS.default.url],
  },
};

// Tells search engines who runs the site and which image is the logo.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {'@type': 'ImageObject', url: `${SITE_URL}${LOGO_PATH}`, width: 512, height: 512},
      email: 'support@bigfoods.app',
      areaServed: 'NG',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: {'@id': `${SITE_URL}/#organization`},
      inLanguage: 'en-NG',
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className}`}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{__html: JSON.stringify(organizationJsonLd)}}
        />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
