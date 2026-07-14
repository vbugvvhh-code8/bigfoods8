'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import BannerUpload from '@/components/restaurant/onboarding/BannerUpload';
import BannerPreview from '@/components/restaurant/onboarding/BannerPreview';
import useOnboardingSession, { ONBOARDING_STEPS } from '@/hooks/useOnboardingSession';
import useRestaurant from '@/hooks/useRestaurant';

// Reusing the same category list customers filter by on the home page, so a
// seller's choice here always matches something a customer can actually find.
const CATEGORIES = ['Local & Native', 'Fast food', 'Drinks & snacks', 'Home kitchens'];

export default function RestaurantInfoPage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated } = useOnboardingSession();
  const { save, error: saveError } = useRestaurant();
  const [saving, setSaving] = useState(false);

  if (!hydrated) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const canContinue = !!(draft.restaurantName && draft.category);

  async function handleContinue() {
    setSaving(true);
    const result = await save({
      name: draft.restaurantName,
      category: draft.category,
      image_url: draft.bannerUrl,
    });
    setSaving(false);
    if (result) router.push(ONBOARDING_STEPS[2].path);
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 2 of 5
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Tell us about your kitchen
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        This is what customers see first.
      </p>

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Restaurant name
        </label>
        <input
          value={draft.restaurantName ?? ''}
          onChange={(e) => updateDraft({ restaurantName: e.target.value })}
          placeholder="e.g. Mama Ngozi's Kitchen"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
        />
      </div>

      <div className="mb-4">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => updateDraft({ category: cat })}
              className="px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-colors"
              style={
                draft.category === cat
                  ? { background: 'var(--ink)', color: 'var(--white)', borderColor: 'var(--ink)' }
                  : { color: 'var(--gray)', borderColor: 'var(--line)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Banner photo
        </label>
        <BannerUpload previewUrl={draft.bannerUrl} onUploaded={(url) => updateDraft({ bannerUrl: url })} />
      </div>

      <BannerPreview bannerUrl={draft.bannerUrl} restaurantName={draft.restaurantName} category={draft.category} />

      {saveError && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--red)' }}>
          {saveError}
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue || saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 mt-5 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue
      </button>
    </>
  );
}
