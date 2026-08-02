'use client';

import {Plus, Minus, Trash2} from 'lucide-react';
import {useCart} from '@/hooks/useCart';

interface CartSummaryProps {
  /** When provided, only that restaurant's items are shown -- used by multi-restaurant checkout so each group renders its own items only. Omit to show the whole cart (original single-restaurant behavior). */
  restaurantId?: string;
}

export function CartSummary({restaurantId}: CartSummaryProps) {
  const {items, updateQuantity, removeItem} = useCart();
  const visibleItems = restaurantId ? items.filter((i) => i.restaurantId === restaurantId) : items;

  return (
    <div className="divide-y" style={{borderColor: 'var(--line)'}}>
      {visibleItems.map((item) => (
        <div key={item.id} className="flex items-center gap-3 py-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[12.5px]" style={{color: 'var(--ink)'}}>
              {item.name}
            </div>
            <div className="text-[11.5px]" style={{color: 'var(--gray)'}}>
              ₦{item.price.toLocaleString()} each
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="w-6 h-6 rounded-full border flex items-center justify-center"
              style={{borderColor: 'var(--line)', color: 'var(--gray)'}}
              aria-label={`Remove one ${item.name}`}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-[12px] font-semibold w-4 text-center" style={{color: 'var(--ink)'}}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white"
              style={{background: 'var(--orange)'}}
              aria-label={`Add one more ${item.name}`}
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => removeItem(item.id)}
              className="w-6 h-6 flex items-center justify-center ml-1"
              style={{color: 'var(--gray)'}}
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
