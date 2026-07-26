'use client';

type Variant = 'rider' | 'storefront' | 'phone-order' | 'delivery-route' | 'earnings';

export default function BlogHeroIllustration({ variant }: { variant: Variant }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[16px]"
      style={{ height: 220, background: 'var(--peach)' }}
    >
      {variant === 'rider' && <RiderScene />}
      {variant === 'storefront' && <StorefrontScene />}
      {variant === 'phone-order' && <PhoneOrderScene />}
      {variant === 'delivery-route' && <DeliveryRouteScene />}
      {variant === 'earnings' && <EarningsScene />}

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          :global(.bf-anim) {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- Rider: moped riding along a dashed road, wheels spinning ---------- */
function RiderScene() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full">
      <line x1="0" y1="170" x2="400" y2="170" stroke="var(--line)" strokeWidth="3" strokeDasharray="10 8" />
      <g className="bf-anim" style={{ animation: 'bf-ride 5s linear infinite' }}>
        <circle cx="70" cy="158" r="14" fill="none" stroke="var(--ink)" strokeWidth="4" />
        <circle cx="140" cy="158" r="14" fill="none" stroke="var(--ink)" strokeWidth="4" />
        <path d="M70 158 L95 120 L140 158" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M95 120 L110 90 L130 90" fill="none" stroke="var(--orange)" strokeWidth="5" strokeLinecap="round" />
        <rect x="55" y="128" width="26" height="16" rx="4" fill="var(--orange)" />
        <circle cx="112" cy="105" r="9" fill="var(--ink)" />
      </g>
      <style jsx>{`
        @keyframes bf-ride {
          0% { transform: translateX(-40px); }
          100% { transform: translateX(340px); }
        }
      `}</style>
    </svg>
  );
}

/* ---------- Storefront: awning with a pulsing "open" dot ---------- */
function StorefrontScene() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full">
      <rect x="90" y="90" width="220" height="100" rx="4" fill="var(--white)" stroke="var(--line)" strokeWidth="3" />
      <path d="M80 90 L100 50 L300 50 L320 90 Z" fill="var(--orange)" />
      <rect x="170" y="130" width="60" height="60" fill="var(--peach)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="220" cy="160" r="3" fill="var(--ink)" />
      <g className="bf-anim" style={{ animation: 'bf-pulse 1.8s ease-in-out infinite', transformOrigin: '340px 70px' }}>
        <circle cx="340" cy="70" r="10" fill="var(--green)" />
      </g>
      <style jsx>{`
        @keyframes bf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </svg>
  );
}

/* ---------- Phone order: floating food icons rising into a phone ---------- */
function PhoneOrderScene() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full">
      <rect x="160" y="40" width="80" height="150" rx="14" fill="var(--white)" stroke="var(--ink)" strokeWidth="3" />
      <rect x="172" y="58" width="56" height="100" rx="4" fill="var(--peach)" />
      <circle cx="200" cy="172" r="6" fill="var(--ink)" />
      {[0, 1, 2].map((i) => (
        <g key={i} className="bf-anim" style={{ animation: `bf-float 3s ease-in-out ${i * 0.6}s infinite` }}>
          <circle cx={90 + i * 15} cy={140 - i * 10} r="14" fill="var(--orange)" opacity="0.85" />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={`r-${i}`} className="bf-anim" style={{ animation: `bf-float 3.4s ease-in-out ${0.3 + i * 0.5}s infinite` }}>
          <circle cx={310 - i * 15} cy={135 - i * 8} r="12" fill="var(--teal)" opacity="0.85" />
        </g>
      ))}
      <style jsx>{`
        @keyframes bf-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </svg>
  );
}

/* ---------- Delivery route: pin travelling along a curved path ---------- */
function DeliveryRouteScene() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full">
      <path
        id="bf-route"
        d="M40 170 C 120 60, 260 200, 360 60"
        fill="none"
        stroke="var(--line)"
        strokeWidth="3"
        strokeDasharray="8 8"
      />
      <circle cx="40" cy="170" r="8" fill="var(--ink)" />
      <circle cx="360" cy="60" r="8" fill="var(--ink)" />
      <g className="bf-anim" style={{ offsetPath: "path('M40 170 C 120 60, 260 200, 360 60')", animation: 'bf-travel 4.5s ease-in-out infinite' } as any}>
        <path d="M-9 8 L0 -9 L9 8 Z" fill="var(--orange)" />
      </g>
      <style jsx>{`
        @keyframes bf-travel {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
      `}</style>
    </svg>
  );
}

/* ---------- Earnings: bars growing, coin ticking up ---------- */
function EarningsScene() {
  const bars = [40, 70, 55, 95, 75];
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={90 + i * 45}
          y={190 - h}
          width="28"
          height={h}
          rx="4"
          fill={i === 3 ? 'var(--orange)' : 'var(--line)'}
          className="bf-anim"
          style={{ animation: `bf-grow 2.2s ease-out ${i * 0.15}s both`, transformOrigin: `${90 + i * 45 + 14}px 190px` }}
        />
      ))}
      <style jsx>{`
        @keyframes bf-grow {
          0% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </svg>
  );
}
