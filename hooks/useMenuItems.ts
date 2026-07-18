'use client';

import useSWR from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';
import type { MenuItem } from '@/types/database';

export interface NewMenuItem {
  name: string;
  price: number;
  category?: string;
  subcategory?: string;
  image_urls: string[]; // 2–3 images, enforced by a DB check constraint
}

export interface MenuItemUpdate {
  name?: string;
  price?: number;
  category?: string | null;
  subcategory?: string | null;
  image_urls?: string[];
}

export function useMenuItems(restaurantId?: string) {
  const supabase = getBrowserSupabase();

  const { data, isLoading, error, mutate } = useSWR(
    restaurantId ? ['menu-items', restaurantId] : null,
    async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category', { ascending: true })
        .order('subcategory', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as MenuItem[];
    }
  );

  async function addMenuItem(item: NewMenuItem) {
    if (!restaurantId) throw new Error('Missing restaurant');
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        name: item.name,
        price: item.price,
        category: item.category ?? null,
        subcategory: item.subcategory ?? null,
        image_urls: item.image_urls,
        image_url: item.image_urls[0], // keep the legacy single-image column in sync
      })
      .select()
      .single();
    if (error) throw error;
    mutate();
    return data as MenuItem;
  }

  async function updateMenuItem(id: string, patch: MenuItemUpdate) {
    const update: Record<string, unknown> = { ...patch };
    if (patch.image_urls) update.image_url = patch.image_urls[0];
    const { data, error } = await supabase.from('menu_items').update(update).eq('id', id).select().single();
    if (error) throw error;
    mutate();
    return data as MenuItem;
  }

  async function deleteMenuItem(id: string) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
    mutate();
  }

  return {
    menuItems: data ?? [],
    isLoading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    mutate,
  };
}
