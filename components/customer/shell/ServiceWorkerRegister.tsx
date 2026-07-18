'use client';

import {useEffect} from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/order-sw.js', {scope: '/order'}).catch(() => {
      // Installability just degrades gracefully without offline caching —
      // not worth surfacing to the user.
    });
  }, []);

  return null;
}
