import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-10" style={{ background: 'var(--ink)', color: '#EDE9E1' }}>
      <div className="max-w-[1180px] mx-auto px-6 py-11">
        <div
          className="grid grid-cols-1 md:grid-cols-[1.2fr_2fr] gap-8 pb-8"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(155deg, var(--orange), var(--orange-dark))',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.15)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: '11.5px',
                  color: 'white',
                }}
              >
                BF
              </div>
              <span
                className="text-[16.5px] font-semibold text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                BigFoods
              </span>
            </div>
            <p className="text-[12.5px] mt-3 max-w-[260px] leading-[1.55]" style={{ color: '#B7B0A2' }}>
              Cook. We handle pickup, delivery, and getting you customers — across Anambra.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <FooterCol title="Restaurants">
              <FooterLink href="/restaurant">Open your restaurant</FooterLink>
            </FooterCol>
            <FooterCol title="Riders">
              <FooterLink href="/rider-portal">Become a rider</FooterLink>
            </FooterCol>
            <FooterCol title="Company">
              <FooterLink href="/blogs">Blog</FooterLink>
            </FooterCol>
            <FooterCol title="Legal">
              <FooterLink href="/terms">Terms &amp; Conditions</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
            </FooterCol>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 pt-5 text-[11.5px]" style={{ color: '#8B8478' }}>
          <span>© 2026 BigFoods. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white" style={{ color: '#8B8478' }}>
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white" style={{ color: '#8B8478' }}>
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-3.5" style={{ color: '#8B8478' }}>
        {title}
      </h4>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[13px] text-white hover:text-[color:var(--orange)]">
      {children}
    </Link>
  );
}
