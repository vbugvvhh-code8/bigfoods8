import type {Restaurant} from '@/types/database';

/**
 * Whether a restaurant can currently take orders: `is_accepting_orders` must
 * be on, and — if an accepting-hours window is set — the current time must
 * fall inside it. Handles windows that cross midnight (e.g. 18:00-02:00).
 * No window set means the toggle alone decides.
 */
export function isRestaurantOpenNow(
  restaurant: Pick<Restaurant, 'is_accepting_orders' | 'accepting_start_time' | 'accepting_end_time'>
): boolean {
  if (!restaurant.is_accepting_orders) return false;

  const {accepting_start_time, accepting_end_time} = restaurant;
  if (!accepting_start_time || !accepting_end_time) return true;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = accepting_start_time.split(':').map(Number);
  const [endH, endM] = accepting_end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}
