'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import BannerUpload from '@/components/restaurant/onboarding/BannerUpload';
import BannerPreview from '@/components/restaurant/onboarding/BannerPreview';
import useOnboardingSession, { stepPath } from '@/hooks/useOnboardingSession';
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

  const registered = draft.registrationStatus === 'registered';
  const cacValid = /^(RC|BN|IT)?\s?-?\d{4,9}$/i.test((draft.cacNumber ?? '').trim());
  const canContinue = !!(
    draft.restaurantName &&
    draft.category &&
    draft.vendorType &&
    draft.registrationStatus &&
    (!registered || cacValid)
  );

  async function handleContinue() {
    setSaving(true);
    const result = await save({
      name: draft.restaurantName,
      category: draft.category,
      image_url: draft.bannerUrl,
      state: draft.state,
      vendor_type: draft.vendorType,
      registration_status: draft.registrationStatus,
      ...(registered ? { cac_number: draft.cacNumber } : {}),
      // Private seller details collected in step 1; the server re-checks 18+.
      ownerDetails: {
        date_of_birth: draft.dateOfBirth ?? '',
        gender: draft.gender ?? '',
        terms_accepted: !!draft.termsAccepted,
        serious_business_ack: !!draft.seriousBusinessAck,
        warnings_ack: !!draft.warningsAck,
      },
    });
    setSaving(false);
    if (result) router.push(stepPath('location'));
  }

  return (
    <>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Tell us about your kitchen
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        This is what customers see first.
      </p>


      <fieldset className="mb-4">
        <legend className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          What are you?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['restaurant', 'A restaurant', 'Shop, canteen or eatery'],
            ['home_kitchen', 'A home kitchen', 'Cooking from home'],
          ].map(([value, title, hint]) => {
            const active = draft.vendorType === value;
            return (
              <label
                key={value}
                className="p-3 rounded-[10px] cursor-pointer text-left"
                style={{ border: active ? '2px solid var(--orange)' : '1px solid var(--line)', padding: active ? 'calc(0.75rem - 1px)' : '0.75rem' }}
              >
                <input
                  type="radio"
                  name="vendorType"
                  value={value}
                  checked={active}
                  onChange={() =>
                    updateDraft({
                      vendorType: value as 'restaurant' | 'home_kitchen',
                      ...(value === 'home_kitchen' && !draft.category ? { category: 'Home kitchens' } : {}),
                    })
                  }
                  className="sr-only"
                />
                <span className="block text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</span>
                <span className="block text-[11px]" style={{ color: 'var(--gray)' }}>{hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Is your business registered with the CAC?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['registered', 'Yes, registered'],
            ['unregistered', 'Not yet'],
          ].map(([value, title]) => {
            const active = draft.registrationStatus === value;
            return (
              <label
                key={value}
                className="p-3 rounded-[10px] cursor-pointer"
                style={{ border: active ? '2px solid var(--orange)' : '1px solid var(--line)', padding: active ? 'calc(0.75rem - 1px)' : '0.75rem' }}
              >
                <input
                  type="radio"
                  name="registrationStatus"
                  value={value}
                  checked={active}
                  onChange={() => updateDraft({ registrationStatus: value as 'registered' | 'unregistered' })}
                  className="sr-only"
                />
                <span className="block text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</span>
              </label>
            );
          })}
        </div>

        {registered && (
          <div className="mt-3">
            <label htmlFor="cac" className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              CAC registration number
            </label>
            <input
              id="cac"
              value={draft.cacNumber ?? ''}
              onChange={(e) => updateDraft({ cacNumber: e.target.value })}
              placeholder="e.g. RC1234567 or BN1234567"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
            {draft.cacNumber && !cacValid && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--red)' }} role="alert">
                Enter a valid CAC number, like RC1234567.
              </p>
            )}
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
              We check this number. Once confirmed, there is no limit on your earnings.
            </p>
          </div>
        )}

        {draft.registrationStatus === 'unregistered' && (
          <p className="text-[11.5px] mt-3 p-3 rounded-[9px]" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>
            You can start selling today. Withdrawals pause once your sales reach ₦10,000,000, until you register
            with the CAC. We will email you well before that.
          </p>
        )}
      </fieldset>

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Business name
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
