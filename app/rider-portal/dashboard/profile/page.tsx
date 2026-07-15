'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useRider from '@/hooks/useRider';
import getBrowserSupabase from '@/lib/supabase/client';

const VEHICLE_TYPES = ['Okada', 'Keke', 'Car', 'Bicycle'];

export default function RiderProfilePage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { rider, save, error } = useRider();
  const [form, setForm] = useState({ name: '', vehicle_type: '', plate_number: '', zone: '' });
  const [zones, setZones] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (rider) {
      setForm({
        name: rider.name ?? '', vehicle_type: rider.vehicle_type ?? '',
        plate_number: rider.plate_number ?? '', zone: rider.zone ?? '',
      });
    }
  }, [rider]);

  useEffect(() => {
    supabase.from('locations').select('lga').eq('is_active', true).then(({ data }) => {
      const unique = Array.from(new Set((data ?? []).map((r: any) => r.lga))).sort();
      setZones(unique);
    });
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const result = await save(form);
    setSaving(false);
    if (result) setSaved(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/rider-portal');
  }

  function field(key: keyof typeof form) {
    return { value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })) };
  }

  return (
    <>
      <h2 className="text-[18px] font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your profile</h2>
      {rider && rider.strikes > 0 && (
        <p className="text-[11.5px] mb-4 -mt-2.5" style={{ color: 'var(--red)' }}>
          {rider.strikes} strike{rider.strikes === 1 ? '' : 's'} on your account from cancelled deliveries.
        </p>
      )}

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Full name</label>
        <input {...field('name')} className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)' }} />
      </div>

      <div className="flex gap-3 mb-3.5">
        <div className="flex-1">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Vehicle</label>
          <select value={form.vehicle_type} onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Plate number</label>
          <input {...field('plate_number')} className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)' }} />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Zone</label>
        <select value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}>
          <option value="" disabled>Select your zone</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>Orders are only matched to riders in the same zone as the restaurant.</p>
      </div>

      {error && <p className="text-[11.5px] mb-3" style={{ color: 'var(--red)' }}>{error}</p>}
      {saved && <p className="text-[11.5px] mb-3" style={{ color: 'var(--green)' }}>Saved.</p>}

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mb-3 disabled:opacity-40"
        style={{ background: 'var(--orange)' }}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      <button onClick={handleLogout} className="w-full py-2.5 text-[12.5px]" style={{ color: 'var(--gray)', background: 'none', border: 'none' }}>
        Log out
      </button>
    </>
  );
}
