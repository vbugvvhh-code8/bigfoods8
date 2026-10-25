"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Boxes, Plus, RefreshCw, Search, Pencil, Eye, EyeOff } from "lucide-react";
import PageHeader from "@/components/admin/layout/PageHeader";
import getBrowserSupabase from "@/lib/supabase/client";

type PosItem = { id: string; name: string; sku: string | null; description: string | null; category: string; subcategory: string | null; selling_price: number; image_url: string | null; is_available: boolean; sort_order: number };
const blank = { id: "", name: "", sku: "", description: "", category: "Meals", subcategory: "", selling_price: "", image_url: "", is_available: true, sort_order: "0" };
const field = "mt-1 w-full rounded-xl border border-[#E7DED4] bg-white px-3.5 py-2.5 text-sm text-[#30261F] outline-none focus:border-[#E87524] focus:ring-2 focus:ring-[#E87524]/15";
const label = "block text-xs font-semibold tracking-wide text-[#6E6257]";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E87524] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D96417] disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DED4] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#47382D] hover:bg-[#FBF7F2] disabled:opacity-50";
const money = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n);

export default function BigFoodsPosCataloguePage() {
  const [items, setItems] = useState<PosItem[]>([]);
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
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

  function startNew() { setForm(blank); setEditing(true); setError(""); setNotice(""); }
  function startEdit(item: PosItem) {
    setForm({ id: item.id, name: item.name, sku: item.sku ?? "", description: item.description ?? "", category: item.category, subcategory: item.subcategory ?? "", selling_price: String(item.selling_price), image_url: item.image_url ?? "", is_available: item.is_available, sort_order: String(item.sort_order) });
    setEditing(true); setError(""); setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await call({ action: "pos_item_save", ...form, selling_price: Number(form.selling_price), sort_order: Number(form.sort_order) });
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

  const filtered = items.filter(item => [item.name, item.sku ?? "", item.category, item.subcategory ?? ""].join(" ").toLowerCase().includes(query.toLowerCase()));

  return <main className="mx-auto max-w-7xl space-y-6 pb-10">
    <PageHeader title="BigFoods POS catalogue" subtitle="Manage products sold by BigFoods cashiers. This catalogue is separate from restaurant-owned menus." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2"><button className={primary} onClick={startNew}><Plus size={16}/> Add catalogue item</button><a className={secondary} href="/admin/inventory/workflows"><Boxes size={16}/> Recipe & production links</a></div>
      <button className={secondary} onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    {editing && <section className="rounded-2xl border border-[#E9E0D6] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-[#30261F]">{form.id ? "Edit catalogue item" : "Add in-house product"}</h2><p className="mt-1 text-sm text-[#817367]">These products belong to BigFoods, not a restaurant account.</p></div><button type="button" className={secondary} onClick={() => setEditing(false)}>Cancel</button></div>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>Product / meal name<input required maxLength={160} className={field} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. BigFoods Jollof Rice"/></label>
          <label className={label}>SKU (optional)<input maxLength={80} className={field} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="BF-MEAL-001"/></label>
          <label className={label}>Selling price (NGN)<input required type="number" min="0" step="0.01" className={field} value={form.selling_price} onChange={e=>setForm({...form,selling_price:e.target.value})} placeholder="2500"/></label>
          <label className={label}>Category<input required maxLength={80} className={field} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Meals, Drinks, Combos"/></label>
          <label className={label}>Subcategory (optional)<input maxLength={80} className={field} value={form.subcategory} onChange={e=>setForm({...form,subcategory:e.target.value})} placeholder="Rice, Swallow, Soft drinks"/></label>
          <label className={label}>Display order<input type="number" step="1" className={field} value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></label>
          <label className={label}>Image URL (optional)<input type="url" className={field} value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://…"/></label>
          <label className={label}>Description (optional)<textarea maxLength={1000} rows={2} className={field} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Short product description"/></label>
          <label className="flex items-center gap-2 self-center text-sm font-medium text-[#47382D]"><input type="checkbox" checked={form.is_available} onChange={e=>setForm({...form,is_available:e.target.checked})}/> Available for cashier sales</label>
        </div>
        <div className="flex justify-end"><button className={primary} disabled={busy}>{busy ? "Saving…" : "Save catalogue item"}</button></div>
      </form>
    </section>}
    <section className="overflow-hidden rounded-2xl border border-[#E9E0D6] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#EFE7DF] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-[#30261F]">In-house products</h2><p className="mt-1 text-sm text-[#817367]">{items.length} catalogue item{items.length === 1 ? "" : "s"} · {items.filter(i=>i.is_available).length} available to sell</p></div><div className="relative sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96887B]"/><input className={field+" pl-9"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, SKU or category"/></div></div>
      {loading ? <div className="p-10 text-center text-sm text-[#817367]">Loading catalogue…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#FBF7F2] text-xs uppercase tracking-wide text-[#827467]"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">POS status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#F0E8E0]">{filtered.map(item=><tr key={item.id} className="hover:bg-[#FFFCF8]"><td className="px-4 py-3.5"><div className="font-semibold text-[#342920]">{item.name}</div><div className="mt-0.5 text-xs text-[#8A7C70]">{item.sku || "No SKU"}{item.description ? " · "+item.description : ""}</div></td><td className="px-4 py-3.5"><div>{item.category}</div>{item.subcategory && <div className="mt-0.5 text-xs text-[#8A7C70]">{item.subcategory}</div>}</td><td className="px-4 py-3.5 font-semibold tabular-nums">{money(Number(item.selling_price))}</td><td className="px-4 py-3.5"><span className={"rounded-full px-2.5 py-1 text-xs font-semibold "+(item.is_available?"bg-emerald-50 text-emerald-800":"bg-gray-100 text-gray-600")}>{item.is_available?"Available":"Hidden"}</span></td><td className="px-4 py-3.5"><div className="flex justify-end gap-2"><button className={secondary} onClick={()=>startEdit(item)} disabled={busy}><Pencil size={14}/> Edit</button><button className={secondary} onClick={()=>void toggle(item)} disabled={busy}>{item.is_available?<EyeOff size={14}/>:<Eye size={14}/>} {item.is_available?"Hide":"Show"}</button></div></td></tr>)}{!filtered.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#8A7C70]">{query?"No items match your search.":"No BigFoods products yet. Add the first in-house meal or product."}</td></tr>}</tbody></table></div>}
    </section>
  </main>;
}
