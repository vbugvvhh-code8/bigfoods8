'use client';

import {useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  selected_options?: { group_id: string; option_id: string }[];
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
  expectedTotal?: number;
}

export function useCheckout() {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
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
      if (params.expectedTotal != null && Number.isFinite(Number(data.total_amount)) && Number(data.total_amount) !== params.expectedTotal) {
        throw new Error(`The checkout estimate (₦${params.expectedTotal.toLocaleString()}) does not match the payment amount (₦${Number(data.total_amount).toLocaleString()}). No payment was started. Refresh checkout and try again.`);
      }
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e?.message ?? 'Could not start payment. Try again.');
      setIsSubmitting(false);
    }
  };

  const createPaymentLink = async (params: InitializeParams): Promise<string | null> => {
    setIsSubmitting(true); setError(null); setPaymentLink(null);
    try {
      const init = await supabase.functions.invoke('initialize-order-payment', {body: {
        groups: params.groups, delivery_address: params.deliveryAddress || null,
        delivery_lat: params.deliveryLat, delivery_lng: params.deliveryLng,
        delivery_note: params.deliveryNote || null, tip_amount: params.tipAmount,
        callbackOrigin: window.location.origin, payment_mode: 'link',
      }});
      if (init.error) throw init.error;
      if (init.data?.error) throw new Error(init.data.error);
      if (!init.data?.reference) throw new Error('Could not prepare payment link');
      const created = await supabase.functions.invoke('create-order-payment-link', {body: {reference: init.data.reference}});
      if (created.error) throw created.error;
      if (created.data?.error) throw new Error(created.data.error);
      if (!created.data?.payment_url) throw new Error('Could not create payment link');
      setPaymentLink(created.data.payment_url);
      return created.data.payment_url;
    } catch (e: any) { setError(e?.message ?? 'Could not create payment link. Try again.'); return null; }
    finally { setIsSubmitting(false); }
  };
  return {initializePayment, createPaymentLink, paymentLink, isSubmitting, error};
}
