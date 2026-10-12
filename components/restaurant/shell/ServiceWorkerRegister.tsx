'use client';

import { useEffect } from 'react';

export function RestaurantServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/restaurant-sw.js', { scope: '/restaurant-portal' }).catch(() => {
      // Installability just degrades gracefully without offline caching.
    });
  }, []);

  return null;
}
