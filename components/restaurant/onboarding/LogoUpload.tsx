'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

interface LogoUploadProps {
  previewUrl?: string;
  onUploaded: (url: string) => void;
}

type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'error';

const MAX_SIZE_KB = 50;
const STORAGE_BUCKET = 'restaurant-banners';

export default function LogoUpload(props: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('idle' as UploadStatus);
  const [error, setError] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  async function handleFile(file: File) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPG or WebP image for your logo.');
      setStatus('error');
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

      const authResult = await supabase.auth.getUser();
      if (authResult.error || !authResult.data.user) {
        throw new Error('Please verify your email before uploading your logo.');
      }

      const extensionByType: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      const extension = extensionByType[compressed.type] || extensionByType[file.type] || 'jpg';
      const path = authResult.data.user.id + '/logo-' + Date.now() + '.' + extension;

      const uploadResult = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed, {
        contentType: compressed.type || file.type,
        cacheControl: '3600',
      });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const publicResult = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      props.onUploaded(publicResult.data.publicUrl);
      setStatus('idle');
    } catch (uploadError) {
      setStatus('error');
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload your logo. Please try again.');
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files && event.target.files.length > 0
      ? event.target.files[0]
      : null;

    event.target.value = '';

    if (selectedFile) {
      handleFile(selectedFile).catch(() => {
        setStatus('error');
        setError('Could not upload your logo. Please try again.');
      });
    }
  }

  const busy = status === 'compressing' || status === 'uploading';

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />

      <div className="flex items-center gap-3">
        <div
          className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ border: '1px solid var(--line)', background: 'var(--peach)' }}
        >
          {props.previewUrl ? (
            <img src={props.previewUrl} alt="Restaurant logo preview" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-6 h-6" style={{ color: 'var(--orange)' }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => inputRef.current && inputRef.current.click()}
            disabled={busy}
            className="rounded-[9px] px-3 py-2.5 text-[12px] font-semibold disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--peach)', color: 'var(--ink)', border: '1px solid var(--line)' }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {status === 'compressing' ? 'Preparing…' : status === 'uploading' ? 'Uploading…' : props.previewUrl ? 'Change logo' : 'Upload logo'}
          </button>

          <p className="text-[10.5px] mt-1.5" style={{ color: 'var(--gray)' }}>
            Square PNG, JPG or WebP. Displayed as a round profile image.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
