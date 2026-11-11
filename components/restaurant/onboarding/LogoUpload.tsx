'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

interface LogoUploadProps {
  previewUrl?: string;
  onUploaded: (url: string) => void;
}

const MAX_SIZE_KB = 50;
const STORAGE_BUCKET = 'restaurant-banners';

export default function LogoUpload({ previewUrl, onUploaded }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for your logo.');
      return;
    }
    setError(null);
    setStatus('compressing');
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: MAX_SIZE_KB / 1024,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
      setStatus('uploading');

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        throw new Error('Please verify your email before uploading your logo.');
      }

      const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const path = userData.user.id + '/logo-' + Date.now() + '.' + extension;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed, {
        contentType: compressed.type || file.type,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onUploaded(data.publicUrl);
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not upload your logo. Please try again.');
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.currentTarget.value = '';
        }}
      />
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ border: '1px solid var(--line)', background: 'var(--peach)' }}>
          {previewUrl ? (
            <img src={previewUrl} alt="Restaurant logo preview" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-6 h-6" style={{ color: 'var(--orange)' }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === 'compressing' || status === 'uploading'}
            className="rounded-[9px] px-3 py-2.5 text-[12px] font-semibold disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--peach)', color: 'var(--ink)', border: '1px solid var(--line)' }}
          >
            {status === 'compressing' || status === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {status === 'compressing' ? 'Preparing…' : status === 'uploading' ? 'Uploading…' : previewUrl ? 'Change logo' : 'Upload logo'}
          </button>
          <p className="text-[10.5px] mt-1.5" style={{ color: 'var(--gray)' }}>
            Square PNG, JPG or WebP. Displayed as a round profile image.
          </p>
        </div>
      </div>
      {error && <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }} role="alert'>{error}</p>}
    </div>
  );
}
