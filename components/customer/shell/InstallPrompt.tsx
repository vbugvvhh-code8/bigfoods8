'use client';

import {useEffect, useState} from 'react';
import {Download, X} from 'lucide-react';

const DISMISS_KEY = 'bigfoods-install-dismissed-at';
const DISMISS_DAYS = 14;
const NOTIFICATION_DURATION = 12_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

function wasRecentlyDismissed() {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const daysSince = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari never fires beforeinstallprompt — show install steps instead.
    if (isIOSSafari()) {
      setShowIOSInstructions(true);
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // The install prompt is a temporary notification, not a persistent bottom banner.
  // It dismisses itself after 12 seconds and never covers the cart or page actions.
  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => setVisible(false), NOTIFICATION_DURATION);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // best-effort only
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[60] mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-[0_12px_32px_rgba(32,28,26,0.24)] lg:top-20"
      style={{background: 'var(--orange)', animation: 'install-drop-in 260ms ease-out both'}}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Download className="h-4 w-4" />
      </div>

      {showIOSInstructions ? (
        <p className="min-w-0 flex-1 text-[12px] leading-snug">
          <b className="font-display">Install BigFoods:</b> tap Share, then &quot;Add to Home Screen&quot;.
        </p>
      ) : (
        <>
          <p className="min-w-0 flex-1 font-display text-[13px] font-semibold">Install BigFoods App</p>
          <button
            type="button"
            onClick={handleInstall}
            className="flex-shrink-0 rounded-full bg-white px-3.5 py-2 text-[12px] font-semibold"
            style={{color: 'var(--orange)'}}
          >
            Install Now
          </button>
        </>
      )}

      <button type="button" onClick={dismiss} aria-label="Dismiss install notification" className="flex-shrink-0 rounded-full p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
