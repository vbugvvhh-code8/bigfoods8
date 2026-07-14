'use client';

import { Download } from 'lucide-react';
import useRestaurantReports from '@/hooks/useRestaurantReports';
import type { Order } from '@/types/database';

interface ReportsListProps {
  restaurantId: string;
}

function toCsv(orders: Order[]): string {
  const header = ['Order ID', 'Status', 'Subtotal', 'Platform fee', 'Delivery fee', 'Placed at', 'Delivered at'];
  const rows = orders.map((o) => [
    o.id,
    o.status,
    o.subtotal,
    o.platform_fee,
    o.delivery_fee ?? '',
    o.placed_at,
    o.delivered_at ?? '',
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadCsv(orders: Order[]) {
  const blob = new Blob([toCsv(orders)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsList({ restaurantId }: ReportsListProps) {
  const { orders, loading, totalOrders, deliveredCount, totalRevenue, avgDeliveryMinutes } =
    useRestaurantReports(restaurantId);

  if (loading) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-[10px] text-center" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{totalOrders}</p>
          <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>Orders</p>
        </div>
        <div className="p-3 rounded-[10px] text-center" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>₦{totalRevenue.toLocaleString()}</p>
          <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>Revenue (delivered)</p>
        </div>
        <div className="p-3 rounded-[10px] text-center" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {avgDeliveryMinutes ?? '—'}
          </p>
          <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>Avg delivery (min)</p>
        </div>
      </div>

      <button
        onClick={() => downloadCsv(orders)}
        disabled={orders.length === 0}
        className="w-full py-3 rounded-[9px] text-[12.5px] font-semibold mb-4 flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ border: '1px solid var(--orange)', color: 'var(--orange)' }}
      >
        <Download className="w-4 h-4" /> Export CSV ({deliveredCount} delivered of {totalOrders})
      </button>

      {orders.length === 0 ? (
        <p className="text-[12px] text-center" style={{ color: 'var(--gray)' }}>No orders yet.</p>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, 20).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-2.5 rounded-[8px]" style={{ border: '1px solid var(--line)' }}>
              <div>
                <p className="text-[12.5px] font-medium">₦{Number(o.subtotal).toLocaleString()}</p>
                <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>
                  {new Date(o.placed_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-[11px] font-medium capitalize" style={{ color: 'var(--gray)' }}>{o.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
