'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import MenuItemForm from '@/components/restaurant/dashboard/MenuItemForm';
import getBrowserSupabase from '@/lib/supabase/client';
import type { MenuItem } from '@/types/database';
import type { MenuItemUpdate, NewMenuItem } from '@/hooks/useMenuItems';

export default function AdminMenuItemEditPage() {
  const params = useParams<{ id: string; itemId: string }>();
  const router = useRouter();
  const [supabase] = useState(() => getBrowserSupabase());
  const [restaurantName, setRestaurantName] = useState('');
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params?.id || !params?.itemId) return;
    setLoading(true); setError(null);
    const [{ data: restaurant, error: restaurantError }, { data, error: itemError }] = await Promise.all([
      supabase.from('restaurants').select('name').eq('id', params.id).single(),
      supabase.from('menu_items').select('*').eq('id', params.itemId).eq('restaurant_id', params.id).single(),
    ]);
    if (restaurantError || itemError || !data) {
      setError('Could not load this menu item. Check the restaurant and item IDs, then refresh.');
      setItem(null);
    } else {
      setRestaurantName(restaurant?.name ?? 'Restaurant');
      setItem(data as MenuItem);
    }
    setLoading(false);
  }, [params?.id, params?.itemId, supabase]);

  useEffect(() => { void load(); }, [load]);

  async function savePatch(id: string, patch: MenuItemUpdate) {
    setSaving(true); setError(null);
    try {
      const { data, error: updateError } = await supabase.from('menu_items').update(patch)
        .eq('id', id).eq('restaurant_id', params.id).select('*').single();
      if (updateError) throw updateError;
      setItem(data as MenuItem);
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save menu item changes.';
      setError(message);
      throw e;
    } finally { setSaving(false); }
  }

  async function createNotAllowed(_newItem: NewMenuItem): Promise<unknown> {
    return undefined;
  }

  if (loading) return <p className="py-8 text-center text-sm" style={{color:'var(--gray')}}><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading menu item…</p>;
  if (!item) return <div><PageHeader title="Edit menu item" subtitle={restaurantName}/><p role="alert" className="rounded-xl p-4 text-sm" style={{background:'#FCE8E6',color:'#B42318'}}>{error ?? 'Menu item not found.'}</p><button type="button" onClick={()=>router.back()} className="mt-4 rounded-lg border px-4 py-2 text-sm">Go back</button></div>;

  return <main className="mx-auto max-w-4xl">
    <button type="button" onClick={()=>router.push('/admin/restaurants/'+params.id)} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold" style={{color:'var(--orange)'}}><ArrowLeft className="h-4 w-4"/> Back to restaurant</button>
    <PageHeader title="Edit menu item" subtitle={restaurantName+' · Full menu-item editor'}/>
    {error && <p role="alert" className="mb-4 rounded-lg p-3 text-sm" style={{background:'#FCE8E6',color:'#B42318'}}>{error}</p>}
    {saving && <p role="status" className="mb-3 text-xs" style={{color:'var(--gray)'}}>Saving changes…</p>}
    <MenuItemForm restaurantId={params.id} existingItem={item} onSubmit={createNotAllowed} onUpdate={savePatch} onDone={()=>router.push('/admin/restaurants/'+params.id)} onCancel={()=>router.push('/admin/restaurants/'+params.id)}/>
  </main>;
}
