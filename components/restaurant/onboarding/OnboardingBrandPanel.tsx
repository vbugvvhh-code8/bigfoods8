import SafeImage from '@/components/ui/SafeImage';
import { CHEF_URL } from '@/lib/brandImages';

/** Desktop-only right column: brand photo with the pitch over it. Hidden on phones, where the same photo is faded behind the page. */
export default function OnboardingBrandPanel() {
  return (
    <aside className="hidden lg:block relative overflow-hidden sticky top-0 h-screen" aria-hidden="true">
      <SafeImage src={CHEF_URL} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(32,28,26,0.82), rgba(32,28,26,0.15) 60%)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-12">
        <h2
          className="text-[28px] font-bold leading-tight mb-3 text-white max-w-[420px]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Your kitchen, on the map for every hungry customer nearby.
        </h2>
        <p className="text-[14px] max-w-[420px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Free dispatch. No delivery staff required. We handle the route.
        </p>
      </div>
    </aside>
  );
}
