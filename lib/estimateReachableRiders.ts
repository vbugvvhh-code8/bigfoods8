/**
 * Illustrative estimate of network reach shown while a restaurant picks a
 * delivery radius — deliberately NOT a live count. It's framed as "riders
 * across our network can reach this zone" rather than "X riders currently
 * here right now", since the latter would be a false real-time claim about
 * a number this function doesn't actually measure.
 *
 * Scales 3km→15km from 9 to 159, then 15km→30km from 159 to 201.
 */
export function estimateReachableRiders(radiusKm: number): number {
  const clamped = Math.min(30, Math.max(3, radiusKm));
  if (clamped <= 15) {
    const t = (clamped - 3) / (15 - 3);
    return Math.round(9 + t * (159 - 9));
  }
  const t = (clamped - 15) / (30 - 15);
  return Math.round(159 + t * (201 - 159));
}
