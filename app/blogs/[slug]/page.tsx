import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import BlogHeroIllustration from '@/components/blog/BlogHeroIllustration';
import { BLOG_POSTS, getBlogPostBySlug } from '@/lib/blogPosts';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — BigFoods Guides`,
    description: post.excerpt,
  };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div style={{ background: 'var(--white)' }}>
      <div className="max-w-[760px] mx-auto px-6">
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

        <Link href="/blogs" className="inline-flex items-center gap-1.5 text-[12px] font-medium mt-8 mb-6" style={{ color: 'var(--gray)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> All guides
        </Link>

        <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--orange)' }}>
          {post.category} · {post.readTime}
        </p>
        <h1
          className="text-[28px] md:text-[36px] leading-[1.15] font-semibold mb-6"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
        >
          {post.title}
        </h1>

        <div className="mb-8">
          <BlogHeroIllustration variant={post.illustration} />
        </div>

        <p className="text-[15px] leading-[1.7] mb-10" style={{ color: 'var(--ink)' }}>
          {post.intro}
        </p>

        <div className="space-y-9">
          {post.sections.map((section, i) => (
            <div key={i}>
              <h2
                className="text-[19px] font-semibold mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
              >
                {section.heading}
              </h2>
              {section.paragraphs?.map((p, j) => (
                <p key={j} className="text-[14px] leading-[1.75] mb-3" style={{ color: 'var(--ink)' }}>
                  {p}
                </p>
              ))}
              {section.list && section.ordered && (
                <ol className="space-y-2.5">
                  {section.list.map((item, j) => (
                    <li key={j} className="flex gap-3 text-[14px] leading-[1.6]" style={{ color: 'var(--ink)' }}>
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11.5px] font-semibold"
                        style={{ background: 'var(--peach)', color: 'var(--orange)' }}
                      >
                        {j + 1}
                      </span>
                      <span className="pt-0.5">{item}</span>
                    </li>
                  ))}
                </ol>
              )}
              {section.list && !section.ordered && (
                <ul className="space-y-2">
                  {section.list.map((item, j) => (
                    <li key={j} className="flex gap-2.5 text-[14px] leading-[1.6]" style={{ color: 'var(--ink)' }}>
                      <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--orange)' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {post.faqs && (
          <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--line)' }}>
            <h2 className="text-[19px] font-semibold mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>
              Common questions
            </h2>
            <div className="space-y-5">
              {post.faqs.map((faq, i) => (
                <div key={i}>
                  <p className="text-[14px] font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                    {faq.q}
                  </p>
                  <p className="text-[13.5px] leading-[1.65]" style={{ color: 'var(--gray)' }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-14 mb-4 p-5 rounded-[14px] flex items-center justify-between flex-wrap gap-3" style={{ background: 'var(--peach)' }}>
          <div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>Ready to get started?</p>
            <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>Join BigFoods as a restaurant or rider today.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/restaurant"
              className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold text-white"
              style={{ background: 'var(--orange)' }}
            >
              Open a restaurant
            </Link>
            <Link
              href="/rider-portal"
              className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold"
              style={{ border: '1px solid var(--orange)', color: 'var(--orange)' }}
            >
              Become a rider
            </Link>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-14 pb-16">
            <p className="text-[12.5px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>Read next</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blogs/${r.slug}`}
                  className="block p-4 rounded-[12px]"
                  style={{ border: '1px solid var(--line)' }}
                >
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
                    {r.category}
                  </p>
                  <p className="text-[13.5px] font-semibold leading-[1.3]" style={{ color: 'var(--ink)' }}>
                    {r.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
