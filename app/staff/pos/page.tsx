"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, RefreshCw, ShoppingBag, LogOut, UtensilsCrossed, LayoutGrid, ClipboardList, Package, Users, ChartNoAxesColumn, FileText, Settings, UserRound, Headphones, CheckCircle2, Grid2X2, List, X, MoreVertical, ScanLine, Percent, Mail, ChevronDown, ChefHat, Soup, GlassWater, Sandwich, PackageOpen, Banknote, CreditCard, UserPlus } from "lucide-react";

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
  const [listView, setListView] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [showMore, setShowMore] = useState(false);

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
    { label:"Reports", icon:FileText, click:()=>router.push("/staff/pos/reports") },
    { label:"Settings", icon:Settings, click:()=>router.push("/staff/settings") },
  ];

  if (!staff || !authorized) return <main className="grid min-h-screen place-items-center bg-[#F7F4F0] p-6"><div className="max-w-md rounded-2xl border border-[#E8E0D8] bg-white p-6 text-center shadow-sm"><h1 className="text-lg font-bold text-[#30261F]">{loading ? "Checking POS access…" : "POS access restricted"}</h1><p className="mt-2 text-sm leading-6 text-[#81766D]">{error || "Verifying your secure staff session…"}</p><button onClick={() => router.replace("/staff")} className="mt-4 rounded-xl bg-[#F47721] px-4 py-2.5 text-sm font-semibold text-white">Return to staff dashboard</button></div></main>;

  return <main className="min-h-screen bg-[#F7F8FA] text-[#151923]"><div className="flex min-h-screen">
  <aside className="hidden w-[210px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white lg:flex">
    <div className="flex h-[76px] items-center border-b border-[#E8EAEE] px-5"><img src="https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.4927238865897102.webp" alt="BigFoods logo" className="h-10 w-10 object-contain"/><span className="ml-1 text-[23px] font-extrabold tracking-tight">BigFoods</span></div>
    <nav className="space-y-1 px-3 py-4">{nav.map(({label,icon:Icon,click})=><button key={label} onClick={click} className={"flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] transition "+(label==="POS"?"bg-[#FFF0E7] font-semibold text-[#E9530B]":"text-[#586171] hover:bg-[#F7F8FA]")}><Icon size={19}/>{label}</button>)}</nav>
    <div className="mt-auto border-t border-[#EEF0F3] p-4 text-[#687180]"><div className="flex gap-2"><Headphones size={20}/><span className="text-xs leading-5">Need help?<br/><span className="text-[#9097A2]">Contact support</span></span></div></div>
  </aside>
  <section className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex min-h-[76px] flex-wrap items-center gap-3 border-b border-[#E7E9ED] bg-white/95 px-4 py-3 backdrop-blur md:px-5">
    <div className="relative min-w-[220px] flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8794]" size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for items (e.g. jollof, burger, coke...)" className="h-[46px] w-full rounded-xl border border-[#E0E4EA] pl-12 pr-4 text-[13px] outline-none focus:border-[#F47721]"/></div>
    <button onClick={()=>{setWalkIn(true);setCustomerEmail("");}} className="hidden h-[46px] items-center gap-2 rounded-xl border border-[#E0E4EA] bg-white px-4 text-[13px] font-medium sm:flex"><UserRound size={18}/>Walk-in Customer</button>
    <button onClick={()=>void load()} aria-label="Refresh menu" className="grid h-[44px] w-[44px] place-items-center rounded-xl border border-[#E0E4EA]"><ScanLine size={19}/></button>
    <div className="relative"><button onClick={()=>setShowMore(v=>!v)} aria-label="More options" className="grid h-[44px] w-[44px] place-items-center rounded-xl border border-[#E0E4EA]"><MoreVertical size={19}/></button>{showMore&&<div className="absolute right-0 top-12 z-30 w-40 rounded-xl border bg-white p-1 shadow-xl"><button onClick={()=>{setShowMore(false);void load();}} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">Refresh catalogue</button><button onClick={()=>void signOut()} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Sign out</button></div>}</div>
    <button onClick={()=>setShowMore(v=>!v)} className="ml-auto flex items-center gap-2 rounded-lg px-1 py-1 text-left"><span className="relative grid h-10 w-10 place-items-center rounded-full bg-[#E9EDF2] text-[#687383]"><UserRound size={23}/><i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"/></span><span className="hidden sm:block"><b className="block max-w-[100px] truncate text-[13px]">{staff?.display_name||"Staff"}</b><small className="text-[11px] capitalize text-[#737B87]">{staff?.role||"Cashier"}</small></span><ChevronDown size={15}/></button>
  </header>
  <div className="grid min-w-0 grid-cols-1 gap-0 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,470px)]"><div className="min-w-0 space-y-7 p-4 md:p-5">
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}{notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-bold">Most Ordered</h2><button onClick={()=>{setCategory("All");setSubcategory("All");setSearch("");}} className="text-xs text-[#505967] hover:text-orange-600">View all</button></div>
      {loading?<p className="py-8 text-sm text-gray-500">Loading menu…</p>:<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">{popular.map(p=><button key={p.id} onClick={()=>add(p)} className="overflow-hidden rounded-xl border border-[#E7E9ED] bg-white text-left shadow-sm transition hover:border-orange-300 hover:shadow-md"><div className="relative aspect-[1.12/1] bg-[#F0F1F3]">{(p.image_urls?.[0]||p.image_url)?<img src={p.image_urls?.[0]||p.image_url||""} alt={p.name} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-gray-400"><UtensilsCrossed size={25}/></div>}<span className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#F47721] text-white"><Plus size={17}/></span></div><div className="p-2"><p className="line-clamp-2 min-h-8 text-[12px] font-semibold">{p.name}</p><p className="mt-1 text-[12px] text-gray-600">{money(activePrice(p))}</p></div></button>)}</div>}</section>
    <section><h2 className="mb-3 text-[17px] font-bold">Categories</h2><div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">{categories.map(c=>{const Icon=c==="All"?Grid2X2:/meal/i.test(c)?ChefHat:/side/i.test(c)?Soup:/drink/i.test(c)?GlassWater:/snack/i.test(c)?Sandwich:/combo/i.test(c)?PackageOpen:UtensilsCrossed;return <button key={c} onClick={()=>{setCategory(c);setSubcategory("All");}} className={"flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold "+(category===c?"border-[#F47721] bg-[#F47721] text-white":"border-[#E7E9ED] bg-white text-[#4B5563]")}><Icon size={23} className={category===c?"":"text-[#F47721]"}/>{c}</button>})}</div></section>
    <section><h2 className="mb-3 text-[17px] font-bold">Subcategories</h2><div className="flex gap-2 overflow-x-auto pb-1">{subcategories.map(c=><button key={c} onClick={()=>setSubcategory(c)} className={"shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold "+(subcategory===c?"bg-[#F47721] text-white":"border border-[#E7E9ED] bg-white text-[#4B5563]")}>{c==="All"?"All "+(category==="All"?"Meals":category):c}</button>)}</div></section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-bold">Menu Items</h2><div className="flex items-center gap-2"><span className="text-xs text-gray-500">{visible.length} items</span><div className="flex rounded-lg border bg-white p-0.5"><button onClick={()=>setListView(false)} aria-label="Grid view" className={"rounded p-1.5 "+(!listView?"bg-orange-50 text-orange-600":"text-gray-400")}><Grid2X2 size={17}/></button><button onClick={()=>setListView(true)} aria-label="List view" className={"rounded p-1.5 "+(listView?"bg-orange-50 text-orange-600":"text-gray-400")}><List size={17}/></button></div></div></div>
      {visible.length?<div className={listView?"space-y-2":"grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4"}>{visible.map(p=><article key={p.id} className={"overflow-hidden rounded-xl border border-[#E7E9ED] bg-white "+(listView?"flex items-center gap-3 p-2":"")}><div className={"bg-[#F0F1F3] "+(listView?"h-16 w-20 shrink-0 overflow-hidden rounded-lg":"aspect-[1.25/1]")}>{(p.image_urls?.[0]||p.image_url)?<img src={p.image_urls?.[0]||p.image_url||""} alt={p.name} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-gray-400"><UtensilsCrossed size={26}/></div>}</div><div className={listView?"flex min-w-0 flex-1 items-center justify-between gap-3":"p-3"}><div className="min-w-0"><p className="line-clamp-2 text-[13px] font-semibold">{p.name}</p><p className="mt-1 text-[11px] text-gray-500">{p.subcategory||p.category}</p><p className="mt-2 text-[13px] font-bold">{money(activePrice(p))}</p></div><button onClick={()=>add(p)} className="mt-2 rounded-lg bg-[#F47721] px-4 py-2 text-xs font-bold text-white">Add</button></div></article>)}</div>:<div className="grid min-h-40 place-items-center rounded-xl border border-dashed bg-white text-sm text-gray-500">{loading?"Loading products…":"No available products match this selection."}</div>}</section>
  </div>
  <aside className="border-t border-[#E7E9ED] bg-white p-4 md:p-5 2xl:sticky 2xl:top-[76px] 2xl:h-[calc(100vh-76px)] 2xl:overflow-y-auto 2xl:border-l 2xl:border-t-0">
    <div className="flex items-center justify-between"><h2 className="text-[16px] font-bold">Current Order ({itemCount} items)</h2><button onClick={()=>{setCart([]);setCustomerEmail("");setCashReceived("");setTerminalConfirmed(false);setError("");setNotice("");}} disabled={!cart.length||busy} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"><Trash2 size={14}/>Clear</button></div>
    {!cart.length?<div className="my-4 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-gray-500"><ShoppingBag size={25} className="mx-auto mb-2"/>Add a food item to start the order.</div>:<div className="my-3 max-h-[30vh] space-y-0 overflow-y-auto">{cart.map(line=><div key={line.key} className="flex items-center gap-3 border-b py-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">{(line.product.image_urls?.[0]||line.product.image_url)&&<img src={line.product.image_urls?.[0]||line.product.image_url||""} alt="" className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold">{line.product.name}</p><div className="mt-2 inline-flex items-center gap-1 rounded-lg border p-0.5"><button onClick={()=>changeQty(line.product.id,-1)} aria-label={"Decrease "+line.product.name} className="grid h-6 w-7 place-items-center"><Minus size={13}/></button><span className="min-w-6 text-center text-xs">{line.quantity}</span><button onClick={()=>changeQty(line.product.id,1)} aria-label={"Increase "+line.product.name} className="grid h-6 w-7 place-items-center"><Plus size={13}/></button></div></div><div className="text-right"><p className="text-[12px] font-bold">{money(activePrice(line.product)*line.quantity)}</p><button onClick={()=>changeQty(line.product.id,-line.quantity)} aria-label={"Remove "+line.product.name} className="mt-1 text-red-600"><X size={15}/></button></div></div>)}</div>}
    <div className="my-3 rounded-xl border p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[13px] font-semibold"><Percent size={17}/>Discount</div><button onClick={()=>setShowDiscount(v=>!v)} className="rounded-lg border px-3 py-2 text-[11px]">{showDiscount?"Close":"Add Discount"}</button></div>{showDiscount&&<div className="mt-3"><div className="flex gap-2"><input value={discountCode} onChange={e=>setDiscountCode(e.target.value)} placeholder="Enter discount code (if any)" className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-xs"/><button onClick={()=>setNotice("POS discount codes are not configured yet; no discount was applied.")} className="rounded-lg bg-gray-100 px-3 text-xs font-semibold">Apply</button></div><p className="mt-2 text-[10px] text-gray-400">Discount codes are not configured yet.</p></div>}</div>
    <div className="space-y-2 border-b pb-4 text-[12px]"><div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{money(total)}</span></div><div className="flex justify-between text-gray-600"><span>Discount</span><span>{money(0)}</span></div></div>
    <div className="border-b py-4"><h3 className="text-[14px] font-bold">Customer Details</h3><label className="mt-2 block text-[12px] text-gray-600">Email Address <span className="text-red-500">*</span><span className="relative mt-1.5 block"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" value={customerEmail} onChange={e=>{setCustomerEmail(e.target.value);setWalkIn(!e.target.value);}} placeholder="customer@example.com" className="h-[42px] w-full rounded-lg border pl-10 pr-3 text-[12px]"/></span></label><div className="mt-2 flex items-center justify-between gap-2"><button onClick={()=>{setWalkIn(v=>!v);if(!walkIn)setCustomerEmail("");}} className="inline-flex items-center gap-1 text-xs font-medium text-orange-600"><UserPlus size={14}/>{walkIn?"+ Add customer (optional)":"Use walk-in customer"}</button><button onClick={()=>{setWalkIn(true);setCustomerEmail("");}} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-2 text-[11px] font-semibold text-orange-600"><UserRound size={14}/>Walk-in</button></div></div>
    <div className="py-4"><h3 className="text-[14px] font-bold">Payment Method</h3><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>{setPaymentMethod("cash");setTerminalConfirmed(false);}} className={"flex min-h-[60px] items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold "+(paymentMethod==="cash"?"border-[#F47721] bg-[#FFF3EA] text-[#D95D12]":"border-gray-200 text-gray-600")}><Banknote size={20}/>Cash</button><button type="button" onClick={()=>{setPaymentMethod("moniepoint_pos");setTerminalConfirmed(false);}} className={"flex min-h-[60px] items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold "+(paymentMethod==="moniepoint_pos"?"border-[#F47721] bg-[#FFF3EA] text-[#D95D12]":"border-gray-200 text-gray-600")}><CreditCard size={20}/><span>Moniepoint<br/>Terminal</span></button></div>
      {paymentMethod==="cash"?<label className="mt-3 block text-xs text-gray-500">Cash received<input type="number" min={total} step="1" value={cashReceived} onChange={e=>setCashReceived(e.target.value)} placeholder={String(total)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"/></label>:<label className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600"><input type="checkbox" checked={terminalConfirmed} onChange={e=>setTerminalConfirmed(e.target.checked)} className="mt-0.5 accent-orange-500"/><span>I confirmed the physical Moniepoint terminal shows successful payment.</span></label>}
      {paymentMethod==="cash"&&Number(cashReceived)>=total&&total>0&&<div className="mt-2 flex justify-between text-xs font-semibold text-emerald-700"><span>Change due</span><span>{money(Number(cashReceived)-total)}</span></div>}</div>
    <div className="rounded-xl bg-[#FFF0E7] px-3 py-3"><div className="flex items-center justify-between text-[12px] text-gray-600"><span>Total</span><span className="text-[22px] font-extrabold text-[#D95312]">{money(total)}</span></div></div>
    <button disabled={!cart.length||busy||loading||(paymentMethod==="cash"&&(!cashReceived||Number(cashReceived)<total))||(paymentMethod==="moniepoint_pos"&&!terminalConfirmed)} onClick={()=>void checkout()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F47721] px-4 py-3.5 text-[13px] font-bold text-white disabled:opacity-50">{busy?"Saving sale…":<>Complete Payment {money(total)} →</>}</button>
    <p className="mt-3 text-center text-[10px] text-gray-400">Receipt email delivery is not connected yet.</p>
    {receipt&&<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={17}/> Receipt {receipt.receipt_number}</div><p className="mt-2">Total: {money(Number(receipt.total_amount))}</p><p>Payment: {receipt.payment_method==="cash"?"Cash":"Moniepoint POS"}</p>{receipt.payment_method==="cash"&&<p>Change: {money(Number(receipt.change_due))}</p>}<button onClick={()=>window.print()} className="mt-3 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold">Print receipt</button></div>}
  </aside></div></section></div></main>;
