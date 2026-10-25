"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, Boxes, ClipboardList, PackagePlus, RefreshCw, Search, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/admin/layout/PageHeader";
import Link from "next/link";
import { CookingPot } from "lucide-react";
import getBrowserSupabase from "@/lib/supabase/client";

type Item = { id: string; name: string; sku: string | null; category: string; tracking_type: string; base_unit: string; reorder_level: number; is_perishable: boolean; is_active: boolean };
type Batch = { id: string; inventory_item_id: string; batch_code: string; supplier_name: string | null; received_quantity: number; remaining_quantity: number; base_unit: string; unit_cost: number | null; currency: string; received_at: string; expires_at: string | null; status: string };
type AlertRow = { id: string; title: string; alert_type: string; severity: string; status: string; created_at: string };
type Movement = { id: string; inventory_item_id: string; batch_id: string | null; movement_type: string; quantity: number; direction: string; base_unit: string; reason: string; occurred_at: string };
type Overview = { items: Item[]; batches: Batch[]; alerts: AlertRow[]; movements: Movement[] };

const initialItem = { name: "", sku: "", category: "ingredient", tracking_type: "weight", base_unit: "kg", reorder_level: "0", is_perishable: false, notes: "" };
const initialReceipt = { inventory_item_id: "", batch_code: "", quantity: "", unit: "", supplier_name: "", supplier_reference: "", unit_cost: "", currency: "NGN", expires_at: "", notes: "" };
const money = (value: number | null, currency = "NGN") => value == null ? "—" : new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "No expiry";

export default function InventoryPage() {
  const [overview, setOverview] = useState<Overview>({ items: [], batches: [], alerts: [], movements: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"stock" | "batches" | "movements" | "alerts">("stock");
  const [itemOpen, setItemOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [itemForm, setItemForm] = useState(initialItem);
  const [receiptForm, setReceiptForm] = useState(initialReceipt);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await getBrowserSupabase().auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const response = await fetch("/api/bigfoods-staff/inventory", { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Inventory request failed");
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await call({ action: "overview" });
      setOverview({ items: data.items ?? [], batches: data.batches ?? [], alerts: data.alerts ?? [], movements: data.movements ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load inventory");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { void load(); }, [load]);

  const filteredItems = useMemo(() => overview.items.filter((item) => [item.name, item.sku ?? "", item.category].join(" ").toLowerCase().includes(query.toLowerCase())), [overview.items, query]);
  const itemName = (id: string) => overview.items.find((item) => item.id === id)?.name ?? "Unknown item";
  const lowStock = overview.items.filter((item) => Number(item.reorder_level) > 0 && overview.batches.filter((batch) => batch.inventory_item_id === item.id && batch.status === "active").reduce((sum, batch) => sum + Number(batch.remaining_quantity), 0) <= Number(item.reorder_level)).length;
  const totalBatches = overview.batches.filter((batch) => batch.status === "active").length;

  async function createItem(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await call({ action: "item_create", ...itemForm, reorder_level: Number(itemForm.reorder_level) });
      setNotice("Inventory item created."); setItemForm(initialItem); setItemOpen(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create item"); }
    finally { setBusy(false); }
  }

  async function receiveStock(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await call({ action: "receive", ...receiptForm, quantity: Number(receiptForm.quantity), unit_cost: receiptForm.unit_cost === "" ? null : Number(receiptForm.unit_cost), expires_at: receiptForm.expires_at || null });
      setNotice("Receipt saved. Stock batch and audit movement were recorded together."); setReceiptForm(initialReceipt); setReceiptOpen(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to receive stock"); }
    finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-xl border border-[#E7DED4] bg-white px-3.5 py-2.5 text-sm text-[#30261F] outline-none transition focus:border-[#E87524] focus:ring-2 focus:ring-[#E87524]/15";
  const label = "block text-xs font-semibold tracking-wide text-[#6E6257]";
  const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E87524] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D96417] disabled:opacity-50";
  const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DED4] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#47382D] transition hover:bg-[#FBF7F2] disabled:opacity-50";

  return <main className="mx-auto max-w-7xl space-y-6 pb-10">
    <PageHeader title="Inventory management" subtitle="Track ingredients, stock receipts, batches and exceptions in one auditable ledger." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <button className={primary} onClick={() => { setError(""); setItemOpen(true); }}><PackagePlus size={16}/> Add item</button>
        <Link className={secondary} href="/admin/inventory/workflows"><CookingPot size={16}/> Waste & production</Link>
        <button className={secondary} onClick={() => { setError(""); setReceiptForm({ ...initialReceipt, inventory_item_id: overview.items[0]?.id ?? "", unit: overview.items[0]?.base_unit ?? "" }); setReceiptOpen(true); }} disabled={!overview.items.length}><ArrowDownToLine size={16}/> Receive stock</button>
      </div>
      <button className={secondary} onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>

    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle size={17} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Inventory items", value: overview.items.length, note: "Active and inactive catalogue", icon: Boxes },
        { label: "Active batches", value: totalBatches, note: "Receipts with stock remaining", icon: ArrowDownToLine },
        { label: "Below reorder level", value: lowStock, note: "Based on active batch balances", icon: ShieldAlert },
        { label: "Open alerts", value: overview.alerts.length, note: "Exceptions needing attention", icon: AlertTriangle }
      ].map((card) => <div key={card.label} className="rounded-2xl border border-[#E9E0D6] bg-white p-4 shadow-[0_2px_10px_rgba(58,39,23,0.035)]">
        <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-[#76695D]">{card.label}</span><span className="rounded-xl bg-[#FFF1E5] p-2 text-[#D96B1F]"><card.icon size={18}/></span></div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-[#30261F]">{loading ? "—" : card.value}</div><p className="mt-1 text-xs text-[#8A7C70]">{card.note}</p>
      </div>)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#E9E0D6] bg-white shadow-[0_2px_10px_rgba(58,39,23,0.035)]">
      <div className="flex flex-col gap-4 border-b border-[#EFE7DF] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-semibold text-[#30261F]">Inventory ledger</h2><p className="mt-1 text-sm text-[#817367]">Receipts are recorded with their stock movement as one database transaction.</p></div>
        <div className="relative w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96887B]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item or SKU" className="w-full rounded-xl border border-[#E7DED4] bg-[#FFFEFC] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#E87524]"/></div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#EFE7DF] px-3 pt-2">
        {([["stock","Stock catalogue"],["batches","Batches"],["movements","Movement history"],["alerts","Alerts"]] as const).map(([key, labelText]) => <button key={key} onClick={() => setTab(key)} className={"whitespace-nowrap rounded-t-lg px-3 py-2.5 text-sm font-semibold transition " + (tab === key ? "border-b-2 border-[#E87524] bg-[#FFF8F1] text-[#C85C16]" : "text-[#76695D] hover:bg-[#FBF7F2]")}>{labelText}</button>)}
      </div>
      {loading ? <div className="p-10 text-center text-sm text-[#817367]">Loading inventory…</div> : <>
        {tab === "stock" && <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#FBF7F2] text-xs uppercase tracking-wide text-[#827467]"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">On hand</th><th className="px-4 py-3">Reorder level</th><th className="px-4 py-3">Tracking</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#F0E8E0]">{filteredItems.map((item) => { const qty = overview.batches.filter((b) => b.inventory_item_id === item.id && b.status === "active").reduce((sum, b) => sum + Number(b.remaining_quantity), 0); const low = Number(item.reorder_level) > 0 && qty <= Number(item.reorder_level); return <tr key={item.id} className="hover:bg-[#FFFCF8]"><td className="px-4 py-3.5"><div className="font-semibold text-[#342920]">{item.name}</div><div className="mt-0.5 text-xs text-[#8A7C70]">{item.sku || "No SKU"}</div></td><td className="px-4 py-3.5 capitalize text-[#65574B]">{item.category}</td><td className="px-4 py-3.5 font-semibold tabular-nums text-[#342920]">{qty.toLocaleString("en-NG")} {item.base_unit}</td><td className="px-4 py-3.5 text-[#65574B]">{Number(item.reorder_level).toLocaleString("en-NG")} {item.base_unit}</td><td className="px-4 py-3.5 capitalize text-[#65574B]">{item.tracking_type}</td><td className="px-4 py-3.5"><span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (!item.is_active ? "bg-gray-100 text-gray-600" : low ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800")}>{!item.is_active ? "Inactive" : low ? "Reorder" : "In stock"}</span></td></tr>; })}{!filteredItems.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#8A7C70]">{query ? "No items match your search." : "No inventory items yet. Add your first item to get started."}</td></tr>}</tbody></table></div>}
        {tab === "batches" && <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#FBF7F2] text-xs uppercase tracking-wide text-[#827467]"><tr><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Unit cost</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#F0E8E0]">{overview.batches.filter((b) => (b.batch_code+" "+itemName(b.inventory_item_id)+" "+(b.supplier_name ?? "")).toLowerCase().includes(query.toLowerCase())).map((b) => <tr key={b.id}><td className="px-4 py-3.5 font-semibold text-[#342920]">{b.batch_code}<div className="mt-0.5 text-xs font-normal text-[#8A7C70]">Received {date(b.received_at)}</div></td><td className="px-4 py-3.5">{itemName(b.inventory_item_id)}</td><td className="px-4 py-3.5">{b.supplier_name || "—"}</td><td className="px-4 py-3.5 font-semibold">{Number(b.remaining_quantity).toLocaleString("en-NG")} {b.base_unit}</td><td className="px-4 py-3.5">{money(b.unit_cost,b.currency)}</td><td className="px-4 py-3.5">{date(b.expires_at)}</td><td className="px-4 py-3.5 capitalize">{b.status}</td></tr>)}{!overview.batches.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-[#8A7C70]">No receipts recorded yet.</td></tr>}</tbody></table></div>}
        {tab === "movements" && <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#FBF7F2] text-xs uppercase tracking-wide text-[#827467]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Batch</th></tr></thead><tbody className="divide-y divide-[#F0E8E0]">{overview.movements.filter((m) => (m.reason+" "+m.movement_type+" "+itemName(m.inventory_item_id)).toLowerCase().includes(query.toLowerCase())).map((m) => <tr key={m.id}><td className="px-4 py-3.5">{new Date(m.occurred_at).toLocaleString("en-NG")}</td><td className="px-4 py-3.5 font-medium">{itemName(m.inventory_item_id)}</td><td className="px-4 py-3.5 capitalize">{m.movement_type.replaceAll("_"," ")}</td><td className={"px-4 py-3.5 font-semibold tabular-nums " + (m.direction === "in" ? "text-emerald-700" : "text-rose-700")}>{m.direction === "in" ? "+" : "−"}{Number(m.quantity).toLocaleString("en-NG")} {m.base_unit}</td><td className="px-4 py-3.5">{m.reason}</td><td className="px-4 py-3.5">{overview.batches.find((b) => b.id === m.batch_id)?.batch_code ?? "—"}</td></tr>)}{!overview.movements.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8A7C70]">No movements recorded yet.</td></tr>}</tbody></table></div>}
        {tab === "alerts" && <div className="divide-y divide-[#F0E8E0]">{overview.alerts.map((a) => <div key={a.id} className="flex items-start gap-3 p-4"><span className={"mt-0.5 rounded-lg p-2 " + (a.severity === "critical" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}><AlertTriangle size={17}/></span><div className="min-w-0 flex-1"><div className="font-semibold text-[#342920]">{a.title}</div><div className="mt-1 text-xs capitalize text-[#827467]">{a.alert_type.replaceAll("_"," ")} · {a.severity} · {date(a.created_at)}</div></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-800">{a.status}</span></div>)}{!overview.alerts.length && <div className="p-10 text-center text-sm text-[#8A7C70]">No open alerts. Low-stock summaries are shown above.</div>}</div>}
      </>}
    </section>

    {itemOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21180F]/45 p-3 sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setItemOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="new-item-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-[#FFFCF8] p-5 shadow-2xl sm:p-6"><div className="mb-5"><h2 id="new-item-title" className="text-lg font-semibold text-[#30261F]">Add inventory item</h2><p className="mt-1 text-sm text-[#817367]">Set the base unit used for every receipt and movement.</p></div><form onSubmit={createItem} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className={label}>Item name<input required maxLength={160} className={field} value={itemForm.name} onChange={(e) => setItemForm({...itemForm,name:e.target.value})} placeholder="e.g. Long grain rice"/></label><label className={label}>SKU (optional)<input maxLength={80} className={field} value={itemForm.sku} onChange={(e) => setItemForm({...itemForm,sku:e.target.value})} placeholder="e.g. ING-RICE-001"/></label><label className={label}>Category<input required maxLength={80} className={field} value={itemForm.category} onChange={(e) => setItemForm({...itemForm,category:e.target.value})}/></label><label className={label}>Tracking type<select className={field} value={itemForm.tracking_type} onChange={(e) => setItemForm({...itemForm,tracking_type:e.target.value})}><option value="weight">Weight</option><option value="volume">Volume</option><option value="count">Count</option></select></label><label className={label}>Base unit<input required maxLength={24} className={field} value={itemForm.base_unit} onChange={(e) => setItemForm({...itemForm,base_unit:e.target.value})} placeholder="kg, L, pcs"/></label><label className={label}>Reorder level<input required type="number" min="0" step="0.0001" className={field} value={itemForm.reorder_level} onChange={(e) => setItemForm({...itemForm,reorder_level:e.target.value})}/></label></div><label className="flex items-center gap-2 text-sm text-[#57483C]"><input type="checkbox" checked={itemForm.is_perishable} onChange={(e) => setItemForm({...itemForm,is_perishable:e.target.checked})} className="accent-[#E87524]"/> Perishable item (track expiry)</label><label className={label}>Notes<textarea rows={2} className={field} value={itemForm.notes} onChange={(e) => setItemForm({...itemForm,notes:e.target.value})}/></label><div className="flex justify-end gap-2 border-t border-[#EFE7DF] pt-4"><button type="button" className={secondary} onClick={() => setItemOpen(false)} disabled={busy}>Cancel</button><button className={primary} disabled={busy}>{busy ? "Saving…" : "Create item"}</button></div></form></section></div>}

    {receiptOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21180F]/45 p-3 sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setReceiptOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="receive-stock-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#FFFCF8] p-5 shadow-2xl sm:p-6"><div className="mb-5"><h2 id="receive-stock-title" className="text-lg font-semibold text-[#30261F]">Receive stock</h2><p className="mt-1 text-sm text-[#817367]">A batch and its audit movement are saved atomically; failed receipts do not partially update stock.</p></div><form onSubmit={receiveStock} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className={label}>Inventory item<select required className={field} value={receiptForm.inventory_item_id} onChange={(e) => { const item=overview.items.find((x)=>x.id===e.target.value); setReceiptForm({...receiptForm,inventory_item_id:e.target.value,unit:item?.base_unit??""}); }}><option value="">Choose item</option>{overview.items.filter((x)=>x.is_active).map((x)=><option key={x.id} value={x.id}>{x.name} ({x.base_unit})</option>)}</select></label><label className={label}>Batch code<input required maxLength={100} className={field} value={receiptForm.batch_code} onChange={(e) => setReceiptForm({...receiptForm,batch_code:e.target.value})} placeholder="e.g. RCPT-2026-001"/></label><label className={label}>Quantity<input required type="number" min="0.0001" step="0.0001" className={field} value={receiptForm.quantity} onChange={(e) => setReceiptForm({...receiptForm,quantity:e.target.value})}/></label><label className={label}>Unit<input required readOnly className={field+" bg-[#F7F1EA]"} value={receiptForm.unit} /></label><label className={label}>Supplier name<input maxLength={160} className={field} value={receiptForm.supplier_name} onChange={(e) => setReceiptForm({...receiptForm,supplier_name:e.target.value})}/></label><label className={label}>Supplier invoice/reference<input maxLength={120} className={field} value={receiptForm.supplier_reference} onChange={(e) => setReceiptForm({...receiptForm,supplier_reference:e.target.value})}/></label><label className={label}>Unit cost (optional)<input type="number" min="0" step="0.0001" className={field} value={receiptForm.unit_cost} onChange={(e) => setReceiptForm({...receiptForm,unit_cost:e.target.value})} placeholder="0.00"/></label><label className={label}>Currency<select className={field} value={receiptForm.currency} onChange={(e) => setReceiptForm({...receiptForm,currency:e.target.value})}><option value="NGN">NGN — Naira</option><option value="USD">USD — US dollar</option><option value="GBP">GBP — Pound sterling</option></select></label><label className={label}>Expiry date (optional)<input type="date" className={field} value={receiptForm.expires_at} onChange={(e) => setReceiptForm({...receiptForm,expires_at:e.target.value})}/></label></div><label className={label}>Notes<textarea rows={2} className={field} value={receiptForm.notes} onChange={(e) => setReceiptForm({...receiptForm,notes:e.target.value})}/></label><div className="flex justify-end gap-2 border-t border-[#EFE7DF] pt-4"><button type="button" className={secondary} onClick={() => setReceiptOpen(false)} disabled={busy}>Cancel</button><button className={primary} disabled={busy || !overview.items.some((x)=>x.id===receiptForm.inventory_item_id)}>{busy ? "Saving receipt…" : "Confirm receipt"}</button></div></form></section></div>}
  </main>;
}
