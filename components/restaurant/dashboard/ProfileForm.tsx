'use client';

import { useEffect, useState } from 'react';
import { Loader as Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import BannerUpload from '@/components/restaurant/onboarding/BannerUpload';
import BannerPreview from '@/components/restaurant/onboarding/BannerPreview';
import useRestaurant from '@/hooks/useRestaurant';
import type { Profile } from '@/types/database';

const CATEGORIES = ['Local & Native', 'Fast food', 'Drinks & snacks', 'Home kitchens'];

export default function ProfileForm() {
  const supabase = getBrowserSupabase();
  const { restaurant, save, error: restaurantError } = useRestaurant();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      setProfile(profileRow as Profile);
    });
  }, [supabase]);

  if (!restaurant || !profile) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  async function handleSave() {
    if (!restaurant || !profile) return;
    setSaving(true);
    setProfileError(null);
    setSavedMessage(false);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name, phone: profile.phone })
      .eq('id', profile.id);

    if (error) {
      setProfileError(error.message);
      setSaving(false);
      return;
    }

    const result = await save({
      name: restaurant.name,
      category: restaurant.category ?? undefined,
      image_url: restaurant.image_url ?? undefined,
    });

    setSaving(false);
    if (result) setSavedMessage(true);
  }

  return (
    <div>
      <p className="text-[11.5px] font-medium mb-3" style={{ color: 'var(--gray)' }}>Your details</p>
      <div className="mb-3">
        <label className="block text-[12px] font-medium mb-1.5">Full name</label>
        <input
          value={profile.full_name ?? ''}
          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{ border: '1px solid var(--line)' }}
        />
      </div>
      <div className="mb-5">
        <label className="block text-[12px] font-medium mb-1.5">Phone</label>
        <input
          value={profile.phone ?? ''}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{ border: '1px solid var(--line)' }}
        />
      </div>

      <p className="text-[11.5px] font-medium mb-3" style={{ color: 'var(--gray)' }}>Your restaurant</p>
      <div className="mb-3">
        <label className="block text-[12px] font-medium mb-1.5">Restaurant name</label>
        <input
          value={restaurant.name}
          disabled
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none opacity-60"
          style={{ border: '1px solid var(--line)' }}
        />
        <p className="text-[10.5px] mt-1" style={{ color: 'var(--gray)' }}>
          Contact support to change your restaurant name.
        </p>
      </div>
      <div className="mb-3">
        <label className="block text-[12px] font-medium mb-1.5">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => save({ category: cat })}
              className="px-3 py-1.5 rounded-full border text-[11.5px] font-medium"
              style={
                restaurant.category === cat
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
        <label className="block text-[12px] font-medium mb-1.5">Banner photo</label>
        <BannerUpload previewUrl={restaurant.image_url ?? undefined} onUploaded={(url) => save({ image_url: url })} />
      </div>
      <BannerPreview bannerUrl={restaurant.image_url ?? undefined} restaurantName={restaurant.name} category={restaurant.category ?? undefined} />

      {(profileError || restaurantError) && (
        <p className="text-[11px] mt-3" style={{ color: 'var(--red)' }}>
          {profileError ?? restaurantError}
        </p>
      )}
      {savedMessage && (
        <p className="text-[11.5px] mt-3" style={{ color: 'var(--green)' }}>
          Saved.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mt-5 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save changes
      </button>
    </div>
  );
}
