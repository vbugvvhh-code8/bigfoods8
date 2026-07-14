'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function usePaymentStatus(restaurantId?: string) {
  const supabase = getBrowserSupabase();
  const [verificationPaid, setVerificationPaid] = useState(false);
  const [promotionPaid, setPromotionPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setLoading(true);

    supabase
      .from('transactions')
      .select('type')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'success')
      .then(({ data }) => {
        if (cancelled) return;
        const types = new Set((data ?? []).map((t) => t.type));
        setVerificationPaid(types.has('verification_fee'));
        setPromotionPaid(types.has('promotion'));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, nonce, supabase]);

  return { verificationPaid, promotionPaid, loading, refresh: () => setNonce((n) => n + 1) };
}
