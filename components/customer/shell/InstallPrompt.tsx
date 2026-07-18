'use client';

import {useEffect, useState} from 'react';
import {Download, X} from 'lucide-react';

const DISMISS_KEY = 'bigfoods-install-dismissed-at';
const DISMISS_DAYS = 14;

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
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 text-white" style={{background: 'var(--orange)'}}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/20">
        <Download className="w-4 h-4" />
      </div>

      {showIOSInstructions ? (
        <p className="flex-1 text-[11.5px] leading-snug">
          <b className="font-display">Install BigFoods:</b> tap Share, then &quot;Add to Home Screen&quot;.
        </p>
      ) : (
        <>
          <p className="flex-1 font-display font-semibold text-[13px]">Install BigFoods App</p>
          <button onClick={handleInstall} className="px-3.5 py-1.5 rounded-full bg-white text-[12px] font-semibold flex-shrink-0" style={{color: 'var(--orange)'}}>
            Install Now
          </button>
        </>
      )}

      <button onClick={dismiss} aria-label="Dismiss install prompt" className="flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
