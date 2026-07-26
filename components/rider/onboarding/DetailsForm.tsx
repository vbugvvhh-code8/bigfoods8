'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import EmailVerifyField from './EmailVerifyField';
import { RiderOnboardingDraft } from '@/hooks/useRiderOnboardingSession';

const VEHICLE_TYPES = ['Okada', 'Keke', 'Car', 'Bicycle'];
const inputStyle = { border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' } as const;

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-3.5">
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{label}</label>
      <input {...props} className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none" style={inputStyle} />
    </div>
  );
}

interface DetailsFormProps {
  draft: RiderOnboardingDraft;
  updateDraft: (patch: Partial<RiderOnboardingDraft>) => void;
  onContinue: () => void;
}

export default function DetailsForm({ draft, updateDraft, onContinue }: DetailsFormProps) {
  const supabase = getBrowserSupabase();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canContinue =
    !!draft.fullName && !!draft.phone && !!draft.vehicleType && !!draft.plateNumber && !!draft.emailVerified;

  async function handleContinue() {
    setSaveError(null);
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('rider-onboarding-save', {
        body: {
          name: draft.fullName,
          phone: draft.phone,
          email: draft.email,
          vehicle_type: draft.vehicleType,
          plate_number: draft.plateNumber,
        },
      });
      if (error) throw error;
      onContinue();
    } catch {
      setSaveError('Could not save your details — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>Step 1 of 4</p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Tell us about you and your ride
      </h2>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        We use this to verify you and match you to nearby orders.
      </p>

      <Field label="Full name" value={draft.fullName ?? ''} placeholder="Your full name"
        onChange={(e) => updateDraft({ fullName: e.target.value })} />
      <Field label="Phone number" value={draft.phone ?? ''} placeholder="080X XXX XXXX"
        onChange={(e) => updateDraft({ phone: e.target.value })} />

      <div className="mb-1">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Email</label>
        <input
          value={draft.email ?? ''}
          onChange={(e) => updateDraft({ email: e.target.value, emailVerified: false })}
          placeholder="you@example.com"
          type="email"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={inputStyle}
        />
        <EmailVerifyField
          email={draft.email ?? ''}
          fullName={draft.fullName}
          phone={draft.phone}
          verified={!!draft.emailVerified}
          onVerified={() => updateDraft({ emailVerified: true })}
          purpose="rider_signup"
        />
      </div>

      <div className="flex gap-3 mb-2 mt-3.5">
        <div className="flex-1">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Vehicle</label>
          <select value={draft.vehicleType ?? ''} onChange={(e) => updateDraft({ vehicleType: e.target.value })}
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none" style={inputStyle}>
            <option value="" disabled>Select</option>
            {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <Field label="Plate number" value={draft.plateNumber ?? ''} placeholder="AAA 123 XY"
          onChange={(e) => updateDraft({ plateNumber: e.target.value })} />
      </div>

      {saveError && (
        <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {saveError}
        </p>
      )}

      <button onClick={handleContinue} disabled={!canContinue || saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 mt-3"
        style={{ background: 'var(--orange)' }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue
      </button>
    </>
  );
}
