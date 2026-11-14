"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {RefreshCw,Save,Store,Package,Search,AlertCircle} from "lucide-react";
import StaffShell from "@/components/staff/StaffShell";

type Branch={id:string;name:string;branch_code:string|null};
type Item={id:string;name:string;sku:string|null;category:string|null;selling_price:number;is_available:boolean};
type BranchItem={id:string;work_location_id:string;pos_item_id:string;is_available:boolean;selling_price:number|null;sort_order:number};
type Stock={work_location_id:string;pos_item_id:string;track_stock:boolean;stock_quantity:number;low_stock_alert:number};
type Row={item:Item;enabled:boolean;price:string;sort:string;track:boolean;quantity:string;low:string;configured:boolean};

const field="w-full rounded-lg border border-[#E7DED4] bg-white px-3 py-2 text-sm outline-none focus:border-orange-400";
const button="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#E87524] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50";
const secondary="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#E7DED4] bg-white px-3 py-2 text-xs font-semibold text-[#47382D] disabled:opacity-50";

export default function BranchCataloguePage(){
 const [currentBranch,setCurrentBranch]=useState<Branch|null>(null);
 const [items,setItems]=useState<Item[]>([]);
 const [branchItems,setBranchItems]=useState<BranchItem[]>([]);
 const [stock,setStock]=useState<Stock[]>([]);
 const [branchId,setBranchId]=useState("");
 const [rows,setRows]=useState<Row[]>([]);
 const [search,setSearch]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const call=useCallback(async(body:Record<string,unknown>)=>{
   const response=await fetch("/api/bigfoods-staff/inventory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||"Branch catalogue request failed");
   return data;
 },[]);
 const load=useCallback(async()=>{
   setLoading(true);setError("");
   try{
     const data=await call({action:"branch_catalogue"});
     setCurrentBranch(data.current_branch||null);setBranchId(data.current_branch?.id||"");setItems(data.items||[]);setBranchItems(data.branch_items||[]);setStock(data.branch_stock||[]);
   }catch(e){setError(e instanceof Error?e.message:"Unable to load branch catalogue");}
   finally{setLoading(false);}
 },[call]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
   if(!branchId)return;
   const configured=new Map(branchItems.filter(x=>x.work_location_id===branchId).map(x=>[x.pos_item_id,x]));
   const inventory=new Map(stock.filter(x=>x.work_location_id===branchId).map(x=>[x.pos_item_id,x]));
   setRows(items.map(item=>{
     const link=configured.get(item.id),s=inventory.get(item.id);
     return {item,enabled:link?.is_available??false,price:link?.selling_price==null?"":String(link.selling_price),sort:String(link?.sort_order??0),track:s?.track_stock??true,quantity:String(s?.stock_quantity??0),low:String(s?.low_stock_alert??10),configured:!!link};
   }));
 },[branchId,items,branchItems,stock]);
 const filtered=useMemo(()=>rows.filter(r=>[r.item.name,r.item.sku||"",r.item.category||""].join(" ").toLowerCase().includes(search.toLowerCase())),[rows,search]);
 function patch(id:string,changes:Partial<Row>){setRows(current=>current.map(row=>row.item.id===id?{...row,...changes}:row));}
 async function save(row:Row){
   setBusy(row.item.id);setError("");setNotice("");
   try{
     if(row.enabled||row.configured){
       await call({action:"branch_item_save",work_location_id:branchId,pos_item_id:row.item.id,is_available:row.enabled,selling_price:row.price===""?null:Number(row.price),sort_order:Number(row.sort)||0});
       await call({action:"branch_stock_save",work_location_id:branchId,pos_item_id:row.item.id,track_stock:row.track,stock_quantity:Number(row.quantity),low_stock_alert:Number(row.low)});
       setNotice(row.item.name+" saved for this branch.");
       await load();
     }else{
       setNotice("Item is not listed at this branch. Enable it and save to add it.");
     }
   }catch(e){setError(e instanceof Error?e.message:"Unable to save branch item");}
   finally{setBusy(null);}
 }
 return <StaffShell title="Branch catalogue & stock" subtitle="Control which BigFoods POS items each branch sells, branch-specific prices and prepared portions.">
  <div className="space-y-4">
   {error&&<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
   {notice&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}
   <section className="rounded-2xl border border-[#E9E0D6] bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#E87524]"><Store className="h-5 w-5"/></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A8D82]">Your assigned branch · from attendance</p><p className="mt-0.5 text-sm font-semibold text-[#30261F]">{currentBranch?currentBranch.name:"No active branch"}</p><p className="text-[10px] text-[#94877B]">{currentBranch?.branch_code||"Branch code not set"}</p></div></div>
     <button className={secondary} onClick={()=>void load()} disabled={loading}><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/>Refresh</button>
    </div>
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 p-3 text-[11px] text-sky-900"><Store className="h-4 w-4 shrink-0"/>The system automatically uses the branch recorded on your active staff attendance. You cannot switch branches here. The catalogue uses the same POS items as the cashier; a blank price uses the standard POS price.</div>
   </section>
   <section className="overflow-hidden rounded-2xl border border-[#E9E0D6] bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E8E0] p-4"><div><h2 className="text-sm font-semibold text-[#30261F]">POS items</h2><p className="mt-1 text-[11px] text-[#817367]">{filtered.length} items · changes are saved per branch</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9A8D82]"/><input className={field+" pl-9"} placeholder="Search POS items" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    {loading?<div className="p-10 text-center text-xs text-[#817367]">Loading branch catalogue…</div>:!branchId?<div className="p-10 text-center text-xs text-[#817367]">You need an active check-in at your assigned branch to view and manage its catalogue.</div>:<div className="divide-y divide-[#F0E8E0]">
     {filtered.map(row=><div key={row.item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(180px,1.3fr)_100px_130px_110px_110px_100px_auto] lg:items-end">
      <div className="min-w-0"><div className="flex items-center gap-2"><Package className="h-4 w-4 shrink-0 text-[#A58B72]"/><p className="truncate text-xs font-semibold text-[#30261F]">{row.item.name}</p></div><p className="mt-1 pl-6 text-[10px] text-[#94877B]">{row.item.category||"Uncategorised"}{row.item.sku?" · "+row.item.sku:""} · Standard {Number(row.item.selling_price||0).toLocaleString("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0})}</p></div>
      <label className="text-[10px] font-semibold text-[#817367]">Listed at branch<select className={field+" mt-1"} value={row.enabled?"yes":"no"} onChange={e=>patch(row.item.id,{enabled:e.target.value==="yes"})}><option value="no">No</option><option value="yes">Yes</option></select></label>
      <label className="text-[10px] font-semibold text-[#817367]">Price override (₦)<input className={field+" mt-1"} type="number" min="0" step="0.01" placeholder="Standard price" value={row.price} onChange={e=>patch(row.item.id,{price:e.target.value})}/></label>
      <label className="text-[10px] font-semibold text-[#817367]">Prepared stock<input className={field+" mt-1"} type="number" min="0" step="1" value={row.quantity} onChange={e=>patch(row.item.id,{quantity:e.target.value})}/></label>
      <label className="text-[10px] font-semibold text-[#817367]">Low stock alert<input className={field+" mt-1"} type="number" min="0" step="1" value={row.low} onChange={e=>patch(row.item.id,{low:e.target.value})}/></label>
      <label className="text-[10px] font-semibold text-[#817367]">Stock tracking<select className={field+" mt-1"} value={row.track?"yes":"no"} onChange={e=>patch(row.item.id,{track:e.target.value==="yes"})}><option value="yes">On</option><option value="no">Off</option></select></label>
      <button className={button} disabled={busy!==null||(!row.enabled&&!row.configured)||!branchId} onClick={()=>void save(row)}><Save className="h-3.5 w-3.5"/>{busy===row.item.id?"Saving…":"Save"}</button>
     </div>)}
     {!filtered.length&&<div className="p-10 text-center text-xs text-[#817367]">No matching POS items.</div>}
    </div>}
   </section>
  </div>
 </StaffShell>;
}
