'use client';

import {useCallback, useEffect, useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type {SavedAddress} from '@/types/database';

export function useSavedAddresses() {
  const supabase = getBrowserSupabase();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    // RLS ("Customers manage own saved addresses") scopes this automatically.
    const {data} = await supabase.from('saved_addresses').select('*').order('created_at', {ascending: false});
    setAddresses(data ?? []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAddress = useCallback(
    async (label: string, lat: number, lng: number, address?: string) => {
      const {data: userData} = await supabase.auth.getUser();
      if (!userData.user) return null;
      const {data, error} = await supabase
        .from('saved_addresses')
        .insert({customer_id: userData.user.id, label, lat, lng, address: address ?? null})
        .select()
        .single();
      if (error) return null;
      await load();
      return data as SavedAddress;
    },
    [supabase, load]
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      await supabase.from('saved_addresses').delete().eq('id', id);
      await load();
    },
    [supabase, load]
  );

  return {addresses, isLoading, saveAddress, deleteAddress};
}
