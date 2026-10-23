'use client';

import { useEffect, useState } from 'react';
import { Loader2, X, ImagePlus } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import { MENU_CATEGORY_PRESETS, MENU_CATEGORY_NAMES } from '@/lib/menuCategoryPresets';
import type { MenuItem, MenuItemOptionGroup } from '@/types/database';
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
export function ChipPicker({
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
  const [supabase] = useState(() => getBrowserSupabase());
  const isEditing = !!existingItem;

  const [name, setName] = useState(existingItem?.name ?? '');
  const [price, setPrice] = useState(existingItem?.price ? String(existingItem.price) : '');
  const [category, setCategory] = useState(existingItem?.category ?? '');
  const [subcategory, setSubcategory] = useState(existingItem?.subcategory ?? '');
  const [description, setDescription] = useState(existingItem?.description ?? '');
  const [ingredients, setIngredients] = useState(existingItem?.ingredients ?? '');
  const [servingSize, setServingSize] = useState(existingItem?.serving_size ?? '');
  const [preparationTime, setPreparationTime] = useState(existingItem?.preparation_time_minutes ? String(existingItem.preparation_time_minutes) : '');
  const [allergens, setAllergens] = useState((existingItem?.allergens ?? []).join(', '));
  const [dietaryTags, setDietaryTags] = useState((existingItem?.dietary_tags ?? []).join(', '));
  const [promotionalPrice, setPromotionalPrice] = useState(existingItem?.promotional_price == null ? '' : String(existingItem.promotional_price));
  const [promotionStartsAt, setPromotionStartsAt] = useState(existingItem?.promotion_starts_at ? new Date(existingItem.promotion_starts_at).toISOString().slice(0,16) : '');
  const [promotionEndsAt, setPromotionEndsAt] = useState(existingItem?.promotion_ends_at ? new Date(existingItem.promotion_ends_at).toISOString().slice(0,16) : '');
  const [complementaryItemIds, setComplementaryItemIds] = useState<string[]>(existingItem?.complementary_item_ids ?? []);
  const [availableMenuItems, setAvailableMenuItems] = useState<{id:string;name:string}[]>([]);
  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    void supabase.from('menu_items').select('id,name').eq('restaurant_id', restaurantId).order('name')
      .then(({data, error}) => {
        if (!active) return;
        if (error) {
          setAvailableMenuItems([]);
          setError('Could not load related menu items. Refresh and try again.');
          return;
        }
        setAvailableMenuItems((data ?? []).filter((row:any) => row.id !== existingItem?.id) as {id:string;name:string}[]);
      });
    return () => { active = false; };
  }, [restaurantId, existingItem?.id]);
  const [optionGroups, setOptionGroups] = useState<MenuItemOptionGroup[]>(existingItem?.option_groups ?? []);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(() => {
    const imageUrls = (existingItem as any)?.image_urls;
    // Older rows may have an empty image_urls array while image_url is populated.
    if (Array.isArray(imageUrls) && imageUrls.length > 0) return imageUrls;
    return existingItem?.image_url ? [existingItem.image_url] : [];
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [stockQuantity, setStockQuantity] = useState(existingItem?.stock_quantity == null ? '' : String(existingItem.stock_quantity));
  type AvailabilityWindow = { day: number; start: string; end: string };
  const [scheduleEnabled, setScheduleEnabled] = useState(Boolean((existingItem as any)?.availability_schedule_enabled));
  const [scheduleWindows, setScheduleWindows] = useState<AvailabilityWindow[]>(() => Array.isArray((existingItem as any)?.availability_schedule) ? (existingItem as any).availability_schedule : []);
  const [error, setError] = useState<string | null>(null);

  const subcategoryOptions = category ? MENU_CATEGORY_PRESETS[category.toLowerCase()] ?? [] : [];
  const totalImageCount = existingImageUrls.length + newImages.length;
  const canAddMoreImages = totalImageCount < 3;
  const parsedPrice = Number(price);
  const parsedPreparationTime = preparationTime.trim() ? Number(preparationTime) : null;
  const parsedPromotionalPrice = promotionalPrice.trim() ? Number(promotionalPrice) : null;
  const hasValidPromotion = parsedPromotionalPrice === null || (Number.isSafeInteger(parsedPromotionalPrice) && parsedPromotionalPrice > 0 && parsedPromotionalPrice < parsedPrice);
  const hasValidPromotionWindow = !promotionStartsAt || !promotionEndsAt || new Date(promotionEndsAt).getTime() > new Date(promotionStartsAt).getTime();
  const hasValidPreparationTime = parsedPreparationTime === null ||
    (Number.isSafeInteger(parsedPreparationTime) && parsedPreparationTime > 0);
  const parsedStockQuantity = stockQuantity.trim() ? Number(stockQuantity) : null;
  const reservedMainStock = Number(existingItem?.stock_reserved ?? 0);
  const hasValidStockQuantity = parsedStockQuantity === null
    ? reservedMainStock === 0
    : Number.isSafeInteger(parsedStockQuantity) && parsedStockQuantity >= reservedMainStock;
  const hasValidOptionGroups = optionGroups.every((group) => {
    const minimum = group.required ? Math.max(1, group.min_select ?? 1) : (group.min_select ?? 0);
    const maximum = group.selection_type === 'single' ? 1 : (group.max_select ?? group.options.length);
    return group.name.trim().length > 0 &&
      ['single', 'multiple'].includes(group.selection_type) &&
      group.options.length >= 2 &&
      group.options.every((option) => option.name.trim().length > 0 && Number.isSafeInteger(option.price) && option.price >= 0 && (option.stock_quantity == null ? Number(option.stock_reserved ?? 0) === 0 : (Number.isSafeInteger(option.stock_quantity) && option.stock_quantity >= Number(option.stock_reserved ?? 0)))) &&
      Number.isSafeInteger(minimum) && Number.isSafeInteger(maximum) &&
      minimum >= 0 && minimum <= maximum && maximum <= group.options.length;
  });
  const hasValidFields = name.trim().length > 0 && price.trim().length > 0 &&
    Number.isSafeInteger(parsedPrice) && parsedPrice > 0 && hasValidPreparationTime && hasValidOptionGroups;
  const hasValidSchedule = !scheduleEnabled || scheduleWindows.every((w) =>
    Number.isInteger(w.day) && w.day >= 0 && w.day <= 6 &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(w.start) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(w.end) && w.start < w.end
  );
  const canSubmit = hasValidFields && hasValidStockQuantity && hasValidSchedule && hasValidPromotion && hasValidPromotionWindow && totalImageCount >= 1 && totalImageCount <= 3;

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

  function getStoragePath(url: string): string | null {
    try {
      const pathname = new URL(url).pathname;
      const marker = '/storage/v1/object/public/menu-images/';
      const markerIndex = pathname.indexOf(marker);
      if (markerIndex < 0) return null;
      const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
      return path.startsWith(`${restaurantId}/`) ? path : null;
    } catch {
      return null;
    }
  }

  async function handleSubmit() {
    if (!canSubmit || saving) {
      if (!name.trim()) setError('Enter a dish name.');
      else if (!price.trim() || !Number.isSafeInteger(parsedPrice) || parsedPrice <= 0) setError('Enter a valid price greater than ₦0.');
      else if (!hasValidStockQuantity) setError('Stock must be a whole number and cannot be lower than quantities currently reserved for checkout.');
      else if (!hasValidPreparationTime) setError('Preparation time must be a whole number greater than 0, or leave it blank.');
      else if (!hasValidOptionGroups) setError('Each option group needs a name, at least two named options, and valid non-negative extra prices.');
      else if (!hasValidSchedule) setError('Check each availability window: use valid times and set the end later than the start.');
      else if (!hasValidPromotion) setError('Promotional price must be a whole number greater than zero and lower than the regular price.');
      else if (!hasValidPromotionWindow) setError('Promotion end must be later than the start.');
      else if (totalImageCount < 1) setError('Add at least 1 photo before saving.');
      else if (totalImageCount > 3) setError('A menu item can have no more than 3 photos.');
      return;
    }
    setSaving(true);
    setError(null);
    const uploadedPaths: string[] = [];
    let saveCompleted = false;
    try {
      const uploadedUrls: string[] = [];
      for (const file of newImages) {
        const compressed = await compressImage(file, { maxDimension: 1280, maxKB: 300 });
        const path = `${restaurantId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, compressed);
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        const { data: publicUrl } = supabase.storage.from('menu-images').getPublicUrl(path);
        uploadedUrls.push(publicUrl.publicUrl);
      }

      const finalImageUrls = [...existingImageUrls, ...uploadedUrls];

      if (isEditing && existingItem && onUpdate) {
        await onUpdate(existingItem.id, {
          name: name.trim(),
          price: parsedPrice,
          category: category.trim() || null,
          subcategory: subcategory.trim() || null,
          description: description.trim() || null,
          ingredients: ingredients.trim() || null,
          serving_size: servingSize.trim() || null,
          preparation_time_minutes: preparationTime.trim() ? Number(preparationTime) : null,
          stock_quantity: parsedStockQuantity,
          availability_schedule_enabled: scheduleEnabled,
          availability_schedule: scheduleEnabled ? scheduleWindows : [],
          allergens: allergens.split(',').map((value) => value.trim()).filter(Boolean),
          dietary_tags: dietaryTags.split(',').map((value) => value.trim()).filter(Boolean),
          promotional_price: parsedPromotionalPrice,
          promotion_starts_at: promotionStartsAt ? new Date(promotionStartsAt).toISOString() : null,
          promotion_ends_at: promotionEndsAt ? new Date(promotionEndsAt).toISOString() : null,
          complementary_item_ids: complementaryItemIds,
          option_groups: optionGroups,
          image_urls: finalImageUrls,
        });
      } else {
        await onSubmit({
          name: name.trim(),
          price: parsedPrice,
          category: category.trim() || undefined,
          subcategory: subcategory.trim() || undefined,
          description: description.trim() || null,
          ingredients: ingredients.trim() || null,
          serving_size: servingSize.trim() || null,
          preparation_time_minutes: preparationTime.trim() ? Number(preparationTime) : null,
          stock_quantity: parsedStockQuantity,
          availability_schedule_enabled: scheduleEnabled,
          availability_schedule: scheduleEnabled ? scheduleWindows : [],
          allergens: allergens.split(',').map((value) => value.trim()).filter(Boolean),
          dietary_tags: dietaryTags.split(',').map((value) => value.trim()).filter(Boolean),
          promotional_price: parsedPromotionalPrice,
          promotion_starts_at: promotionStartsAt ? new Date(promotionStartsAt).toISOString() : null,
          promotion_ends_at: promotionEndsAt ? new Date(promotionEndsAt).toISOString() : null,
          complementary_item_ids: complementaryItemIds,
          option_groups: optionGroups,
          image_urls: finalImageUrls,
        });
      }
      saveCompleted = true;
      if (isEditing && existingItem) {
        const oldUrls = Array.isArray((existingItem as any).image_urls) && (existingItem as any).image_urls.length > 0
          ? (existingItem as any).image_urls as string[]
          : existingItem.image_url ? [existingItem.image_url] : [];
        const retained = new Set(finalImageUrls);
        const pathsToRemove = Array.from(new Set(
          oldUrls.filter((url) => !retained.has(url)).map(getStoragePath).filter((path): path is string => !!path)
        ));
        if (pathsToRemove.length > 0) {
          const { error: cleanupError } = await supabase.storage.from('menu-images').remove(pathsToRemove);
          if (cleanupError) {
            setError('Your menu item was saved, but one or more old photos could not be removed from Storage. Check the item before retrying.');
            return;
          }
        }
      }
      onDone();
    } catch (e: any) {
      if (!saveCompleted && uploadedPaths.length > 0) {
        await supabase.storage.from('menu-images').remove(uploadedPaths).catch(() => undefined);
      }
      setError(e?.message ?? 'Could not save this item — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[16px] p-4 sm:p-6" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--orange)' }}>{isEditing ? 'Edit menu item' : 'New menu item'}</p><h2 className="mt-1 text-xl font-bold" style={{ color: 'var(--ink)' }}>{['Basic information','Photos','Variants & extras','Stock & availability','Preparation & details','Review & save'][step-1]}</h2><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>Step {step} of 6 · Your progress stays here while you move between steps.</p></div>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:'var(--peach)',color:'var(--ink)'}}>{Math.round(step/6*100)}%</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5" aria-label="Form progress">{[1,2,3,4,5,6].map((n)=><div key={n} className="h-1.5 rounded-full" style={{background:n<=step?'var(--orange)':'var(--line)'}} />)}</div>
      </div>
      <div className="mb-3" style={{ display: step === 1 ? undefined : "none" }}>
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

      <div className="mb-3" style={{ display: step === 1 ? undefined : "none" }}>
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

      <div className="mb-3" style={{ display: step === 1 ? undefined : "none" }}>
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

      <div className="mb-3" style={{ display: step === 1 ? undefined : "none" }}>
        <ChipPicker
          label="Sub-category (optional)"
          options={subcategoryOptions}
          value={subcategory}
          onChange={setSubcategory}
        />
      </div>

      <div className="mb-3" style={{ display: step === 1 ? undefined : "none" }}>
        <label className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Dish description (optional)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} rows={3} placeholder="Describe the dish, flavour, and what customers can expect." className="w-full rounded-[9px] px-3 py-2.5 text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }} />
      </div>
      <div className="mb-3" style={{ display: step === 5 ? undefined : "none" }}>
        <label className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Ingredients (optional)</label>
        <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} maxLength={1200} rows={2} placeholder="e.g. rice, tomatoes, peppers, chicken" className="w-full rounded-[9px] px-3 py-2.5 text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }} />
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ display: step === 5 ? undefined : "none" }}>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Portion / serving size</label>
          <input value={servingSize} onChange={(e) => setServingSize(e.target.value)} maxLength={100} placeholder="e.g. 1 plate, serves 2" className="w-full rounded-[9px] px-3 py-2.5 text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }} />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Preparation time (minutes)</label>
          <input value={preparationTime} onChange={(e) => setPreparationTime(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="e.g. 20" className="w-full rounded-[9px] px-3 py-2.5 text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }} />
        </div>
      </div>
      <div className="mb-3" style={{ display: step === 5 ? undefined : "none" }}>
        <label className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Allergens (comma-separated)</label>
        <input value={allergens} onChange={(e) => setAllergens(e.target.value)} maxLength={500} placeholder="e.g. peanuts, dairy, eggs" className="w-full rounded-[9px] px-3 py-2.5 text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }} />
      </div>
      <div className="mb-4" style={{ display: step === 5 ? undefined : "none" }}>
        <label className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Dietary tags (comma-separated)</label>
        <input value={dietaryTags} onChange={(e) => setDietaryTags(e.target.value)} maxLength={500} placeholder="e.g. vegetarian, spicy, halal" className="w-full rounded-[9px] px-3 py-2.5 text-[13px] outline-none" style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }} />
      </div>

      <section className="mb-4 space-y-3 rounded-xl border p-3" style={{display:step === 5 ? undefined : "none",borderColor:'var(--line)',background:'var(--white)'}}>
        <h3 className="text-sm font-bold" style={{color:'var(--ink)'}}>Promotions & recommendations</h3>
        <div><label className="mb-1.5 block text-[12px] font-medium" style={{color:'var(--ink)'}}>Promotional price (₦, optional)</label><input inputMode="numeric" value={promotionalPrice} onChange={e=>setPromotionalPrice(e.target.value.replace(/[^\d]/g,''))} placeholder="Leave blank for regular price" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)',background:'var(--white)',color:'var(--ink)'}}/><p className="mt-1 text-[11px]" style={{color:'var(--gray)'}}>Must be lower than the regular price. Leave blank to disable the discount.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-[12px] font-medium" style={{color:'var(--ink)'}}>Promotion starts<input type="datetime-local" value={promotionStartsAt} onChange={e=>setPromotionStartsAt(e.target.value)} className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm" style={{borderColor:'var(--line)',background:'var(--white)',color:'var(--ink)'}}/></label><label className="text-[12px] font-medium" style={{color:'var(--ink)'}}>Promotion ends<input type="datetime-local" value={promotionEndsAt} onChange={e=>setPromotionEndsAt(e.target.value)} className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm" style={{borderColor:'var(--line)',background:'var(--white)',color:'var(--ink)'}}/></label></div>
        <div><p className="mb-2 text-[12px] font-medium" style={{color:'var(--ink)'}}>Complementary items (optional)</p><p className="mb-2 text-[11px]" style={{color:'var(--gray)'}}>Recommend these items alongside this dish.</p><div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2" style={{borderColor:'var(--line)'}}>{availableMenuItems.length ? availableMenuItems.map(option=><label key={option.id} className="flex items-center gap-2 py-1 text-sm" style={{color:'var(--ink)'}}><input type="checkbox" checked={complementaryItemIds.includes(option.id)} onChange={e=>setComplementaryItemIds(prev=>e.target.checked?[...prev,option.id]:prev.filter(id=>id!==option.id))} className="h-4 w-4 accent-orange-500"/>{option.name}</label>) : <p className="text-xs" style={{color:'var(--gray)'}}>Add other menu items first to create recommendations.</p>}</div></div>
      </section>

      <section className="mb-4 rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--white)', display: step === 3 ? undefined : "none" }}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>Variants & extras</h3>
          <button type="button" onClick={() => setOptionGroups((prev) => [...prev, { id: crypto.randomUUID(), name: 'Choose an option', required: false, selection_type: 'single', options: [{ id: crypto.randomUUID(), name: '', price: 0 }, { id: crypto.randomUUID(), name: '', price: 0 }] }])} className="rounded-lg px-3 py-2 text-[11px] font-bold text-white" style={{ background: 'var(--orange)' }}>+ Add group</button>
        </div>
        <p className="mb-3 text-[11px] leading-5" style={{ color: 'var(--gray)' }}>Set choices such as Chicken, Beef or Fish with an extra price. Prices here are added to the dish's base price. Use a required single-choice group for one protein, or optional multiple-choice groups for extras.</p>
        {optionGroups.length === 0 && <p className="rounded-lg p-3 text-[11px]" style={{ background: 'var(--peach)', color: 'var(--gray)' }}>No options added. Customers can order this dish at its base price.</p>}
        <div className="space-y-4">
          {optionGroups.map((group, groupIndex) => (
            <div key={group.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
              <div className="mb-3 flex items-start gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>Group name</label>
                  <input value={group.name} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, name: e.target.value } : g))} maxLength={80} placeholder="e.g. Choose your protein" className="w-full rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }} />
                </div>
                <button type="button" onClick={() => setOptionGroups((prev) => prev.filter((g) => g.id !== group.id))} className="mt-5 rounded-lg border px-2.5 py-2 text-[11px]" style={{ borderColor: 'var(--line)', color: 'var(--red, #C1453A)' }}>Remove</button>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>Selection type</label>
                  <select value={group.selection_type} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, selection_type: e.target.value as 'single' | 'multiple', max_select: e.target.value === 'single' ? 1 : undefined, min_select: e.target.value === 'single' ? (g.required ? 1 : 0) : (g.required ? 1 : 0) } : g))} className="w-full rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: 'var(--line)', background: 'var(--white)', color: 'var(--ink)' }}>
                    <option value="single">Choose one</option><option value="multiple">Choose multiple</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                  <input type="checkbox" checked={group.required} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, required: e.target.checked, min_select: e.target.checked ? 1 : 0 } : g))} />
                  Customer must choose
                </label>
              </div>
              {group.selection_type === 'multiple' && <div className="mb-3 grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-[11px]" style={{ color: 'var(--gray)' }}>Minimum choices</label><input type="number" min={group.required ? 1 : 0} max={group.options.length} value={group.min_select ?? (group.required ? 1 : 0)} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, min_select: e.target.value === '' ? undefined : Number(e.target.value) } : g))} className="w-full rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: 'var(--line)' }} /></div>
                <div><label className="mb-1 block text-[11px]" style={{ color: 'var(--gray)' }}>Maximum choices (optional)</label><input type="number" min={1} max={group.options.length} value={group.max_select ?? ''} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, max_select: e.target.value === '' ? undefined : Number(e.target.value) } : g))} placeholder="No limit" className="w-full rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: 'var(--line)' }} /></div>
              </div>}
              <div className="space-y-2">
                {group.options.map((option) => (
                  <div key={option.id} className="grid grid-cols-[minmax(0,1fr)_78px_92px_34px] items-center gap-2">
                    <input value={option.name} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, options: g.options.map((o) => o.id === option.id ? { ...o, name: e.target.value } : o) } : g))} maxLength={80} placeholder="e.g. Chicken, Beef, Fish" className="min-w-0 rounded-lg border px-2.5 py-2 text-[12px]" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }} />
                    <input type="number" min={0} step={1} value={option.price} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, options: g.options.map((o) => o.id === option.id ? { ...o, price: e.target.value === '' ? 0 : Number(e.target.value) } : o) } : g))} aria-label={`Extra price for ${option.name || 'option'}`} placeholder="₦ extra" className="w-full rounded-lg border px-2 py-2 text-[12px]" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }} />
                    <input type="number" min={0} step={1} value={option.stock_quantity == null ? '' : option.stock_quantity} onChange={(e) => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, options: g.options.map((o) => o.id === option.id ? { ...o, stock_quantity: e.target.value === '' ? null : Number(e.target.value) } : o) } : g))} aria-label={`Stock quantity for ${option.name || 'option'}`} placeholder="∞ stock" className="w-full rounded-lg border px-2 py-2 text-[12px]" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }} />
                    <button type="button" onClick={() => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, options: g.options.filter((o) => o.id !== option.id) } : g))} aria-label={`Remove ${option.name || 'option'}`} className="flex h-8 w-8 items-center justify-center rounded-lg border text-sm" style={{ borderColor: 'var(--line)', color: 'var(--red, #C1453A)' }}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setOptionGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, options: [...g.options, { id: crypto.randomUUID(), name: '', price: 0 }] } : g))} className="mt-3 text-[11px] font-semibold underline underline-offset-2" style={{ color: 'var(--orange)' }}>+ Add option</button>
              <p className="mt-2 text-[10px]" style={{ color: 'var(--gray)' }}>Extra price in naira (₦). Enter 0 if included in the base dish price.</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: step === 2 ? undefined : "none" }}>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
        Photos (1–3 required)
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
        {totalImageCount}/3 photos · At least one photo is required.
      </p>
      </section>

      {error && (
        <p className="text-[11px] mb-2" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <section className="mb-4 rounded-xl border p-4" style={{display: step === 4 ? undefined : "none", borderColor:'var(--line)', background:'var(--white)'}}>
        <h3 className="mb-2 text-sm font-bold" style={{color:'var(--ink)'}}>Scheduled availability</h3>
        <p className="mb-3 text-xs leading-5" style={{color:'var(--gray)'}}>Optionally restrict ordering to weekly time windows in Nigeria time (Africa/Lagos). Multiple windows per day are supported. Your existing Available/Unavailable control still takes priority.</p>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm font-semibold" style={{borderColor:'var(--line)',color:'var(--ink)'}}>
          <input type="checkbox" checked={scheduleEnabled} onChange={(e)=>setScheduleEnabled(e.target.checked)} className="h-4 w-4 accent-orange-500" />
          Enable weekly schedule
        </label>
        {scheduleEnabled && <div className="mt-3 space-y-3">
          {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((dayName, day) => {
            const dayWindows = scheduleWindows.filter((window) => window.day === day);
            return <div key={day} className="rounded-xl border p-3" style={{borderColor:'var(--line)'}}>
              <div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-semibold" style={{color:'var(--ink)'}}>{dayName}</span>
                <button type="button" onClick={()=>setScheduleWindows((prev)=>[...prev,{day,start:'09:00',end:'17:00'}])} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'var(--orange)'}}>+ Add time</button>
              </div>
              {dayWindows.length===0 && <p className="text-xs" style={{color:'var(--gray)'}}>Unavailable on this day</p>}
              {dayWindows.map((window) => {
                const originalIndex = scheduleWindows.indexOf(window);
                return <div key={originalIndex} className="mb-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2 last:mb-0">
                  <label className="text-xs" style={{color:'var(--gray)'}}>From<input type="time" value={window.start} onChange={(e)=>setScheduleWindows((prev)=>prev.map((w,i)=>i===originalIndex?{...w,start:e.target.value}:w))} className="mt-1 min-h-10 w-full rounded-lg border px-2 text-sm" style={{borderColor:'var(--line)',color:'var(--ink)'}} /></label>
                  <label className="text-xs" style={{color:'var(--gray)'}}>Until<input type="time" value={window.end} onChange={(e)=>setScheduleWindows((prev)=>prev.map((w,i)=>i===originalIndex?{...w,end:e.target.value}:w))} className="mt-1 min-h-10 w-full rounded-lg border px-2 text-sm" style={{borderColor:'var(--line)',color:'var(--ink)'}} /></label>
                  <button type="button" onClick={()=>setScheduleWindows((prev)=>prev.filter((_,i)=>i!==originalIndex))} className="min-h-10 rounded-lg border px-3 text-xs font-semibold" style={{borderColor:'var(--line)',color:'var(--red)'}}>Remove</button>
                </div>;
              })}
            </div>;
          })}
          {scheduleWindows.some((w)=>!Number.isInteger(w.day)||w.day<0||w.day>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(w.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(w.end)||w.start>=w.end) && <p className="text-xs" style={{color:'var(--red)'}}>Each time window must have valid times, with the end later than the start on the same day.</p>}
        </div>}
      </section>
      <section className="mb-4 rounded-xl border p-4" style={{display: step === 4 ? undefined : "none", borderColor:'var(--line)', background:'var(--white)'}}>
        <h3 className="mb-2 text-sm font-bold" style={{color:'var(--ink)'}}>Main dish stock</h3>
        <p className="mb-3 text-xs leading-5" style={{color:'var(--gray)'}}>Leave quantity blank if this dish is not stock-tracked. Enter 0 to mark it out of stock. This setting is saved with the item. Stock is reserved when checkout starts, released after a failed or abandoned payment, and deducted when payment succeeds.</p>
        <label className="block text-xs font-semibold" style={{color:'var(--ink)'}}>Available quantity <span className="font-normal" style={{color:'var(--gray)'}}>(optional)</span></label>
        <input type="number" min={0} step={1} value={stockQuantity} onChange={(e)=>setStockQuantity(e.target.value)} placeholder="Leave blank for unlimited / not tracked" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)'}} />
        {!hasValidStockQuantity && <p className="mt-2 text-xs" style={{color:'var(--red)'}}>Stock must be a whole number and cannot be lower than quantities currently reserved for checkout.</p>}
        <p className="mt-3 text-xs leading-5" style={{color:'var(--gray)'}}>Variant stock is configured beside each variant in the previous step. Blank variant quantities mean not tracked.</p>
      </section>
      <section className="mb-4" style={{display: step === 6 ? undefined : "none"}}>
      <div className="rounded-xl p-4" style={{background: 'var(--peach)'}}>
        <h3 className="mb-3 text-sm font-bold" style={{color:'var(--ink)'}}>Review your item</h3>
        <div className="flex items-start gap-3">{(existingImageUrls[0] || newImages[0]) && <img src={existingImageUrls[0] || URL.createObjectURL(newImages[0])} alt="" className="h-20 w-20 rounded-xl object-cover" />}<div><p className="font-bold" style={{color:'var(--ink)'}}>{name.trim() || 'Untitled dish'}</p><p className="mt-1 text-sm font-semibold" style={{color:'var(--orange)'}}>₦{Number(price || 0).toLocaleString()}</p><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>{category || 'No category'}{subcategory ? ' · ' + subcategory : ''}</p><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>{totalImageCount} photo(s) · {optionGroups.length} option group(s)</p></div></div>
      </div>
      </section>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {onCancel && <button type="button" onClick={onCancel} disabled={saving} className="rounded-[10px] border px-4 py-2.5 text-[12.5px] font-semibold disabled:opacity-50" style={{borderColor:'var(--line)',color:'var(--gray)'}}>Cancel</button>}
          {step > 1 && <button type="button" onClick={() => { setError(null); setStep((s)=>Math.max(1,s-1)); }} disabled={saving} className="rounded-[10px] border px-5 py-2.5 text-[12.5px] font-semibold" style={{borderColor:'var(--line)',color:'var(--ink)'}}>Back</button>}
        </div>
        {step < 6 ? <button type="button" onClick={() => {
          setError(null);
          if (step === 1 && (!name.trim() || !price.trim() || !Number.isSafeInteger(parsedPrice) || parsedPrice <= 0)) { setError(!name.trim() ? 'Enter a dish name.' : 'Enter a valid price greater than ₦0.'); return; }
          if (step === 2 && (totalImageCount < 1 || totalImageCount > 3)) { setError('Add between 1 and 3 photos.'); return; }
          if (step === 3 && !hasValidOptionGroups) { setError('Each option group needs a name, at least two named options, and valid non-negative extra prices.'); return; }
          if (step === 4 && !hasValidStockQuantity) { setError('Stock quantity must be a whole number of zero or greater, or leave it blank.'); return; }
          if (step === 4 && !hasValidSchedule) { setError('Check each availability window: use valid times and set the end later than the start.'); return; }
          if (step === 5 && !hasValidPreparationTime) { setError('Preparation time must be a whole number greater than 0, or leave it blank.'); return; }
          setStep((s)=>Math.min(6,s+1));
        }} className="flex items-center justify-center gap-2 rounded-[10px] px-6 py-2.5 text-[12.5px] font-bold text-white" style={{background:'var(--orange)'}}>Continue <span aria-hidden="true">→</span></button> : <button type="button" onClick={handleSubmit} disabled={!canSubmit || saving} className="flex items-center justify-center gap-2 rounded-[10px] px-6 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-40" style={{background:'var(--orange)'}}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? (isEditing ? 'Saving changes…' : 'Adding item…') : isEditing ? 'Save menu item' : 'Add menu item'}</button>}
      </div>
    </div>
  );
}
