"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Plus, RefreshCw, Search, Pencil, Eye, EyeOff, ArrowLeft, ArrowRight, ImagePlus } from "lucide-react";
import PageHeader from "@/components/admin/layout/PageHeader";
import { ChipPicker } from "@/components/restaurant/dashboard/MenuItemForm";
import { MENU_CATEGORY_NAMES, MENU_CATEGORY_PRESETS } from "@/lib/menuCategoryPresets";
import getBrowserSupabase from "@/lib/supabase/client";

type PosItem = { id: string; name: string; sku: string | null; description: string | null; category: string; subcategory: string | null; selling_price: number; image_url: string | null; is_available: boolean; sort_order: number };
const blank = { id: "", name: "", sku: "", description: "", category: "Meals", subcategory: "", selling_price: "", image_url: "", is_available: true, sort_order: "0" };
const field = "w-full rounded-[9px] border px-3 py-2.5 text-[13px] outline-none";
const money = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
const steps = ["Basic information", "Photos", "Stock & availability", "Review & save"];

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

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await getBrowserSupabase().auth.getSession();
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
    try { const data = await call({ action: "pos_catalogue_overview" }); setItems(data.items ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load catalogue"); }
    finally { setLoading(false); }
  }, [call]);
  useEffect(() => { void load(); }, [load]);

  const categoryOptions = useMemo(() => Array.from(new Set([...MENU_CATEGORY_NAMES, ...items.map(i => i.category.trim().toLowerCase()).filter(Boolean)])).sort((a,b)=>a.localeCompare(b)), [items]);
  const subcategoryOptions = form.category ? (MENU_CATEGORY_PRESETS[form.category.toLowerCase()] ?? []) : [];
  const filtered = items.filter(item => [item.name, item.sku ?? "", item.category, item.subcategory ?? ""].join(" ").toLowerCase().includes(query.toLowerCase()));
  const parsedPrice = Number(form.selling_price);
  const canSave = form.name.trim().length > 0 && form.category.trim().length > 0 && form.selling_price.trim().length > 0 && Number.isFinite(parsedPrice) && parsedPrice >= 0 && step === 4;

  function startNew() { setForm(blank); setStep(1); setEditing(true); setError(""); setNotice(""); }
  function startEdit(item: PosItem) {
    setForm({ id: item.id, name: item.name, sku: item.sku ?? "", description: item.description ?? "", category: item.category, subcategory: item.subcategory ?? "", selling_price: String(item.selling_price), image_url: item.image_url ?? "", is_available: item.is_available, sort_order: String(item.sort_order) });
    setStep(1); setEditing(true); setError(""); setNotice("");
  }

  function nextStep() {
    setError("");
    if (step === 1 && (!form.name.trim() || !form.category.trim() || form.selling_price.trim() === "" || !Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError("Enter a product name, category and valid selling price before continuing."); return;
    }
    setStep(s => Math.min(4, s + 1));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canSave || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await call({ action: "pos_item_save", ...form, selling_price: parsedPrice, sort_order: Number(form.sort_order) || 0 });
      setNotice(form.id ? "Catalogue item updated." : "Catalogue item created."); setEditing(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save catalogue item"); }
    finally { setBusy(false); }
  }

  async function toggle(item: PosItem) {
    setBusy(true); setError(""); setNotice("");
    try { await call({ action: "pos_item_availability", id: item.id, is_available: !item.is_available }); setNotice(item.is_available ? "Item hidden from POS sales." : "Item available in POS sales."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update availability"); }
    finally { setBusy(false); }
  }

  const label = "mb-1.5 block text-[12px] font-medium";
  const inputStyle = { borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" };

  return <main className="mx-auto max-w-7xl space-y-5 pb-10">
    <PageHeader title="BigFoods POS catalogue" subtitle="Manage products sold by BigFoods cashiers. Restaurant-owned menus stay separate." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95" style={{background:"var(--orange)"}} onClick={startNew}><Plus size={16}/> Add item</button><a href="/admin/inventory/workflows" className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}}><Boxes size={16}/> Recipe & production</a></div>
      <button className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}} onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl px-4 py-3 text-sm" style={{background:"var(--peach)",color:"var(--ink)"}}>{notice}</div>}
    {editing && <section className="mx-auto w-full max-w-3xl rounded-[16px] border p-4 sm:p-6" style={{borderColor:"var(--line)",background:"var(--white)"}}>
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{color:"var(--orange)"}}>{form.id ? "Edit catalogue item" : "New BigFoods product"}</p><h2 className="mt-1 text-xl font-bold" style={{color:"var(--ink)"}}>{steps[step-1]}</h2><p className="mt-1 text-xs" style={{color:"var(--gray)"}}>Step {step} of {steps.length} · Your entries stay here while you move between steps.</p></div><button type="button" onClick={()=>setEditing(false)} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}}>Cancel</button></div>
        <div className="grid grid-cols-4 gap-1.5" aria-label="Form progress">{steps.map((_,i)=><div key={i} className="h-1.5 rounded-full" style={{background:i+1<=step?"var(--orange)":"var(--line)"}} />)}</div>
      </div>
      <form onSubmit={save}>
        <section style={{display:step===1?undefined:"none"}}>
          <div className="mb-3"><label className={label} style={{color:"var(--ink)"}}>Product / meal name</label><input required maxLength={160} className={field} style={inputStyle} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. BigFoods Jollof Rice & Chicken"/></div>
          <div className="mb-3"><label className={label} style={{color:"var(--ink)"}}>Selling price (₦)</label><input required type="number" min="0" step="1" className={field} style={inputStyle} value={form.selling_price} onChange={e=>setForm({...form,selling_price:e.target.value})} placeholder="2500"/></div>
          <div className="mb-3"><ChipPicker label="Category" options={categoryOptions} value={form.category} onChange={v=>setForm({...form,category:v,subcategory:""})}/></div>
          <div className="mb-3"><ChipPicker label="Sub-category (optional)" options={subcategoryOptions} value={form.subcategory} onChange={v=>setForm({...form,subcategory:v})}/></div>
          <div className="mb-3"><label className={label} style={{color:"var(--ink)"}}>Description (optional)</label><textarea maxLength={1200} rows={3} className={field} style={inputStyle} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the product and what customers can expect."/></div>
        </section>
        <section style={{display:step===2?undefined:"none"}}>
          <label className={label} style={{color:"var(--ink)"}}>Product photo (optional)</label>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4" style={{borderColor:"var(--line)"}}>
            {form.image_url ? <img src={form.image_url} alt="Product preview" className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl" style={{background:"var(--peach)",color:"var(--orange)"}}><ImagePlus size={25}/></div>}
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold" style={{color:"var(--ink)"}}>Add a product image</p><p className="mt-1 text-xs" style={{color:"var(--gray)"}}>Use the image URL for now. Direct photo upload can be connected to the shared storage flow separately.</p></div>
          </div>
          <label className={label} style={{color:"var(--ink)"}}>Image URL</label><input type="url" className={field} style={inputStyle} value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://…"/>
          {form.image_url && <button type="button" className="mt-2 text-xs font-semibold underline" style={{color:"var(--orange)"}} onClick={()=>setForm({...form,image_url:""})}>Remove image</button>}
        </section>
        <section style={{display:step===3?undefined:"none"}}>
          <div className="mb-4 rounded-xl border p-4" style={{borderColor:"var(--line)",background:"var(--white)"}}>
            <h3 className="text-[13px] font-bold" style={{color:"var(--ink)"}}>POS availability</h3><p className="mt-1 text-[11px] leading-5" style={{color:"var(--gray)"}}>Control whether this product is shown to cashiers as available for sale.</p>
            <label className="mt-4 flex items-center gap-3 rounded-xl p-3" style={{background:"var(--peach)",color:"var(--ink)"}}><input type="checkbox" checked={form.is_available} onChange={e=>setForm({...form,is_available:e.target.checked})} className="h-4 w-4 accent-orange-500"/><span><span className="block text-sm font-semibold">{form.is_available?"Available for cashier sales":"Hidden from cashier sales"}</span><span className="mt-0.5 block text-xs" style={{color:"var(--gray)"}}>You can change this later without deleting the product.</span></span></label>
          </div>
          <div className="mb-3"><label className={label} style={{color:"var(--ink)"}}>SKU / item code (optional)</label><input maxLength={80} className={field} style={inputStyle} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="BF-MEAL-001"/></div>
          <div className="mb-3"><label className={label} style={{color:"var(--ink)"}}>Display order</label><input type="number" step="1" className={field} style={inputStyle} value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/><p className="mt-1 text-[11px]" style={{color:"var(--gray)"}}>Lower numbers appear first in the catalogue.</p></div>
        </section>
        <section style={{display:step===4?undefined:"none"}}>
          <div className="mb-4 rounded-xl p-4" style={{background:"var(--peach)"}}><p className="text-[11px] font-bold uppercase tracking-wide" style={{color:"var(--orange)"}}>Review product</p><h3 className="mt-1 text-lg font-bold" style={{color:"var(--ink)"}}>{form.name || "Untitled product"}</h3><p className="mt-1 text-xl font-bold" style={{color:"var(--ink)"}}>{form.selling_price ? money(parsedPrice) : "Price not set"}</p><p className="mt-1 text-xs" style={{color:"var(--gray)"}}>{form.category}{form.subcategory ? " · "+form.subcategory : ""}</p>{form.description && <p className="mt-3 text-sm" style={{color:"var(--ink)"}}>{form.description}</p>}</div>
          <div className="space-y-2 rounded-xl border p-4 text-sm" style={{borderColor:"var(--line)",color:"var(--ink)"}}><div className="flex justify-between gap-4"><span style={{color:"var(--gray)"}}>SKU</span><span>{form.sku || "Not set"}</span></div><div className="flex justify-between gap-4"><span style={{color:"var(--gray)"}}>Photo</span><span>{form.image_url ? "Added" : "Not added"}</span></div><div className="flex justify-between gap-4"><span style={{color:"var(--gray)"}}>POS status</span><span>{form.is_available?"Available":"Hidden"}</span></div></div>
        </section>
        {error && <p role="alert" className="mt-3 text-[11px]" style={{color:"var(--red)"}}>{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4" style={{borderColor:"var(--line)"}}>
          <button type="button" disabled={step===1||busy} onClick={()=>{setError("");setStep(s=>Math.max(1,s-1));}} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-40" style={{borderColor:"var(--line)",color:"var(--ink)"}}><ArrowLeft size={15}/> Back</button>
          {step<4 ? <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{background:"var(--orange)"}}>Continue <ArrowRight size={15}/></button> : <button type="submit" disabled={!canSave||busy} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{background:"var(--orange)"}}>{busy?"Saving…":form.id?"Save changes":"Save item"}</button>}
        </div>
      </form>
    </section>}
    <section className="overflow-hidden rounded-[16px] border" style={{borderColor:"var(--line)",background:"var(--white)"}}>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{borderColor:"var(--line)"}}><div><h2 className="font-semibold" style={{color:"var(--ink)"}}>In-house products</h2><p className="mt-1 text-sm" style={{color:"var(--gray)"}}>{items.length} catalogue item{items.length===1?"":"s"} · {items.filter(i=>i.is_available).length} available to sell</p></div><div className="relative sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--gray)"}}/><input className={field+" pl-9"} style={inputStyle} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search dishes or categories"/></div></div>
      {loading ? <div className="p-10 text-center text-sm" style={{color:"var(--gray)"}}>Loading catalogue…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr style={{background:"var(--peach)",color:"var(--gray)"}}><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">POS status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id} className="border-t" style={{borderColor:"var(--line)",color:"var(--ink)"}}><td className="px-4 py-3.5"><div className="font-semibold">{item.name}</div><div className="mt-0.5 text-xs" style={{color:"var(--gray)"}}>{item.sku||"No SKU"}{item.description?" · "+item.description:""}</div></td><td className="px-4 py-3.5"><div>{item.category}</div>{item.subcategory&&<div className="mt-0.5 text-xs" style={{color:"var(--gray)"}}>{item.subcategory}</div>}</td><td className="px-4 py-3.5 font-semibold tabular-nums">{money(Number(item.selling_price))}</td><td className="px-4 py-3.5"><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{background:item.is_available?"#E7F6EC":"#F2EEE9",color:item.is_available?"#216E3A":"#6F6257"}}>{item.is_available?"Available":"Hidden"}</span></td><td className="px-4 py-3.5"><div className="flex justify-end gap-2"><button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}} onClick={()=>startEdit(item)} disabled={busy}><Pencil size={14}/> Edit</button><button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:"var(--line)",color:"var(--ink)"}} onClick={()=>void toggle(item)} disabled={busy}>{item.is_available?<EyeOff size={14}/>:<Eye size={14}/>} {item.is_available?"Hide":"Show"}</button></div></td></tr>)}{!filtered.length&&<tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{color:"var(--gray)"}}>{query?"No items match your search.":"No BigFoods products yet. Add the first in-house meal or product."}</td></tr>}</tbody></table></div>}
    </section>
  </main>;
}
