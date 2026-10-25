"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, RefreshCw, ShoppingBag, ShieldCheck, LogOut, UtensilsCrossed } from "lucide-react";
import StaffShell from "@/components/staff/StaffShell";

type Staff = { id: string; email: string; display_name: string; role: string; permissions: unknown; must_change_password: boolean };
type Product = { id: string; name: string; category: string; subcategory: string | null; selling_price: number; image_url: string | null; image_urls?: string[] | null; is_available: boolean; sku?: string | null; option_groups?: { id: string; name: string; required: boolean; selection_type: "single" | "multiple"; options: { id: string; name: string; price: number }[] }[] };
type CartLine = { key: string; product: Product; quantity: number };

const money = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

export default function StaffPosPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const sessionRes = await fetch("/api/bigfoods-staff/session", { cache: "no-store" });
      const session = await sessionRes.json();
      if (!sessionRes.ok || !session.staff) { router.replace("/staff/login"); return; }
      setStaff(session.staff as Staff);
      if (session.staff.must_change_password) { router.replace("/staff/change-password"); return; }
      const permissions = session.staff.permissions;
      const allowed = ["owner", "admin", "cashier", "pos"].includes(session.staff.role) ||
        (Array.isArray(permissions) && (permissions.includes("pos.sell") || permissions.includes("pos.view")));
      if (!allowed) { setError("Your staff account does not have permission to use the POS. Ask an administrator to grant POS access."); return; }
      const res = await fetch("/api/bigfoods-staff/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pos_catalogue_overview" }), cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the BigFoods product catalogue.");
      setProducts((data.items ?? []).filter((p: Product) => p.is_available));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load the POS."); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b))], [products]);
  const visible = useMemo(() => products.filter(p => (category === "All" || p.category === category) &&
    [p.name, p.category, p.subcategory ?? "", p.sku ?? ""].join(" ").toLowerCase().includes(search.toLowerCase())), [products, category, search]);
  const total = cart.reduce((sum, line) => sum + Number(line.product.selling_price) * line.quantity, 0);
  function add(product: Product) {
    setNotice("");
    setCart(lines => {
      const found = lines.find(line => line.product.id === product.id);
      return found ? lines.map(line => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...lines, { key: product.id, product, quantity: 1 }];
    });
  }
  function changeQty(id: string, delta: number) {
    setCart(lines => lines.map(line => line.product.id === id ? { ...line, quantity: line.quantity + delta } : line).filter(line => line.quantity > 0));
  }
  async function signOut() {
    await fetch("/api/bigfoods-staff/session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/staff/login");
  }

  return <StaffShell title="Cashier POS" staffName={staff?.display_name ?? "Staff"} subtitle="In-person sales · BigFoods in-house catalogue">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><ShieldCheck size={15}/> Staff session protected</div>
      <div className="flex gap-2"><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#E8E0D8] bg-white px-3 py-2 text-sm font-semibold text-[#47382D]"><RefreshCw size={15} className={loading?"animate-spin":""}/> Refresh menu</button><button onClick={()=>void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-[#E8E0D8] bg-white px-3 py-2 text-sm font-semibold text-[#47382D]"><LogOut size={15}/> Sign out</button></div>
    </div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 rounded-2xl border border-[#E8E0D8] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#817367]" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search food, category or item code" className="w-full rounded-xl border border-[#E8E0D8] bg-white py-3 pl-10 pr-3 text-sm text-[#30261F] outline-none focus:border-orange-500" /></div>
          <span className="flex items-center text-xs text-[#817367]">{visible.length} products</span>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={"shrink-0 rounded-full px-4 py-2 text-sm font-semibold "+(category===c?"bg-[#E87524] text-white":"border border-[#E8E0D8] bg-white text-[#47382D]")}>{c}</button>)}</div>
        {loading ? <div className="grid min-h-48 place-items-center text-sm text-[#817367]">Loading BigFoods menu…</div> :
        visible.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">{visible.map(p=><button key={p.id} onClick={()=>add(p)} className="group overflow-hidden rounded-xl border border-[#E8E0D8] bg-white text-left transition hover:border-orange-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
          <div className="aspect-[4/3] overflow-hidden bg-[#FBF7F2]">{(p.image_urls?.[0] || p.image_url) ? <img src={p.image_urls?.[0] || p.image_url || ""} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]"/> : <div className="grid h-full place-items-center text-[#B6A89A]"><UtensilsCrossed size={28}/></div>}</div>
          <div className="p-3"><div className="line-clamp-2 min-h-10 text-sm font-semibold text-[#30261F]">{p.name}</div><div className="mt-1 text-xs text-[#817367]">{p.subcategory || p.category}</div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-sm font-bold text-[#30261F]">{money(Number(p.selling_price))}</span><span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-50 text-orange-700"><Plus size={16}/></span></div></div>
        </button>)}</div> : <div className="grid min-h-48 place-items-center text-center text-sm text-[#817367]"><div><ShoppingBag size={28} className="mx-auto mb-2"/>{products.length ? "No products match your search." : "No available BigFoods products yet. Ask an admin to publish a product in the POS catalogue."}</div></div>}
      </section>
      <aside className="rounded-2xl border border-[#E8E0D8] bg-white p-4 shadow-sm sm:p-5 xl:sticky xl:top-4">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#30261F]">Current order</h2><p className="mt-1 text-xs text-[#817367]">Items and total update as you add food.</p></div><span className="rounded-full bg-[#FBF0E6] px-2.5 py-1 text-xs font-bold text-[#9B4A17]">{cart.reduce((n,l)=>n+l.quantity,0)} items</span></div>
        {!cart.length ? <div className="my-5 rounded-xl border border-dashed border-[#E8E0D8] px-4 py-8 text-center text-sm text-[#817367]"><ShoppingBag size={25} className="mx-auto mb-2"/>Tap a product to add it to the order.</div> :
          <div className="my-4 max-h-[42vh] space-y-3 overflow-y-auto">{cart.map(line=><div key={line.key} className="flex gap-3 border-b border-[#F0E8E0] pb-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#30261F]">{line.product.name}</p><p className="mt-1 text-xs text-[#817367]">{money(Number(line.product.selling_price))} each</p><div className="mt-2 inline-flex items-center gap-3 rounded-lg border border-[#E8E0D8] p-1"><button onClick={()=>changeQty(line.product.id,-1)} aria-label={"Decrease "+line.product.name} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#FBF7F2]"><Minus size={14}/></button><span className="min-w-4 text-center text-sm font-semibold">{line.quantity}</span><button onClick={()=>changeQty(line.product.id,1)} aria-label={"Increase "+line.product.name} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#FBF7F2]"><Plus size={14}/></button></div></div><div className="text-right"><p className="text-sm font-bold text-[#30261F]">{money(Number(line.product.selling_price)*line.quantity)}</p><button onClick={()=>changeQty(line.product.id,-line.quantity)} aria-label={"Remove "+line.product.name} className="mt-2 text-[#A34B37]"><Trash2 size={15}/></button></div></div>)}</div>}
        <label className="mt-4 block text-xs font-semibold text-[#6E6257]">Customer email<input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="customer@example.com" className="mt-1.5 w-full rounded-xl border border-[#E8E0D8] px-3 py-2.5 text-sm text-[#30261F] outline-none focus:border-orange-500"/></label>
        <div className="mt-4 space-y-2 border-t border-[#E8E0D8] pt-4"><div className="flex justify-between text-sm text-[#6E6257]"><span>Subtotal</span><span>{money(total)}</span></div><div className="flex justify-between text-lg font-bold text-[#30261F]"><span>Total</span><span>{money(total)}</span></div></div>
        <button disabled={!cart.length || busy || loading} onClick={()=>setNotice("Cart is ready. Secure checkout is the next implementation step; no sale or payment has been created.")} className="mt-4 w-full rounded-xl bg-[#E87524] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#D96417] disabled:cursor-not-allowed disabled:opacity-50">{busy?"Processing…":"Proceed to payment"}</button>
        <button disabled={!cart.length} onClick={()=>{setCart([]);setCustomerEmail("");setNotice("");}} className="mt-2 w-full rounded-xl border border-[#E8E0D8] px-4 py-2.5 text-sm font-semibold text-[#47382D] disabled:opacity-50">Clear order</button>
        <p className="mt-3 text-[11px] leading-5 text-[#817367]">Payment is not taken by this screen yet. Checkout will be enabled only after server-side payment verification and duplicate-sale protection are connected.</p>
      </aside>
    </div>
  </StaffShell>;
}
