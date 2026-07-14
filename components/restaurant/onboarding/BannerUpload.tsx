'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

interface BannerUploadProps {
  previewUrl?: string;
  onUploaded: (url: string) => void;
}

const MAX_SIZE_KB = 20;
const STORAGE_BUCKET = 'restaurant-banners'; // public bucket, owner-scoped write via RLS

export default function BannerUpload({ previewUrl, onUploaded }: BannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  async function handleFile(file: File) {
    setError(null);
    setStatus('compressing');
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: MAX_SIZE_KB / 1024,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      setStatus('uploading');

      // The bucket's RLS policy only allows writes under the caller's own
      // auth.uid() folder, so this requires the seller to already have a
      // session — true from Step 1 onward, since email verification signs
      // them in.
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Please verify your email in Step 1 before uploading a banner.');
      }

      const path = `${userData.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed);

      if (uploadError) {
        const localUrl = URL.createObjectURL(compressed);
        onUploaded(localUrl);
        setError('Using a local preview for now — the upload failed: ' + uploadError.message);
        setStatus('idle');
        return;
      }

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onUploaded(data.publicUrl);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Could not process that image — try a smaller file.');
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'compressing' || status === 'uploading'}
        className="w-full rounded-[10px] px-4 py-5 flex flex-col items-center justify-center gap-1.5 transition-colors"
        style={{ border: '1.5px dashed var(--line)', background: previewUrl ? 'transparent' : 'var(--peach)' }}
      >
        {status === 'compressing' || status === 'uploading' ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--orange)' }} />
        ) : (
          <ImagePlus className="w-5 h-5" style={{ color: 'var(--orange)' }} />
        )}
        <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
          {previewUrl ? 'Change banner photo' : 'Upload a banner photo'}
        </span>
        <span className="text-[10.5px]" style={{ color: 'var(--gray)' }}>
          Recommended 1200×600px, under {MAX_SIZE_KB}KB after compression
        </span>
      </button>

      {error && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
