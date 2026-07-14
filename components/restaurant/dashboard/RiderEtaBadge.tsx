import { Bike } from 'lucide-react';
import useNearestRider from '@/hooks/useNearestRider';

interface RiderEtaBadgeProps {
  latitude?: number;
  longitude?: number;
}

export default function RiderEtaBadge({ latitude, longitude }: RiderEtaBadgeProps) {
  const { etaMinutes, loading } = useNearestRider(latitude, longitude);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium"
      style={{ background: 'var(--peach)', color: 'var(--ink)' }}
    >
      <Bike className="w-3.5 h-3.5" style={{ color: 'var(--orange)' }} />
      {loading ? 'Checking riders…' : etaMinutes === null ? 'No riders online nearby' : `Nearest rider ~${etaMinutes} min away`}
    </div>
  );
}
