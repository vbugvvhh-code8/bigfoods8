"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import { ChefHat, RefreshCw, AlertTriangle, CheckCircle2, Boxes, Calculator } from "lucide-react";

type StockItem = { id: string; name: string; base_unit: string; reorder_level: number };
type RecipeLine = { quantity: number; unit: string; inventory_items?: { name: string; base_unit: string } | null };
type Recipe = { id: string; bigfoods_pos_item_id: string; name: string; version: number; output_quantity: number; output_unit: string; bigfoods_pos_items?: { name: string } | null; inventory_recipe_items?: RecipeLine[] };
type Batch = { inventory_item_id: string; remaining_quantity: number; status: string; expires_at: string | null };
type Requirement = { id: string; name: string; unit: string; required: number; available: number; shortage: number };

const fmt = (n: number) => new Intl.NumberFormat("en-NG", { maximumFractionDigits: 3 }).format(n);

export default function StaffKitchenPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [portions, setPortions] = useState("10");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/bigfoods-staff/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "kitchen_overview" }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load kitchen data");
      setItems(data.items || []); setBatches(data.batches || []); setRecipes(data.recipes || []);
      setRecipeId((current: string) => current || data.recipes?.[0]?.id || "");
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
      const item = items.find(entry => entry.name === line.inventory_items?.name);
      const id = item?.id || "";
      const required = Number(line.quantity) * requested / Number(selected.output_quantity);
      const available = id ? stock.get(id) || 0 : 0;
      return { id, name: line.inventory_items?.name || "Unknown ingredient", unit: line.unit, required, available, shortage: Math.max(0, required - available) };
    });
  }, [selected, requested, items, stock]);

  const shortageCount = requirements.filter(line => line.shortage > 0).length;
  const inStockCount = items.filter(item => (stock.get(item.id) || 0) > Number(item.reorder_level)).length;

  return <StaffShell title="Kitchen" subtitle="Plan meal preparation against live inventory and recipe yields.">
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700"><ChefHat className="h-6 w-6"/></div><div><h3 className="font-semibold text-[#30261F]">Kitchen preparation planner</h3><p className="text-xs text-[#817367]">Scale a standard recipe to the number of portions you need.</p></div></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#E7DED4] bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Refresh stock</button>
      </div>
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
        <p className="mt-3 text-[11px] text-[#94877B]">This planner is read-only: checking quantities does not reserve or deduct stock. Preparation queue, stock reservation and completion controls will be added after the transactional consumption workflow is in place.</p>
      </section>
    </div>
  </StaffShell>;
}
