'use client';

import useSWR from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';
import type { MenuItem } from '@/types/database';

export interface NewMenuItem {
  name: string;
  price: number;
  category?: string;
  subcategory?: string;
  image_urls: string[];
}

export interface MenuItemUpdate {
  name?: string;
  price?: number;
  category?: string | null;
  subcategory?: string | null;
  image_urls?: string[];
}

export function useMenuItems(restaurantId: string | undefined) {
  const supabase = getBrowserSupabase();

  const { data, isLoading, error, mutate } = useSWR(
    restaurantId ? ['menu-items', restaurantId] : null,
    async () => {
      const { data, error } = await supabase
        .from('visible_menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as MenuItem[];
    }
  );

  async function addMenuItem(item: NewMenuItem) {
    if (!restaurantId) throw new Error('No restaurant selected');
    const { error } = await supabase.from('menu_items').insert({
      ...item,
      restaurant_id: restaurantId,
    });
    if (error) throw error;
    await mutate();
  }

  async function updateMenuItem(id: string, patch: MenuItemUpdate) {
    const { error } = await supabase.from('menu_items').update(patch).eq('id', id);
    if (error) throw error;
    await mutate();
  }

  async function deleteMenuItem(id: string) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
    await mutate();
  }

  return {
    menuItems: data ?? [],
    isLoading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}