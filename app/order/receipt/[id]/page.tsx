'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {ArrowLeft, Loader2, ReceiptText} from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import {AuthGate} from '@/components/customer/shell/AuthGate';

type ReceiptData = {
  id: string;
  placed_at: string;
  status: string;
  payment_status: string;
  subtotal: number;
  platform_fee: number;
  delivery_fee: number;
  tip_amount: number;
  delivery_code: string | null;
  delivery_batch_id: string | null;
  delivery_address: string | null;
  restaurant: {name: string | null} | null;
  items: {quantity: number; unit_price: number; selected_options: {groupName: string; optionName: string; price: number; quantity?: number}[]; menu_item: {name: string | null} | null}[];
  transaction: {reference: string; amount: number; created_at: string; status: string} | null;
  batch: {delivery_fee: number; tip_amount: number; delivery_code: string | null} | null;
};

function ReceiptContent() {
  const params = useParams<{id: string}>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = getBrowserSupabase();
      const {data: auth} = await supabase.auth.getUser();
      if (!auth.user) {
        if (!cancelled) { setError('Sign in to view this receipt.'); setLoading(false); }
        return;
      }
      const {data: order, error: orderError} = await supabase
        .from('orders')
        .select('id, placed_at, status, payment_status, subtotal, platform_fee, delivery_fee, tip_amount, delivery_code, delivery_batch_id, delivery_address, restaurant:restaurants(name), order_items(quantity, unit_price, selected_options, menu_item:menu_items(name)), delivery_batches(delivery_fee, tip_amount, delivery_code)')
        .eq('id', params.id)
        .eq('customer_id', auth.user.id)
        .eq('payment_status', 'paid')
        .maybeSingle();
      if (orderError || !order) {
        if (!cancelled) { setError('We could not find a paid order receipt for this order.'); setLoading(false); }
        return;
      }
      const {data: transaction} = await supabase
        .from('transactions')
        .select('reference, amount, created_at, status')
        .eq('customer_id', auth.user.id)
        .eq('order_id', order.id)
        .eq('type', 'order_payment')
        .eq('status', 'success')
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle();
      const restaurant = Array.isArray(order.restaurant) ? order.restaurant[0] : order.restaurant;
      const batchRaw = Array.isArray(order.delivery_batches) ? order.delivery_batches[0] : order.delivery_batches;
      const items = (order.order_items ?? []).map((item: any) => ({
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        selected_options: (item.selected_options ?? []) as {groupName: string; optionName: string; price: number; quantity?: number}[],
        menu_item: Array.isArray(item.menu_item) ? item.menu_item[0] : item.menu_item,
      }));
      const result: ReceiptData = {
        ...order,
        subtotal: Number(order.subtotal ?? 0),
        platform_fee: Number(order.platform_fee ?? 0),
        delivery_fee: Number(order.delivery_fee ?? 0),
        tip_amount: Number(order.tip_amount ?? 0),
        restaurant,
        items,
        transaction: transaction ? {...transaction, amount: Number(transaction.amount)} : null,
        batch: batchRaw ? {
          delivery_fee: Number(batchRaw.delivery_fee ?? 0),
          tip_amount: Number(batchRaw.tip_amount ?? 0),
          delivery_code: batchRaw.delivery_code ?? null,
        } : null,
      } as ReceiptData;
      if (!cancelled) { setReceipt(result); setLoading(false); }
    }
    load().catch(() => {
      if (!cancelled) { setError('Unable to load the receipt. Please try again.'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) return <div className="py-16 text-center"><Loader2 className="w-7 h-7 mx-auto animate-spin" /><p className="mt-3 text-sm">Loading receipt…</p></div>;
  if (error || !receipt) return <div className="max-w-md mx-auto px-4 py-12"><p className="text-sm">{error || 'Receipt unavailable.'}</p><Link className="inline-flex gap-2 mt-5 text-sm underline" href="/order/orders"><ArrowLeft className="w-4 h-4" /> Back to orders</Link></div>;

  const deliveryFee = receipt.delivery_batch_id ? (receipt.batch?.delivery_fee ?? 0) : receipt.delivery_fee;
  const tip = receipt.delivery_batch_id ? (receipt.batch?.tip_amount ?? 0) : receipt.tip_amount;
  const total = receipt.subtotal + receipt.platform_fee + deliveryFee + tip;

  return <main className="receipt-page max-w-md mx-auto px-4 py-8">
    <Link href={`/order/track/${receipt.id}`} className="inline-flex items-center gap-2 text-sm mb-5" style={{color:'var(--gray)'}}><ArrowLeft className="w-4 h-4" /> Back to tracking</Link>
    <section id="printable-receipt" className="receipt-body rounded-2xl border p-5" style={{borderColor:'var(--line)', color:'var(--ink)'}}>
      <div className="flex items-center gap-3 mb-5"><ReceiptText className="w-7 h-7" style={{color:'var(--orange)'}}/><div><h1 className="font-display text-xl font-semibold">Order receipt</h1><p className="text-xs" style={{color:'var(--gray)'}}>BigFoods · Paid</p></div></div>
      <div className="text-sm mb-4"><p className="font-semibold">{receipt.restaurant?.name ?? 'Restaurant'}</p><p className="text-xs mt-1" style={{color:'var(--gray)'}}>Order #{receipt.id.slice(0,8).toUpperCase()}</p><p className="text-xs" style={{color:'var(--gray)'}}>{new Date(receipt.placed_at).toLocaleString()}</p></div>
      <div className="border-y py-4 space-y-3" style={{borderColor:'var(--line)'}}>
        {receipt.items.map((item, index) => <div key={index} className="flex justify-between gap-3 text-sm"><span>{item.quantity} × {item.menu_item?.name ?? 'Menu item'}{item.selected_options.length > 0 && <span className="mt-1 block text-[11px]" style={{color:'var(--gray)'}}>{item.selected_options.map((option) => `${option.groupName}: ${option.quantity && option.quantity > 1 ? `${option.quantity} × ` : ''}${option.optionName}`).join(' · ')}</span>}</span><span>₦{(item.quantity * item.unit_price).toLocaleString()}</span></div>)}
      </div>
      <div className="space-y-2 text-sm py-4">
        <div className="flex justify-between"><span>Items subtotal</span><span>₦{receipt.subtotal.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Platform fee</span><span>₦{receipt.platform_fee.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Delivery</span><span>₦{deliveryFee.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Tip</span><span>₦{tip.toLocaleString()}</span></div>
        <div className="flex justify-between font-bold text-base border-t pt-3" style={{borderColor:'var(--line)'}}><span>Total paid</span><span>₦{total.toLocaleString()}</span></div>
      </div>
      <div className="rounded-xl p-3 text-sm mt-1" style={{background:'var(--peach)'}}>
        <p className="text-xs" style={{color:'var(--gray)'}}>Delivery code</p>
        <p className="font-display font-bold tracking-widest text-xl" style={{color:'var(--orange)'}}>{receipt.batch?.delivery_code ?? receipt.delivery_code ?? 'Shown in tracking'}</p>
      </div>
      <div className="mt-4 text-xs break-all" style={{color:'var(--gray)'}}>
        <p>Payment reference</p><p className="font-medium mt-1">{receipt.transaction?.reference ?? 'Payment reference unavailable'}</p>
      </div>
      <button onClick={() => window.print()} className="w-full mt-5 rounded-xl py-3 text-sm font-semibold text-white no-print" style={{background:'var(--orange)'}}>Print / Save receipt</button>
    </section>
  </main>;
}

export default function OrderReceiptPage() {
  return <AuthGate><ReceiptContent /></AuthGate>;
}
