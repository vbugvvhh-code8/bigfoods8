'use client';

import {useState, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {useCart} from '@/hooks/useCart';
import {useRestaurant} from '@/hooks/useRestaurants';
import {useCheckout} from '@/hooks/useCheckout';
import usePricingConfig from '@/hooks/usePricingConfig';
import {haversineKm} from '@/lib/customer/distance';
import {AuthGate} from '@/components/customer/shell/AuthGate';
import {EmptyState} from '@/components/customer/shared/EmptyState';
import {CartSummary} from '@/components/customer/checkout/CartSummary';
import {DeliveryLocationPicker, type DeliveryPoint} from '@/components/customer/checkout/DeliveryLocationPicker';
import {TipSelector} from '@/components/customer/checkout/TipSelector';
import {PriceBreakdown} from '@/components/customer/checkout/PriceBreakdown';
import {ShoppingBag} from 'lucide-react';

function CheckoutContent() {
  const router = useRouter();
  const {items, groups, total: subtotal, isMultiRestaurant} = useCart();
  const {prices} = usePricingConfig(['platform_fee', 'delivery_rate_per_km', 'minimum_delivery_fee']);
  const {initializePayment, isSubmitting, error: paymentError} = useCheckout();

  const [deliveryPoint, setDeliveryPoint] = useState<DeliveryPoint | null>(null);
  const [note, setNote] = useState('');
  const [tipAmount, setTipAmount] = useState(0);

  // Rough client-side estimate only -- the real fee (with proper batch
  // clustering for 3+ restaurants) is computed server-side at payment init.
  // This is here purely so the customer sees a believable total before paying.
  const {restaurant: singleRestaurant} = useRestaurant(!isMultiRestaurant ? groups[0]?.restaurantId ?? '' : '');
  const restaurantResults = groups.map((g) => useRestaurant(g.restaurantId));

  const minDeliveryFee = prices.minimum_delivery_fee ?? 1000;
  const platformFee = (prices.platform_fee ?? 500) * groups.length;

  const estimatedDeliveryFee = useMemo(() => {
    if (!deliveryPoint || !prices.delivery_rate_per_km) return null;
    if (!isMultiRestaurant) {
      if (!singleRestaurant?.latitude || !singleRestaurant?.longitude) return null;
      const km = haversineKm(singleRestaurant.latitude, singleRestaurant.longitude, deliveryPoint.lat, deliveryPoint.lng);
      return Math.max(Math.round(km * prices.delivery_rate_per_km), minDeliveryFee);
    }
    // Multi-restaurant: rough estimate assuming one batch per restaurant
    // visited independently to the same address (real clustering happens
    // server-side and may combine up to 3 into one trip, which would be
    // cheaper than this estimate -- intentionally conservative).
    let total = 0;
    let anyMissing = false;
    for (const r of restaurantResults) {
      if (!r.restaurant?.latitude || !r.restaurant?.longitude) { anyMissing = true; continue; }
      const km = haversineKm(r.restaurant.latitude, r.restaurant.longitude, deliveryPoint.lat, deliveryPoint.lng);
      total += Math.max(Math.round(km * prices.delivery_rate_per_km), minDeliveryFee);
    }
    return anyMissing && total === 0 ? null : total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryPoint, singleRestaurant, restaurantResults.map((r) => r.restaurant?.id).join(','), prices.delivery_rate_per_km]);

  if (items.length === 0) {
    return (
      <div className="w-full max-w-[380px] mx-auto px-4 py-8">
        <EmptyState
          icon={<ShoppingBag className="w-5 h-5" />}
          title="Your cart is empty"
          message="Add something from a restaurant first."
        />
        <button
          onClick={() => router.push('/order')}
          className="w-full mt-3 py-2.5 rounded-xl text-[12.5px] font-semibold text-white"
          style={{background: 'var(--orange)'}}
        >
          Browse restaurants
        </button>
      </div>
    );
  }

  const handlePay = () => {
    if (!deliveryPoint) return;
    initializePayment({
      groups: groups.map((g) => ({
        restaurant_id: g.restaurantId,
        items: g.items.map((i) => ({menu_item_id: i.id, quantity: i.quantity})),
      })),
      deliveryAddress: deliveryPoint.label + (note ? ` — ${note}` : ''),
      deliveryLat: deliveryPoint.lat,
      deliveryLng: deliveryPoint.lng,
      deliveryNote: note,
      tipAmount,
    });
  };

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6 pb-28">
      <button onClick={() => router.back()} className="flex items-center gap-2.5 mb-4" style={{color: 'var(--gray)'}}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[12.5px]">Back</span>
      </button>

      <h1 className="font-display text-[19px] font-semibold" style={{color: 'var(--ink)'}}>
        Checkout
      </h1>
      <p className="text-[12px] mt-0.5" style={{color: 'var(--gray)'}}>
        {isMultiRestaurant ? `${groups.length} restaurants` : groups[0]?.restaurantName}
      </p>

      {isMultiRestaurant && (
        <div className="mt-3 p-3 rounded-xl text-[11.5px]" style={{background: 'var(--peach)', color: 'var(--ink)'}}>
          Ordering from {groups.length} restaurants means this may arrive as separate deliveries — each rider
          brings their own portion, and you'll get each one's contact info and their own drop-off code.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {groups.map((g) => (
          <div key={g.restaurantId}>
            {isMultiRestaurant && (
              <p className="text-[12px] font-semibold mb-1.5" style={{color: 'var(--ink)'}}>
                {g.restaurantName}
              </p>
            )}
            <CartSummary restaurantId={g.restaurantId} />
          </div>
        ))}
      </div>

      <DeliveryLocationPicker selected={deliveryPoint} onSelect={setDeliveryPoint} note={note} onNoteChange={setNote} />

      <TipSelector value={tipAmount} onChange={setTipAmount} />

      <PriceBreakdown subtotal={subtotal} platformFee={platformFee} deliveryFee={estimatedDeliveryFee} tipAmount={tipAmount} />

      {paymentError && (
        <p className="text-[12px] mt-3 text-center" style={{color: 'var(--red, #C1453A)'}}>
          {paymentError}
        </p>
      )}

      <div className="fixed bottom-20 lg:bottom-4 left-0 right-0 px-4 z-30">
        <div className="max-w-[380px] lg:max-w-2xl mx-auto">
          <button
            onClick={handlePay}
            disabled={!deliveryPoint || isSubmitting}
            className="w-full py-3.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
            style={{background: 'var(--ink)', boxShadow: '0 10px 30px rgba(32,28,26,0.25)'}}
          >
            {isSubmitting
              ? 'Starting payment…'
              : deliveryPoint
              ? `Pay ₦${(subtotal + platformFee + (estimatedDeliveryFee ?? 0) + tipAmount).toLocaleString()}`
              : 'Choose a delivery location to pay'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGate>
      <CheckoutContent />
    </AuthGate>
  );
}
