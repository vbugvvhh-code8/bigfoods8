'use client';

import { useState } from 'react';
import { mutate as globalMutate } from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';

export default function usePromotionAction() {
  const supabase = getBrowserSupabase();
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  async function reviewPromotion(id: string, action: 'approve' | 'reject') {
    setLoadingIds((s) => [...s, id]);
    const { error } = await supabase.functions.invoke('admin-manage-promotion', {
      body: { action, promotion_id: id },
    });
    await globalMutate('admin-query:promotions_with_restaurants');
    setLoadingIds((s) => s.filter((x) => x !== id));
    if (error) throw error;
  }

  async function toggleFeatured(restaurantId: string, feature: boolean) {
    setLoadingIds((s) => [...s, restaurantId]);
    const { error } = await supabase.functions.invoke('admin-manage-promotion', {
      body: { action: feature ? 'feature' : 'unfeature', restaurant_id: restaurantId },
    });
    await globalMutate('admin-query:restaurants');
    setLoadingIds((s) => s.filter((x) => x !== restaurantId));
    if (error) throw error;
  }

  return { reviewPromotion, toggleFeatured, loadingIds };
}
