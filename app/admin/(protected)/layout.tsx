import React from 'react';
import Sidebar from '@/components/admin/layout/Sidebar';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = privateMetadata('Admin');

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col md:flex-row min-h-screen"
      style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--ink)', background: '#F7F4F0' }}
    >
      <Sidebar />
      <main className="flex-1 px-4 py-4 sm:px-7 sm:py-6 max-w-[1180px] overflow-auto w-full">{children}</main>
    </div>
  );
}
