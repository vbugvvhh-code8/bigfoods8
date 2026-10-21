export type ServiceLocation = {
  state: string;
  lga: string;
  is_active: boolean;
};

export type RestaurantServiceArea = {
  state?: string | null;
  zone?: string | null;
};

function countLgaNames(locations: readonly ServiceLocation[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const location of locations) {
    counts.set(location.lga, (counts.get(location.lga) ?? 0) + 1);
  }
  return counts;
}

function zoneKeyForLocation(
  state: string,
  lga: string,
  lgaCounts: ReadonlyMap<string, number>,
): string {
  return (lgaCounts.get(lga) ?? 0) > 1 ? `${lga} (${state})` : lga;
}

/** Return the canonical stored zone for a state/LGA pair, or undefined if absent. */
export function canonicalZoneKey(
  state: string,
  lga: string,
  locations: readonly ServiceLocation[],
): string | undefined {
  const matchingCount = locations.filter((location) => location.state === state && location.lga === lga).length;
  if (matchingCount !== 1) return undefined;
  return zoneKeyForLocation(state, lga, countLgaNames(locations));
}

function isActiveAreaWithCounts(
  state: string | null | undefined,
  zone: string | null | undefined,
  locations: readonly ServiceLocation[],
  lgaCounts: ReadonlyMap<string, number>,
): boolean {
  if (!state || !zone) return false;
  return locations.some((location) =>
    location.state === state &&
    zoneKeyForLocation(location.state, location.lga, lgaCounts) === zone &&
    location.is_active === true
  );
}

/** Validate a restaurant state + stored zone against the canonical key and active flag. */
export function isCanonicalActiveServiceArea(
  state: string | null | undefined,
  zone: string | null | undefined,
  locations: readonly ServiceLocation[],
): boolean {
  return isActiveAreaWithCounts(state, zone, locations, countLgaNames(locations));
}

/** Validate a rider's stored zone without guessing a state from an ambiguous LGA. */
export function isCanonicalActiveZone(
  zone: string | null | undefined,
  locations: readonly ServiceLocation[],
): boolean {
  if (!zone) return false;
  const lgaCounts = countLgaNames(locations);
  return locations.some((location) =>
    zoneKeyForLocation(location.state, location.lga, lgaCounts) === zone &&
    location.is_active === true
  );
}

/** A dispatch batch is eligible only when every restaurant area is active and canonical. */
export function areAllServiceAreasActive(
  restaurants: readonly RestaurantServiceArea[],
  locations: readonly ServiceLocation[],
): boolean {
  if (restaurants.length === 0) return false;
  const lgaCounts = countLgaNames(locations);
  return restaurants.every((restaurant) =>
    isActiveAreaWithCounts(restaurant.state, restaurant.zone, locations, lgaCounts)
  );
}
