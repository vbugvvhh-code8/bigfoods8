'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

interface VendorOrder {
  id: string;
  status: string;
  subtotal: number;
  platform_fee: number;
  placed_at: string;
}

interface VendorMenuItem {
  id: string;
  name: string;
  price: number;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
}

export default function AdminVendorDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = getBrowserSupabase();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [menuItems, setMenuItems] = useState<VendorMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: r }, { data: o }, { data: m }] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', params.id).single(),
        supabase
          .from('orders')
          .select('id, status, subtotal, platform_fee, placed_at')
          .eq('restaurant_id', params.id)
          .order('placed_at', { ascending: false })
          .limit(500),
        supabase
          .from('menu_items')
          .select('id, name, price, category, subcategory, image_url')
          .eq('restaurant_id', params.id)
          .order('category', { ascending: true }),
      ]);
      setRestaurant(r ?? null);
      setOrders((o as VendorOrder[]) ?? []);
      setMenuItems((m as VendorMenuItem[]) ?? []);
      setLoading(false);
    })();
  }, [params?.id, supabase]);

  const delivered = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);
  const totalEarned = useMemo(
    () => delivered.reduce((sum, o) => sum + Number(o.subtotal) - Number(o.platform_fee ?? 0), 0),
    [delivered]
  );
  const totalPlatformFees = useMemo(
    () => delivered.reduce((sum, o) => sum + Number(o.platform_fee ?? 0), 0),
    [delivered]
  );

  const menuByCategory = useMemo(() => {
    const groups: Record<string, VendorMenuItem[]> = {};
    for (const item of menuItems) {
      const cat = item.category || 'uncategorized';
      groups[cat] = groups[cat] ?? [];
      groups[cat].push(item);
    }
    return groups;
  }, [menuItems]);

  if (loading) {
    return <p className="text-[12px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>;
  }

  if (!restaurant) {
    return <p className="text-[12px] py-6 text-center" style={{ color: 'var(--gray)' }}>Restaurant not found.</p>;
  }

  return (
    <div>
      <PageHeader title={restaurant.name} subtitle={`${restaurant.category ?? ''} · ${restaurant.address ?? ''}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total orders" value={String(orders.length)} />
        <StatTile label="Delivered" value={String(delivered.length)} />
        <StatTile label="Restaurant earned" value={`₦${totalEarned.toLocaleString()}`} />
        <StatTile label="Platform fees" value={`₦${totalPlatformFees.toLocaleString()}`} />
      </div>

      <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
        Menu ({menuItems.length} items)
      </p>
      {Object.keys(menuByCategory).length === 0 ? (
        <p className="text-[12px] mb-6" style={{ color: 'var(--gray)' }}>No menu items yet.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {Object.entries(menuByCategory).map(([cat, items]) => (
            <div key={cat} className="p-3.5 rounded-[10px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide mb-2 capitalize" style={{ color: 'var(--gray)' }}>
                {cat}
              </p>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{item.name}</span>
                    <span className="text-[12px]" style={{ color: 'var(--gray)' }}>₦{Number(item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>Order history</p>
      {orders.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--gray)' }}>No orders yet.</p>
      ) : (
        <div className="space-y-1.5">
          {orders.slice(0, 100).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-2.5 rounded-[8px]" style={{ border: '1px solid var(--line)' }}>
              <span className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
                {new Date(o.placed_at).toLocaleString()}
              </span>
              <span className="text-[12px] capitalize" style={{ color: 'var(--ink)' }}>{o.status}</span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>₦{Number(o.subtotal).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-[10px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>{label}</p>
      <p className="text-[15px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>{value}</p>
    </div>
  );
}
