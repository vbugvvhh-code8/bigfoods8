"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Plus, RefreshCw, Search, Pencil, Eye, EyeOff, ArrowLeft, ArrowRight, ImagePlus, X, Loader2 } from "lucide-react";
import getBrowserSupabase from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { ChipPicker } from "@/components/restaurant/dashboard/MenuItemForm";
import { MENU_CATEGORY_NAMES, MENU_CATEGORY_PRESETS } from "@/lib/menuCategoryPresets";
import PageHeader from "@/components/admin/layout/PageHeader";

type Option = { id: string; name: string; price: number; stock_quantity?: number | null; stock_reserved?: number };
type OptionGroup = { id: string; name: string; required: boolean; selection_type: "single" | "multiple"; min_select?: number; max_select?: number; options: Option[] };
type Window = { day: number; start: string; end: string };
type PosItem = {
  id: string; name: string; sku: string | null; description: string | null; category: string; subcategory: string | null;
  selling_price: number; image_url: string | null; image_urls?: string[] | null; is_available: boolean; sort_order: number;
  ingredients?: string | null; serving_size?: string | null; preparation_time_minutes?: number | null; stock_quantity?: number | null;
  availability_schedule_enabled?: boolean; availability_schedule?: Window[] | null; allergens?: string[] | null; dietary_tags?: string[] | null;
  promotional_price?: number | null; promotion_starts_at?: string | null; promotion_ends_at?: string | null;
  complementary_item_ids?: string[] | null; option_groups?: OptionGroup[] | null;
};
const blank = {
  id: "", name: "", description: "", category: "meals", subcategory: "", selling_price: "",
  image_urls: [] as string[], is_available: true, sort_order: "0", ingredients: "", serving_size: "",
  preparation_time_minutes: "", stock_quantity: "", schedule_enabled: false, schedule: [] as Window[],
  allergens: "", dietary_tags: "", promotional_price: "", promotion_starts_at: "", promotion_ends_at: "",
  complementary_item_ids: [] as string[], option_groups: [] as OptionGroup[]
};
const steps = ["Product details", "Product photo", "Weekly availability", "Promotions & recommendations", "Review & save"];
const field = "w-full rounded-[9px] border px-3 py-2.5 text-[13px] outline-none";
const money = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export default function BigFoodsPosCataloguePage() {
  const [items, setItems] = useState<PosItem[]>([]);
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [otherItems, setOtherItems] = useState<{id:string;name:string}[]>([]);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const supabase = getBrowserSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/bigfoods-staff/inventory", {
      method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify(body), cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "POS catalogue request failed");
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await call({ action: "pos_catalogue_overview" });
      setItems(data.items ?? []);
      setOtherItems((data.items ?? []).map((x:PosItem)=>({id:x.id,name:x.name})));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load catalogue"); }
    finally { setLoading(false); }
  }, [call]);
  useEffect(() => { void load(); }, [load]);

  const categoryOptions = useMemo(() => Array.from(new Set([...MENU_CATEGORY_NAMES, ...items.map(i => i.category.trim().toLowerCase()).filter(Boolean)])).sort((a,b)=>a.localeCompare(b)), [items]);
  const subcategoryOptions = form.category ? (MENU_CATEGORY_PRESETS[form.category.toLowerCase()] ?? []) : [];
  const filtered = items.filter(item => [item.name, item.sku ?? "", item.category, item.subcategory ?? ""].join(" ").toLowerCase().includes(query.toLowerCase()));
  const price = Number(form.selling_price);
  const promo = form.promotional_price.trim() ? Number(form.promotional_price) : null;
  const stock = form.stock_quantity.trim() ? Number(form.stock_quantity) : null;
  const preparation = form.preparation_time_minutes.trim() ? Number(form.preparation_time_minutes) : null;
  const imageCount = form.image_urls.length + newImages.length;
  const validSchedule = !form.schedule_enabled || form.schedule.every(w => Number.isInteger(w.day) && w.day >= 0 && w.day <= 6 &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(w.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(w.end) && w.start < w.end);
  const validPromo = promo === null || (Number.isSafeInteger(promo) && promo > 0 && Number.isSafeInteger(price) && promo < price);
  const validPromoWindow = !form.promotion_starts_at || !form.promotion_ends_at || new Date(form.promotion_ends_at).getTime() > new Date(form.promotion_starts_at).getTime();
  const canSave = form.name.trim().length > 0 && form.category.trim().length > 0 && form.selling_price.trim().length > 0 &&
    Number.isSafeInteger(price) && price > 0 && step === 5 && imageCount === 1 &&
    (stock === null || (Number.isSafeInteger(stock) && stock >= 0)) &&
    (preparation === null || (Number.isSafeInteger(preparation) && preparation > 0)) &&
    validOptions && validSchedule && validPromo && validPromoWindow;

  function startNew() { setForm({...blank}); setNewImages([]); setRemovedImages([]); setStep(1); setEditing(true); setError(""); setNotice(""); }
  function startEdit(item: PosItem) {
    const urls = Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls : item.image_url ? [item.image_url] : [];
    setForm({
      ...blank, id:item.id, name:item.name, description:item.description ?? "", category:item.category,
      subcategory:item.subcategory ?? "", selling_price:String(item.selling_price), image_urls:urls, is_available:item.is_available,
      sort_order:String(item.sort_order), ingredients:item.ingredients ?? "", serving_size:item.serving_size ?? "",
      preparation_time_minutes:item.preparation_time_minutes == null ? "" : String(item.preparation_time_minutes),
      stock_quantity:item.stock_quantity == null ? "" : String(item.stock_quantity),
      schedule_enabled:Boolean(item.availability_schedule_enabled), schedule:item.availability_schedule ?? [],
      allergens:(item.allergens ?? []).join(", "), dietary_tags:(item.dietary_tags ?? []).join(", "),
      promotional_price:item.promotional_price == null ? "" : String(item.promotional_price),
      promotion_starts_at:item.promotion_starts_at ? new Date(item.promotion_starts_at).toISOString().slice(0,16) : "",
      promotion_ends_at:item.promotion_ends_at ? new Date(item.promotion_ends_at).toISOString().slice(0,16) : "",
      complementary_item_ids:item.complementary_item_ids ?? []
    });
    setNewImages([]); setRemovedImages([]); setStep(1); setEditing(true); setError(""); setNotice("");
  }
  function nextStep() {
    setError("");
    if (step === 1 && (!form.name.trim() || !form.category.trim() || !form.selling_price.trim() || !Number.isSafeInteger(price) || price <= 0)) {
      setError("Enter a product name, category and valid price greater than ₦0."); return;
    }
    if (step === 2 && imageCount !== 1) { setError("Add exactly one product photo before continuing."); return; }
    
    if (step === 3 && !validSchedule) { setError("Check weekly availability times."); return; }
    if (step === 4 && (!validPromo || !validPromoWindow)) { setError("Check promotion price and dates."); return; }
    setStep(s => Math.min(5, s + 1));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canSave || busy) { setError("Please complete all required fields and check each step before saving."); return; }
    setBusy(true); setError(""); setNotice("");
    const uploadedPaths: string[] = [];
    try {
      const uploadedUrls: string[] = [];
      for (const file of newImages) {
        const compressed = await compressImage(file, { maxDimension: 1280, maxKB: 300 });
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read photo."));
          reader.onerror = () => reject(new Error("Could not read photo."));
          reader.readAsDataURL(compressed);
        });
        const uploaded = await call({ action: "pos_item_photo_upload", image_base64: base64 });
        if (!uploaded.url || !uploaded.path) throw new Error("Photo upload did not return a usable URL.");
        uploadedPaths.push(uploaded.path);
        uploadedUrls.push(uploaded.url);
      }
      const finalUrls = [...form.image_urls, ...uploadedUrls];
      await call({
        action:"pos_item_save", id:form.id || undefined, name:form.name.trim(),
        description:form.description.trim() || null, category:form.category.trim(), subcategory:form.subcategory.trim() || null,
        selling_price:price, image_urls:finalUrls, image_url:finalUrls[0] ?? null, is_available:form.is_available,
        sort_order:Number(form.sort_order) || 0, ingredients:form.ingredients.trim() || null, serving_size:form.serving_size.trim() || null,
        preparation_time_minutes:preparation, stock_quantity:stock, availability_schedule_enabled:form.schedule_enabled,
        availability_schedule:form.schedule_enabled ? form.schedule : [], allergens:form.allergens.split(",").map(v=>v.trim()).filter(Boolean),
        dietary_tags:form.dietary_tags.split(",").map(v=>v.trim()).filter(Boolean), promotional_price:promo,
        promotion_starts_at:form.promotion_starts_at ? new Date(form.promotion_starts_at).toISOString() : null,
        promotion_ends_at:form.promotion_ends_at ? new Date(form.promotion_ends_at).toISOString() : null,
        complementary_item_ids:form.complementary_item_ids
      });
      let cleanupWarning = "";
      if (removedImages.length) {
        const paths = removedImages.map(url => { try { const u = new URL(url); const marker = "/storage/v1/object/public/menu-images/"; const i = u.pathname.indexOf(marker); return i < 0 ? null : decodeURIComponent(u.pathname.slice(i + marker.length)); } catch { return null; } }).filter((v):v is string=>!!v && v.startsWith("bigfoods/pos/"));
        if (paths.length) {
          try { await call({ action: "pos_item_photo_delete", paths }); }
          catch { cleanupWarning = " Item saved, but an old photo could not be deleted."; }
        }
      }
      setNotice((form.id ? "Catalogue item updated." : "Catalogue item created.") + cleanupWarning); setEditing(false); await load();
    } catch (e) {
      if (uploadedPaths.length) await call({ action: "pos_item_photo_delete", paths: uploadedPaths }).catch(()=>undefined);
      setError(e instanceof Error ? e.message : "Unable to save catalogue item");
    } finally { setBusy(false); }
  }

  async function toggle(item: PosItem) {
    setBusy(true); setError(""); setNotice("");
    try { await call({ action: "pos_item_availability", id: item.id, is_available: !item.is_available }); setNotice(item.is_available ? "Item hidden from POS sales." : "Item available in POS sales."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update availability"); }
    finally { setBusy(false); }
  }
  const label = "mb-1.5 block text-[12px] font-medium";
  const inputStyle = { borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" };
  function updateGroup(id:string, patch:Partial<OptionGroup>) { setForm(f=>({...f,option_groups:f.option_groups.map(g=>g.id===id?{...g,...patch}:g)})); }

  return <main className="mx-auto max-w-7xl space-y-5 pb-10">
    <PageHeader title="BigFoods POS catalogue" subtitle="Manage products sold by BigFoods cashiers. Restaurant-owned menus stay separate." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95" style={{background:"var(--orange)"}} onClick={startNew}><Plus size={16}/> Add item</button><a href="/admin/inventory/workflows" className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}}><Boxes size={16}/> Recipe & production</a></div>
      <button className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}} onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>
    {error && !editing && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl px-4 py-3 text-sm" style={{background:"var(--peach)",color:"var(--ink)"}}>{notice}</div>}
    {editing && <section className="mx-auto w-full max-w-3xl rounded-[16px] border p-4 sm:p-6" style={{borderColor:"var(--line)",background:"var(--white)"}}>
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{color:"var(--orange)"}}>{form.id ? "Edit catalogue item" : "New BigFoods product"}</p><h2 className="mt-1 text-xl font-bold" style={{color:"var(--ink)"}}>{steps[step-1]}</h2><p className="mt-1 text-xs" style={{color:"var(--gray)"}}>Step {step} of 5 · Your progress stays here while you move between steps.</p></div><div className="flex items-center gap-2"><span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:"var(--peach)",color:"var(--ink)"}}>{Math.round(step/5*100)}%</span><button type="button" onClick={()=>setEditing(false)} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}}>Cancel</button></div></div>
        <div className="grid grid-cols-5 gap-1.5" aria-label="Form progress">{steps.map((_,i)=><div key={i} className="h-1.5 rounded-full" style={{background:i+1<=step?"var(--orange)":"var(--line)"}} />)}</div>
      </div>
      <form onSubmit={save}>
        <section style={{display:step===1?undefined:"none"}}>
          <div className="mb-3"><label className={label} style={{color:"var(--ink)"}}>Product / meal name</label><input required maxLength={160} className={field} style={inputStyle} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. BigFoods Jollof Rice & Chicken"/></div>
          <div className="mb-3"><label className={label} style={{color:"var(--ink)"}}>Price (₦)</label><input required inputMode="numeric" className={field} style={inputStyle} value={form.selling_price} onChange={e=>setForm({...form,selling_price:e.target.value.replace(/[^\d]/g,"")})} placeholder="2500"/></div>
          <div className="mb-3"><ChipPicker label="Category" options={categoryOptions} value={form.category} onChange={v=>setForm({...form,category:v,subcategory:""})}/></div>
          <div className="mb-3"><ChipPicker label="Sub-category (optional)" options={subcategoryOptions} value={form.subcategory} onChange={v=>setForm({...form,subcategory:v})}/></div>
          
        </section>
        <section style={{display:step===2?undefined:"none"}}>
          <label className={label} style={{color:"var(--ink)"}}>Product photo (1 required)</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {form.image_urls.map((url,i)=><div key={url} className="relative h-16 w-16 overflow-hidden rounded-[9px] border" style={{borderColor:"var(--line)"}}><img src={url} alt="" className="h-full w-full object-cover"/><button type="button" onClick={()=>{setRemovedImages(p=>[...p,url]);setForm(f=>({...f,image_urls:f.image_urls.filter((_,n)=>n!==i)}));}} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full" style={{background:"rgba(0,0,0,.65)"}} aria-label="Remove photo"><X className="h-2.5 w-2.5 text-white"/></button></div>)}
            {newImages.map((file,i)=><div key={i} className="relative h-16 w-16 overflow-hidden rounded-[9px] border" style={{borderColor:"var(--line)"}}><img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover"/><button type="button" onClick={()=>setNewImages(p=>p.filter((_,n)=>n!==i))} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full" style={{background:"rgba(0,0,0,.65)"}} aria-label="Remove photo"><X className="h-2.5 w-2.5 text-white"/></button></div>)}
            {imageCount<1&&<label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-[9px]" style={{border:"1.5px dashed var(--line)"}}><ImagePlus className="h-5 w-5" style={{color:"var(--gray)"}}/><input type="file" accept="image/*" multiple className="hidden" onChange={e=>{const files=Array.from(e.target.files??[]).slice(0,1-imageCount);setNewImages(p=>[...p,...files]);e.currentTarget.value="";}}/></label>}
          </div><p className="mb-3 text-[11px]" style={{color:"var(--gray)"}}>{imageCount}/1 photo · One clear product photo is required. Photos are compressed before upload.</p>
        </section>
        <section style={{display:step===3?undefined:"none"}}>
          <div className="mb-4 rounded-xl border p-4" style={{borderColor:"var(--line)",background:"var(--white)"}}><h3 className="text-[13px] font-bold" style={{color:"var(--ink)"}}>POS availability</h3><p className="mt-1 text-[11px] leading-5" style={{color:"var(--gray)"}}>Control whether cashiers see this product as available for sale.</p><label className="mt-4 flex items-center gap-3 rounded-xl p-3" style={{background:"var(--peach)",color:"var(--ink)"}}><input type="checkbox" checked={form.is_available} onChange={e=>setForm({...form,is_available:e.target.checked})} className="h-4 w-4 accent-orange-500"/><span><span className="block text-sm font-semibold">{form.is_available?"Available for cashier sales":"Hidden from cashier sales"}</span><span className="mt-0.5 block text-xs" style={{color:"var(--gray)"}}>You can change this later without deleting the product.</span></span></label></div>
          
          
          <div className="rounded-xl border p-3" style={{borderColor:"var(--line)"}}><h3 className="mb-1 text-sm font-bold" style={{color:"var(--ink)"}}>Scheduled availability</h3><p className="mb-3 text-xs leading-5" style={{color:"var(--gray)"}}>Optionally restrict ordering to weekly time windows in Nigeria time (Africa/Lagos).</p><label className="flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}}><input type="checkbox" checked={form.schedule_enabled} onChange={e=>setForm({...form,schedule_enabled:e.target.checked})} className="h-4 w-4 accent-orange-500"/> Enable weekly schedule</label>
          {form.schedule_enabled&&<div className="mt-3 space-y-3">{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((dayName,day)=>{const wins=form.schedule.filter(w=>w.day===day);return <div key={day} className="rounded-lg border p-3" style={{borderColor:"var(--line)"}}><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold" style={{color:"var(--ink)"}}>{dayName}</span><button type="button" className="text-xs font-semibold" style={{color:"var(--orange)"}} onClick={()=>setForm(f=>({...f,schedule:[...f.schedule,{day,start:"09:00",end:"17:00"}]}))}>+ Add window</button></div>{wins.map((w,i)=><div key={i} className="mb-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2"><input type="time" className={field} style={inputStyle} value={w.start} onChange={e=>setForm(f=>({...f,schedule:f.schedule.map((x,j)=>x.day===day&&wins.indexOf(x)===i?{...x,start:e.target.value}:x)}))}/><input type="time" className={field} style={inputStyle} value={w.end} onChange={e=>setForm(f=>({...f,schedule:f.schedule.map((x,j)=>x.day===day&&wins.indexOf(x)===i?{...x,end:e.target.value}:x)}))}/><button type="button" onClick={()=>setForm(f=>({...f,schedule:f.schedule.filter(x=>!(x.day===day&&wins.indexOf(x)===i))}))} className="rounded-lg border px-3 py-2 text-xs" style={{borderColor:"var(--line)"}}>Remove</button></div>)}{!wins.length&&<p className="text-[11px]" style={{color:"var(--gray)"}}>No restriction set for this day.</p>}</div>})}</div>}
          </div>
        </section>
        <section style={{display:step===4?undefined:"none"}}>
          <section className="mb-4 space-y-3 rounded-xl border p-3" style={{borderColor:"var(--line)",background:"var(--white)"}}><h3 className="text-sm font-bold" style={{color:"var(--ink)"}}>Promotions & recommendations</h3><div><label className={label} style={{color:"var(--ink)"}}>Promotional price (₦, optional)</label><input inputMode="numeric" className={field} style={inputStyle} value={form.promotional_price} onChange={e=>setForm({...form,promotional_price:e.target.value.replace(/[^\d]/g,"")})} placeholder="Leave blank for regular price"/><p className="mt-1 text-[11px]" style={{color:"var(--gray)"}}>Must be lower than regular price. Leave blank to disable the discount.</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-[12px] font-medium" style={{color:"var(--ink)"}}>Promotion starts<input type="datetime-local" value={form.promotion_starts_at} onChange={e=>setForm({...form,promotion_starts_at:e.target.value})} className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm" style={inputStyle}/></label><label className="text-[12px] font-medium" style={{color:"var(--ink)"}}>Promotion ends<input type="datetime-local" value={form.promotion_ends_at} onChange={e=>setForm({...form,promotion_ends_at:e.target.value})} className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm" style={inputStyle}/></label></div>
            <div><p className="mb-2 text-[12px] font-medium" style={{color:"var(--ink)"}}>Complementary items (optional)</p><p className="mb-2 text-[11px]" style={{color:"var(--gray)"}}>Recommend other BigFoods items alongside this product.</p><div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2" style={{borderColor:"var(--line)"}}>{otherItems.filter(o=>o.id!==form.id).length?otherItems.filter(o=>o.id!==form.id).map(o=><label key={o.id} className="flex items-center gap-2 py-1 text-sm" style={{color:"var(--ink)"}}><input type="checkbox" checked={form.complementary_item_ids.includes(o.id)} onChange={e=>setForm(f=>({...f,complementary_item_ids:e.target.checked?[...f.complementary_item_ids,o.id]:f.complementary_item_ids.filter(id=>id!==o.id)}))} className="h-4 w-4 accent-orange-500"/>{o.name}</label>):<p className="text-xs" style={{color:"var(--gray)"}}>Add other catalogue items first to create recommendations.</p>}</div></div>
          </section>
        </section>
        <section style={{display:step===5?undefined:"none"}}>
          <div className="mb-4 rounded-xl p-4" style={{background:"var(--peach)"}}><p className="text-[11px] font-bold uppercase tracking-wide" style={{color:"var(--orange)"}}>Review product</p><h3 className="mt-1 text-lg font-bold" style={{color:"var(--ink)"}}>{form.name||"Untitled product"}</h3><p className="mt-1 text-xl font-bold" style={{color:"var(--ink)"}}>{form.selling_price?money(price):"Price not set"}</p><p className="mt-1 text-xs" style={{color:"var(--gray)"}}>{form.category}{form.subcategory?" · "+form.subcategory:""}</p>{form.description&&<p className="mt-3 text-sm" style={{color:"var(--ink)"}}>{form.description}</p>}{form.image_urls[0]&&<img src={form.image_urls[0]} alt="Product" className="mt-3 h-24 w-24 rounded-xl object-cover"/>}{newImages[0]&&<p className="mt-2 text-xs" style={{color:"var(--gray)"}}>New photo ready to upload</p>}</div>
          <div className="space-y-2 rounded-xl border p-4 text-sm" style={{borderColor:"var(--line)",color:"var(--ink)"}}><div className="flex justify-between gap-4"><span style={{color:"var(--gray)"}}>Photos</span><span>{imageCount}/1</span></div><div className="flex justify-between gap-4"><span style={{color:"var(--gray)"}}>POS status</span><span>{form.is_available?"Available":"Hidden"}</span></div><div className="flex justify-between gap-4"><span style={{color:"var(--gray)"}}>Promotion</span><span>{promo===null?"None":money(promo)}</span></div></div>
        </section>
        {error&&<p role="alert" className="mt-3 text-[11px]" style={{color:"var(--red)"}}>{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4" style={{borderColor:"var(--line)"}}><button type="button" disabled={step===1||busy} onClick={()=>{setError("");setStep(s=>Math.max(1,s-1));}} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-40" style={{borderColor:"var(--line)",color:"var(--ink)"}}><ArrowLeft size={15}/> Back</button>{step<5?<button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{background:"var(--orange)"}}>Continue <ArrowRight size={15}/></button>:<button type="submit" disabled={!canSave||busy} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{background:"var(--orange)"}}>{busy?<Loader2 size={15} className="animate-spin"/>:null}{busy?(form.id?"Saving changes…":"Adding item…"):form.id?"Save menu item":"Add menu item"}</button>}</div>
      </form>
    </section>}
    <section className="overflow-hidden rounded-[16px] border" style={{borderColor:"var(--line)",background:"var(--white)"}}>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{borderColor:"var(--line)"}}><div><h2 className="font-semibold" style={{color:"var(--ink)"}}>In-house products</h2><p className="mt-1 text-sm" style={{color:"var(--gray)"}}>{items.length} catalogue item{items.length===1?"":"s"} · {items.filter(i=>i.is_available).length} available to sell</p></div><div className="relative sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--gray)"}}/><input className={field+" pl-9"} style={inputStyle} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search dishes or categories"/></div></div>
      {loading?<div className="p-10 text-center text-sm" style={{color:"var(--gray)"}}>Loading catalogue…</div>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr style={{background:"var(--peach)",color:"var(--gray)"}}><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">POS status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id} className="border-t" style={{borderColor:"var(--line)",color:"var(--ink)"}}><td className="px-4 py-3.5"><div className="font-semibold">{item.name}</div><div className="mt-0.5 text-xs" style={{color:"var(--gray)"}}>{item.sku ? "Item code: "+item.sku : "Code generated on save"}{item.description?" · "+item.description:""}</div></td><td className="px-4 py-3.5"><div>{item.category}</div>{item.subcategory&&<div className="mt-0.5 text-xs" style={{color:"var(--gray)"}}>{item.subcategory}</div>}</td><td className="px-4 py-3.5 font-semibold tabular-nums">{money(Number(item.selling_price))}</td><td className="px-4 py-3.5"><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{background:item.is_available?"#E7F6EC":"#F2EEE9",color:item.is_available?"#216E3A":"#6F6257"}}>{item.is_available?"Available":"Hidden"}</span></td><td className="px-4 py-3.5"><div className="flex justify-end gap-2"><button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}} onClick={()=>startEdit(item)} disabled={busy}><Pencil size={14}/> Edit</button><button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}} onClick={()=>void toggle(item)} disabled={busy}>{item.is_available?<EyeOff size={14}/>:<Eye size={14}/>} {item.is_available?"Hide":"Show"}</button></div></td></tr>)}{!filtered.length&&<tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{color:"var(--gray)"}}>{query?"No items match your search.":"No BigFoods products yet. Add the first in-house meal or product."}</td></tr>}</tbody></table></div>}
    </section>
  </main>;
}
