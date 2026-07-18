'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, ImagePlus } from 'lucide-react';
import { ONBOARDING_STEPS } from '@/hooks/useOnboardingSession';
import { useMenuItems } from '@/hooks/useMenuItems';
import useRestaurant from '@/hooks/useRestaurant';
import getBrowserSupabase from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';

export default function MenuStepPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { menuItems, isLoading: itemsLoading, addMenuItem, deleteMenuItem } = useMenuItems(restaurant?.id);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = images.length < 3;
  const canSubmitItem = !!(name && price && images.length >= 2 && images.length <= 3);
  const canContinue = menuItems.length >= 1;

  async function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const remaining = 3 - images.length;
    const picked = Array.from(files).slice(0, remaining);
    setImages((prev) => [...prev, ...picked]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddItem() {
    if (!restaurant?.id || !canSubmitItem) return;
    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const compressed = await compressImage(file, { maxDimension: 1280, maxKB: 300 });
        const path = `${restaurant.id}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, compressed);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('menu-images').getPublicUrl(path);
        uploadedUrls.push(publicUrl.publicUrl);
      }

      await addMenuItem({
        name,
        price: Number(price),
        category: category || undefined,
        image_urls: uploadedUrls,
      });

      setName('');
      setPrice('');
      setCategory('');
      setImages([]);
    } catch (e: any) {
      setError(e?.message ?? 'Could not add this item — try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleContinue() {
    router.push(ONBOARDING_STEPS[5].path); // payment
  }

  if (restaurantLoading) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 5 of 6
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Add your first menu item
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        Add at least one dish with 2–3 photos. You can build out the rest of your menu later from your dashboard.
      </p>

      {/* existing items */}
      {menuItems.length > 0 && (
        <div className="mb-5 space-y-2.5">
          {menuItems.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2.5 rounded-[10px]"
              style={{ border: '1px solid var(--line)' }}
            >
              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.name} className="w-11 h-11 rounded-[8px] object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                  {item.name}
                </p>
                <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
                  ₦{Number(item.price).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteMenuItem(item.id)}
                style={{ color: 'var(--gray)' }}
                aria-label={`Remove ${item.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* add item form */}
      <div className="p-4 rounded-[12px] mb-5" style={{ border: '1px solid var(--line)' }}>
        <div className="mb-3">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Dish name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jollof rice & chicken"
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Price (₦)
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="2500"
              inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Category
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Local & native"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
          </div>
        </div>

        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Photos (2–3 required)
        </label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {images.map((file, i) => (
            <div key={i} className="relative w-16 h-16 rounded-[9px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                aria-label="Remove photo"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
          {canAddMore && (
            <label
              className="w-16 h-16 rounded-[9px] flex items-center justify-center cursor-pointer"
              style={{ border: '1.5px dashed var(--line)' }}
            >
              <ImagePlus className="w-5 h-5" style={{ color: 'var(--gray)' }} />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>
          )}
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--gray)' }}>
          {images.length}/3 photos added
        </p>

        {error && (
          <p className="text-[11px] mb-2" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleAddItem}
          disabled={!canSubmitItem || uploading}
          className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--white)', border: '1px solid var(--orange)', color: 'var(--orange)' }}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {uploading ? 'Uploading…' : 'Add this item'}
        </button>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue || itemsLoading}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40"
        style={{ background: 'var(--orange)' }}
      >
        Continue
      </button>
      {!canContinue && (
        <p className="text-[11px] mt-1.5 text-center" style={{ color: 'var(--gray)' }}>
          Add at least one item to continue.
        </p>
      )}
    </>
  );
}
