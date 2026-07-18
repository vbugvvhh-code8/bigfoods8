'use client';

import {Plus, Minus} from 'lucide-react';
import {useCart} from '@/hooks/useCart';
import type {MenuItem, Restaurant} from '@/types/database';

interface MenuItemRowProps {
  item: MenuItem;
  restaurant: Restaurant;
}

export function MenuItemRow({item, restaurant}: MenuItemRowProps) {
  const {items, addItem, updateQuantity} = useCart();
  const cartItem = items.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity ?? 0;

  return (
    <div className="flex gap-3 items-center py-3">
      <div
        className="w-[50px] h-[50px] rounded-lg flex-shrink-0 bg-cover bg-center"
        style={item.image_url ? {backgroundImage: `url(${item.image_url})`} : {background: 'var(--peach)'}}
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[12.5px]" style={{color: 'var(--ink)'}}>
          {item.name}
        </div>
        <div className="text-[11.5px]" style={{color: 'var(--gray)'}}>
          ₦{item.price.toLocaleString()}
        </div>
      </div>

      {quantity === 0 ? (
        <button
          onClick={() =>
            addItem({id: item.id, name: item.name, price: item.price, restaurantId: restaurant.id, restaurantName: restaurant.name})
          }
          className="w-7 h-7 rounded-full border flex items-center justify-center"
          style={{borderColor: 'var(--orange)', color: 'var(--orange)'}}
          aria-label={`Add ${item.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(item.id, quantity - 1)}
            className="w-7 h-7 rounded-full border flex items-center justify-center"
            style={{borderColor: 'var(--orange)', color: 'var(--orange)'}}
            aria-label={`Remove one ${item.name}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-[12.5px] font-semibold w-4 text-center" style={{color: 'var(--ink)'}}>
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.id, quantity + 1)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white"
            style={{background: 'var(--orange)'}}
            aria-label={`Add one more ${item.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
