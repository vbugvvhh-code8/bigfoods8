'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Power, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

interface VendorOrder {
  id: string;
  status: string;
  subtotal: number;
  platform_fee: number;
  placed_at: string;
}

interface VendorMenuItem {
  id: string;
  name: string;
  price: number;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  is_available: boolean;
}

export default function AdminVendorDetailPage() {
  const params = useParams<{ id: string }>();
  const [supabase] = useState(() => getBrowserSupabase());
  const [editingItem, setEditingItem] = useState<VendorMenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemNotice, setItemNotice] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [menuItems, setMenuItems] = useState<VendorMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: r }, { data: o }, { data: m }] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', params.id).single(),
        supabase
          .from('orders')
          .select('id, status, subtotal, platform_fee, placed_at')
          .eq('restaurant_id', params.id)
          .order('placed_at', { ascending: false })
          .limit(500),
        supabase
          .from('menu_items')
          .select('id, name, price, category, subcategory, image_url, is_available')
          .eq('restaurant_id', params.id)
          .order('category', { ascending: true }),
      ]);
      setRestaurant(r ?? null);
      setOrders((o as VendorOrder[]) ?? []);
      setMenuItems((m as VendorMenuItem[]) ?? []);
      setLoading(false);
    })();
  }, [params?.id, supabase]);

  async function saveMenuItem() {
    if (!editingItem) return;
    const price = Number(editPrice);
    if (!editName.trim()) { setItemError('Enter a menu item name.'); return; }
    if (!Number.isSafeInteger(price) || price <= 0) { setItemError('Enter a valid price greater than ₦0.'); return; }
    setSavingItem(true); setItemError(null); setItemNotice(null);
    try {
      const { data, error } = await supabase.from('menu_items').update({
        name: editName.trim(), price,
        category: editCategory.trim() || null,
        subcategory: editSubcategory.trim() || null,
      }).eq('id', editingItem.id).eq('restaurant_id', params.id)
        .select('id, name, price, category, subcategory, image_url, is_available').single();
      if (error) throw error;
      setMenuItems((items) => items.map((item) => item.id === editingItem.id ? data as VendorMenuItem : item));
      setEditingItem(null); setItemNotice('Menu item updated successfully.');
    } catch (e) {
      setItemError(e instanceof Error ? e.message : 'Could not update this menu item.');
    } finally { setSavingItem(false); }
  }

  async function toggleMenuItem(item: VendorMenuItem) {
    setBusyItemId(item.id); setItemError(null); setItemNotice(null);
    try {
      const { data, error } = await supabase.from('menu_items').update({ is_available: !item.is_available })
        .eq('id', item.id).eq('restaurant_id', params.id)
        .select('id, name, price, category, subcategory, image_url, is_available').single();
      if (error) throw error;
      setMenuItems((items) => items.map((current) => current.id === item.id ? data as VendorMenuItem : current));
      setItemNotice(`${item.name} ${item.is_available ? 'disabled' : 'reactivated'} successfully.`);
    } catch (e) {
      setItemError(e instanceof Error ? e.message : 'Could not change item availability.');
    } finally { setBusyItemId(null); }
  }

  const delivered = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);
  const totalEarned = useMemo(
    () => delivered.reduce((sum, o) => sum + Number(o.subtotal) - Number(o.platform_fee ?? 0), 0),
    [delivered]
  );
  const totalPlatformFees = useMemo(
    () => delivered.reduce((sum, o) => sum + Number(o.platform_fee ?? 0), 0),
    [delivered]
  );

  const menuByCategory = useMemo(() => {
    const groups: Record<string, VendorMenuItem[]> = {};
    for (const item of menuItems) {
      const cat = item.category || 'uncategorized';
      groups[cat] = groups[cat] ?? [];
      groups[cat].push(item);
    }
    return groups;
  }, [menuItems]);

  if (loading) {
    return <p className="text-[12px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>;
  }

  if (!restaurant) {
    return <p className="text-[12px] py-6 text-center" style={{ color: 'var(--gray)' }}>Restaurant not found.</p>;
  }

  return (
    <div>
      <PageHeader title={restaurant.name} subtitle={`${restaurant.category ?? ''} · ${restaurant.address ?? ''}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total orders" value={String(orders.length)} />
        <StatTile label="Delivered" value={String(delivered.length)} />
        <StatTile label="Restaurant earned" value={`₦${totalEarned.toLocaleString()}`} />
        <StatTile label="Platform fees" value={`₦${totalPlatformFees.toLocaleString()}`} />
      </div>

      <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
        Menu ({menuItems.length} items)
      </p>
      {itemError && <p role="alert" className="mb-3 rounded-lg p-3 text-xs" style={{background:'#FCE8E6',color:'#B42318'}}>{itemError}</p>}
      {itemNotice && <p role="status" className="mb-3 rounded-lg p-3 text-xs" style={{background:'#E7F6EC',color:'#207245'}}>{itemNotice}</p>}
      {editingItem && <section className="mb-4 rounded-xl border p-4" style={{borderColor:'var(--line)',background:'white'}}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-sm" style={{color:'var(--ink)'}}>Edit menu item</h3><button type="button" onClick={()=>{setEditingItem(null);setItemError(null);}} className="rounded-lg border p-2" style={{borderColor:'var(--line)',color:'var(--gray)'}} aria-label="Cancel edit"><X className="h-4 w-4"/></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold" style={{color:'var(--ink)'}}>Item name<input value={editName} onChange={e=>setEditName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)'}}/></label>
          <label className="text-xs font-semibold" style={{color:'var(--ink)'}}>Price (₦)<input type="number" min="1" step="1" value={editPrice} onChange={e=>setEditPrice(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)'}}/></label>
          <label className="text-xs font-semibold" style={{color:'var(--ink)'}}>Category<input value={editCategory} onChange={e=>setEditCategory(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)'}}/></label>
          <label className="text-xs font-semibold" style={{color:'var(--ink)'}}>Subcategory<input value={editSubcategory} onChange={e=>setEditSubcategory(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:'var(--line)'}}/></label>
        </div>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>{setEditingItem(null);setItemError(null);}} disabled={savingItem} className="rounded-lg border px-4 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'var(--gray)'}}>Cancel</button><button type="button" onClick={saveMenuItem} disabled={savingItem} className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50" style={{background:'var(--orange)'}}><Check className="h-4 w-4"/>{savingItem?'Saving…':'Save changes'}</button></div>
      </section>}
      {Object.keys(menuByCategory).length === 0 ? (
        <p className="text-[12px] mb-6" style={{ color: 'var(--gray)' }}>No menu items yet.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {Object.entries(menuByCategory).map(([cat, items]) => (
            <div key={cat} className="p-3.5 rounded-[10px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide mb-2 capitalize" style={{ color: 'var(--gray)' }}>
                {cat}
              </p>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-2 py-1.5">
                    <div className="min-w-0 flex-1"><span className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{item.name}</span><span className="ml-2 text-[10px] font-semibold" style={{color:item.is_available?'#207245':'#B42318'}}>{item.is_available?'Active':'Disabled'}</span></div>
                    <span className="text-[12px]" style={{ color: 'var(--gray)' }}>₦{Number(item.price).toLocaleString()}</span>
                    <button type="button" onClick={()=>{setEditingItem(item);setEditName(item.name);setEditPrice(String(item.price));setEditCategory(item.category??'');setEditSubcategory(item.subcategory??'');setItemError(null);setItemNotice(null);}} className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold" style={{borderColor:'var(--line)',color:'var(--orange)'}}>Edit</button>
                    <button type="button" disabled={busyItemId===item.id} onClick={()=>toggleMenuItem(item)} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50" style={{borderColor:'var(--line)',color:item.is_available?'#B42318':'#207245'}}><Power className="h-3 w-3"/>{busyItemId===item.id?'Saving…':item.is_available?'Disable':'Reactivate'}</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>Order history</p>
      {orders.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--gray)' }}>No orders yet.</p>
      ) : (
        <div className="space-y-1.5">
          {orders.slice(0, 100).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-2.5 rounded-[8px]" style={{ border: '1px solid var(--line)' }}>
              <span className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
                {new Date(o.placed_at).toLocaleString()}
              </span>
              <span className="text-[12px] capitalize" style={{ color: 'var(--ink)' }}>{o.status}</span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>₦{Number(o.subtotal).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-[10px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>{label}</p>
      <p className="text-[15px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>{value}</p>
    </div>
  );
}
