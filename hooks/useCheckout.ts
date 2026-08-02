'use client';

import {useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
}

interface RestaurantGroupInput {
  restaurant_id: string;
  items: OrderItemInput[];
}

interface InitializeParams {
  groups: RestaurantGroupInput[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryNote?: string;
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
          groups: params.groups,
          delivery_address: params.deliveryAddress || null,
          delivery_lat: params.deliveryLat,
          delivery_lng: params.deliveryLng,
          delivery_note: params.deliveryNote || null,
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
