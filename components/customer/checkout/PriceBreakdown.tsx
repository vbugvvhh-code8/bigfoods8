'use client';

interface PriceBreakdownProps {
  subtotal: number;
  platformFee: number;
  deliveryFee: number | null;
  tipAmount: number;
}

function Row({label, value, muted}: {label: string; value: string; muted?: boolean}) {
  return (
    <div className="flex justify-between text-[12.5px] py-1">
      <span style={{color: muted ? 'var(--gray)' : 'var(--ink)'}}>{label}</span>
      <span style={{color: muted ? 'var(--gray)' : 'var(--ink)'}}>{value}</span>
    </div>
  );
}

export function PriceBreakdown({subtotal, platformFee, deliveryFee, tipAmount}: PriceBreakdownProps) {
  const total = subtotal + platformFee + (deliveryFee ?? 0) + tipAmount;

  return (
    <div className="rounded-xl p-3.5 mt-4 border" style={{borderColor: 'var(--line)'}}>
      <Row label="Subtotal" value={`₦${subtotal.toLocaleString()}`} muted />
      <Row label="Platform fee" value={`₦${platformFee.toLocaleString()}`} muted />
      <Row label="Delivery fee" value={deliveryFee != null ? `₦${deliveryFee.toLocaleString()}` : 'Share location to calculate'} muted />
      {tipAmount > 0 && <Row label="Rider tip" value={`₦${tipAmount.toLocaleString()}`} muted />}
      <div className="border-t mt-2 pt-2" style={{borderColor: 'var(--line)'}}>
        <div className="flex justify-between text-[14px] font-semibold">
          <span style={{color: 'var(--ink)'}}>Total</span>
          <span style={{color: 'var(--orange)'}}>₦{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
