'use client';

import { useState } from 'react';
import { Loader2, X, ImagePlus } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import { MENU_CATEGORY_PRESETS, MENU_CATEGORY_NAMES } from '@/lib/menuCategoryPresets';
import type { MenuItem } from '@/types/database';
import type { NewMenuItem, MenuItemUpdate } from '@/hooks/useMenuItems';

interface MenuItemFormProps {
  restaurantId: string;
  existingItem?: MenuItem;
  onSubmit: (item: NewMenuItem) => Promise<unknown>;
  onUpdate?: (id: string, patch: MenuItemUpdate) => Promise<unknown>;
  onDone: () => void;
  onCancel?: () => void;
}

// One chip grid for picking a category or sub-category — preset chips plus
// an always-available "Custom" chip that reveals a free text field. Presets
// are suggestions only, never enforced (per product decision).
function ChipPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = value !== '' && !options.includes(value.toLowerCase());
  const [showCustomInput, setShowCustomInput] = useState(isCustom);

  return (
    <div>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              onChange(opt);
            }}
            className="px-3 py-1.5 rounded-full border text-[11.5px] font-medium capitalize"
            style={
              !showCustomInput && value.toLowerCase() === opt
                ? { background: 'var(--ink)', color: 'var(--white)', borderColor: 'var(--ink)' }
                : { color: 'var(--gray)', borderColor: 'var(--line)' }
            }
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="px-3 py-1.5 rounded-full border text-[11.5px] font-medium"
          style={
            showCustomInput
              ? { background: 'var(--ink)', color: 'var(--white)', borderColor: 'var(--ink)' }
              : { color: 'var(--gray)', borderColor: 'var(--line)' }
          }
        >
          Custom
        </button>
      </div>
      {showCustomInput && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Type a custom ${label.toLowerCase()}`}
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
        />
      )}
    </div>
  );
}

export default function MenuItemForm({ restaurantId, existingItem, onSubmit, onUpdate, onDone, onCancel }: MenuItemFormProps) {
  const supabase = getBrowserSupabase();
  const isEditing = !!existingItem;

  const [name, setName] = useState(existingItem?.name ?? '');
  const [price, setPrice] = useState(existingItem?.price ? String(existingItem.price) : '');
  const [category, setCategory] = useState(existingItem?.category ?? '');
  const [subcategory, setSubcategory] = useState(existingItem?.subcategory ?? '');
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    (existingItem as any)?.image_urls ?? (existingItem?.image_url ? [existingItem.image_url] : [])
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subcategoryOptions = category ? MENU_CATEGORY_PRESETS[category.toLowerCase()] ?? [] : [];
  const totalImageCount = existingImageUrls.length + newImages.length;
  const canAddMoreImages = totalImageCount < 3;
  const canSubmit = !!(name && price && totalImageCount >= 2 && totalImageCount <= 3);

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const remaining = 3 - totalImageCount;
    setNewImages((prev) => [...prev, ...Array.from(files).slice(0, remaining)]);
  }

  function removeExistingImage(index: number) {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of newImages) {
        const compressed = await compressImage(file, { maxDimension: 1280, maxKB: 300 });
        const path = `${restaurantId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, compressed);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('menu-images').getPublicUrl(path);
        uploadedUrls.push(publicUrl.publicUrl);
      }

      const finalImageUrls = [...existingImageUrls, ...uploadedUrls];

      if (isEditing && existingItem && onUpdate) {
        await onUpdate(existingItem.id, {
          name,
          price: Number(price),
          category: category || null,
          subcategory: subcategory || null,
          image_urls: finalImageUrls,
        });
      } else {
        await onSubmit({
          name,
          price: Number(price),
          category: category || undefined,
          subcategory: subcategory || undefined,
          image_urls: finalImageUrls,
        });
      }
      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this item — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
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

      <div className="mb-3">
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

      <div className="mb-3">
        <ChipPicker
          label="Category"
          options={MENU_CATEGORY_NAMES}
          value={category}
          onChange={(v) => {
            setCategory(v);
            setSubcategory('');
          }}
        />
      </div>

      <div className="mb-3">
        <ChipPicker
          label="Sub-category (optional)"
          options={subcategoryOptions}
          value={subcategory}
          onChange={setSubcategory}
        />
      </div>

      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
        Photos (2–3 required)
      </label>
      <div className="flex gap-2 mb-2 flex-wrap">
        {existingImageUrls.map((url, i) => (
          <div key={url} className="relative w-16 h-16 rounded-[9px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeExistingImage(i)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              aria-label="Remove photo"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
        {newImages.map((file, i) => (
          <div key={i} className="relative w-16 h-16 rounded-[9px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeNewImage(i)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              aria-label="Remove photo"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
        {canAddMoreImages && (
          <label
            className="w-16 h-16 rounded-[9px] flex items-center justify-center cursor-pointer"
            style={{ border: '1.5px dashed var(--line)' }}
          >
            <ImagePlus className="w-5 h-5" style={{ color: 'var(--gray)' }} />
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
          </label>
        )}
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'var(--gray)' }}>
        {totalImageCount}/3 photos
      </p>

      {error && (
        <p className="text-[11px] mb-2" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-[9px] text-[12.5px] font-semibold"
            style={{ border: '1px solid var(--line)', color: 'var(--gray)' }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="flex-1 py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEditing ? 'Save changes' : 'Add item'}
        </button>
      </div>
    </div>
  );
}
