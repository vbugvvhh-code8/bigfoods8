'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Tags } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type MenuRow = { id: string; restaurant_id: string | null; name: string; category: string | null; subcategory: string | null };

export default function MenuCategoryManagementPage() {
  const [supabase] = useState(() => getBrowserSupabase());
  const [items, setItems] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryEdits, setCategoryEdits] = useState<Record<string,string>>({});
  const [subcategoryEdits, setSubcategoryEdits] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const {data,error}=await supabase.from('menu_items').select('id, restaurant_id, name, category, subcategory').order('category').limit(10000);
    if(error) setError('Could not load catalog categories. Check admin permissions and try again.');
    else setItems((data??[]) as MenuRow[]);
    setLoading(false);
  },[supabase]);
  useEffect(()=>{void load();},[load]);

  const categories=useMemo(()=>{
    const groups=new Map<string,{values:Set<string>;count:number;restaurants:Set<string>}>();
    for(const item of items){const value=(item.category??'').trim();if(!value)continue;const key=value.toLocaleLowerCase();const g=groups.get(key)??{values:new Set<string>(),count:0,restaurants:new Set<string>()};g.values.add(value);g.count++;if(item.restaurant_id)g.restaurants.add(item.restaurant_id);groups.set(key,g);}
    return [...groups.entries()].map(([key,g])=>({key,name:Array.from(g.values).sort()[0],values:[...g.values],count:g.count,restaurantCount:g.restaurants.size,duplicate:g.values.size>1})).filter(x=>(x.name+' '+x.values.join(' ')).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  },[items,search]);
  const subcategories=useMemo(()=>{
    const groups=new Map<string,{category:string;values:Set<string>;count:number;restaurants:Set<string>}>();
    for(const item of items){const category=(item.category??'').trim();const value=(item.subcategory??'').trim();if(!category||!value)continue;const key=category.toLocaleLowerCase()+'::'+value.toLocaleLowerCase();const g=groups.get(key)??{category,values:new Set<string>(),count:0,restaurants:new Set<string>()};g.values.add(value);g.count++;if(item.restaurant_id)g.restaurants.add(item.restaurant_id);groups.set(key,g);}
    return [...groups.entries()].map(([key,g])=>({key,category:g.category,name:[...g.values].sort()[0],values:[...g.values],count:g.count,restaurantCount:g.restaurants.size,duplicate:g.values.size>1})).filter(x=>(x.category+' '+x.name+' '+x.values.join(' ')).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
  },[items,search]);

  async function renameCategory(key:string,values:string[],current:string){
    const next=(categoryEdits[key]??current).trim();
    if(!next){setError('Category name cannot be empty.');return;}
    if(values.length===1&&next===values[0])return;
    if(!window.confirm('Rename this category across every restaurant menu? '+values.join(', ')+' → '+next+'. This affects matching menu items platform-wide.'))return;
    setSavingKey('cat:'+key);setError(null);setNotice(null);
    try{
      for(const old of values){if(old===next)continue;const {error}=await supabase.from('menu_items').update({category:next}).eq('category',old);if(error)throw error;}
      setNotice('Category renamed across the catalog.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not rename category. Some matching items may need a refresh.');}
    finally{setSavingKey(null);}
  }
  async function renameSubcategory(key:string,category:string,values:string[],current:string){
    const next=(subcategoryEdits[key]??current).trim();
    if(!next){setError('Subcategory name cannot be empty.');return;}
    if(values.length===1&&next===values[0])return;
    if(!window.confirm('Rename this subcategory for every item under '+category+'? '+values.join(', ')+' → '+next+'.'))return;
    setSavingKey('sub:'+key);setError(null);setNotice(null);
    try{
      for(const old of values){if(old===next)continue;const {error}=await supabase.from('menu_items').update({subcategory:next}).eq('category',category).eq('subcategory',old);if(error)throw error;}
      setNotice('Subcategory renamed for matching menu items.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not rename subcategory.');}
    finally{setSavingKey(null);}
  }

  return <main className="mx-auto max-w-6xl">
    <PageHeader title="Catalog categories" subtitle="Review and standardize category names across restaurant menus. Renames apply to matching menu items platform-wide."/>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories and subcategories…" className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}/><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{background:'var(--orange)'}}><RefreshCw className="h-4 w-4"/>{loading?'Loading…':'Refresh catalog'}</button></div>
    {error&&<p role="alert" className="mb-3 rounded-xl p-3 text-sm" style={{background:'#FCE8E6',color:'#B42318'}}>{error}</p>}
    {notice&&<p role="status" className="mb-3 rounded-xl p-3 text-sm" style={{background:'#E7F6EC',color:'#207245'}}>{notice}</p>}
    <section className="mb-6 overflow-hidden rounded-xl border" style={{borderColor:'var(--line)',background:'white'}}>
      <div className="flex items-center justify-between border-b p-4" style={{borderColor:'var(--line)'}}><div><h2 className="text-sm font-bold" style={{color:'var(--ink)'}}>Categories</h2><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>{categories.length} category names · duplicates are highlighted</p></div><Tags className="h-5 w-5" style={{color:'var(--orange)'}}/></div>
      {categories.map(c=><div key={c.key} className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,1fr)_auto] md:items-center" style={{borderColor:'var(--line)'}}>
        <div><p className="text-sm font-semibold" style={{color:'var(--ink)'}}>{c.name}</p><p className="mt-1 text-[11px]" style={{color:'var(--gray)'}}>{c.count} items · {c.restaurantCount} restaurants</p>{c.duplicate&&<p className="mt-1 text-[11px] font-semibold" style={{color:'#B45309'}}>Different capitalization: {c.values.join(' / ')}</p>}</div>
        <input aria-label={'Rename category '+c.name} value={categoryEdits[c.key]??c.name} onChange={e=>setCategoryEdits(v=>({...v,[c.key]:e.target.value}))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)'}}/>
        <button type="button" disabled={savingKey==='cat:'+c.key||loading} onClick={()=>void renameCategory(c.key,c.values,c.name)} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50" style={{background:'var(--orange)'}}><Save className="h-3.5 w-3.5"/>{savingKey==='cat:'+c.key?'Saving…':'Rename category'}</button>
      </div>)}
      {!loading&&categories.length===0&&<p className="p-4 text-sm" style={{color:'var(--gray)'}}>No categories match your search.</p>}
    </section>
    <section className="overflow-hidden rounded-xl border" style={{borderColor:'var(--line)',background:'white'}}>
      <div className="border-b p-4" style={{borderColor:'var(--line)'}}><h2 className="text-sm font-bold" style={{color:'var(--ink)'}}>Subcategories</h2><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>Renaming applies only to items under the displayed parent category.</p></div>
      {subcategories.map(c=><div key={c.key} className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,1fr)_auto] md:items-center" style={{borderColor:'var(--line)'}}>
        <div><p className="text-sm font-semibold" style={{color:'var(--ink)'}}>{c.name}</p><p className="mt-1 text-[11px]" style={{color:'var(--gray)'}}>{c.category} · {c.count} items · {c.restaurantCount} restaurants</p>{c.duplicate&&<p className="mt-1 text-[11px] font-semibold" style={{color:'#B45309'}}>Different capitalization: {c.values.join(' / ')}</p>}</div>
        <input aria-label={'Rename subcategory '+c.name} value={subcategoryEdits[c.key]??c.name} onChange={e=>setSubcategoryEdits(v=>({...v,[c.key]:e.target.value}))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)'}}/>
        <button type="button" disabled={savingKey==='sub:'+c.key||loading} onClick={()=>void renameSubcategory(c.key,c.category,c.values,c.name)} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50" style={{background:'var(--orange)'}}><Save className="h-3.5 w-3.5"/>{savingKey==='sub:'+c.key?'Saving…':'Rename subcategory'}</button>
      </div>)}
      {!loading&&subcategories.length===0&&<p className="p-4 text-sm" style={{color:'var(--gray)'}}>No subcategories match your search.</p>}
    </section>
    <p className="mt-4 text-xs" style={{color:'var(--gray)'}}>Category renames are global. Existing menu items are preserved; only their category labels change. Every changed item is captured by the menu audit trigger.</p>
  </main>;
}
