'use client';

import {useMemo} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {ArrowLeft, Phone, Check} from 'lucide-react';
import {useOrderTracking} from '@/hooks/useOrderTracking';
import {haversineKm, estimateEtaMinutes} from '@/lib/customer/distance';
import {relativeTimeFromNow} from '@/lib/customer/format';
import {AuthGate} from '@/components/customer/shell/AuthGate';
import {OrderStatusStepper} from '@/components/customer/track/OrderStatusStepper';
import {TrackingMapView} from '@/components/customer/track/TrackingMapView';
import {ErrorState} from '@/components/customer/shared/ErrorState';

function TrackContent() {
  const {orderId} = useParams<{orderId: string}>();
  const router = useRouter();
  const {order, restaurant, items, rider, batch, currentDestination, isLoading, error} = useOrderTracking(orderId);

  const riderPosition = useMemo<[number, number] | null>(() => {
    if (rider?.lat == null || rider?.lng == null) return null;
    return [rider.lat, rider.lng];
  }, [rider]);

  const distanceKm = useMemo(() => {
    if (!riderPosition || !currentDestination) return null;
    return haversineKm(riderPosition[0], riderPosition[1], currentDestination.lat, currentDestination.lng);
  }, [riderPosition, currentDestination]);

  const etaMinutes = distanceKm != null ? estimateEtaMinutes(distanceKm) : null;

  if (isLoading) {
    return (
      <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-8 space-y-3" aria-busy="true">
        <div className="h-[220px] rounded-xl animate-pulse" style={{background: 'var(--peach)'}} />
        <div className="h-4 w-1/2 rounded animate-pulse" style={{background: 'var(--peach)'}} />
      </div>
    );
  }

  if (error || !order || order.delivery_lat == null || order.delivery_lng == null) {
    return (
      <div className="w-full max-w-[380px] mx-auto px-4 py-8">
        <ErrorState message="Couldn't load this order." />
      </div>
    );
  }

  const displayCode = batch?.deliveryCode ?? order.delivery_code;
  const otherStops = batch?.stops.filter((s) => s.restaurantId !== order.restaurant_id);

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6 pb-10">
      <button onClick={() => router.push('/order/orders')} className="flex items-center gap-2.5 mb-4" style={{color: 'var(--gray)'}}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[12.5px]">Back to orders</span>
      </button>

      <h1 className="font-display text-[19px] font-semibold" style={{color: 'var(--ink)'}}>
        {restaurant?.name ?? 'Your order'}
      </h1>
      <p className="text-[12px] mt-0.5 mb-4" style={{color: 'var(--gray)'}}>
        Placed {new Date(order.placed_at).toLocaleString()}
      </p>

      {batch && otherStops && otherStops.length > 0 && (
        <div className="rounded-xl mb-4 p-3.5" style={{background: 'var(--peach)'}}>
          <p className="text-[11.5px] font-semibold mb-2" style={{color: 'var(--ink)'}}>
            Your rider is also picking up from:
          </p>
          <div className="space-y-1.5">
            {otherStops.map((s) => (
              <div key={s.restaurantId} className="flex items-center gap-2 text-[12px]">
                {s.pickedUp ? (
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{color: 'var(--green, #1F6E5C)'}} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: 'var(--orange)'}} />
                )}
                <span style={{color: s.pickedUp ? 'var(--gray)' : 'var(--ink)'}}>
                  {s.name} {s.pickedUp ? '— picked up' : '— pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentDestination && (
        <TrackingMapView
          riderPosition={riderPosition}
          currentDestination={currentDestination}
          finalDestination={[order.delivery_lat, order.delivery_lng]}
          otherStops={otherStops}
          distanceKm={distanceKm}
          etaMinutes={etaMinutes}
          lastUpdatedLabel={relativeTimeFromNow(rider?.last_location_update)}
        />
      )}

      {rider && (
        <div className="flex items-center justify-between mt-4 p-3.5 rounded-xl" style={{border: '1px solid var(--line)'}}>
          <div>
            <p className="text-[10.5px] uppercase tracking-wide" style={{color: 'var(--gray)'}}>Your rider</p>
            <p className="text-[13.5px] font-semibold" style={{color: 'var(--ink)'}}>{rider.name}</p>
          </div>
          {rider.phone && (
            <a
              href={`tel:${rider.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white"
              style={{background: 'var(--orange)'}}
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
          )}
        </div>
      )}

      <div className="mt-5">
        <OrderStatusStepper status={order.status} />
      </div>

      {displayCode && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="rounded-xl mt-5 p-3.5 text-center" style={{background: 'var(--peach)'}}>
          <p className="text-[11px]" style={{color: 'var(--gray)'}}>
            Give your rider this code at delivery
          </p>
          <p className="font-display text-[22px] font-bold tracking-widest mt-1" style={{color: 'var(--orange)'}}>
            {displayCode}
          </p>
        </div>
      )}

      <div className="mt-5">
        <h2 className="font-display text-[14px] font-semibold mb-2" style={{color: 'var(--ink)'}}>
          Order summary
        </h2>
        <div className="divide-y" style={{borderColor: 'var(--line)'}}>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 text-[12.5px]">
              <span style={{color: 'var(--ink)'}}>
                {item.quantity}× {item.name}
              </span>
              <span style={{color: 'var(--gray)'}}>₦{(item.unit_price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-3 mt-1 border-t text-[13px] font-semibold" style={{borderColor: 'var(--line)'}}>
          <span style={{color: 'var(--ink)'}}>Total</span>
          <span style={{color: 'var(--orange)'}}>
            ₦{(order.subtotal + order.platform_fee + (order.delivery_fee ?? 0) + (order.tip_amount ?? 0)).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <AuthGate>
      <TrackContent />
    </AuthGate>
  );
}
