import Link from 'next/link';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Terms & Conditions — BigFoods',
  description: 'The terms that govern use of the BigFoods platform.',
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
  ['acceptance', '1. Acceptance of these terms'],
  ['the-service', '2. What BigFoods is'],
  ['eligibility', '3. Eligibility and accounts'],
  ['contractor-status', '4. Restaurants and riders are independent'],
  ['orders-payment', '5. Orders, pricing, and payment'],
  ['promotions', '6. Promotions and boosted listings'],
  ['cancellations', '7. Cancellations and refunds'],
  ['conduct', '8. Prohibited conduct'],
  ['content', '9. Content you provide'],
  ['liability', '10. Limitation of liability'],
  ['indemnity', '11. Indemnification'],
  ['termination', '12. Suspension and termination'],
  ['disputes', '13. Governing law and disputes'],
  ['changes', '14. Changes to these terms'],
  ['contact', '15. Contact'],
] as const;

export default function TermsPage() {
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
            Terms & Conditions
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
              These Terms & Conditions ("Terms") govern access to and use of the BigFoods platform, including our
              website, mobile experience, and related services (together, the "Platform"), operated by BigFoods
              ("BigFoods", "we", "us"). By creating an account, placing an order, registering a restaurant, or
              signing up as a delivery rider, you agree to be bound by these Terms.
            </p>

            <Section id="acceptance" title="1. Acceptance of these terms">
              <p>
                By accessing or using the Platform in any capacity — as a customer, restaurant, or rider — you
                confirm that you have read, understood, and agree to these Terms and our{' '}
                <Link href="/privacy" className="underline" style={{ color: 'var(--ink)' }}>Privacy Policy</Link>. If
                you do not agree, you may not use the Platform.
              </p>
            </Section>

            <Section id="the-service" title="2. What BigFoods is">
              <p>
                BigFoods operates a marketplace that connects independent restaurants and home kitchens
                ("Restaurants"), independent delivery riders ("Riders"), and customers ("Customers") in Anambra
                State, Nigeria. BigFoods facilitates discovery, ordering, payment processing, and delivery
                coordination between these parties. BigFoods does not itself prepare, sell, or deliver food.
              </p>
            </Section>

            <Section id="eligibility" title="3. Eligibility and accounts">
              <p>
                You must be at least 18 years old to create an account or use the Platform. You are responsible for
                maintaining the confidentiality of your account credentials and for all activity that occurs under
                your account. You agree to provide accurate, current information during registration and to keep it
                up to date. BigFoods may suspend or terminate any account found to contain false or misleading
                information.
              </p>
            </Section>

            <Section id="contractor-status" title="4. Restaurants and riders are independent">
              <p>
                Restaurants and Riders using the Platform are independent, self-employed operators — not employees,
                agents, partners, or joint venturers of BigFoods. BigFoods does not control the day-to-day
                operations, hours, food preparation methods, or delivery methods of Restaurants or Riders, and is
                not responsible for the acts, omissions, negligence, or misconduct of any Restaurant or Rider.
              </p>
              <p>
                Restaurants are solely responsible for the quality, safety, accuracy, and legality of the food they
                prepare and sell, including compliance with all applicable food safety and public health
                regulations. Riders are solely responsible for operating any vehicle safely and lawfully and for
                complying with applicable traffic and licensing laws.
              </p>
            </Section>

            <Section id="orders-payment" title="5. Orders, pricing, and payment">
              <p>
                Prices, availability, and delivery estimates displayed on the Platform are set or provided by
                Restaurants and Riders and may change without notice. Payments are processed through our third-party
                payment processor, Paystack; BigFoods does not store your full card details. By placing an order or
                making a payment, you authorize BigFoods and its payment processor to charge the applicable amount.
              </p>
              <p>
                Verification fees, promotion fees, and platform commissions charged to Restaurants and Riders are
                disclosed at the time of payment and are, except where these Terms or applicable law state
                otherwise, non-refundable.
              </p>
            </Section>

            <Section id="promotions" title="6. Promotions and boosted listings">
              <p>
                BigFoods may offer paid promotional placement to Restaurants to increase their visibility on the
                Platform. Purchasing a promotion does not guarantee any specific number of views, clicks, or orders.
                BigFoods reserves the right to set, change, and enforce pricing, duration, and eligibility rules for
                promotions at its discretion, including withholding the discounted first-time rate from any
                Restaurant found to be circumventing it.
              </p>
            </Section>

            <Section id="cancellations" title="7. Cancellations and refunds">
              <p>
                Once a Restaurant has begun preparing an order, it generally cannot be cancelled. Where an order is
                cancelled before preparation begins, is undeliverable through no fault of the Customer, or is
                materially different from what was ordered, BigFoods may, at its discretion, arrange a refund or
                credit. BigFoods is not obligated to issue a refund for a Customer's change of mind after an order
                has been accepted by a Restaurant.
              </p>
            </Section>

            <Section id="conduct" title="8. Prohibited conduct">
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Provide false information when registering a Restaurant or Rider account</li>
                <li>Use the Platform for any fraudulent, unlawful, or harassing purpose</li>
                <li>Attempt to circumvent, disable, or interfere with the Platform's security or functionality</li>
                <li>Scrape, copy, or resell Platform data or content without written permission</li>
                <li>Manipulate ratings, reviews, order volume, or promotional pricing eligibility</li>
                <li>Use the Platform to transact outside its payment system in a way that avoids applicable fees</li>
              </ul>
              <p>Violation of this section may result in immediate suspension or termination of your account.</p>
            </Section>

            <Section id="content" title="9. Content you provide">
              <p>
                When you upload photos, menu descriptions, reviews, or other content to the Platform, you grant
                BigFoods a non-exclusive, worldwide, royalty-free license to host, display, reproduce, and
                distribute that content in connection with operating and promoting the Platform. You represent that
                you own or have the right to share any content you upload.
              </p>
            </Section>

            <Section id="liability" title="10. Limitation of liability">
              <p>
                The Platform is provided "as is" and "as available." To the fullest extent permitted by law,
                BigFoods disclaims all warranties, express or implied, regarding the Platform, including
                merchantability, fitness for a particular purpose, and non-infringement.
              </p>
              <p>
                To the fullest extent permitted by law, BigFoods will not be liable for any indirect, incidental,
                special, consequential, or punitive damages, or for any loss of profits, revenue, or data, arising
                from your use of the Platform, including any act or omission of a Restaurant or Rider. Where
                liability cannot be fully excluded under applicable law, BigFoods' total liability to you for any
                claim arising from your use of the Platform is limited to the greater of the amount you paid to
                BigFoods in the three months preceding the claim, or ₦20,000.
              </p>
            </Section>

            <Section id="indemnity" title="11. Indemnification">
              <p>
                You agree to indemnify and hold BigFoods, its officers, and staff harmless from any claim, demand,
                loss, or damages, including reasonable legal fees, arising out of your use of the Platform, your
                violation of these Terms, or your violation of any law or the rights of a third party.
              </p>
            </Section>

            <Section id="termination" title="12. Suspension and termination">
              <p>
                BigFoods may suspend or terminate any account, at its discretion and without prior notice, for
                conduct that violates these Terms, harms other users, harms BigFoods, or creates legal exposure for
                BigFoods. You may stop using the Platform and close your account at any time.
              </p>
            </Section>

            <Section id="disputes" title="13. Governing law and disputes">
              <p>
                These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute arising from
                these Terms or your use of the Platform that cannot be resolved informally shall be subject to the
                exclusive jurisdiction of the courts of Anambra State, Nigeria.
              </p>
            </Section>

            <Section id="changes" title="14. Changes to these terms">
              <p>
                BigFoods may update these Terms from time to time. Material changes will be indicated by updating
                the "Last updated" date above. Continued use of the Platform after changes take effect constitutes
                acceptance of the revised Terms.
              </p>
            </Section>

            <Section id="contact" title="15. Contact">
              <p>
                Questions about these Terms can be sent to{' '}
                <a href="mailto:support@bigfoods.app" className="underline" style={{ color: 'var(--ink)' }}>
                  support@bigfoods.app
                </a>.
              </p>
            </Section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
