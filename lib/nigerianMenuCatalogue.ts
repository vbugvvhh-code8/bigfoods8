// Nigerian menu-name suggestions grouped by category and subcategory.
// Suggestions are optional: restaurants can still enter their own menu names.
export const NIGERIAN_MENU_NAME_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  'rice & pasta': {
    'rice dishes': ['Jollof Rice','Fried Rice','White Rice','Coconut Rice','Ofada Rice','Native Palm Oil Rice','Banga Rice','Rice and Beans'],
    'jollof rice': ['Party Jollof Rice','Smoky Jollof Rice','Jollof Rice and Chicken','Jollof Rice and Beef','Jollof Rice and Turkey','Jollof Rice and Fish'],
    'fried rice': ['Nigerian Fried Rice','Vegetable Fried Rice','Fried Rice and Chicken','Fried Rice and Turkey','Fried Rice and Beef'],
    'white rice': ['White Rice and Stew','White Rice and Ayamase','White Rice and Ofada Sauce','White Rice and Beans'],
    'native rice': ['Native Palm Oil Rice','Iwuk Edesi','Masa Rice','Coconut Native Rice'],
    'pasta & noodles': ['Spaghetti Bolognese','Jollof Spaghetti','Stir-fried Noodles','Indomie and Egg','Chicken Pasta','Creamy Pasta'],
  },
  'swallow': {
    'eba & garri': ['Eba','Yellow Garri','White Garri'], 'fufu': ['Cassava Fufu','Akpu','Lafun'],
    'pounded yam': ['Pounded Yam'], 'amala': ['Amala'], 'semo & wheat': ['Semo','Wheat Meal'], 'tuwo': ['Tuwo Shinkafa','Tuwo Masara'],
  },
  'soups': {
    'egusi soup': ['Egusi Soup','Egusi with Assorted Meat','Egusi with Stockfish','Egusi with Chicken'],
    'okra soup': ['Okra Soup','Seafood Okra','Okra with Assorted Meat'], 'ogbono soup': ['Ogbono Soup','Ogbono with Okra'],
    'vegetable soup': ['Vegetable Soup','Edikang Ikong','Afang Soup','Efo Riro'], 'efo riro': ['Efo Riro'],
    'banga soup': ['Banga Soup','Banga and Starch'], 'pepper soup': ['Catfish Pepper Soup','Goat Meat Pepper Soup','Chicken Pepper Soup','Assorted Meat Pepper Soup'],
    'oha & ora soup': ['Oha Soup','Ora Soup'], 'afang & edikang ikong': ['Afang Soup','Edikang Ikong'],
  },
  'beans & legumes': {
    'beans porridge': ['Beans Porridge','Beans and Plantain','Beans and Yam'], 'ewa agoyin': ['Ewa Agoyin and Sauce'],
    'moi moi': ['Moi Moi','Moi Moi with Egg','Moi Moi with Fish'], 'akara': ['Akara','Akara and Pap'], 'yam & beans': ['Yam and Beans'],
  },
  'proteins': {
    chicken: ['Grilled Chicken','Fried Chicken','Peppered Chicken','Chicken in Stew'], beef: ['Beef','Peppered Beef','Beef in Stew'],
    'goat meat': ['Goat Meat','Peppered Goat Meat','Goat Meat in Stew'], fish: ['Grilled Fish','Fried Fish','Peppered Fish','Catfish'],
    turkey: ['Grilled Turkey','Fried Turkey','Peppered Turkey'], 'assorted meat': ['Assorted Meat','Peppered Assorted Meat'], egg: ['Boiled Egg','Fried Egg','Egg Sauce'],
  },
  'grills & bbq': {
    suya: ['Beef Suya','Chicken Suya','Kilishi'], 'grilled chicken': ['Grilled Chicken','Barbecue Chicken'],
    'grilled fish': ['Grilled Tilapia','Grilled Croaker','Grilled Catfish'], barbecue: ['BBQ Chicken','BBQ Turkey','BBQ Fish'], 'roasted meat': ['Roasted Chicken','Roasted Turkey','Roasted Goat Meat'],
  },
  'fast food': {
    burgers: ['Beef Burger','Chicken Burger','Cheese Burger'], shawarma: ['Chicken Shawarma','Beef Shawarma','Mixed Shawarma'],
    pizza: ['Chicken Pizza','Beef Pizza','Vegetable Pizza','Pepperoni Pizza'], sandwiches: ['Chicken Sandwich','Club Sandwich','Tuna Sandwich'],
    fries: ['French Fries','Sweet Potato Fries','Loaded Fries'], 'hot dogs': ['Hot Dog','Cheese Hot Dog'],
  },
  'breakfast': {
    'pap & akamu': ['Akamu and Akara','Pap and Moi Moi','Pap and Bread'], 'yam & egg': ['Boiled Yam and Egg Sauce','Fried Yam and Egg','Yam Porridge'],
    'pancakes & waffles': ['Pancakes','Waffles','Pancakes and Sausage'], 'bread & spreads': ['Bread and Omelette','Bread and Beans','Toast and Egg'], 'breakfast combos': ['English Breakfast','Nigerian Breakfast Combo'],
  },
  'snacks & small chops': {
    'puff puff': ['Puff Puff'], 'chin chin': ['Chin Chin'], 'meat pie': ['Nigerian Meat Pie'], 'sausage rolls': ['Sausage Roll'],
    'spring rolls': ['Spring Rolls'], samosa: ['Beef Samosa','Chicken Samosa','Vegetable Samosa'], 'small chops platters': ['Small Chops Platter','Party Small Chops'],
  },
  'sides': {
    plantain: ['Fried Plantain','Roasted Plantain','Boiled Plantain'], yam: ['Boiled Yam','Fried Yam','Yam Chips'], potatoes: ['Potato Chips','Mashed Potatoes','Roasted Potatoes'],
    coleslaw: ['Coleslaw'], salads: ['Vegetable Salad','Chicken Salad','Coleslaw Salad'],
  },
  'desserts': {
    cakes: ['Chocolate Cake','Red Velvet Cake','Vanilla Cake','Carrot Cake'], 'ice cream': ['Vanilla Ice Cream','Chocolate Ice Cream','Strawberry Ice Cream'],
    puddings: ['Caramel Pudding','Custard','Fruit Pudding'], pastries: ['Doughnut','Croissant','Danish Pastry'], 'fruit bowls': ['Fresh Fruit Bowl','Mixed Fruit Salad'],
  },
  'drinks': {
    'soft drinks': ['Coca-Cola','Fanta','Sprite','Pepsi','Malt Drink','Schweppes'], 'fresh juices': ['Orange Juice','Pineapple Juice','Watermelon Juice','Mango Juice'],
    smoothies: ['Mango Smoothie','Banana Smoothie','Pineapple Smoothie','Mixed Berry Smoothie'], water: ['Bottled Water','Sparkling Water'],
    'zobo & kunu': ['Zobo','Kunu Aya','Kunu Zaki','Ginger Zobo'], 'tea & coffee': ['Tea','Coffee','Hot Chocolate','Ginger Tea'],
    milkshakes: ['Vanilla Milkshake','Chocolate Milkshake','Strawberry Milkshake'], 'energy drinks': ['Energy Drink','Sports Drink'],
  },
};
