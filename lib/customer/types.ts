import type {Restaurant} from '@/types/database';

/** A restaurant enriched with client-computed fields (distance, ETA, open status). */
export interface RestaurantWithMeta extends Restaurant {
  isOpenNow: boolean;
  distanceKm: number | null;
  etaMinutes: number | null;
  inDeliveryRange: boolean | null;
}
