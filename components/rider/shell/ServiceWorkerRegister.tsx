'use client';

import {useEffect} from 'react';

export function RiderServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/rider-sw.js', {scope: '/rider-portal'}).catch(() => {
      // Installability just degrades gracefully without offline caching —
      // not worth surfacing to the user.
    });
  }, []);

  return null;
}
