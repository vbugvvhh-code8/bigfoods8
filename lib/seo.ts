import type { Metadata } from 'next';

// Public site address used for canonical URLs, share cards and the sitemap.
// Set NEXT_PUBLIC_SITE_URL in Netlify if the live domain is different.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bigfoods.app').replace(/\/+$/, '');
export const SITE_NAME = 'BigFoods';
export const DEFAULT_DESCRIPTION =
  'Order food from restaurants and home kitchens near you across Nigeria. Pay securely and track your rider live.';

export const LOGO_PATH = '/brand/bigfoods-logo-512.png';

// 1200x630 share cards built from the BigFoods logo.
export const SHARE_CARDS = {
  default: { url: '/brand/og-default.png', alt: 'BigFoods: order from local kitchens near you' },
  order: { url: '/brand/og-order.png', alt: 'Order food on BigFoods' },
  restaurant: { url: '/brand/og-restaurant.png', alt: 'BigFoods for restaurants: sell your food online' },
  rider: { url: '/brand/og-rider.png', alt: 'Ride with BigFoods' },
} as const;

export type ShareCard = keyof typeof SHARE_CARDS;

type PageMetaInput = {
  title: string;
  description?: string;
  /** Path of the page, e.g. "/order". Used for the canonical URL and og:url. */
  path: string;
  card?: ShareCard;
  /** Pages behind a login or mid-flow: keep them out of search results. */
  noIndex?: boolean;
  type?: 'website' | 'article';
};

/** "Checkout" -> "Checkout | BigFoods". */
export function withBrand(title: string) {
  return title.endsWith(`| ${SITE_NAME}`) ? title : `${title} | ${SITE_NAME}`;
}

/** Consistent title, description, canonical URL and logo share card for a page. */
export function pageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  card = 'default',
  noIndex = false,
  type = 'website',
}: PageMetaInput): Metadata {
  const image = SHARE_CARDS[card];
  const images = [{ url: image.url, width: 1200, height: 630, alt: image.alt }];
  return {
    // Absolute so nested layouts (e.g. everything under /order) keep the suffix.
    title: { absolute: withBrand(title) },
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: 'en_NG',
      url: path,
      title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** For signed-in areas: no search indexing, but still branded tab titles. */
export function privateMetadata(title: string): Metadata {
  return {
    title: { absolute: withBrand(title) },
    robots: { index: false, follow: false },
    // Don't inherit a parent page's canonical URL.
    alternates: { canonical: null },
  };
}
