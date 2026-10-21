'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, FileCheck2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import useRider from '@/hooks/useRider';

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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again before uploading.');
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image of your completed waiver.');
      if (file.size > 8 * 1024 * 1024) throw new Error('Please choose an image smaller than 8 MB.');
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/waiver-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('rider-documents').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      setScreenshotPath(path);
      setUploaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!screenshotPath) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('rider-complete-waiver', {
        body: { waiver_screenshot_url: screenshotPath },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      await refresh();
      router.replace('/rider-portal/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your waiver. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (rider?.waiver_completed) {
    return (
      <div className="max-w-[420px] mx-auto px-4 py-10 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-semibold mx-auto mb-4" style={{ background: 'var(--green)' }}>✓</div>
        <h1 className="text-[18px] font-semibold mb-2">Waiver submitted</h1>
        <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>Your waiver is recorded on your rider account.</p>
        <button onClick={() => router.replace('/rider-portal/dashboard')} className="px-5 py-2.5 rounded-[9px] text-[13px] font-semibold text-white" style={{ background: 'var(--orange)' }}>Back to dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-[460px] mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-3">
        <FileCheck2 className="w-5 h-5" style={{ color: 'var(--orange)' }} />
        <h1 className="text-[20px] font-semibold">Complete your waiver</h1>
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        A completed rider waiver is required before you can go online. If you have already completed the official BigFoods waiver, upload a clear screenshot or image below.
      </p>
      <div className="rounded-[10px] p-3 mb-4 text-[12px]" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>
        If you have not received the official waiver document, contact BigFoods support before submitting. Do not upload an unrelated document.
      </div>
      <label className="flex items-center justify-between px-3 py-3 rounded-[9px] text-[13px] cursor-pointer mb-3" style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}>
        <span>{uploading ? 'Uploading…' : uploaded ? 'Waiver image uploaded' : 'Choose waiver image'}</span>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--orange)' }} /> : uploaded ? <Check className="w-4 h-4" style={{ color: 'var(--green)' }} /> : null}
        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); e.currentTarget.value = ''; }} />
      </label>
      {error && <p role="alert" className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>{error}</p>}
      <button onClick={() => void handleSubmit()} disabled={!uploaded || submitting} className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'var(--orange)' }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Submit waiver
      </button>
    </div>
  );
}
