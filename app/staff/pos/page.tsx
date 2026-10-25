"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, RefreshCw, ShoppingBag, LogOut, UtensilsCrossed, LayoutGrid, ClipboardList, Package, Users, ChartNoAxesColumn, FileText, Settings, UserRound, Headphones, CheckCircle2 } from "lucide-react";

type Staff = { id: string; email: string; display_name: string; role: string; permissions: unknown; must_change_password: boolean };
type Product = { id: string; name: string; sold_count?: number; category: string; subcategory: string | null; selling_price: number; image_url: string | null; image_urls?: string[] | null; is_available: boolean; sku?: string | null; sort_order?: number; promotional_price?: number | null; promotion_starts_at?: string | null; promotion_ends_at?: string | null; complementary_item_ids?: string[] | null };
type CartLine = { key: string; product: Product; quantity: number };
type SaleReceipt = { id: string; receipt_number: string; total_amount: number; payment_method: "cash" | "moniepoint_pos"; status: string; cash_received: number | null; change_due: number; created_at: string };
const money = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
function activePrice(p: Product) {
  const now = Date.now();
  const starts = p.promotion_starts_at ? new Date(p.promotion_starts_at).getTime() : null;
  const ends = p.promotion_ends_at ? new Date(p.promotion_ends_at).getTime() : null;
  return p.promotional_price != null && (!starts || starts <= now) && (!ends || ends >= now) ? Number(p.promotional_price) : Number(p.selling_price);
}

export default function StaffPosPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [subcategory, setSubcategory] = useState("All");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "moniepoint_pos">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [terminalConfirmed, setTerminalConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [walkIn, setWalkIn] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setAuthorized(false);
    try {
      const sessionRes = await fetch("/api/bigfoods-staff/session", { cache: "no-store" });
      const session = await sessionRes.json();
      if (!sessionRes.ok || !session.staff) { router.replace("/staff/login"); return; }
      setStaff(session.staff as Staff);
      if (session.staff.must_change_password) { router.replace("/staff/change-password"); return; }
      const permissions = session.staff.permissions;
      const allowed = ["owner", "admin", "pos"].includes(String(session.staff.role).toLowerCase()) ||
        (Array.isArray(permissions) && (permissions.includes("pos.sell") || permissions.includes("pos.view")));
      if (!allowed) { setError("POS access is restricted. Your account needs the POS role or an explicit POS permission."); return; }
      setAuthorized(true);
      const res = await fetch("/api/bigfoods-staff/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pos_catalogue_overview" }), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the BigFoods product catalogue.");
      setProducts((data.items ?? []).filter((p: Product) => p.is_available));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load the POS."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b))], [products]);
  const subcategories = useMemo(() => ["All", ...Array.from(new Set(products.filter(p => category === "All" || p.category === category).map(p => p.subcategory).filter((x): x is string => Boolean(x)))).sort((a,b)=>a.localeCompare(b))], [products, category]);
  const visible = useMemo(() => products.filter(p => (category === "All" || p.category === category) && (subcategory === "All" || p.subcategory === subcategory) &&
    [p.name, p.category, p.subcategory ?? "", p.sku ?? ""].join(" ").toLowerCase().includes(search.toLowerCase())), [products, category, subcategory, search]);
  const popular = useMemo(() => [...products].sort((a,b)=>Number(b.sold_count ?? 0)-Number(a.sold_count ?? 0) || Number(b.sort_order ?? 0)-Number(a.sort_order ?? 0)).slice(0,6), [products]);
  const recommendations = useMemo(() => {
    const ids = new Set(cart.flatMap(line => line.product.complementary_item_ids ?? []));
    return products.filter(p => ids.has(p.id) && !cart.some(line => line.product.id === p.id)).slice(0,4);
  }, [cart, products]);
  const total = cart.reduce((sum, line) => sum + activePrice(line.product) * line.quantity, 0);
  const itemCount = cart.reduce((n,line)=>n+line.quantity,0);

  function add(product: Product) { setNotice(""); setReceipt(null); setCart(lines => { const found=lines.find(line=>line.product.id===product.id); return found ? lines.map(line=>line.product.id===product.id?{...line,quantity:line.quantity+1}:line) : [...lines,{key:product.id,product,quantity:1}]; }); }
  function changeQty(id: string, delta: number) { setCart(lines => lines.map(line=>line.product.id===id?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0)); }
  async function signOut() { await fetch("/api/bigfoods-staff/session",{method:"DELETE"}).catch(()=>undefined); router.replace("/staff/login"); }

  async function checkout() {
    if (!cart.length || busy) return;
    if (paymentMethod === "moniepoint_pos" && !terminalConfirmed) { setError("Confirm that the physical Moniepoint terminal shows a successful payment."); return; }
    setBusy(true); setError(""); setNotice(""); setReceipt(null);
    try {
      const response = await fetch("/api/bigfoods-staff/inventory", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        action:"pos_sale_create", idempotency_key:crypto.randomUUID(), payment_method:paymentMethod,
        terminal_confirmed:paymentMethod==="moniepoint_pos" ? terminalConfirmed : false,
        cash_received:paymentMethod==="cash"?Number(cashReceived):null, customer_email:customerEmail.trim(),
        items:cart.map(line=>({product_id:line.product.id,quantity:line.quantity}))
      }), cache:"no-store" });
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Unable to record sale.");
      setReceipt(data.sale as SaleReceipt); setCart([]); setCustomerEmail(""); setCashReceived(""); setTerminalConfirmed(false);
      setNotice(data.duplicate?"This checkout was already recorded. No duplicate sale was created.":"Sale recorded successfully.");
    } catch(e) { setError(e instanceof Error?e.message:"Unable to record sale."); }
    finally { setBusy(false); }
  }

  const nav = [
    { label:"POS", icon:LayoutGrid, active:true, click:()=>{} },
    { label:"Orders", icon:ClipboardList, click:()=>router.push("/staff/pos/orders") },
    { label:"Menu", icon:UtensilsCrossed, click:()=>router.push("/staff/pos-catalogue") },
    { label:"Inventory", icon:Package, click:()=>router.push("/staff/inventory") },
    { label:"Customers", icon:Users, click:()=>setNotice("Customer management is not connected to cashier POS yet.") },
    { label:"Analytics", icon:ChartNoAxesColumn, click:()=>router.push("/staff/pos/analytics") },
    { label:"Settings", icon:Settings, click:()=>router.push("/staff/settings") },
  ];

  if (!staff || !authorized) return <main className="grid min-h-screen place-items-center bg-[#F7F4F0] p-6"><div className="max-w-md rounded-2xl border border-[#E8E0D8] bg-white p-6 text-center shadow-sm"><h1 className="text-lg font-bold text-[#30261F]">{loading ? "Checking POS access…" : "POS access restricted"}</h1><p className="mt-2 text-sm leading-6 text-[#81766D]">{error || "Verifying your secure staff session…"}</p><button onClick={() => router.replace("/staff")} className="mt-4 rounded-xl bg-[#F47721] px-4 py-2.5 text-sm font-semibold text-white">Return to staff dashboard</button></div></main>;

  return <main className="min-h-screen bg-[#F6F7F8] text-[#171923]">
    <div className="flex min-h-screen">
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-[#322721] bg-[#211A17] px-3.5 py-5 text-[#D8D2CB] lg:flex">
        <div className="mb-7"><div className="flex items-center gap-2 px-1.5"><span className="h-[18px] w-[18px] shrink-0 rounded-[5px] bg-[#FF6A00]"/><span className="text-[14px] font-semibold tracking-tight text-white">BigFoods</span></div><p className="mt-2 px-1.5 text-[10px] uppercase tracking-widest text-[#9C948A]">Staff Workspace</p></div>
        <nav className="space-y-0.5">{nav.map(({label,icon:Icon,active,click})=><button key={label} onClick={click} className={"flex w-full items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2.5 text-left text-[12.5px] font-medium "+(active?"border-[#FF6A00] bg-white/10 text-white":"border-transparent text-[#B8B0A8] hover:bg-white/[.06] hover:text-white") }><Icon size={19}/>{label}</button>)}</nav>
        <div className="mt-auto border-t border-white/[.08] pt-3 text-xs text-[#B8B0A8]"><Headphones size={18} className="mb-2"/>Need help?<br/>Contact support</div>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-[76px] flex-wrap items-center gap-3 border-b border-[#E7E9ED] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A4]" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for items (e.g. jollof, burger, coke...)" className="w-full rounded-xl border border-[#E2E5E9] bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-orange-400"/></div>
          <button onClick={()=>{setWalkIn(true);setCustomerEmail("");}} className="hidden items-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-3 text-sm font-medium sm:flex"><UserRound size={17}/> {walkIn?"Walk-in Customer":"Customer selected"}</button>
          <button aria-label="Refresh catalogue" onClick={()=>void load()} className="rounded-xl border border-[#E2E5E9] p-3 text-[#5D6470]"><RefreshCw size={17}/></button>
          <div className="flex items-center gap-2 pl-1"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#E9EDF2] text-[#687383]"><UserRound size={21}/></div><div className="hidden sm:block"><p className="text-sm font-semibold">{staff?.display_name??"Staff"}</p><p className="text-xs text-[#737B87] capitalize">{staff?.role??"Cashier"}</p></div><button onClick={()=>void signOut()} aria-label="Sign out" className="rounded-lg p-2 text-[#737B87]"><LogOut size={17}/></button></div>
        </header>
        <div className="grid min-w-0 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(390px,470px)]">
          <div className="min-w-0 space-y-7 p-4 md:p-6">
            {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}
            <section>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Most Ordered</h2><span className="text-xs text-[#6F7783]">Quick add</span></div>
              {loading?<p className="py-8 text-sm text-[#737B87]">Loading menu…</p>:<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">{popular.map(p=><button key={p.id} onClick={()=>add(p)} className="overflow-hidden rounded-xl border border-[#E6E8EC] bg-white text-left transition hover:border-orange-300 hover:shadow-sm"><div className="relative aspect-square bg-[#F0F1F3]">{(p.image_urls?.[0]||p.image_url)?<img src={p.image_urls?.[0]||p.image_url||""} alt={p.name} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-[#A6ADB7]"><UtensilsCrossed size={25}/></div>}<span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-[#F47721] text-white shadow"><Plus size={17}/></span></div><div className="p-2"><p className="line-clamp-2 min-h-9 text-xs font-semibold">{p.name}</p><p className="mt-1 text-xs font-bold">{money(activePrice(p))}</p></div></button>)}</div>}
            </section>
            <section>
              <h2 className="mb-3 text-base font-bold">Categories</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">{categories.map((c,i)=><button key={c} onClick={()=>{setCategory(c);setSubcategory("All");}} className={"flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold "+(category===c?"border-[#F47721] bg-[#F47721] text-white":"border-[#E6E8EC] bg-white text-[#59616D] hover:border-orange-300")}><UtensilsCrossed size={20}/>{c}</button>)}</div>
            </section>
            <section>
              <h2 className="mb-3 text-base font-bold">Subcategories</h2>
              <div className="flex gap-2 overflow-x-auto pb-1">{subcategories.map(c=><button key={c} onClick={()=>setSubcategory(c)} className={"shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold "+(subcategory===c?"bg-[#F47721] text-white":"border border-[#E6E8EC] bg-white text-[#59616D]")}>{c==="All"?"All "+(category==="All"?"items":category):c}</button>)}</div>
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Menu Items</h2><span className="text-xs text-[#737B87]">{visible.length} items</span></div>
              {visible.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">{visible.map(p=><article key={p.id} className="overflow-hidden rounded-xl border border-[#E6E8EC] bg-white"><div className="aspect-square bg-[#F0F1F3]">{(p.image_urls?.[0]||p.image_url)?<img src={p.image_urls?.[0]||p.image_url||""} alt={p.name} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-[#A6ADB7]"><UtensilsCrossed size={26}/></div>}</div><div className="p-3"><p className="line-clamp-2 min-h-10 text-sm font-semibold">{p.name}</p><p className="mt-1 text-xs text-[#737B87]">{p.subcategory||p.category}</p><div className="mt-3 flex items-center justify-between gap-2"><div>{p.promotional_price!=null&&activePrice(p)<Number(p.selling_price)&&<p className="text-[10px] text-[#9BA1AA] line-through">{money(Number(p.selling_price))}</p>}<p className="text-sm font-bold">{money(activePrice(p))}</p></div><button onClick={()=>add(p)} className="rounded-lg bg-[#F47721] px-3 py-2 text-xs font-bold text-white hover:bg-[#E96818]">Add</button></div></div></article>)}</div>:<div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-[#DDE1E6] bg-white text-sm text-[#737B87]">{loading?"Loading products…":"No available products match this selection."}</div>}
            </section>
          </div>
          <aside className="border-t border-[#E7E9ED] bg-white p-4 md:p-6 xl:min-h-[calc(100vh-76px)] xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between"><div><h2 className="text-base font-bold">Current Order ({itemCount} items)</h2><p className="mt-1 text-xs text-[#737B87]">Review quantities before taking payment.</p></div><button onClick={()=>{setCart([]);setCustomerEmail("");setCashReceived("");setTerminalConfirmed(false);setError("");setNotice("");}} disabled={!cart.length||busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF0F0] px-3 py-2 text-xs font-semibold text-[#C43D3D] disabled:opacity-40"><Trash2 size={14}/> Clear</button></div>
            {!cart.length?<div className="my-5 rounded-xl border border-dashed border-[#E2E5E9] px-4 py-8 text-center text-sm text-[#737B87]"><ShoppingBag size={25} className="mx-auto mb-2"/>Add a food item to start the order.</div>:<div className="my-4 max-h-[32vh] space-y-3 overflow-y-auto">{cart.map(line=><div key={line.key} className="flex gap-3 border-b border-[#EFF0F2] pb-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F0F1F3]">{(line.product.image_urls?.[0]||line.product.image_url)&&<img src={line.product.image_urls?.[0]||line.product.image_url||""} alt="" className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{line.product.name}</p><div className="mt-2 inline-flex items-center gap-3 rounded-lg border border-[#E2E5E9] p-1"><button onClick={()=>changeQty(line.product.id,-1)} aria-label={"Decrease "+line.product.name} className="grid h-6 w-6 place-items-center"><Minus size={13}/></button><span className="min-w-4 text-center text-xs font-semibold">{line.quantity}</span><button onClick={()=>changeQty(line.product.id,1)} aria-label={"Increase "+line.product.name} className="grid h-6 w-6 place-items-center"><Plus size={13}/></button></div></div><div className="text-right"><p className="text-xs font-bold">{money(activePrice(line.product)*line.quantity)}</p><button onClick={()=>changeQty(line.product.id,-line.quantity)} aria-label={"Remove "+line.product.name} className="mt-2 text-[#C43D3D]"><Trash2 size={14}/></button></div></div>)}</div>}
            {recommendations.length>0&&<div className="mb-4 rounded-xl bg-[#FFF7F1] p-3"><p className="mb-2 text-xs font-bold">Recommended with this order</p><div className="space-y-2">{recommendations.map(p=><button key={p.id} onClick={()=>add(p)} className="flex w-full items-center justify-between gap-2 text-left text-xs"><span>{p.name}</span><span className="font-bold text-[#E96818]">+ {money(activePrice(p))}</span></button>)}</div></div>}
            <div className="border-t border-[#E7E9ED] pt-4"><h3 className="text-sm font-bold">Customer Details</h3><label className="mt-2 block text-xs text-[#737B87]">Email address (optional for walk-in)<input type="email" value={customerEmail} onChange={e=>{setCustomerEmail(e.target.value);setWalkIn(!e.target.value);}} placeholder="customer@example.com" className="mt-1.5 w-full rounded-lg border border-[#E2E5E9] px-3 py-2.5 text-sm text-[#171923] outline-none focus:border-orange-400"/></label><button onClick={()=>{setWalkIn(v=>!v);if(!walkIn)setCustomerEmail("");}} className="mt-2 text-xs font-semibold text-[#E96818]">{walkIn?"+ Add customer email":"Use walk-in customer"}</button></div>
            <div className="mt-4 border-t border-[#E7E9ED] pt-4"><h3 className="text-sm font-bold">Payment Method</h3><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>{setPaymentMethod("cash");setTerminalConfirmed(false);}} className={"rounded-xl border px-3 py-3 text-xs font-semibold "+(paymentMethod==="cash"?"border-[#F47721] bg-[#FFF3EA] text-[#D95D12]":"border-[#E2E5E9] text-[#59616D]")}>Cash</button><button type="button" onClick={()=>{setPaymentMethod("moniepoint_pos");setTerminalConfirmed(false);}} className={"rounded-xl border px-3 py-3 text-xs font-semibold "+(paymentMethod==="moniepoint_pos"?"border-[#F47721] bg-[#FFF3EA] text-[#D95D12]":"border-[#E2E5E9] text-[#59616D]")}>Moniepoint POS</button></div>
              {paymentMethod==="cash"?<label className="mt-3 block text-xs text-[#737B87]">Cash received<input type="number" min={total} step="1" value={cashReceived} onChange={e=>setCashReceived(e.target.value)} placeholder={String(total)} className="mt-1.5 w-full rounded-lg border border-[#E2E5E9] px-3 py-2.5 text-sm text-[#171923] outline-none focus:border-orange-400"/></label>:<label className="mt-3 flex items-start gap-2 rounded-lg bg-[#F7F8FA] p-3 text-xs leading-5 text-[#59616D]"><input type="checkbox" checked={terminalConfirmed} onChange={e=>setTerminalConfirmed(e.target.checked)} className="mt-0.5 accent-orange-500"/><span>I have checked the physical Moniepoint terminal and confirmed the payment succeeded.</span></label>}
              {paymentMethod==="cash"&&Number(cashReceived)>=total&&total>0&&<div className="mt-2 flex justify-between text-xs font-semibold text-emerald-700"><span>Change due</span><span>{money(Number(cashReceived)-total)}</span></div>}
            </div>
            <div className="mt-4 space-y-2 border-t border-[#E7E9ED] pt-4"><div className="flex justify-between text-xs text-[#737B87]"><span>Subtotal</span><span>{money(total)}</span></div><div className="flex justify-between rounded-lg bg-[#FFF0E7] px-3 py-3 text-lg font-extrabold text-[#D95D12]"><span>Total</span><span>{money(total)}</span></div></div>
            <button disabled={!cart.length||busy||loading||(paymentMethod==="cash"&&(!cashReceived||Number(cashReceived)<total))||(paymentMethod==="moniepoint_pos"&&!terminalConfirmed)} onClick={()=>void checkout()} className="mt-4 w-full rounded-xl bg-[#F47721] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#E96818] disabled:cursor-not-allowed disabled:opacity-50">{busy?"Saving sale…":paymentMethod==="cash"?"Complete Cash Sale":"Confirm Moniepoint Payment"}</button>
            {receipt&&<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={17}/> Receipt {receipt.receipt_number}</div><p className="mt-2">Total: {money(Number(receipt.total_amount))}</p><p>Payment: {receipt.payment_method==="cash"?"Cash":"Moniepoint POS"}</p>{receipt.payment_method==="cash"&&<p>Change: {money(Number(receipt.change_due))}</p>}<p className="mt-2 text-xs">Sale recorded. Receipt email delivery is not connected yet.</p><button onClick={()=>window.print()} className="mt-3 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold">Print receipt</button></div>}
          </aside>
        </div>
      </section>
    </div>
  </main>;
}
