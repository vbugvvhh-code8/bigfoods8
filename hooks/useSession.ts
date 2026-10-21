'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  role: string | null;
  full_name: string | null;
  phone: string | null;
  status: string | null;
  state: string | null;
  lga: string | null;
  created_at: string | null;
};

export default function useSession() {
  const supabase = getBrowserSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let profileRequest = 0;

    async function loadProfile(nextUser: User | null) {
      const request = ++profileRequest;
      if (!nextUser) {
        if (mounted) {
          setProfile(null);
          setIsAdmin(false);
        }
        return;
      }

      try {
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('id, role, full_name, phone, status, state, lga, created_at')
          .eq('id', nextUser.id)
          .maybeSingle();

        if (profErr) throw profErr;
        const { data: adminData, error: adminErr } = await supabase.rpc('is_admin');
        if (adminErr) console.warn('Could not resolve admin role', adminErr);

        if (!mounted || request !== profileRequest) return;
        setProfile(profData ?? null);
        setIsAdmin(!!adminData);
      } catch (e) {
        if (!mounted || request !== profileRequest) return;
        // A profile/RPC network error must not erase a valid auth session.
        setError(e instanceof Error ? e : new Error('Could not load your profile.'));
      }
    }

    // Subscribe before reading the stored session to avoid missing an auth
    // change between initial hydration and the first session read.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setError(null);
      setLoading(false);
      void loadProfile(nextUser);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        // A transient session-read error is not proof the customer signed out.
        setError(sessionError);
        setLoading(false);
        return;
      }
      const nextUser = data.session?.user ?? null;
      setUser((current) => current ?? nextUser);
      setLoading(false);
      void loadProfile(nextUser);
    }).catch((e) => {
      if (!mounted) return;
      setError(e instanceof Error ? e : new Error('Could not restore your session.'));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, profile, isAdmin, loading, error };
}
