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

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  restaurantId: string | null;
  restaurantName: string | null;
  /** Set when addItem was blocked because the cart already holds items from a different restaurant. */
  pendingSwitch: {id: string; name: string; price: number; restaurantId: string; restaurantName: string} | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  confirmRestaurantSwitch: () => void;
  cancelRestaurantSwitch: () => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'bigfoods-customer-cart';

export function CartProvider({children}: {children: ReactNode}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<CartContextValue['pendingSwitch']>(null);

  // Hydrate from localStorage once on mount (client-side only).
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
  const restaurantId = items.length > 0 ? items[0].restaurantId : null;
  const restaurantName = items.length > 0 ? items[0].restaurantName : null;

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>) => {
      if (restaurantId && item.restaurantId !== restaurantId) {
        setPendingSwitch(item);
        return;
      }
      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) => (i.id === item.id ? {...i, quantity: i.quantity + 1} : i));
        }
        return [...prev, {...item, quantity: 1}];
      });
    },
    [restaurantId]
  );

  const confirmRestaurantSwitch = useCallback(() => {
    if (!pendingSwitch) return;
    setItems([{...pendingSwitch, quantity: 1}]);
    setPendingSwitch(null);
  }, [pendingSwitch]);

  const cancelRestaurantSwitch = useCallback(() => setPendingSwitch(null), []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? {...i, quantity} : i));
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        total,
        restaurantId,
        restaurantName,
        pendingSwitch,
        addItem,
        confirmRestaurantSwitch,
        cancelRestaurantSwitch,
        removeItem,
        updateQuantity,
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
