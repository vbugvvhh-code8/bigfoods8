// Canonical Nigerian food and drink categories with their subcategories.
// Keep keys lowercase to match menu_items normalization and database catalogue rows.
export const MENU_CATEGORY_PRESETS: Record<string, string[]> = {
  'rice & pasta': ['rice dishes','jollof rice','fried rice','white rice','native rice','pasta & noodles'],
  swallow: ['eba & garri','fufu','pounded yam','amala','semo & wheat','tuwo'],
  soups: ['egusi soup','okra soup','ogbono soup','vegetable soup','efo riro','banga soup','pepper soup','oha & ora soup','afang & edikang ikong'],
  'beans & legumes': ['beans porridge','ewa agoyin','moi moi','akara','yam & beans'],
  proteins: ['chicken','beef','goat meat','fish','turkey','assorted meat','egg'],
  'grills & bbq': ['suya','grilled chicken','grilled fish','barbecue','roasted meat'],
  'fast food': ['burgers','shawarma','pizza','sandwiches','fries','hot dogs'],
  breakfast: ['pap & akamu','yam & egg','pancakes & waffles','bread & spreads','breakfast combos'],
  'snacks & small chops': ['puff puff','chin chin','meat pie','sausage rolls','spring rolls','samosa','small chops platters'],
  sides: ['plantain','yam','potatoes','coleslaw','salads'],
  desserts: ['cakes','ice cream','puddings','pastries','fruit bowls'],
  drinks: ['soft drinks','fresh juices','smoothies','water','zobo & kunu','tea & coffee','milkshakes','energy drinks'],
};

export const MENU_CATEGORY_NAMES = Object.keys(MENU_CATEGORY_PRESETS);
