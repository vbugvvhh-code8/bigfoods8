'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LocationPicker from '@/components/restaurant/onboarding/LocationPicker';
import useOnboardingSession, { ONBOARDING_STEPS } from '@/hooks/useOnboardingSession';
import useRestaurant from '@/hooks/useRestaurant';

export default function LocationPage() {
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

  const canContinue = !!(draft.address && draft.lga && draft.latitude && draft.longitude);

  async function handleContinue() {
    setSaving(true);
    const result = await save({
      address: draft.address,
      zone: draft.lga,
      latitude: draft.latitude,
      longitude: draft.longitude,
    });
    setSaving(false);
    if (result) router.push(ONBOARDING_STEPS[3].path);
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 3 of 5
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Where's your kitchen?
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        Riders use this to find you. You can fine-tune the pin later.
      </p>

      <LocationPicker
        address={draft.address}
        lga={draft.lga}
        onChange={({ address, lga, latitude, longitude }) => updateDraft({ address, lga, latitude, longitude })}
      />

      {saveError && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--red)' }}>
          {saveError}
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue || saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 mt-6 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue
      </button>
    </>
  );
}
