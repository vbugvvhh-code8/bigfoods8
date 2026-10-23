'use client';

import {useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  selected_options?: { group_id: string; option_id: string; quantity?: number }[];
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

async function throwFunctionError(error: any, fallback: string): Promise<never> {
  let message = error?.message ?? fallback;
  try {
    if (typeof error?.context?.json === 'function') {
      const payload = await error.context.json();
      message = payload?.error ?? payload?.message ?? message;
    }
  } catch {
    // The response may not contain JSON; retain the SDK message.
  }
  throw new Error(message || fallback);
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
          expected_total: params.expectedTotal,
          callbackOrigin: window.location.origin,
        },
      });
      if (fnError) await throwFunctionError(fnError, 'Could not start payment. Try again.');
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
        expected_total: params.expectedTotal,
        callbackOrigin: window.location.origin, payment_mode: 'link',
      }});
      if (init.error) await throwFunctionError(init.error, 'Could not prepare the payment link. Try again.');
      if (init.data?.error) throw new Error(init.data.error);
      if (!init.data?.reference) throw new Error('Could not prepare payment link');
      const created = await supabase.functions.invoke('create-order-payment-link', {body: {reference: init.data.reference}});
      if (created.error) await throwFunctionError(created.error, 'Could not create the payment link. Try again.');
      if (created.data?.error) throw new Error(created.data.error);
      if (!created.data?.payment_url) throw new Error('Could not create payment link');
      setPaymentLink(created.data.payment_url);
      return created.data.payment_url;
    } catch (e: any) { setError(e?.message ?? 'Could not create payment link. Try again.'); return null; }
    finally { setIsSubmitting(false); }
  };
  return {initializePayment, createPaymentLink, paymentLink, isSubmitting, error};
}
