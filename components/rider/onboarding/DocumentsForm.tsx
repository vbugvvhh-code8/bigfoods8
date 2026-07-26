'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import { RiderOnboardingDraft } from '@/hooks/useRiderOnboardingSession';

const inputStyle = { border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' } as const;

interface DocumentsFormProps {
  draft: RiderOnboardingDraft;
  updateDraft: (patch: Partial<RiderOnboardingDraft>) => void;
  onContinue: () => void;
  onBack: () => void;
}

function UploadField({
  label,
  uploaded,
  uploading,
  error,
  onSelect,
}: {
  label: string;
  uploaded: boolean;
  uploading: boolean;
  error: string | null;
  onSelect: (file: File) => void;
}) {
  return (
    <div className="mb-3.5">
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
        {label}
      </label>
      <label
        className="flex items-center justify-between px-3 py-2.5 rounded-[9px] text-[13px] cursor-pointer"
        style={inputStyle}
      >
        <span style={{ color: uploaded ? 'var(--ink)' : 'var(--gray)' }}>
          {uploading ? 'Uploading…' : uploaded ? 'Uploaded' : 'Choose a photo'}
        </span>
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--orange)' }} />
        ) : uploaded ? (
          <Check className="w-4 h-4" style={{ color: 'var(--green)' }} />
        ) : null}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = '';
          }}
        />
      </label>
      {error && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function DocumentsForm({ draft, updateDraft, onContinue, onBack }: DocumentsFormProps) {
  const supabase = getBrowserSupabase();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload(
    field: 'face_photo_url' | 'id_front_url' | 'id_back_url',
    draftKey: 'facePhotoUploaded' | 'idFrontUploaded' | 'idBackUploaded',
    file: File
  ) {
    setErrors((e) => ({ ...e, [field]: null }));
    setUploading((u) => ({ ...u, [field]: true }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${field}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('rider-documents').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const { error: saveErr } = await supabase.functions.invoke('rider-onboarding-save', {
        body: { [field]: path },
      });
      if (saveErr) throw saveErr;

      updateDraft({ [draftKey]: true } as Partial<RiderOnboardingDraft>);
    } catch (err: any) {
      setErrors((e) => ({ ...e, [field]: err?.message ?? 'Upload failed — try again.' }));
    } finally {
      setUploading((u) => ({ ...u, [field]: false }));
    }
  }

  const canContinue =
    !!draft.facePhotoUploaded &&
    !!draft.idFrontUploaded &&
    !!draft.idBackUploaded &&
    !!draft.idNumber &&
    (!draft.isDispatchCompany || !!draft.companyName);

  async function handleContinue() {
    setSaveError(null);
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('rider-onboarding-save', {
        body: {
          id_number: draft.idNumber,
          company_name: draft.isDispatchCompany ? draft.companyName : null,
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
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 2 of 4
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Verify who you are
      </h2>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        A clear photo of your face and your government ID, front and back.
      </p>

      <UploadField
        label="Face photo"
        uploaded={!!draft.facePhotoUploaded}
        uploading={!!uploading.face_photo_url}
        error={errors.face_photo_url ?? null}
        onSelect={(file) => handleUpload('face_photo_url', 'facePhotoUploaded', file)}
      />
      <UploadField
        label="Government ID — front"
        uploaded={!!draft.idFrontUploaded}
        uploading={!!uploading.id_front_url}
        error={errors.id_front_url ?? null}
        onSelect={(file) => handleUpload('id_front_url', 'idFrontUploaded', file)}
      />
      <UploadField
        label="Government ID — back"
        uploaded={!!draft.idBackUploaded}
        uploading={!!uploading.id_back_url}
        error={errors.id_back_url ?? null}
        onSelect={(file) => handleUpload('id_back_url', 'idBackUploaded', file)}
      />

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          ID number
        </label>
        <input
          value={draft.idNumber ?? ''}
          onChange={(e) => updateDraft({ idNumber: e.target.value })}
          placeholder="As shown on your ID"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={inputStyle}
        />
      </div>

      <div
        className="flex items-center justify-between rounded-[10px] px-3.5 py-3 mb-3.5"
        style={{ border: '1px solid var(--line)' }}
      >
        <div>
          <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>
            Riding for a dispatch company?
          </p>
          <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
            Leave off if this is your personal vehicle
          </p>
        </div>
        <button
          onClick={() => updateDraft({ isDispatchCompany: !draft.isDispatchCompany })}
          className="w-[42px] h-6 rounded-full relative transition-colors flex-shrink-0"
          style={{ background: draft.isDispatchCompany ? 'var(--orange)' : 'var(--line)' }}
        >
          <span
            className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all"
            style={{ left: draft.isDispatchCompany ? '21px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
          />
        </button>
      </div>

      {draft.isDispatchCompany && (
        <div className="mb-3.5">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Company name
          </label>
          <input
            value={draft.companyName ?? ''}
            onChange={(e) => updateDraft({ companyName: e.target.value })}
            placeholder="e.g. Swift Dispatch Ltd"
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
            style={inputStyle}
          />
        </div>
      )}

      {saveError && (
        <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {saveError}
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue || saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mb-2.5 disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue
      </button>
      <button onClick={onBack} className="w-full py-2.5 text-[12.5px]" style={{ color: 'var(--gray)', background: 'none', border: 'none' }}>
        Back
      </button>
    </>
  );
}
