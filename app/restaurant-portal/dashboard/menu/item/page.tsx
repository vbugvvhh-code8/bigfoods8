'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import useRestaurant from '@/hooks/useRestaurant';
import { useMenuItems } from '@/hooks/useMenuItems';
import MenuItemForm from '@/components/restaurant/dashboard/MenuItemForm';

export default function MenuItemEditorPage() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setEditId(new URLSearchParams(window.location.search).get('edit'));
  }, []);
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { menuItems, isLoading: itemsLoading, addMenuItem, updateMenuItem } = useMenuItems(restaurant?.id);
  const item = editId ? menuItems.find((entry) => entry.id === editId) : undefined;

  if (editId === undefined || restaurantLoading || (editId && itemsLoading)) {
    return <p className="py-10 text-center text-sm" style={{ color: 'var(--gray)' }}>Loading menu item…</p>;
  }

  if (!restaurant) {
    return <p className="py-10 text-center text-sm" style={{ color: 'var(--gray)' }}>Restaurant details could not be loaded. Refresh and try again.</p>;
  }

  if (editId && !item) {
    return <div className="mx-auto max-w-2xl py-8"><p className="mb-4 text-sm" style={{color:'var(--gray)'}}>This menu item could not be found in your restaurant menu.</p><button type="button" onClick={() => router.push('/restaurant-portal/dashboard/menu')} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:'var(--orange)'}}>Back to menu</button></div>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl pb-10">
      <button type="button" onClick={() => router.push('/restaurant-portal/dashboard/menu')} className="mb-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{borderColor:'var(--line)',color:'var(--ink)'}}>
        <ArrowLeft className="h-4 w-4" /> Back to menu
      </button>
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{color:'var(--ink)',fontFamily:"'Space Grotesk', sans-serif"}}>{item ? 'Edit menu item' : 'Add menu item'}</h1>
        <p className="mt-1 text-sm leading-6" style={{color:'var(--gray)'}}>Add the essentials first, then photos, variants, and preparation details. You can move between steps without losing your entries.</p>
      </div>
      <MenuItemForm
        key={item?.id ?? 'new-menu-item'}
        restaurantId={restaurant.id}
        existingItem={item}
        onSubmit={addMenuItem}
        onUpdate={updateMenuItem}
        onDone={() => router.push('/restaurant-portal/dashboard/menu')}
        onCancel={() => router.push('/restaurant-portal/dashboard/menu')}
      />
    </main>
  );
}
