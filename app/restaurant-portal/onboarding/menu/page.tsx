'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import type { MenuItem } from '@/types/database';
import SafeImage from '@/components/ui/SafeImage';
import { useMenuItems } from '@/hooks/useMenuItems';
import useRestaurant from '@/hooks/useRestaurant';
import MenuItemForm from '@/components/restaurant/dashboard/MenuItemForm';

export default function MenuStepPage() {
  const router = useRouter();
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { menuItems, isLoading: itemsLoading, addMenuItem, updateMenuItem, deleteMenuItem } = useMenuItems(restaurant?.id);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function removeItem(id: string, name: string) {
    if (!confirm('Remove "' + name + '" from your menu?')) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteMenuItem(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove this item.');
    } finally {
      setDeletingId(null);
    }
  }

  if (restaurantLoading) {
    return <p className="py-6 text-center text-sm" style={{color:'var(--gray)'}}>Loading…</p>;
  }

  if (!restaurant) {
    return <p className="py-6 text-center text-sm" style={{color:'var(--gray)'}}>Restaurant details could not be loaded. Refresh and try again.</p>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl pb-10">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{color:'var(--orange)'}}>Restaurant setup · Menu</p>
        <h1 className="mt-1 text-2xl font-bold" style={{color:'var(--ink)',fontFamily:"'Space Grotesk', sans-serif"}}>Build your menu</h1>
        <p className="mt-1 text-sm leading-6" style={{color:'var(--gray)'}}>Add at least one dish to continue. The same guided editor is used here and in your dashboard.</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg p-3 text-xs" style={{background:'#FCE8E6',color:'var(--red)'}}>{error}</p>}

      {!showForm && (
        <button type="button" onClick={() => { setEditingItem(undefined); setShowForm(true); }} className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm font-bold" style={{borderColor:'var(--orange)',color:'var(--orange)',background:'var(--white)'}}>
          <Plus className="h-4 w-4" /> Add a menu item
        </button>
      )}

      {showForm && (
        <div className="mb-6">
          <MenuItemForm
            restaurantId={restaurant.id}
            existingItem={editingItem}
            onSubmit={addMenuItem}
            onUpdate={updateMenuItem}
            onDone={() => { setShowForm(false); setEditingItem(undefined); setError(null); }}
            onCancel={() => { setShowForm(false); setEditingItem(undefined); }}
          />
        </div>
      )}

      <section className="mb-6 rounded-xl border p-4" style={{borderColor:'var(--line)',background:'var(--white)'}}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold" style={{color:'var(--ink)'}}>Your menu items</h2>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{background:'var(--peach)',color:'var(--ink)'}}>{menuItems.length} added</span>
        </div>
        {itemsLoading ? <p className="py-5 text-center text-xs" style={{color:'var(--gray)'}}>Loading your items…</p> : menuItems.length === 0 ? (
          <p className="rounded-lg p-4 text-xs leading-5" style={{background:'var(--peach)',color:'var(--gray)'}}>No dishes added yet. Add your first item to continue setup.</p>
        ) : (
          <div className="divide-y" style={{borderColor:'var(--line)'}}>
            {menuItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                {item.image_url ? <SafeImage src={item.image_url} alt={item.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <div className="h-12 w-12 shrink-0 rounded-lg" style={{background:'var(--peach)'}} />}
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold" style={{color:'var(--ink)'}}>{item.name}</p><p className="mt-0.5 text-xs" style={{color:'var(--gray)'}}>{item.category || 'Uncategorized'} · ₦{Number(item.price).toLocaleString()}</p></div>
                <button type="button" onClick={() => { setEditingItem(item); setShowForm(true); setError(null); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border" style={{borderColor:'var(--line)',color:'var(--orange)'}} aria-label={'Edit ' + item.name}><Pencil className="h-4 w-4" /></button>
                <button type="button" disabled={deletingId === item.id} onClick={() => removeItem(item.id,item.name)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border disabled:opacity-50" style={{borderColor:'var(--line)',color:'var(--red)'}} aria-label={'Remove ' + item.name}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <button type="button" disabled={menuItems.length < 1 || itemsLoading} onClick={() => router.push('/restaurant-portal/dashboard')} className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-40" style={{background:'var(--orange)'}}>
        Continue to dashboard <ArrowRight className="h-4 w-4" />
      </button>
    </main>
  );
}
