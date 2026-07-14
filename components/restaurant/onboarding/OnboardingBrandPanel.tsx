export default function OnboardingBrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
      style={{ background: 'var(--peach)' }}
    >
      <div className="max-w-[380px] w-full relative">
        {/* Route line */}
        <svg width="100%" height="220" viewBox="0 0 320 220" fill="none">
          <path
            d="M20 190 C 90 190, 70 40, 160 40 S 250 190, 300 30"
            stroke="var(--orange)"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />
          <circle cx="20" cy="190" r="6" fill="var(--white)" stroke="var(--orange)" strokeWidth="2" />
          <circle cx="300" cy="30" r="6" fill="var(--orange)" />
        </svg>

        {/* Floating ticket card */}
        <div
          className="absolute -bottom-2 left-4 bg-white rounded-xl px-4 py-3 text-[12px]"
          style={{ boxShadow: '0 10px 30px rgba(32,28,26,0.10)', border: '1px solid var(--line)' }}
        >
          <b className="block text-[14px] mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Order #A192 ready
          </b>
          <span style={{ color: 'var(--gray)' }}>Dispatch rider arriving in 4 min</span>
        </div>

        <div className="text-center mt-16">
          <h2
            className="text-[24px] font-bold leading-tight mb-2.5"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
          >
            Your kitchen, on the map for every hungry customer nearby.
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
            Free dispatch. No delivery staff required. We handle the route.
          </p>
        </div>
      </div>
    </div>
  );
}
