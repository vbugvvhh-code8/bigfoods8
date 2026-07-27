'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function WaiverBanner() {
  return (
    <Link
      href="/rider-portal/dashboard/waiver"
      className="flex items-center gap-2.5 px-4 py-3 mb-4 rounded-[10px]"
      style={{ background: 'var(--peach)', border: '1px solid var(--orange)' }}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--orange)' }} />
      <div className="flex-1">
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>
          Complete your waiver to go live
        </p>
        <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
          Required before you can start receiving orders — takes 2 minutes.
        </p>
      </div>
      <span className="text-[12px] font-semibold flex-shrink-0" style={{ color: 'var(--orange)' }}>
        Complete
      </span>
    </Link>
  );
}
