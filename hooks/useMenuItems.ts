'use client';

import useSWR from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';
import type { MenuItem, MenuItemOptionGroup } from '@/types/database';

export interface NewMenuItem {
  name: string;
  price: number;
  category?: string;
  subcategory?: string;
  image_urls: string[]; // 1–3 images, enforced by a DB check constraint
  is_available?: boolean;
  description?: string | null;
  ingredients?: string | null;
  serving_size?: string | null;
  preparation_time_minutes?: number | null;
  allergens?: string[];
  dietary_tags?: string[];
  option_groups?: MenuItemOptionGroup[];
  stock_quantity?: number | null;
  availability_schedule_enabled?: boolean;
  availability_schedule?: { day: number; start: string; end: string }[];
  promotional_price?: number | null;
  promotion_starts_at?: string | null;
  promotion_ends_at?: string | null;
  complementary_item_ids?: string[];
  display_order?: number;
}

export interface MenuItemUpdate {
  name?: string;
  price?: number;
  category?: string | null;
  subcategory?: string | null;
  image_urls?: string[];
  is_available?: boolean;
  description?: string | null;
  ingredients?: string | null;
  serving_size?: string | null;
  preparation_time_minutes?: number | null;
  allergens?: string[];
  dietary_tags?: string[];
  option_groups?: MenuItemOptionGroup[];
  stock_quantity?: number | null;
  availability_schedule_enabled?: boolean;
  availability_schedule?: { day: number; start: string; end: string }[];
  promotional_price?: number | null;
  promotion_starts_at?: string | null;
  promotion_ends_at?: string | null;
  complementary_item_ids?: string[];
  display_order?: number;
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
        .order('display_order', { ascending: true })
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
        name: item.name.trim(),
        price: item.price,
        category: item.category ?? null,
        subcategory: item.subcategory ?? null,
        image_urls: item.image_urls,
        image_url: item.image_urls[0], // keep the legacy single-image column in sync
        is_available: item.is_available ?? true,
        description: item.description ?? null,
        ingredients: item.ingredients ?? null,
        serving_size: item.serving_size ?? null,
        preparation_time_minutes: item.preparation_time_minutes ?? null,
        allergens: item.allergens ?? [],
        dietary_tags: item.dietary_tags ?? [],
        option_groups: item.option_groups ?? [],
        stock_quantity: item.stock_quantity ?? null,
        availability_schedule_enabled: item.availability_schedule_enabled ?? false,
        availability_schedule: item.availability_schedule ?? [],
        promotional_price: item.promotional_price ?? null,
        promotion_starts_at: item.promotion_starts_at ?? null,
        promotion_ends_at: item.promotion_ends_at ?? null,
        complementary_item_ids: item.complementary_item_ids ?? [],
        display_order: item.display_order ?? 0,
      })
      .select()
      .single();
    if (error?.code === '23505') {
      throw new Error('A menu item with this name already exists in your restaurant. Use a different name or edit the existing item.');
    }
    if (error?.code === '23514') {
      throw new Error('The menu item has invalid data. Check the name and required fields, then try again.');
    }
    if (error) throw error;
    mutate();
    return data as MenuItem;
  }

  async function updateMenuItem(id: string, patch: MenuItemUpdate) {
    if (!restaurantId) throw new Error('Missing restaurant');
    const update: Record<string, unknown> = { ...patch };
    if (typeof patch.name === 'string') update.name = patch.name.trim();
    if (patch.image_urls) update.image_url = patch.image_urls[0];
    const { data, error } = await supabase
      .from('menu_items')
      .update(update)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();
    if (error?.code === '23505') {
      throw new Error('A menu item with this name already exists in your restaurant. Use a different name or edit the existing item.');
    }
    if (error?.code === '23514') {
      throw new Error('The menu item has invalid data. Check the name and required fields, then try again.');
    }
    if (error) throw error;
    if (!data) throw new Error('This menu item was not found in your restaurant. Refresh and try again.');
    mutate();
    return data as MenuItem;
  }

  async function deleteMenuItem(id: string) {
    if (!restaurantId) throw new Error('Missing restaurant');
    const { data, error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('This menu item was not found in your restaurant. Refresh and try again.');
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
