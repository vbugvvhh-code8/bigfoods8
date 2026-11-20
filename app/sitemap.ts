import type { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/lib/blogPosts';
import { SITE_URL } from '@/lib/seo';

// Rebuilt at most once an hour, so the restaurant list costs one small
// database read per hour.
export const revalidate = 3600;

async function approvedRestaurantIds(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/restaurants?approval_status=eq.approved&is_seed_data=eq.false&select=id&limit=1000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as { id: string }[];
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/restaurant`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/order`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/rider-portal`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/subscriptions`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/waitlist`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/blogs`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ].map((p) => ({ ...p, lastModified: now }) as MetadataRoute.Sitemap[number]);

  const guides = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blogs/${post.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const restaurants = (await approvedRestaurantIds()).map((id) => ({
    url: `${SITE_URL}/order/restaurant/${id}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...pages, ...guides, ...restaurants];
}
