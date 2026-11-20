import type { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/lib/blogPosts';
import { CONTENT_UPDATED, SITE_URL } from '@/lib/seo';

// Submit https://<your domain>/sitemap.xml in Google Search Console.
// Rebuilt at most once an hour, so the restaurant list costs one small
// database read per hour.
export const revalidate = 3600;

type RestaurantRow = { id: string; created_at: string | null };

async function approvedRestaurants(): Promise<RestaurantRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/restaurants?approval_status=eq.approved&is_seed_data=eq.false&select=id,created_at&order=created_at.asc&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    return (await res.json()) as RestaurantRow[];
  } catch {
    // Never fail the whole sitemap because the database was unreachable.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const page = (
    path: string,
    updated: string,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: number,
  ) => ({ url: `${SITE_URL}${path}`, lastModified: updated, changeFrequency, priority });

  const pages: MetadataRoute.Sitemap = [
    page('/restaurant', CONTENT_UPDATED.marketing, 'weekly', 1),
    page('/order', CONTENT_UPDATED.marketing, 'daily', 0.9),
    page('/rider-portal', CONTENT_UPDATED.marketing, 'weekly', 0.8),
    page('/subscriptions', CONTENT_UPDATED.marketing, 'weekly', 0.6),
    page('/waitlist', CONTENT_UPDATED.marketing, 'monthly', 0.5),
    page('/blogs', CONTENT_UPDATED.guides, 'weekly', 0.7),
    page('/privacy', CONTENT_UPDATED.legal, 'yearly', 0.2),
    page('/terms', CONTENT_UPDATED.legal, 'yearly', 0.2),
  ];

  const guides = BLOG_POSTS.map((post) => page(`/blogs/${post.slug}`, CONTENT_UPDATED.guides, 'monthly', 0.6));

  // Menus change often and we don't track a "menu updated" time, so no
  // lastmod here; Google will recrawl on its own schedule.
  const restaurants = (await approvedRestaurants()).map((r) => ({
    url: `${SITE_URL}/order/restaurant/${r.id}`,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...pages, ...guides, ...restaurants];
}
