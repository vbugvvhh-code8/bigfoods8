import type { Metadata } from 'next';
import { LOGO_PATH, pageMetadata, SITE_URL } from '@/lib/seo';

type RestaurantSeo = {
  id: string;
  name: string | null;
  category: string | null;
  zone: string | null;
  state: string | null;
  image_url: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-side read of the public restaurant fields, cached for 10 minutes so a
// shared link costs at most one database read per restaurant every 10 minutes.
async function getRestaurant(id: string): Promise<RestaurantSeo | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !UUID_RE.test(id)) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/restaurants?id=eq.${id}&approval_status=eq.approved&select=id,name,category,zone,state,image_url&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 600 } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as RestaurantSeo[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function placeOf(r: RestaurantSeo) {
  return [r.zone, r.state].filter(Boolean).join(', ');
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const path = `/order/restaurant/${params.id}`;
  const r = await getRestaurant(params.id);
  if (!r?.name) {
    return pageMetadata({ title: 'Restaurant menu', path, card: 'order' });
  }
  const place = placeOf(r);
  const kind = r.category ? `${r.category} ` : '';
  return pageMetadata({
    title: place ? `${r.name}, ${place}` : r.name,
    description: `Order ${kind}food from ${r.name}${place ? ` in ${place}` : ''} on BigFoods. See the menu, pay securely and track your rider live.`,
    path,
    card: 'order',
  });
}

export default async function RestaurantMenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const r = await getRestaurant(params.id);
  const jsonLd = r?.name
    ? {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: r.name,
        url: `${SITE_URL}/order/restaurant/${r.id}`,
        image: r.image_url || `${SITE_URL}${LOGO_PATH}`,
        ...(r.category ? { servesCuisine: r.category } : {}),
        ...(placeOf(r)
          ? { address: { '@type': 'PostalAddress', addressLocality: r.zone ?? undefined, addressRegion: r.state ?? undefined, addressCountry: 'NG' } }
          : {}),
        hasMenu: `${SITE_URL}/order/restaurant/${r.id}`,
        brand: { '@id': `${SITE_URL}/#organization` },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  );
}
