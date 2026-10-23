'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, RefreshCw, Tags, X, Save } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type CatalogRow = { id: string; category_name: string; subcategory_name: string | null; created_at: string };
type MenuRow = { id: string; restaurant_id: string | null; category: string | null; subcategory: string | null };
type ModalMode = 'add-category' | 'add-subcategory' | 'edit-category' | 'edit-subcategory';

export default function MenuCategoryManagementPage() {
  const [supabase] = useState(() => getBrowserSupabase());
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [items, setItems] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [selected, setSelected] = useState<{category:string;subcategory:string|null}|null>(null);
  const [name, setName] = useState('');
  const [parentCategory, setParentCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [catalogResult, itemResult] = await Promise.all([
      supabase.from('menu_catalog_categories').select('id, category_name, subcategory_name, created_at').order('category_name').order('subcategory_name'),
      supabase.from('menu_items').select('id, restaurant_id, category, subcategory').limit(10000),
    ]);
    if (catalogResult.error) setError('Could not load catalog categories. Confirm the latest database migration has been applied and your admin account has access.');
    else setCatalog((catalogResult.data ?? []) as CatalogRow[]);
    if (!itemResult.error) setItems((itemResult.data ?? []) as MenuRow[]);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  const categoryRows = useMemo(() => {
    const map = new Map<string,{name:string;items:number;restaurants:Set<string>;subcategories:Set<string>}>();
    for (const row of catalog) {
      const key = row.category_name.trim().toLocaleLowerCase();
      const entry = map.get(key) ?? {name:row.category_name,items:0,restaurants:new Set<string>(),subcategories:new Set<string>()};
      if (row.category_name.localeCompare(entry.name)<0) entry.name=row.category_name;
      if (row.subcategory_name?.trim()) entry.subcategories.add(row.subcategory_name.trim());
      map.set(key,entry);
    }
    for (const item of items) {
      const key=(item.category??'').trim().toLocaleLowerCase();
      const entry=map.get(key);
      if(entry){entry.items++;if(item.restaurant_id)entry.restaurants.add(item.restaurant_id);}
    }
    return Array.from(map.entries()).map(([key,v])=>({key,...v,subcategoryList:Array.from(v.subcategories).sort((a,b)=>a.localeCompare(b))}))
      .filter(row=>(row.name+' '+row.subcategoryList.join(' ')).toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      .sort((a,b)=>a.name.localeCompare(b.name));
  },[catalog,items,search]);

  function openModal(mode:ModalMode, category?:string, subcategory?:string|null) {
    setModal(mode); setSelected(category ? {category,subcategory:subcategory??null}:null);
    setParentCategory(category??'');
    setName(mode==='edit-category' ? category??'' : mode==='edit-subcategory' ? subcategory??'' : '');
    setError(null); setNotice(null);
  }
  function closeModal(){if(!saving)setModal(null);}

  async function submitModal(){
    const clean=name.trim();
    if(!clean){setError('Enter a name before saving.');return;}
    if((modal==='add-subcategory'||modal==='edit-subcategory')&&!parentCategory){setError('Choose a parent category.');return;}
    setSaving(true);setError(null);setNotice(null);
    try {
      if(modal==='add-category'){
        const {error:insertError}=await supabase.from('menu_catalog_categories').insert({category_name:clean,subcategory_name:null});
        if(insertError)throw insertError;
      } else if(modal==='add-subcategory'){
        const {error:insertError}=await supabase.from('menu_catalog_categories').insert({category_name:parentCategory,subcategory_name:clean});
        if(insertError)throw insertError;
      } else if(modal==='edit-category'&&selected){
        const old=selected.category;
        const {error:updateError}=await supabase.from('menu_catalog_categories').update({category_name:clean,updated_at:new Date().toISOString()}).ilike('category_name',old);
        if(updateError)throw updateError;
        const {error:itemsError}=await supabase.from('menu_items').update({category:clean}).ilike('category',old);
        if(itemsError)throw itemsError;
      } else if(modal==='edit-subcategory'&&selected){
        const old=selected.subcategory??'';
        const {error:updateError}=await supabase.from('menu_catalog_categories').update({subcategory_name:clean,updated_at:new Date().toISOString()}).ilike('category_name',selected.category).ilike('subcategory_name',old);
        if(updateError)throw updateError;
        const {error:itemsError}=await supabase.from('menu_items').update({subcategory:clean}).ilike('category',selected.category).ilike('subcategory',old);
        if(itemsError)throw itemsError;
      }
      setModal(null);setNotice('Catalog updated successfully.');await load();
    } catch(e) {
      const message=e instanceof Error?e.message:'Could not save the catalog change.';
      setError(message.toLowerCase().includes('duplicate')||message.toLowerCase().includes('unique')?'That category or subcategory already exists.':message);
    } finally {setSaving(false);}
  }

  return <main className="mx-auto max-w-6xl">
    <PageHeader title="Catalog categories" subtitle="Manage the shared category list used to organize restaurant menus."/>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories and subcategories…" className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}/>
      <button type="button" onClick={()=>openModal('add-category')} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white" style={{background:'var(--orange)'}}><Plus className="h-4 w-4"/>Add category</button>
      <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-60" style={{borderColor:'var(--line)',color:'var(--ink)',background:'white'}}><RefreshCw className="h-4 w-4"/>{loading?'Loading…':'Refresh'}</button>
    </div>
    {error&&!modal&&<p role="alert" className="mb-3 rounded-xl p-3 text-sm" style={{background:'#FCE8E6',color:'#B42318'}}>{error}</p>}
    {notice&&<p role="status" className="mb-3 rounded-xl p-3 text-sm" style={{background:'#E7F6EC',color:'#207245'}}>{notice}</p>}
    <section className="overflow-hidden rounded-xl border" style={{borderColor:'var(--line)',background:'white'}}>
      <div className="flex items-center justify-between border-b p-4" style={{borderColor:'var(--line)'}}><div><h2 className="text-sm font-bold" style={{color:'var(--ink)'}}>Categories and subcategories</h2><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>{categoryRows.length} categories · {catalog.filter(row=>row.subcategory_name).length} subcategory entries</p></div><Tags className="h-5 w-5" style={{color:'var(--orange)'}}/></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead style={{background:'#F8F6F3',color:'var(--gray)'}}><tr><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Subcategories</th><th className="px-4 py-3 font-semibold">Menu items</th><th className="px-4 py-3 font-semibold">Restaurants</th><th className="px-4 py-3 font-semibold">Actions</th></tr></thead><tbody>{categoryRows.map(row=><tr key={row.key} className="border-t align-top" style={{borderColor:'var(--line)'}}><td className="px-4 py-4 font-semibold" style={{color:'var(--ink)'}}>{row.name}</td><td className="px-4 py-4"><div className="flex max-w-md flex-wrap gap-2">{row.subcategoryList.length?row.subcategoryList.map(sub=><span key={sub} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={{borderColor:'var(--line)',color:'var(--ink)'}}>{sub}<button type="button" aria-label={'Edit '+sub} onClick={()=>openModal('edit-subcategory',row.name,sub)} className="font-bold" style={{color:'var(--orange)'}}><Pencil className="h-3 w-3"/></button></span>):<span className="text-xs" style={{color:'var(--gray)'}}>No subcategories</span>}</div><button type="button" onClick={()=>openModal('add-subcategory',row.name)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{color:'var(--orange)'}}><Plus className="h-3 w-3"/>Add subcategory</button></td><td className="px-4 py-4">{row.items}</td><td className="px-4 py-4">{row.restaurants.size}</td><td className="px-4 py-4"><button type="button" onClick={()=>openModal('edit-category',row.name)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'var(--orange)'}}><Pencil className="h-3.5 w-3.5"/>Edit</button></td></tr>)}</tbody></table></div>
      <div className="divide-y md:hidden" style={{borderColor:'var(--line)'}}>{categoryRows.map(row=><article key={row.key} className="p-4" style={{borderColor:'var(--line)'}}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold" style={{color:'var(--ink)'}}>{row.name}</h3><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>{row.items} items · {row.restaurants.size} restaurants</p></div><button type="button" onClick={()=>openModal('edit-category',row.name)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'var(--orange)'}}><Pencil className="h-3.5 w-3.5"/>Edit</button></div><div className="mt-3 flex flex-wrap gap-2">{row.subcategoryList.map(sub=><span key={sub} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={{borderColor:'var(--line)',color:'var(--ink)'}}>{sub}<button type="button" aria-label={'Edit '+sub} onClick={()=>openModal('edit-subcategory',row.name,sub)} style={{color:'var(--orange)'}}><Pencil className="h-3 w-3"/></button></span>)}</div><button type="button" onClick={()=>openModal('add-subcategory',row.name)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{color:'var(--orange)'}}><Plus className="h-3 w-3"/>Add subcategory</button></article>)}</div>
      {!loading&&categoryRows.length===0&&<p className="p-6 text-center text-sm" style={{color:'var(--gray)'}}>No categories found. Add your first category.</p>}
    </section>
    <p className="mt-4 text-xs" style={{color:'var(--gray)'}}>Renaming an existing category or subcategory also updates matching menu items. New categories are added to the shared catalog for use in menu-item forms.</p>

    {modal&&<div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget)closeModal();}}>
      <section role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title" className="w-full max-w-lg rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl" style={{background:'white',color:'var(--ink)'}}>
        <div className="mb-4 flex items-center justify-between"><div><h2 id="catalog-modal-title" className="text-lg font-bold">{modal==='add-category'?'Add category':modal==='add-subcategory'?'Add subcategory':modal==='edit-category'?'Edit category':'Edit subcategory'}</h2><p className="mt-1 text-xs" style={{color:'var(--gray)'}}>{modal.startsWith('edit')?'Changes will update matching menu items.':'Add a reusable option to the shared catalog.'}</p></div><button type="button" onClick={closeModal} disabled={saving} aria-label="Close" className="rounded-lg p-2" style={{color:'var(--gray)'}}><X className="h-5 w-5"/></button></div>
        {modal==='add-subcategory'&&<label className="mb-3 block text-sm font-medium">Parent category<select value={parentCategory} onChange={e=>setParentCategory(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}><option value="">Choose category</option>{categoryRows.map(row=><option key={row.key} value={row.name}>{row.name}</option>)}</select></label>}
        <label className="block text-sm font-medium">{modal.includes('subcategory')?'Subcategory name':'Category name'}<input autoFocus value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder={modal.includes('subcategory')?'e.g. Smoothies':'e.g. Breakfast'} className="mt-1.5 w-full rounded-lg border px-3 py-3 text-sm outline-none" style={{borderColor:'var(--line)',background:'white'}}/></label>
        {error&&<p role="alert" className="mt-3 rounded-lg p-3 text-sm" style={{background:'#FCE8E6',color:'#B42318'}}>{error}</p>}
        <div className="mt-5 flex gap-3"><button type="button" onClick={closeModal} disabled={saving} className="flex-1 rounded-xl border px-4 py-3 text-sm font-semibold" style={{borderColor:'var(--line)'}}>Cancel</button><button type="button" onClick={()=>void submitModal()} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60" style={{background:'var(--orange)'}}><Save className="h-4 w-4"/>{saving?'Saving…':'Save'}</button></div>
      </section>
    </div>}
  </main>;
}
