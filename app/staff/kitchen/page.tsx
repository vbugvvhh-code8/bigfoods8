"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import { ChefHat, RefreshCw, AlertTriangle, CheckCircle2, Boxes, Calculator } from "lucide-react";

type StockItem = { id: string; name: string; base_unit: string; reorder_level: number };
type RecipeLine = { inventory_item_id: string; quantity: number; unit: string; inventory_items?: { id: string; name: string; base_unit: string } | null };
type Recipe = { id: string; bigfoods_pos_item_id: string; name: string; version: number; output_quantity: number; output_unit: string; bigfoods_pos_items?: { name: string } | null; inventory_recipe_items?: RecipeLine[] };
type Batch = { inventory_item_id: string; remaining_quantity: number; status: string; expires_at: string | null };
type Requirement = { id: string; name: string; unit: string; required: number; available: number; shortage: number };
type Preparation = { id: string; prep_code: string; recipe_name: string; recipe_version: number; requested_portions: number; status: string; ingredient_snapshot: Requirement[]; requested_at: string; notes: string | null };

const fmt = (n: number) => new Intl.NumberFormat("en-NG", { maximumFractionDigits: 3 }).format(n);

export default function StaffKitchenPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [portions, setPortions] = useState("10");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<Preparation[]>([]);
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/bigfoods-staff/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "kitchen_overview" }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load kitchen data");
      setItems(data.items || []); setBatches(data.batches || []); setRecipes(data.recipes || []);
      setRecipeId((current: string) => current || data.recipes?.[0]?.id || "");
      const queueResponse = await fetch("/api/bigfoods-staff/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "kitchen_queue" }), cache: "no-store" });
      const queueData = await queueResponse.json();
      if (queueResponse.ok) setQueue(queueData.preparations || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load kitchen data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stock = useMemo(() => {
    const map = new Map<string, number>();
    for (const batch of batches) map.set(batch.inventory_item_id, (map.get(batch.inventory_item_id) || 0) + Number(batch.remaining_quantity || 0));
    return map;
  }, [batches]);

  const selected = recipes.find(recipe => recipe.id === recipeId);
  const requested = Math.max(0, Number(portions) || 0);
  const requirements: Requirement[] = useMemo(() => {
    if (!selected || !Number(selected.output_quantity) || requested <= 0) return [];
    return (selected.inventory_recipe_items || []).map(line => {
      const item = items.find(entry => entry.id === line.inventory_item_id);
      const id = item?.id || "";
      const required = Number(line.quantity) * requested / Number(selected.output_quantity);
      const available = id ? stock.get(id) || 0 : 0;
      return { id: line.inventory_item_id, name: line.inventory_items?.name || "Unknown ingredient", unit: line.unit, required, available, shortage: Math.max(0, required - available) };
    });
  }, [selected, requested, items, stock]);

  const runKitchenAction = async (action: string, preparationId?: string) => {
    setBusyAction(preparationId || action); setError(""); setNotice("");
    try {
      const payload: Record<string, unknown> = { action };
      if (preparationId) payload.preparation_id = preparationId;
      if (action === "kitchen_create") { payload.recipe_id = recipeId; payload.portions = requested; }
      const response = await fetch("/api/bigfoods-staff/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kitchen action failed");
      setNotice(action === "kitchen_create" ? "Preparation added to the kitchen queue." : action === "kitchen_start" ? "Preparation started and ingredients deducted from stock." : "Preparation marked as completed.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Kitchen action failed"); }
    finally { setBusyAction(""); }
  };

  const shortageCount = requirements.filter(line => line.shortage > 0).length;
  const inStockCount = items.filter(item => (stock.get(item.id) || 0) > Number(item.reorder_level)).length;

  return <StaffShell title="Kitchen" subtitle="Plan meal preparation against live inventory and recipe yields.">
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700"><ChefHat className="h-6 w-6"/></div><div><h3 className="font-semibold text-[#30261F]">Kitchen preparation planner</h3><p className="text-xs text-[#817367]">Scale a standard recipe to the number of portions you need.</p></div></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#E7DED4] bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Refresh stock</button>
      </div>
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E9E0D6] bg-white p-4"><p className="text-xs text-[#817367]">Inventory items</p><p className="mt-1 text-2xl font-bold">{items.length}</p></div>
        <div className="rounded-2xl border border-[#E9E0D6] bg-white p-4"><p className="text-xs text-[#817367]">Items above reorder level</p><p className="mt-1 text-2xl font-bold text-emerald-700">{inStockCount}</p></div>
        <div className="rounded-2xl border border-[#E9E0D6] bg-white p-4"><p className="text-xs text-[#817367]">Configured recipes</p><p className="mt-1 text-2xl font-bold">{recipes.length}</p></div>
      </div>
      <section className="rounded-2xl border border-[#E9E0D6] bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><Calculator className="h-5 w-5 text-orange-600"/><h3 className="font-semibold">Preparation requirements</h3></div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="text-xs font-semibold text-[#65584D]">Meal / recipe
            <select className="mt-1 w-full rounded-xl border border-[#E7DED4] bg-white px-3 py-3 text-sm" value={recipeId} onChange={e => setRecipeId(e.target.value)}>
              {recipes.length === 0 && <option value="">No recipes configured</option>}
              {recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.bigfoods_pos_items?.name || recipe.name} — {recipe.name} (v{recipe.version})</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#65584D]">Portions to prepare
            <input type="number" min="1" step="1" className="mt-1 w-full rounded-xl border border-[#E7DED4] bg-white px-3 py-3 text-sm" value={portions} onChange={e => setPortions(e.target.value)}/>
          </label>
        </div>
        {selected && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">Recipe baseline: {fmt(Number(selected.output_quantity))} {selected.output_unit}. Requirements below are scaled by {fmt(requested / Number(selected.output_quantity || 1))}× for {fmt(requested)} portions.</div>}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-[#FAF8F6] text-[#817367]"><tr><th className="px-3 py-3">Ingredient / material</th><th className="px-3 py-3">Required</th><th className="px-3 py-3">Available stock</th><th className="px-3 py-3">Shortage</th><th className="px-3 py-3">Status</th></tr></thead>
            <tbody>{requirements.map((line, index) => <tr key={line.id || index} className="border-t border-[#F1EEEB]"><td className="px-3 py-3 font-semibold">{line.name}</td><td className="px-3 py-3">{fmt(line.required)} {line.unit}</td><td className="px-3 py-3">{fmt(line.available)} {line.unit}</td><td className={`px-3 py-3 font-semibold ${line.shortage > 0 ? "text-rose-700" : "text-emerald-700"}`}>{fmt(line.shortage)} {line.unit}</td><td className="px-3 py-3">{line.shortage > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-rose-700"><AlertTriangle className="h-3 w-3"/>Short</span> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"><CheckCircle2 className="h-3 w-3"/>Available</span>}</td></tr>)}</tbody>
          </table>
          {!loading && selected && requirements.length === 0 && <p className="py-8 text-center text-sm text-[#817367]">This recipe has no ingredient lines yet. Add ingredients in Inventory → Workflows.</p>}
          {!loading && !selected && <div className="py-8 text-center text-sm text-[#817367]"><Boxes className="mx-auto mb-2 h-6 w-6"/>No active menu recipes found. Configure a recipe in Inventory → Workflows first.</div>}
        </div>
        {selected && requirements.length > 0 && <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${shortageCount ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{shortageCount ? `${shortageCount} ingredient(s) are short. Do not begin preparation until stock is received or the plan is adjusted.` : "All recipe ingredients are currently available for this preparation plan."}</div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-[#94877B]">Queueing does not deduct stock. Ingredients are deducted once, atomically, when preparation starts.</p><button onClick={() => void runKitchenAction("kitchen_create")} disabled={!!busyAction || !selected || requested <= 0 || requirements.length === 0 || shortageCount > 0} className="rounded-xl bg-[#E66A19] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busyAction === "kitchen_create" ? "Adding…" : "Add to kitchen queue"}</button></div>
      </section>
      <section className="rounded-2xl border border-[#E9E0D6] bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Preparation queue</h3><p className="mt-1 text-xs text-[#817367]">Start queued work or complete meals already in progress.</p></div><span className="rounded-full bg-[#F7F1EA] px-3 py-1 text-xs font-semibold">{queue.length} records</span></div>
        <div className="space-y-3">{queue.map(prep => <div key={prep.id} className="flex flex-col gap-3 rounded-xl border border-[#F0E8E0] p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{prep.prep_code}</b><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${prep.status==="completed"?"bg-emerald-50 text-emerald-700":prep.status==="in_progress"?"bg-sky-50 text-sky-700":"bg-amber-50 text-amber-800"}`}>{prep.status.replaceAll("_"," ")}</span></div><p className="mt-1 text-xs text-[#65584D]">{prep.recipe_name} · {fmt(Number(prep.requested_portions))} portions · recipe v{prep.recipe_version}</p><p className="mt-1 text-[10px] text-[#94877B]">{new Date(prep.requested_at).toLocaleString("en-NG")}</p></div><div className="flex gap-2">{prep.status==="queued" && <button onClick={()=>void runKitchenAction("kitchen_start",prep.id)} disabled={!!busyAction} className="rounded-lg bg-[#E66A19] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busyAction===prep.id?"Starting…":"Start preparation"}</button>}{prep.status==="in_progress" && <button onClick={()=>void runKitchenAction("kitchen_finish",prep.id)} disabled={!!busyAction} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busyAction===prep.id?"Saving…":"Mark completed"}</button>}</div></div>)}{!queue.length && <p className="py-8 text-center text-sm text-[#817367]">No kitchen preparations yet. Create a plan above to populate the queue.</p>}</div>
      </section>
    </div>
  </StaffShell>;
}
