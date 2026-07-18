'use client';

import {useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type {CartItem} from '@/hooks/useCart';

interface InitializeParams {
  restaurantId: string;
  items: CartItem[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  tipAmount: number;
}

export function useCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  const initializePayment = async (params: InitializeParams) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const {data, error: fnError} = await supabase.functions.invoke('initialize-order-payment', {
        body: {
          restaurant_id: params.restaurantId,
          items: params.items.map((i) => ({menu_item_id: i.id, quantity: i.quantity})),
          delivery_address: params.deliveryAddress || null,
          delivery_lat: params.deliveryLat,
          delivery_lng: params.deliveryLng,
          tip_amount: params.tipAmount,
          callbackOrigin: window.location.origin,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (!data?.authorization_url) throw new Error('Could not start payment');
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e?.message ?? 'Could not start payment. Try again.');
      setIsSubmitting(false);
    }
  };

  return {initializePayment, isSubmitting, error};
}
