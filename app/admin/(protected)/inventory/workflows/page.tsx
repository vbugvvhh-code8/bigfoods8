"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw, Trash2, CookingPot } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/admin/layout/PageHeader";
import getBrowserSupabase from "@/lib/supabase/client";

type Item = { id: string; name: string; base_unit: string; is_active: boolean };
type Batch = { id: string; inventory_item_id: string; batch_code: string; remaining_quantity: number; base_unit: string; status: string };
type MenuItem = { id: string; name: string };
type Recipe = { id: string; menu_item_id: string | null; name: string; version: number; output_quantity: number; output_unit: string; effective_from: string; is_active: boolean };
type IngredientLine = { inventory_item_id: string; quantity: string; unit: string };
type Production = { id: string; batch_code: string; input_inventory_item_id: string; input_batch_id: string | null; raw_input_quantity: number; raw_input_unit: string; output_inventory_item_id: string; output_quantity: number | null; output_unit: string; unprocessed_quantity: number; allowed_loss_quantity: number; actual_loss_quantity: number | null; variance_quantity: number | null; status: string };
const initialStart = { batch_code: "", input_inventory_item_id: "", input_batch_id: "", raw_input_quantity: "", output_inventory_item_id: "", allowed_loss_quantity: "0" };
const initialWaste = { batch_id: "", quantity: "", reason: "" };
const initialFinish = { production_batch_id: "", output_quantity: "", unprocessed_quantity: "0", actual_loss_quantity: "0", review_note: "" };
const initialRecipe = { menu_item_id: "", name: "", output_quantity: "1", output_unit: "portion" };

export default function InventoryWorkflowsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeForm, setRecipeForm] = useState(initialRecipe);
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([{ inventory_item_id: "", quantity: "", unit: "" }]);
  const [start, setStart] = useState(initialStart);
  const [waste, setWaste] = useState(initialWaste);
  const [finish, setFinish] = useState(initialFinish);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await getBrowserSupabase().auth.getSession();
    const response = await fetch("/api/bigfoods-staff/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify(body), cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Inventory request failed");
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [overview, prod, recipeData] = await Promise.all([call({ action: "overview" }), call({ action: "production_list" }), call({ action: "recipe_overview" })]);
      setItems(overview.items ?? []); setBatches(overview.batches ?? []); setProduction(prod.production ?? []);
      setMenuItems(recipeData.menu_items ?? []); setRecipes(recipeData.recipes ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load inventory workflows"); }
    finally { setLoading(false); }
  }, [call]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent, action: string, payload: Record<string, unknown>, reset: () => void, message: string) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await call({ action, ...payload }); reset(); setNotice(message); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save inventory workflow"); }
    finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-xl border border-[#E7DED4] bg-white px-3.5 py-2.5 text-sm text-[#30261F] outline-none focus:border-[#E87524] focus:ring-2 focus:ring-[#E87524]/15";
  const label = "block text-xs font-semibold tracking-wide text-[#6E6257]";
  const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E87524] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D96417] disabled:opacity-50";
  const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DED4] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#47382D] hover:bg-[#FBF7F2] disabled:opacity-50";
  const activeBatches = batches.filter(b => b.status === "active" && Number(b.remaining_quantity) > 0);
  const availableInputBatches = activeBatches.filter(b => b.inventory_item_id === start.input_inventory_item_id);
  const inProgress = production.filter(p => p.status === "in_progress");

  return <main className="mx-auto max-w-7xl space-y-6 pb-10">
    <PageHeader title="Inventory workflows" subtitle="Record waste and production yields with a reasoned, auditable stock trail." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/inventory" className={secondary}><ArrowLeft size={16}/> Back to inventory</Link>
      <button className={secondary} onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle size={17} className="shrink-0"/>{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    {loading ? <div className="rounded-2xl border border-[#E9E0D6] bg-white p-10 text-center text-sm text-[#817367]">Loading inventory workflows…</div> : <>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E9E0D6] bg-white p-5 shadow-[0_2px_10px_rgba(58,39,23,0.035)]">
          <div className="mb-5"><h2 className="font-semibold text-[#30261F]">Create recipe version</h2><p className="mt-1 text-sm text-[#817367]">Each save creates a new version so past reconciliation can preserve the recipe used at the time.</p></div>
          <form className="space-y-4" onSubmit={e=>void submit(e,"recipe_save",{...recipeForm,output_quantity:Number(recipeForm.output_quantity),ingredients:ingredientLines.map(line=>({inventory_item_id:line.inventory_item_id,quantity:Number(line.quantity),unit:line.unit}))},()=>{setRecipeForm(initialRecipe);setIngredientLines([{inventory_item_id:"",quantity:"",unit:""}]);},"Recipe version saved.")}>
            <label className={label}>Menu item<select required className={field} value={recipeForm.menu_item_id} onChange={e=>setRecipeForm({...recipeForm,menu_item_id:e.target.value})}><option value="">Choose menu item</option>{menuItems.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <label className={label}>Recipe name<input required maxLength={160} className={field} value={recipeForm.name} onChange={e=>setRecipeForm({...recipeForm,name:e.target.value})} placeholder="e.g. Classic jollof rice"/></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Output quantity<input required type="number" min="0.0001" step="0.0001" className={field} value={recipeForm.output_quantity} onChange={e=>setRecipeForm({...recipeForm,output_quantity:e.target.value})}/></label><label className={label}>Output unit<input required maxLength={24} className={field} value={recipeForm.output_unit} onChange={e=>setRecipeForm({...recipeForm,output_unit:e.target.value})} placeholder="portion"/></label></div>
            <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[#47382D]">Ingredients</h3><button type="button" className={secondary} onClick={()=>setIngredientLines(lines=>[...lines,{inventory_item_id:"",quantity:"",unit:""}])}>Add ingredient</button></div>
              {ingredientLines.map((line,index)=><div key={index} className="grid gap-2 rounded-xl border border-[#F0E8E0] p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]"><label className={label}>Inventory item<select required className={field} value={line.inventory_item_id} onChange={e=>{const item=items.find(i=>i.id===e.target.value);setIngredientLines(lines=>lines.map((x,i)=>i===index?{...x,inventory_item_id:e.target.value,unit:item?.base_unit??""}:x));}}><option value="">Choose item</option>{items.filter(i=>i.is_active).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label className={label}>Quantity<input required type="number" min="0.0001" step="0.0001" className={field} value={line.quantity} onChange={e=>setIngredientLines(lines=>lines.map((x,i)=>i===index?{...x,quantity:e.target.value}:x))}/></label><label className={label}>Unit<input required readOnly className={field+" bg-[#F7F1EA]"} value={line.unit}/></label><button type="button" className={secondary+" self-end"} disabled={ingredientLines.length===1} onClick={()=>setIngredientLines(lines=>lines.filter((_,i)=>i!==index))} aria-label="Remove ingredient">Remove</button></div>)}
            </div>
            <button className={primary} disabled={busy || !menuItems.length || !items.some(i=>i.is_active)}>{busy ? "Saving…" : "Save recipe version"}</button>
          </form>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#E9E0D6] bg-white shadow-[0_2px_10px_rgba(58,39,23,0.035)]">
          <div className="border-b border-[#EFE7DF] p-4"><h2 className="font-semibold text-[#30261F]">Active recipe versions</h2><p className="mt-1 text-sm text-[#817367]">Saving a new recipe version retires the prior active version for that menu item.</p></div>
          <div className="divide-y divide-[#F0E8E0]">{recipes.map(r=><div key={r.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-[#342920]">{r.name}</div><div className="mt-1 text-sm text-[#817367]">{menuItems.find(m=>m.id===r.menu_item_id)?.name ?? "Menu item"} · Version {r.version}</div></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Active</span></div><div className="mt-2 text-xs text-[#827467]">Output: {Number(r.output_quantity)} {r.output_unit} · Effective {new Date(r.effective_from).toLocaleDateString("en-NG")}</div></div>)}{!recipes.length && <div className="p-8 text-center text-sm text-[#8A7C70]">No active recipes yet. Save a recipe to start linking menu sales to ingredient usage.</div>}</div>
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E9E0D6] bg-white p-5 shadow-[0_2px_10px_rgba(58,39,23,0.035)]">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-[#FFF1E5] p-2 text-[#D96B1F]"><Trash2 size={19}/></span><div><h2 className="font-semibold text-[#30261F]">Log stock waste</h2><p className="mt-1 text-sm text-[#817367]">Expired, spoiled or otherwise unusable stock.</p></div></div>
          <form className="space-y-4" onSubmit={e => void submit(e,"waste",{...waste,quantity:Number(waste.quantity)},()=>setWaste(initialWaste),"Waste logged and stock balance updated atomically.")}>
            <label className={label}>Stock batch<select required className={field} value={waste.batch_id} onChange={e=>setWaste({...waste,batch_id:e.target.value})}><option value="">Choose batch</option>{activeBatches.map(b=><option key={b.id} value={b.id}>{items.find(i=>i.id===b.inventory_item_id)?.name ?? "Item"} · {b.batch_code} · {Number(b.remaining_quantity)} {b.base_unit} left</option>)}</select></label>
            <label className={label}>Quantity wasted<input required type="number" min="0.0001" step="0.0001" className={field} value={waste.quantity} onChange={e=>setWaste({...waste,quantity:e.target.value})}/></label>
            <label className={label}>Reason<textarea required minLength={3} maxLength={500} rows={3} className={field} value={waste.reason} onChange={e=>setWaste({...waste,reason:e.target.value})} placeholder="e.g. Expired before use; packaging damaged"/></label>
            <button className={primary} disabled={busy || !activeBatches.length}>{busy ? "Saving…" : "Record waste"}</button>
          </form>
        </div>
        <div className="rounded-2xl border border-[#E9E0D6] bg-white p-5 shadow-[0_2px_10px_rgba(58,39,23,0.035)]">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-[#FFF1E5] p-2 text-[#D96B1F]"><CookingPot size={19}/></span><div><h2 className="font-semibold text-[#30261F]">Start production batch</h2><p className="mt-1 text-sm text-[#817367]">Choose the raw batch and the inventory item produced.</p></div></div>
          <form className="space-y-4" onSubmit={e=>void submit(e,"production_start",{...start,raw_input_quantity:Number(start.raw_input_quantity),allowed_loss_quantity:Number(start.allowed_loss_quantity)},()=>setStart(initialStart),"Production batch started. Input stock is checked again when the batch is finished.")}>
            <label className={label}>Production batch code<input required maxLength={100} className={field} value={start.batch_code} onChange={e=>setStart({...start,batch_code:e.target.value})} placeholder="e.g. PROD-TOMATO-001"/></label>
            <label className={label}>Raw inventory item<select required className={field} value={start.input_inventory_item_id} onChange={e=>setStart({...start,input_inventory_item_id:e.target.value,input_batch_id:""})}><option value="">Choose raw item</option>{items.filter(i=>i.is_active).map(i=><option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>)}</select></label>
            <label className={label}>Source stock batch<select required className={field} value={start.input_batch_id} onChange={e=>setStart({...start,input_batch_id:e.target.value})}><option value="">Choose batch</option>{availableInputBatches.map(b=><option key={b.id} value={b.id}>{b.batch_code} — {Number(b.remaining_quantity)} {b.base_unit} left</option>)}</select></label>
            <label className={label}>Raw input quantity<input required type="number" min="0.0001" step="0.0001" className={field} value={start.raw_input_quantity} onChange={e=>setStart({...start,raw_input_quantity:e.target.value})}/></label>
            <label className={label}>Output inventory item<select required className={field} value={start.output_inventory_item_id} onChange={e=>setStart({...start,output_inventory_item_id:e.target.value})}><option value="">Choose output item</option>{items.filter(i=>i.is_active).map(i=><option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>)}</select></label>
            <label className={label}>Allowed variance / loss tolerance<input required type="number" min="0" step="0.0001" className={field} value={start.allowed_loss_quantity} onChange={e=>setStart({...start,allowed_loss_quantity:e.target.value})}/></label>
            <button className={primary} disabled={busy || !availableInputBatches.length}>{busy ? "Saving…" : "Start production"}</button>
          </form>
        </div>
      </section>
      <section className="rounded-2xl border border-[#E9E0D6] bg-white p-5 shadow-[0_2px_10px_rgba(58,39,23,0.035)]">
        <div className="mb-5"><h2 className="font-semibold text-[#30261F]">Finish production batch</h2><p className="mt-1 text-sm text-[#817367]">Output, unprocessed input and actual loss are reconciled. Variance beyond tolerance raises an alert for review.</p></div>
        <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={e=>void submit(e,"production_finish",{...finish,output_quantity:Number(finish.output_quantity),unprocessed_quantity:Number(finish.unprocessed_quantity),actual_loss_quantity:Number(finish.actual_loss_quantity)},()=>setFinish(initialFinish),"Production results recorded. Check the batch status and alerts for any variance.")}>
          <label className={label}>Production batch<select required className={field} value={finish.production_batch_id} onChange={e=>setFinish({...finish,production_batch_id:e.target.value})}><option value="">Choose in-progress batch</option>{inProgress.map(p=><option key={p.id} value={p.id}>{p.batch_code} · {Number(p.raw_input_quantity)} {p.raw_input_unit} raw</option>)}</select></label>
          <label className={label}>Output quantity<input required type="number" min="0" step="0.0001" className={field} value={finish.output_quantity} onChange={e=>setFinish({...finish,output_quantity:e.target.value})}/></label>
          <label className={label}>Unprocessed quantity<input required type="number" min="0" step="0.0001" className={field} value={finish.unprocessed_quantity} onChange={e=>setFinish({...finish,unprocessed_quantity:e.target.value})}/></label>
          <label className={label}>Actual loss quantity<input required type="number" min="0" step="0.0001" className={field} value={finish.actual_loss_quantity} onChange={e=>setFinish({...finish,actual_loss_quantity:e.target.value})}/></label>
          <label className={label+" sm:col-span-2"}>Notes for audit / review<textarea rows={2} maxLength={500} className={field} value={finish.review_note} onChange={e=>setFinish({...finish,review_note:e.target.value})} placeholder="Optional context for the batch report"/></label>
          <div className="flex items-end"><button className={primary} disabled={busy || !inProgress.length}>{busy ? "Saving…" : "Finish and reconcile"}</button></div>
        </form>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#E9E0D6] bg-white">
        <div className="border-b border-[#EFE7DF] p-4"><h2 className="font-semibold text-[#30261F]">Recent production batches</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#FBF7F2] text-xs uppercase tracking-wide text-[#827467]"><tr><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Input</th><th className="px-4 py-3">Output</th><th className="px-4 py-3">Variance</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#F0E8E0]">{production.map(p=><tr key={p.id}><td className="px-4 py-3.5 font-semibold">{p.batch_code}</td><td className="px-4 py-3.5">{Number(p.raw_input_quantity)} {p.raw_input_unit}</td><td className="px-4 py-3.5">{p.output_quantity == null ? "—" : Number(p.output_quantity)+" "+p.output_unit}</td><td className="px-4 py-3.5">{p.variance_quantity == null ? "—" : Number(p.variance_quantity)}</td><td className="px-4 py-3.5"><span className={"rounded-full px-2.5 py-1 text-xs font-semibold "+(p.status==="pending_review"?"bg-amber-50 text-amber-800":p.status==="confirmed"?"bg-emerald-50 text-emerald-800":"bg-gray-100 text-gray-700")}>{p.status.replaceAll("_"," ")}</span></td></tr>)}{!production.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8A7C70]">No production batches yet.</td></tr>}</tbody></table></div>
      </section>
    </>}
  </main>;
}
