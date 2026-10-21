export type ServiceLocation = {
  state: string;
  lga: string;
  is_active: boolean;
};

export type RestaurantServiceArea = {
  state?: string | null;
  zone?: string | null;
};

/** Return the canonical stored zone for a state/LGA pair, or undefined if absent. */
export function canonicalZoneKey(
  state: string,
  lga: string,
  locations: readonly ServiceLocation[],
): string | undefined {
  const matching = locations.filter((location) => location.state === state && location.lga === lga);
  if (matching.length !== 1) return undefined;

  const sameLgaCount = locations.filter((location) => location.lga === lga).length;
  return sameLgaCount > 1 ? `${lga} (${state})` : lga;
}

/** Validate a restaurant state + stored zone against the canonical key and active flag. */
export function isCanonicalActiveServiceArea(
  state: string | null | undefined,
  zone: string | null | undefined,
  locations: readonly ServiceLocation[],
): boolean {
  if (!state || !zone) return false;
  return locations.some((location) =>
    location.state === state &&
    canonicalZoneKey(location.state, location.lga, locations) === zone &&
    location.is_active === true
  );
}

/** Validate a rider's stored zone without guessing a state from an ambiguous LGA. */
export function isCanonicalActiveZone(
  zone: string | null | undefined,
  locations: readonly ServiceLocation[],
): boolean {
  if (!zone) return false;
  return locations.some((location) =>
    canonicalZoneKey(location.state, location.lga, locations) === zone &&
    location.is_active === true
  );
}

/** A dispatch batch is eligible only when every restaurant area is active and canonical. */
export function areAllServiceAreasActive(
  restaurants: readonly RestaurantServiceArea[],
  locations: readonly ServiceLocation[],
): boolean {
  return restaurants.length > 0 && restaurants.every((restaurant) =>
    isCanonicalActiveServiceArea(restaurant.state, restaurant.zone, locations)
  );
}
