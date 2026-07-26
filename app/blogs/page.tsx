import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import BlogHeroIllustration from '@/components/blog/BlogHeroIllustration';
import { BLOG_POSTS } from '@/lib/blogPosts';

export const metadata = {
  title: 'BigFoods Guides — Riders, Restaurants & Food Businesses in Anambra',
  description:
    'Practical guides on becoming a delivery rider, selling food online, and running a food business in Anambra — from the team behind BigFoods.',
};

export default function BlogIndexPage() {
  return (
    <div style={{ background: 'var(--white)' }}>
      <div className="max-w-[1180px] mx-auto px-6">
        <header className="pt-6 flex items-center gap-2.5">
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(155deg, var(--orange), var(--orange-dark))',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '11.5px',
            }}
          >
            BF
          </div>
          <Link href="/" className="text-[16.5px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>
            BigFoods
          </Link>
        </header>

        <div className="pt-10 pb-8 md:pt-16 md:pb-12 max-w-[640px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--orange)' }}>
            Guides
          </p>
          <h1
            className="text-[32px] md:text-[42px] leading-[1.1] font-semibold mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
          >
            Everything you need to earn, sell, and deliver in Anambra.
          </h1>
          <p className="text-[14px] leading-[1.6]" style={{ color: 'var(--gray)' }}>
            Practical, no-fluff guides for riders, home cooks, and restaurants building a real food business online.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-16">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blogs/${post.slug}`}
              className="group block rounded-[16px] overflow-hidden transition-transform"
              style={{ border: '1px solid var(--line)' }}
            >
              <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                <BlogHeroIllustration variant={post.illustration} />
              </div>
              <div className="p-5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--orange)' }}>
                  {post.category} · {post.readTime}
                </p>
                <h2
                  className="text-[17px] font-semibold mb-2 leading-[1.3]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
                >
                  {post.title}
                </h2>
                <p className="text-[12.5px] leading-[1.55]" style={{ color: 'var(--gray)' }}>
                  {post.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
