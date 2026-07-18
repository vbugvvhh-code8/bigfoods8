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
  const {items, total: subtotal, restaurantId, restaurantName} = useCart();
  const {restaurant} = useRestaurant(restaurantId ?? '');
  const {prices} = usePricingConfig(['platform_fee', 'delivery_rate_per_km']);
  const {initializePayment, isSubmitting, error: paymentError} = useCheckout();

  const [deliveryPoint, setDeliveryPoint] = useState<DeliveryPoint | null>(null);
  const [note, setNote] = useState('');
  const [tipAmount, setTipAmount] = useState(0);

  const deliveryFee = useMemo(() => {
    if (!deliveryPoint || !restaurant?.latitude || !restaurant?.longitude || !prices.delivery_rate_per_km) return null;
    const distanceKm = haversineKm(restaurant.latitude, restaurant.longitude, deliveryPoint.lat, deliveryPoint.lng);
    return Math.round(distanceKm * prices.delivery_rate_per_km);
  }, [deliveryPoint, restaurant, prices.delivery_rate_per_km]);

  const platformFee = prices.platform_fee ?? 500;

  if (items.length === 0 || !restaurantId) {
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
    if (!deliveryPoint || !restaurantId) return;
    initializePayment({
      restaurantId,
      items,
      deliveryAddress: deliveryPoint.label + (note ? ` — ${note}` : ''),
      deliveryLat: deliveryPoint.lat,
      deliveryLng: deliveryPoint.lng,
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
        {restaurantName}
      </p>

      <div className="mt-4">
        <CartSummary />
      </div>

      <DeliveryLocationPicker selected={deliveryPoint} onSelect={setDeliveryPoint} note={note} onNoteChange={setNote} />

      <TipSelector value={tipAmount} onChange={setTipAmount} />

      <PriceBreakdown subtotal={subtotal} platformFee={platformFee} deliveryFee={deliveryFee} tipAmount={tipAmount} />

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
              ? `Pay ₦${(subtotal + platformFee + (deliveryFee ?? 0) + tipAmount).toLocaleString()}`
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
