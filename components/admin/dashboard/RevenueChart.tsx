const TYPE_LABELS: Record<string, string> = {
  platform_fee: 'Platform fee',
  delivery_commission: 'Delivery commission',
  promotion: 'Promotions',
  verification_fee: 'Verification fees',
  payout: 'Payouts',
};

export default function RevenueChart({ data = [] }: any) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 160, background: 'rgba(0,0,0,0.03)', color: 'var(--gray)' }} className="rounded-md flex items-center justify-center text-[12px]">
        No revenue recorded this month yet
      </div>
    );
  }

  const total = data.reduce((sum: number, d: any) => sum + Number(d.total), 0);

  return (
    <div style={{ height: 160 }} className="flex flex-col justify-center gap-2.5">
      {data.map((d: any) => {
        const pct = total > 0 ? Math.round((Number(d.total) / total) * 100) : 0;
        return (
          <div key={d.type}>
            <div className="flex justify-between text-[11.5px] mb-1">
              <span>{TYPE_LABELS[d.type] ?? d.type}</span>
              <span style={{ color: 'var(--gray)' }}>₦{Number(d.total).toLocaleString()} · {pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--line)' }}>
              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: 'var(--orange)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
