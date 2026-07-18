// All 21 Local Government Areas of Anambra State. Deliberately static and NOT
// derived from `locations`/`useActiveLocations` — that table is filtered to
// is_active = true (LGAs with current rider coverage), which meant the
// onboarding dropdown was silently missing any LGA BigFoods hasn't expanded
// riders into yet. A restaurant should be able to register from any real
// Anambra LGA regardless of current rider coverage there — that's how
// expansion into a new area starts in the first place.
export const ANAMBRA_LGAS = [
  'Aguata',
  'Anambra East',
  'Anambra West',
  'Anaocha',
  'Awka North',
  'Awka South',
  'Ayamelum',
  'Dunukofia',
  'Ekwusigo',
  'Idemili North',
  'Idemili South',
  'Ihiala',
  'Njikoka',
  'Nnewi North',
  'Nnewi South',
  'Ogbaru',
  'Onitsha North',
  'Onitsha South',
  'Orumba North',
  'Orumba South',
  'Oyi',
] as const;

export type AnambraLga = (typeof ANAMBRA_LGAS)[number];

/** Rough centroid used only to give the map picker a sensible starting view. */
export const ANAMBRA_STATE_CENTER: [number, number] = [6.2104, 7.0742]; // Awka
