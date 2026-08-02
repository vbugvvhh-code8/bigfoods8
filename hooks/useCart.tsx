'use client';

import {createContext, useContext, useState, useCallback, useEffect, type ReactNode} from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}

export interface RestaurantGroup {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  /** Items grouped by restaurant -- this is what checkout/multi-restaurant dispatch actually operates on. */
  groups: RestaurantGroup[];
  /** True once the cart spans more than one restaurant -- checkout uses this to decide single-order vs. order-group flow. */
  isMultiRestaurant: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeRestaurant: (restaurantId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'bigfoods-customer-cart';

export function CartProvider({children}: {children: ReactNode}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted or unavailable storage — start with an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full or unavailable — cart still works for this session
    }
  }, [items, hydrated]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const groups: RestaurantGroup[] = Object.values(
    items.reduce((acc, item) => {
      if (!acc[item.restaurantId]) {
        acc[item.restaurantId] = {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          items: [],
          subtotal: 0,
        };
      }
      acc[item.restaurantId].items.push(item);
      acc[item.restaurantId].subtotal += item.price * item.quantity;
      return acc;
    }, {} as Record<string, RestaurantGroup>)
  );

  const isMultiRestaurant = groups.length > 1;

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? {...i, quantity: i.quantity + 1} : i));
      }
      return [...prev, {...item, quantity: 1}];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? {...i, quantity} : i));
    });
  }, []);

  const removeRestaurant = useCallback((restaurantId: string) => {
    setItems((prev) => prev.filter((i) => i.restaurantId !== restaurantId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        total,
        groups,
        isMultiRestaurant,
        addItem,
        removeItem,
        updateQuantity,
        removeRestaurant,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
