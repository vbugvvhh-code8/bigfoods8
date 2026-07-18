'use client';

import {Bookmark, Trash2} from 'lucide-react';
import {useSavedAddresses} from '@/hooks/useSavedAddresses';

export function SavedAddressesList() {
  const {addresses, isLoading, deleteAddress} = useSavedAddresses();

  if (isLoading) return null;
  if (addresses.length === 0) {
    return (
      <p className="text-[12px]" style={{color: 'var(--gray)'}}>
        No saved locations yet — you can save one at checkout.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {addresses.map((addr) => (
        <div key={addr.id} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{background: 'var(--peach)'}}>
          <div className="flex items-center gap-2 min-w-0">
            <Bookmark className="w-3.5 h-3.5 flex-shrink-0" style={{color: 'var(--orange)'}} />
            <span className="text-[12px] font-semibold truncate" style={{color: 'var(--ink)'}}>
              {addr.label}
            </span>
          </div>
          <button onClick={() => deleteAddress(addr.id)} aria-label={`Remove ${addr.label}`}>
            <Trash2 className="w-3.5 h-3.5" style={{color: 'var(--gray)'}} />
          </button>
        </div>
      ))}
    </div>
  );
}
