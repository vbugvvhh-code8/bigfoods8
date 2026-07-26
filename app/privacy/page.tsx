import Link from 'next/link';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Privacy Policy — BigFoods',
  description: 'How BigFoods collects, uses, and protects your information.',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-9 scroll-mt-24">
      <h2 className="text-[17px] font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>
        {title}
      </h2>
      <div className="text-[13.5px] leading-[1.75] space-y-3" style={{ color: 'var(--ink)' }}>
        {children}
      </div>
    </section>
  );
}

const SECTIONS = [
  ['info-we-collect', '1. Information we collect'],
  ['how-we-use', '2. How we use your information'],
  ['sharing', '3. Who we share information with'],
  ['cookies', '4. Cookies and similar technologies'],
  ['retention', '5. How long we keep information'],
  ['your-rights', '6. Your rights'],
  ['security', '7. Security'],
  ['children', "8. Children's privacy"],
  ['changes', '9. Changes to this policy'],
  ['contact', '10. Contact'],
] as const;

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--white)' }}>
      <div className="max-w-[900px] mx-auto px-6">
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

        <div className="pt-10 pb-8">
          <h1 className="text-[28px] md:text-[34px] font-semibold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>
            Privacy Policy
          </h1>
          <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>Last updated July 25, 2026</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 pb-16">
          <nav className="hidden md:block">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--gray)' }}>On this page</p>
            <ul className="space-y-2">
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-[12px] hover:underline" style={{ color: 'var(--gray)' }}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-[13.5px] leading-[1.75] mb-8" style={{ color: 'var(--gray)' }}>
              This Privacy Policy explains how BigFoods ("BigFoods", "we", "us") collects, uses, shares, and
              protects information when you use our platform as a Customer, Restaurant, or Rider. It's written to
              align with the Nigeria Data Protection Regulation (NDPR).
            </p>

            <Section id="info-we-collect" title="1. Information we collect">
              <p><strong>Account information:</strong> name, email, phone number, and password (stored in encrypted form).</p>
              <p><strong>Location information:</strong> delivery addresses, restaurant addresses, and, for active Riders, live location while online, so orders can be matched and tracked accurately.</p>
              <p><strong>Payment information:</strong> processed directly by our payment processor, Paystack. BigFoods does not receive or store your full card number. For Restaurant withdrawals, we collect and verify bank account details through Paystack's account-verification service.</p>
              <p><strong>Order and usage information:</strong> order history, menu views, restaurant page views, and interactions with promoted listings, used to operate and improve the Platform.</p>
              <p><strong>Communications:</strong> messages you send to support, and records of transactional emails we send you (such as order confirmations and account notices).</p>
            </Section>

            <Section id="how-we-use" title="2. How we use your information">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>To create and manage your account, and verify your identity where required</li>
                <li>To process orders, payments, and Restaurant/Rider payouts</li>
                <li>To match Customers, Restaurants, and Riders, and coordinate delivery</li>
                <li>To send transactional emails: order updates, verification codes, password resets, and account notices</li>
                <li>To detect and prevent fraud, abuse, and violations of our Terms</li>
                <li>To understand how the Platform is used and improve it, including measuring how restaurant listings and promotions perform</li>
              </ul>
            </Section>

            <Section id="sharing" title="3. Who we share information with">
              <p>We share information only as needed to operate the Platform:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Paystack</strong> — to process payments and verify withdrawal bank accounts</li>
                <li><strong>Resend</strong> — to deliver transactional emails (verification codes, receipts, account notices)</li>
                <li><strong>Supabase</strong> — our database and infrastructure provider, which stores platform data securely</li>
                <li><strong>Restaurants and Riders</strong> — receive the order and contact information necessary to fulfil a specific order</li>
                <li><strong>Legal and regulatory authorities</strong> — where required by law, or to protect the rights, safety, or property of BigFoods or others</li>
              </ul>
              <p>We do not sell your personal information to third parties.</p>
            </Section>

            <Section id="cookies" title="4. Cookies and similar technologies">
              <p>
                We use essential cookies and local storage to keep you signed in and remember your preferences. We
                also record anonymous, aggregate interaction data — such as how often a restaurant's listing is
                viewed or clicked — to power analytics shown to Restaurants and platform administrators. This data
                is not linked to an individual customer's identity.
              </p>
            </Section>

            <Section id="retention" title="5. How long we keep information">
              <p>
                We retain account and order information for as long as your account is active and for a reasonable
                period afterward to meet legal, tax, and dispute-resolution obligations. You may request deletion of
                your account as described below, subject to information we're required to retain by law.
              </p>
            </Section>

            <Section id="your-rights" title="6. Your rights">
              <p>Under the NDPR and applicable law, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Request a copy of the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete information</li>
                <li>Request deletion of your account and associated personal information</li>
                <li>Object to certain uses of your information</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:support@bigfoods.app" className="underline" style={{ color: 'var(--ink)' }}>support@bigfoods.app</a>.
                We may need to verify your identity before fulfilling a request.
              </p>
            </Section>

            <Section id="security" title="7. Security">
              <p>
                We use industry-standard safeguards, including encryption in transit and access controls, to protect
                your information. No system is completely secure, and we encourage you to use a strong, unique
                password and to contact us immediately if you suspect unauthorized access to your account.
              </p>
            </Section>

            <Section id="children" title="8. Children's privacy">
              <p>
                The Platform is not directed at children under 18, and we do not knowingly collect personal
                information from anyone under 18. If you believe a child has provided us with personal information,
                contact us and we will take steps to remove it.
              </p>
            </Section>

            <Section id="changes" title="9. Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. Material changes will be reflected by updating
                the "Last updated" date above. Continued use of the Platform after changes take effect constitutes
                acceptance of the revised policy.
              </p>
            </Section>

            <Section id="contact" title="10. Contact">
              <p>
                Questions or requests about this Privacy Policy can be sent to{' '}
                <a href="mailto:support@bigfoods.app" className="underline" style={{ color: 'var(--ink)' }}>
                  support@bigfoods.app
                </a>. You can also review our{' '}
                <Link href="/terms" className="underline" style={{ color: 'var(--ink)' }}>Terms & Conditions</Link>.
              </p>
            </Section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
