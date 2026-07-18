'use client';

import {useCart} from '@/hooks/useCart';

export function RestaurantSwitchModal() {
  const {pendingSwitch, restaurantName, confirmRestaurantSwitch, cancelRestaurantSwitch} = useCart();

  if (!pendingSwitch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 px-4 pb-4 lg:pb-0">
      <div className="w-full max-w-[340px] rounded-2xl bg-white p-5">
        <h3 className="font-display font-semibold text-[15px] mb-1.5" style={{color: 'var(--ink)'}}>
          Start a new cart?
        </h3>
        <p className="text-[12.5px] mb-4" style={{color: 'var(--gray)'}}>
          Your cart has items from {restaurantName}. Adding from {pendingSwitch.restaurantName} will clear it.
        </p>
        <div className="flex gap-2">
          <button
            onClick={cancelRestaurantSwitch}
            className="flex-1 py-2.5 rounded-xl text-[12.5px] font-semibold border"
            style={{borderColor: 'var(--line)', color: 'var(--ink)'}}
          >
            Keep current cart
          </button>
          <button
            onClick={confirmRestaurantSwitch}
            className="flex-1 py-2.5 rounded-xl text-[12.5px] font-semibold text-white"
            style={{background: 'var(--orange)'}}
          >
            Start new cart
          </button>
        </div>
      </div>
    </div>
  );
}
