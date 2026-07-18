// Suggested categories and their common sub-categories, shown as quick-pick
// chips in the menu builder. These are purely suggestions — a restaurant can
// always type a custom category or sub-category instead. Stored/compared in
// lowercase to match the DB normalization trigger.
export const MENU_CATEGORY_PRESETS: Record<string, string[]> = {
  'local & native': ['swallow', 'soups', 'rice dishes', 'proteins'],
  'fast food': ['burgers', 'chicken', 'shawarma', 'pizza'],
  'drinks & snacks': ['soft drinks', 'juices', 'snacks', 'desserts'],
  grills: ['suya', 'grilled chicken', 'grilled fish'],
};

export const MENU_CATEGORY_NAMES = Object.keys(MENU_CATEGORY_PRESETS);
