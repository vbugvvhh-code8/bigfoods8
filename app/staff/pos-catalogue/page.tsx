"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Plus, RefreshCw, Search, Pencil, Eye, EyeOff, ArrowLeft, ArrowRight, ImagePlus, X, Loader2, Download, Upload, ChevronDown, MoreVertical, Star, Package, Utensils, GlassWater, Cookie, Layers, Camera } from "lucide-react";
import getBrowserSupabase from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { ChipPicker } from "@/components/restaurant/dashboard/MenuItemForm";
import { MENU_CATEGORY_NAMES, MENU_CATEGORY_PRESETS } from "@/lib/menuCategoryPresets";

import { useRouter } from "next/navigation";

type Window = { day: number; start: string; end: string };
type PosItem = {
  id: string; name: string; sku: string | null; description: string | null; category: string; subcategory: string | null;
  selling_price: number; image_url: string | null; image_urls?: string[] | null; is_available: boolean; sort_order: number;
  availability_schedule_enabled?: boolean; availability_schedule?: Window[] | null;
  promotional_price?: number | null; promotion_starts_at?: string | null; promotion_ends_at?: string | null;
  complementary_item_ids?: string[] | null;
};
const blank = {
  id: "", name: "", description: "", category: "meals", subcategory: "", selling_price: "",
  image_urls: [] as string[], is_available: true, sort_order: "0", schedule_enabled: false, schedule: [] as Window[],
  promotional_price: "", promotion_starts_at: "", promotion_ends_at: "", complementary_item_ids: [] as string[]
};
const steps = ["Product details", "Product photo", "Weekly availability", "Promotions & recommendations", "Review & save"];
const field = "w-full rounded-[9px] border px-3 py-2.5 text-[13px] outline-none";
const money = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export const dynamic = "force-dynamic";
export default function BigFoodsPosCataloguePage() {
  const router = useRouter();
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [items, setItems] = useState<PosItem[]>([]);
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [otherItems, setOtherItems] = useState<{id:string;name:string}[]>([]);
  const newImagePreview = useMemo(() => newImages[0] ? URL.createObjectURL(newImages[0]) : "", [newImages]);
  useEffect(() => () => { if (newImagePreview) URL.revokeObjectURL(newImagePreview); }, [newImagePreview]);

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
      const sessionRes = await fetch("/api/bigfoods-staff/session", { cache: "no-store" });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.staff) { router.replace("/staff/login"); return; }
      const staff = sessionData.staff;
      const permissions = Array.isArray(staff.permissions) ? staff.permissions : [];
      if (!["owner", "admin"].includes(String(staff.role || "").toLowerCase()) && !permissions.includes("inventory.manage") && !permissions.includes("pos.manage") && !permissions.includes("pos.catalogue.manage")) {
        setError("Your account does not have permission to access the POS catalogue."); return;
      }
      setCurrentStaff(staff);
      const data = await call({ action: "pos_catalogue_overview" });
      setItems(data.items ?? []);
      setOtherItems((data.items ?? []).map((x:PosItem)=>({id:x.id,name:x.name})));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load catalogue"); }
    finally { setLoading(false); }
  }, [call, router]);
  useEffect(() => { void load(); }, [load]);

  const categoryOptions = useMemo(() => Array.from(new Set([...MENU_CATEGORY_NAMES, ...items.map(i => i.category.trim().toLowerCase()).filter(Boolean)])).sort((a,b)=>a.localeCompare(b)), [items]);
  const subcategoryOptions = form.category ? (MENU_CATEGORY_PRESETS[form.category.toLowerCase()] ?? []) : [];
  const filtered = items.filter(item => [item.name, item.sku ?? "", item.category, item.subcategory ?? ""].join(" ").toLowerCase().includes(query.toLowerCase()))
    .filter(item => activeCategory === "all" || item.category.toLowerCase() === activeCategory)
    .filter(item => availabilityFilter === "all" || (availabilityFilter === "available" ? item.is_available : !item.is_available))
    .sort((a,b) => sortOrder === "name" ? a.name.localeCompare(b.name) : sortOrder === "price_low" ? a.selling_price-b.selling_price : sortOrder === "price_high" ? b.selling_price-a.selling_price : b.sort_order-a.sort_order);
  const price = Number(form.selling_price);
  const promo = form.promotional_price.trim() ? Number(form.promotional_price) : null;
  const imageCount = form.image_urls.length + newImages.length;
  const validSchedule = !form.schedule_enabled || form.schedule.every(w => Number.isInteger(w.day) && w.day >= 0 && w.day <= 6 &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(w.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(w.end) && w.start < w.end);
  const validPromo = promo === null || (Number.isSafeInteger(promo) && promo > 0 && Number.isSafeInteger(price) && promo < price);
  const validPromoWindow = !form.promotion_starts_at || !form.promotion_ends_at || new Date(form.promotion_ends_at).getTime() > new Date(form.promotion_starts_at).getTime();
  const canSave = form.name.trim().length > 0 && form.category.trim().length > 0 && form.selling_price.trim().length > 0 &&
    Number.isSafeInteger(price) && price > 0 && step === 5 && imageCount === 1 && validSchedule && validPromo && validPromoWindow;

  function startNew() { setForm({...blank}); setNewImages([]); setRemovedImages([]); setStep(5); setEditing(true); setError(""); setNotice(""); }
  function startEdit(item: PosItem) {
    const urls = Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls : item.image_url ? [item.image_url] : [];
    setForm({
      ...blank, id:item.id, name:item.name, description:item.description ?? "", category:item.category,
      subcategory:item.subcategory ?? "", selling_price:String(item.selling_price), image_urls:urls, is_available:item.is_available,
      sort_order:String(item.sort_order), schedule_enabled:Boolean(item.availability_schedule_enabled), schedule:item.availability_schedule ?? [],
      promotional_price:item.promotional_price == null ? "" : String(item.promotional_price),
      promotion_starts_at:item.promotion_starts_at ? new Date(item.promotion_starts_at).toISOString().slice(0,16) : "",
      promotion_ends_at:item.promotion_ends_at ? new Date(item.promotion_ends_at).toISOString().slice(0,16) : "",
      complementary_item_ids:item.complementary_item_ids ?? []
    });
    setNewImages([]); setRemovedImages([]); setStep(5); setEditing(true); setError(""); setNotice("");
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
        sort_order:Number(form.sort_order) || 0, availability_schedule_enabled:form.schedule_enabled,
        availability_schedule:form.schedule_enabled ? form.schedule : [], promotional_price:promo,
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
  const exportCsv = () => { const rows = [["Name","Category","Subcategory","Price","Availability"], ...filtered.map(i => [i.name, i.category, i.subcategory ?? "", String(i.selling_price), i.is_available ? "Available" : "Hidden"])]; const csv = rows.map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\r\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "bigfoods-menu.csv"; a.click(); URL.revokeObjectURL(a.href); };

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#171923]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[210px] border-r border-[#E4E7EC] bg-white lg:flex lg:flex-col"><div className="flex h-[74px] items-center gap-2 border-b border-[#E8EAEE] px-5"><span className="text-2xl">🍲</span><b className="text-xl tracking-tight">Big<span className="text-[#ED570C]">Foods</span></b></div><nav className="space-y-1 px-3 py-5">{[["POS","/staff/pos",Boxes],["Orders","/staff/pos/orders",Package],["Menu","/staff/pos/menu",Utensils],["Inventory","/staff/inventory",Layers],["Customers","#",Cookie],["Analytics","/staff/pos/analytics",Star],["Reports","/staff/pos/reports",Upload],["Settings","/staff/settings",Camera]].map(([label,href,Icon]:any)=><button key={label} onClick={()=>href!=="#"&&router.push(href)} className={"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium "+(label==="Menu"?"border border-orange-100 bg-[#FFF0E6] text-[#D94B0A]":"text-[#59616D] hover:bg-gray-50")}><Icon size={18}/>{label}</button>)}</nav><div className="mt-auto border-t border-[#E8EAEE] p-4 text-xs text-[#687180]">Need help? Contact support</div></aside>
      <div className="lg:pl-[210px]"><header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white/95 px-4 py-4 sm:px-6"><div className="relative min-w-[190px] flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search menu items, categories or ingredients..." className="w-full rounded-xl border px-3 py-3 pl-10 text-sm outline-none focus:border-orange-400"/></div><button className="rounded-xl border bg-white px-4 py-3 text-sm">View Store</button><button className="rounded-xl border bg-white px-4 py-3 text-sm">♧</button><span className="text-sm font-semibold">{currentStaff?.display_name||"Staff"}</span></header>
      <section className="p-4 sm:p-6"><div className="mx-auto max-w-[1400px] space-y-4 pb-10"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[29px] font-bold tracking-tight text-[#171923]">Menu</h1><p className="mt-1 text-[13px] text-[#667085]">Manage your food items, categories, subcategories, combos and prices.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-[9px] border bg-white px-3.5 text-[12px] font-semibold text-[#344054]" style={{borderColor:"var(--line)"}}><Download size={15}/> Export</button><button onClick={startNew} className="inline-flex h-10 items-center gap-2 rounded-[9px] px-4 text-[12px] font-bold text-white" style={{background:"var(--orange)"}}><Plus size={16}/> Add Menu Item</button><button onClick={()=>void load()} aria-label="Refresh menu" className="inline-flex h-10 items-center gap-2 rounded-[9px] border bg-white px-3 text-[12px] font-semibold" style={{borderColor:"var(--line)"}}><RefreshCw size={14}/></button></div></div>
      {error&&!editing&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}{notice&&<div role="status" className="rounded-xl p-3 text-sm" style={{background:"var(--peach)"}}>{notice}</div>}
      <div className="flex flex-wrap gap-2">{[{id:"all",label:"All Items",count:items.length},...categoryOptions.map(cat=>({id:cat.toLowerCase(),label:cat.charAt(0).toUpperCase()+cat.slice(1),count:items.filter(i=>i.category.toLowerCase()===cat.toLowerCase()).length}))].map(tab=><button key={tab.id} onClick={()=>setActiveCategory(tab.id)} className="h-[38px] rounded-[9px] border px-4 text-[12px] font-semibold" style={activeCategory===tab.id?{borderColor:"var(--orange)",background:"var(--orange)",color:"#fff"}:{borderColor:"var(--line)",background:"var(--white)",color:"var(--ink)"}}>{tab.label} ({tab.count})</button>)}</div>
      <div className="grid gap-2.5 md:grid-cols-4"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--gray)"}}/><input className={field+" h-[39px] pl-9"} style={inputStyle} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search menu items..."/></div><select aria-label="Category" className={field+" h-[39px]"} style={inputStyle} value={activeCategory} onChange={e=>setActiveCategory(e.target.value)}><option value="all">All Categories</option>{categoryOptions.map(cat=><option key={cat} value={cat.toLowerCase()}>{cat}</option>)}</select><select aria-label="Availability status" className={field+" h-[39px]"} style={inputStyle} value={availabilityFilter} onChange={e=>setAvailabilityFilter(e.target.value)}><option value="all">All Status</option><option value="available">Available</option><option value="hidden">Hidden</option></select><select aria-label="Sort menu items" className={field+" h-[39px]"} style={inputStyle} value={sortOrder} onChange={e=>setSortOrder(e.target.value)}><option value="newest">Newest First</option><option value="name">Name A–Z</option><option value="price_low">Price: Low to High</option><option value="price_high">Price: High to Low</option></select></div>
      {loading?<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({length:8},(_,i)=><div key={i} className="h-[220px] animate-pulse rounded-xl bg-gray-100"/>)}</div>:filtered.length===0?<div className="rounded-xl border bg-white p-10 text-center text-sm" style={{borderColor:"var(--line)",color:"var(--gray)"}}>No menu items match these filters.</div>:<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{filtered.map(item=><article key={item.id} className="group overflow-hidden rounded-[12px] border bg-white" style={{borderColor:"var(--line)"}}><div className="relative h-[108px] bg-[#F0F1F3]">{(item.image_urls?.[0]||item.image_url)?<img src={item.image_urls?.[0]||item.image_url||""} alt={item.name} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-[#98A2B3]"><Utensils size={28}/></div>}<button aria-label={"Edit "+item.name} onClick={()=>startEdit(item)} className="absolute bottom-2 right-2 rounded-lg border bg-white/95 p-2"><MoreVertical size={15}/></button></div><div className="p-3"><h3 className="truncate text-[12px] font-bold">{item.name}</h3><p className="mt-1 truncate text-[10px] text-gray-500">{item.category}{item.subcategory?" › "+item.subcategory:""}</p><p className="mt-2 text-[14px] font-extrabold">{money(Number(item.selling_price))}</p><div className="mt-2 flex items-center justify-between gap-2"><span className={"text-[10px] "+(item.is_available?"text-green-700":"text-amber-700")}>{item.is_available?"● In Stock":"○ Hidden"}</span><button onClick={()=>void toggle(item)} disabled={busy} aria-label={item.is_available?"Hide "+item.name:"Show "+item.name}>{item.is_available?<EyeOff size={13}/>:<Eye size={13}/>}</button></div></div></article>)}</div>}
      </div></section></div>
      {editing&&<div className="fixed inset-0 z-40 bg-black/20"><section className="ml-auto flex h-full w-full max-w-[400px] flex-col overflow-y-auto border-l bg-white p-4 sm:p-5" style={{borderColor:"var(--line)"}}><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-[17px] font-bold">{form.id?"Edit Menu Item":"Add Menu Item"}</h2><p className="mt-1 text-xs text-gray-500">Update product details, pricing and availability.</p></div><button type="button" onClick={()=>setEditing(false)} aria-label="Close editor"><X size={18}/></button></div><form onSubmit={save} className="flex-1"><div className="mb-3"><label className={label}>Item Name *</label><input required className={field} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div><div className="mb-3"><label className={label}>Category *</label><ChipPicker label="Category" options={categoryOptions} value={form.category} onChange={v=>setForm({...form,category:v,subcategory:""})}/></div><div className="mb-3"><label className={label}>Subcategory</label><ChipPicker label="Subcategory" options={subcategoryOptions} value={form.subcategory} onChange={v=>setForm({...form,subcategory:v})}/></div><div className="mb-3"><label className={label}>Price (₦) *</label><input required inputMode="numeric" className={field} value={form.selling_price} onChange={e=>setForm({...form,selling_price:e.target.value.replace(/[^\d]/g,"")})}/></div><div className="mb-3"><label className={label}>Description</label><textarea className={field} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div><div className="mb-3"><label className={label}>Product Image</label><div className="flex flex-wrap gap-2">{form.image_urls.map((url,i)=><img key={url} src={url} alt="" className="h-16 w-16 rounded-lg object-cover"/>)}{newImages.map((file,i)=><img key={i} src={URL.createObjectURL(file)} alt="" className="h-16 w-16 rounded-lg object-cover"/>)}{imageCount<1&&<label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed"><ImagePlus/><input type="file" accept="image/*" className="hidden" onChange={e=>{setNewImages(Array.from(e.target.files??[]).slice(0,1-imageCount));e.currentTarget.value="";}}/></label>}</div></div><label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_available} onChange={e=>setForm({...form,is_available:e.target.checked})}/> Available</label><div className="sticky bottom-0 flex gap-2 border-t bg-white pt-4"><button type="button" onClick={()=>setEditing(false)} className="flex-1 rounded-lg border px-4 py-3">Cancel</button><button type="submit" disabled={!canSave||busy} className="flex-1 rounded-lg bg-[#ED570C] px-4 py-3 font-bold text-white">{busy?"Saving…":form.id?"Save Changes":"Add Menu Item"}</button></div>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</form></section></div>}
    </main>
  );
}
