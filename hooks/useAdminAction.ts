'use client';

import { useState } from 'react';
import { mutate as globalMutate } from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';

type EntityType = 'restaurant' | 'rider';
type Decision = 'approved' | 'rejected';

const QUERY_KEYS: Record<EntityType, string> = {
  restaurant: 'admin-query:restaurants',
  rider: 'admin-query:riders',
};

export default function useAdminAction() {
  const supabase = getBrowserSupabase();
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  function start(id: string) {
    setLoadingIds((s) => (s.includes(id) ? s : [...s, id]));
  }
  function done(id: string) {
    setLoadingIds((s) => s.filter((x) => x !== id));
  }

  // Generic approval decision — used by both restaurant and rider queues via
  // the same admin-review-application Edge Function (role check + audit log built in).
  async function reviewApplication(entityType: EntityType, id: string, decision: Decision) {
    start(id);
    const key = QUERY_KEYS[entityType];

    globalMutate(
      key,
      (current: any) => current?.map((r: any) => (r.id === id ? { ...r, approval_status: decision } : r)),
      false
    );

    const { error } = await supabase.functions.invoke('admin-review-application', {
      body: { entity_type: entityType, id, decision },
    });

    if (error) {
      await globalMutate(key);
      done(id);
      throw error;
    }

    await globalMutate(key);
    done(id);
  }

  const approveRestaurant = (id: string) => reviewApplication('restaurant', id, 'approved');
  const rejectRestaurant = (id: string) => reviewApplication('restaurant', id, 'rejected');
  const approveRider = (id: string) => reviewApplication('rider', id, 'approved');
  const rejectRider = (id: string) => reviewApplication('rider', id, 'rejected');

  // Direct table write — RLS already allows admin, no Edge Function needed here.
  async function setAcceptingOrders(id: string, isAccepting: boolean) {
    start(id);
    const key = QUERY_KEYS.restaurant;

    globalMutate(
      key,
      (current: any) => current?.map((r: any) => (r.id === id ? { ...r, is_accepting_orders: isAccepting } : r)),
      false
    );

    const { error } = await supabase.from('restaurants').update({ is_accepting_orders: isAccepting }).eq('id', id);

    if (error) {
      await globalMutate(key);
      done(id);
      throw error;
    }

    await globalMutate(key);
    done(id);
  }

  return {
    reviewApplication,
    approveRestaurant,
    rejectRestaurant,
    approveRider,
    rejectRider,
    setAcceptingOrders,
    loadingIds,
  };
}
