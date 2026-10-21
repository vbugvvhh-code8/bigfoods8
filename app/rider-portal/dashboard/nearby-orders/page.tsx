'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';
import useRider from '@/hooks/useRider';

type Offer = { offer_id: string; order_id: string; zone: string | null; status: string; offered_at: string; delivery_address: string | null; delivery_fee: number | null };

export default function NearbyOrdersPage() {
  const { rider, loading: riderLoading } = useRider();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const { data, error } = await supabase.functions.invoke('dispatch-marketplace', { body: { action: 'rider_offers' } });
    if (error || data?.error) setMessage(data?.error ?? 'Could not load order offers. Please try again.');
    else { setOffers((data?.offers ?? []) as Offer[]); setMessage(''); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!rider) return;
    void load();
    if (rider.status !== 'online') return;
    const timer = setInterval(() => { void load(true); }, 10000);
    return () => clearInterval(timer);
  }, [rider?.id, rider?.status, load]);

  async function respond(orderId: string, accept: boolean) {
    setBusy(orderId); setMessage('');
    const { data, error } = await supabase.functions.invoke('dispatch-marketplace', { body: { action: 'respond_offer', order_id: orderId, accept } });
    if (error || data?.error) { setMessage(data?.error ?? error?.message ?? 'Offer unavailable.'); await load(true); }
    else if (accept) router.push('/rider-portal/dashboard/delivery/' + orderId);
    else { setOffers(rows => rows.filter(row => row.order_id !== orderId)); setMessage('Offer rejected.'); }
    setBusy(null);
  }

  if (riderLoading || !rider) return <p className="py-8 text-center">Loading rider account…</p>;
  return <div className="space-y-4">
    <PageHeader title="Nearby orders" subtitle="Offers for paid orders in your service area" />
    {message && <p role="alert" className="rounded-xl p-3 text-sm">{message}</p>}
    {rider.status !== 'online' && <p className="rounded-xl p-3 text-sm">Go online from your dashboard to receive offers.</p>}
    {loading ? <p className="py-8 text-center">Loading offers…</p> : offers.length === 0 ?
      <div className="rounded-2xl border border-dashed p-7 text-center"><p className="font-medium">No nearby orders right now</p><p className="mt-2 text-sm">This list refreshes automatically while you are online.</p><button onClick={() => { setLoading(true); void load(); }} className="mt-4 rounded-lg px-4 py-2 text-sm text-white" style={{ background: 'var(--orange)' }}>Refresh</button></div> :
      offers.map(offer => <div key={offer.offer_id} className="rounded-2xl p-4 space-y-3" style={{ border: '1px solid var(--line)' }}>
        <div className="flex justify-between gap-3"><div><p className="font-semibold">Order {offer.order_id.slice(0, 8)}</p><p className="text-sm">{offer.zone ?? rider.zone ?? 'Service area'}</p><p className="text-xs opacity-70">{offer.status === 'accepted' ? 'Accepted' : 'Offer available'}</p></div><p className="font-semibold">₦{Number(offer.delivery_fee ?? 0).toLocaleString()}</p></div>
        <p className="text-sm">{offer.status === 'accepted' ? offer.delivery_address ?? 'Open delivery details for destination' : 'Delivery address is shared after acceptance.'}</p>
        {offer.status === 'offered' && <div className="flex gap-2"><button disabled={!!busy} onClick={() => void respond(offer.order_id, false)} className="flex-1 rounded-lg border p-2 text-sm disabled:opacity-50">{busy === offer.order_id ? 'Working…' : 'Reject'}</button><button disabled={!!busy || rider.status !== 'online'} onClick={() => void respond(offer.order_id, true)} className="flex-1 rounded-lg p-2 text-sm text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>{busy === offer.order_id ? 'Working…' : 'Accept'}</button></div>}
        {offer.status === 'accepted' && <button onClick={() => router.push('/rider-portal/dashboard/delivery/' + offer.order_id)} className="w-full rounded-lg p-2 text-sm text-white" style={{ background: 'var(--orange)' }}>Open delivery</button>}
      </div>)}
  </div>;
}
