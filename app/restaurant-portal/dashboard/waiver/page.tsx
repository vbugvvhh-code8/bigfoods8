'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import useRider from '@/hooks/useRider';

// TODO: replace with the actual URL riders should visit to obtain the waiver
// document -- placeholder until that's provided.
const WAIVER_LINK = 'https://bigfoods.app/rider-waiver';

export default function RiderWaiverPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { rider, refresh } = useRider();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/waiver-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('rider-documents').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      setScreenshotPath(path);
      setUploaded(true);
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed — try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!screenshotPath) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: fnError } = await supabase.functions.invoke('rider-complete-waiver', {
        body: { waiver_screenshot_url: screenshotPath },
      });
      if (fnError) throw fnError;
      await refresh();
      router.push('/rider-portal/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Could not save — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (rider?.waiver_completed) {
    return (
      <div className="max-w-[420px] mx-auto px-4 py-10 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-semibold mx-auto mb-4" style={{ background: 'var(--green)' }}>✓</div>
        <h2 className="text-[18px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Waiver complete</h2>
        <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>You're all set to go online.</p>
        <button
          onClick={() => router.push('/rider-portal/dashboard')}
          className="px-5 py-2.5 rounded-[9px] text-[13px] font-semibold text-white"
          style={{ background: 'var(--orange)' }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[420px] mx-auto px-4 py-8">
      <h1 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Complete your waiver
      </h1>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        BigFoods requires every rider to have a liability waiver on file before going online. This protects both
        you and the platform in case of an accident while delivering.
      </p>

      <a
        href={WAIVER_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center py-3 rounded-[10px] text-[13px] font-semibold mb-4"
        style={{ background: 'var(--peach)', color: 'var(--ink)' }}
      >
        Get your waiver
      </a>

      <p className="text-[12.5px] mb-2 font-medium" style={{ color: 'var(--ink)' }}>
        Upload a screenshot once you have it
      </p>

      <label
        className="flex items-center justify-between px-3 py-2.5 rounded-[9px] text-[13px] cursor-pointer mb-3"
        style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
      >
        <span style={{ color: uploaded ? 'var(--ink)' : 'var(--gray)' }}>
          {uploading ? 'Uploading…' : uploaded ? 'Uploaded' : 'Choose a screenshot'}
        </span>
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--orange)' }} />
        ) : uploaded ? (
          <Check className="w-4 h-4" style={{ color: 'var(--green)' }} />
        ) : null}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </label>

      {error && (
        <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!uploaded || submitting}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Submit
      </button>
    </div>
  );
}
