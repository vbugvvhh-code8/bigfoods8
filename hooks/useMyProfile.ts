'use client';

import {useCallback, useEffect, useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type {Profile} from '@/types/database';

export function useMyProfile() {
  const supabase = getBrowserSupabase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const {data: userData} = await supabase.auth.getUser();
      if (cancelled) return;
      // email lives on auth.users, not the profiles table
      setEmail(userData.user?.email ?? null);

      if (!userData.user) {
        setIsLoading(false);
        return;
      }

      const {data, error: profileError} = await supabase.from('profiles').select('*').eq('id', userData.user.id).single();
      if (cancelled) return;
      if (profileError) setError(profileError.message);
      else setProfile(data as Profile);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'lga' | 'state'>>) => {
      if (!profile) return false;
      setIsSaving(true);
      setError(null);
      const {data, error: updateError} = await supabase.from('profiles').update(updates).eq('id', profile.id).select().single();
      setIsSaving(false);
      if (updateError) {
        setError(updateError.message);
        return false;
      }
      setProfile(data as Profile);
      return true;
    },
    [profile, supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  return {profile, email, isLoading, isSaving, error, updateProfile, signOut};
}
