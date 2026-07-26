export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  ordered?: boolean;
}

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  illustration: 'rider' | 'storefront' | 'phone-order' | 'delivery-route' | 'earnings';
  intro: string;
  sections: BlogSection[];
  faqs?: BlogFaq[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'become-a-delivery-rider-in-anambra',
    title: 'How to Become a Delivery Rider in Anambra: The Complete Guide',
    excerpt:
      "Everything you need to start earning as a BigFoods delivery rider — requirements, signup steps, and what your first week actually looks like.",
    category: 'For Riders',
    readTime: '6 min read',
    illustration: 'rider',
    intro:
      "If you've got a bike and a phone, delivery work is one of the fastest ways to start earning in Anambra right now — no CV, no interview, no waiting for a hiring manager to call back. Here's exactly what it takes to get started, step by step.",
    sections: [
      {
        heading: 'What you actually need',
        list: [
          'A working motorcycle, keke, or bicycle (motorcycles cover more zones and earn more per trip)',
          'A valid means of identification — National ID, voter\u2019s card, or driver\u2019s license',
          'A smartphone that can run apps and stay online during your shift',
          'A bank account or mobile money account in your own name, for payouts',
          'Basic familiarity with your local government area — you\u2019ll move faster once you know your streets',
        ],
      },
      {
        heading: 'Signing up, step by step',
        ordered: true,
        list: [
          'Open the BigFoods rider portal and start the sign-up — you\u2019ll verify your email with a one-time code before anything else.',
          'Fill in your personal details: full name, phone number, and the LGA you\u2019ll mostly operate in.',
          'Set your delivery location so nearby restaurants and customers can be matched to you.',
          'Complete the one-time rider verification payment — this filters for serious riders and keeps the platform trustworthy for restaurants and customers.',
          'Once approved, you\u2019re live. Turn your status to online whenever you\u2019re ready to accept deliveries.',
        ],
      },
      {
        heading: 'What your first week looks like',
        paragraphs: [
          'Most new riders spend the first few days learning which zones are busiest at which hours — lunch rushes around office areas, dinner rushes near residential streets, and weekend spikes around event centers.',
          'Early on, accept every delivery that comes your way rather than being selective. It builds your rating, gets you familiar with the app, and helps you map out the fastest routes between popular restaurants and delivery zones.',
          'Keep your phone charged and your data active — a rider who goes offline mid-shift misses assigned orders, and that affects how often you get matched going forward.',
        ],
      },
      {
        heading: 'Staying safe and professional',
        list: [
          'Always confirm the order details with the restaurant before leaving with food',
          'Wear reflective gear or bright clothing, especially for evening deliveries',
          'Keep food upright and protected from rain — a spilled order is a lost customer for the restaurant, and a bad review for you',
          'Be polite at the door. A five-star rating from a customer is worth more than rushing to the next job',
        ],
      },
    ],
    faqs: [
      {
        q: 'Do I need my own motorcycle to start?',
        a: 'Yes — BigFoods doesn\u2019t provide vehicles. A bicycle or keke works in tighter zones, but a motorcycle covers more ground and generally completes more deliveries per shift.',
      },
      {
        q: 'Can I ride part-time?',
        a: 'Yes. Many riders start part-time around school, another job, or family responsibilities, then increase their hours once they\u2019re comfortable with the app and their zone.',
      },
      {
        q: 'How long does approval take?',
        a: 'Once your details and verification payment are submitted, approval is typically quick — most riders are online within the same day.',
      },
    ],
  },
  {
    slug: 'start-selling-food-online-in-anambra',
    title: 'How to Start Selling Food Online in Anambra (Even Without a Restaurant)',
    excerpt:
      "You don't need a storefront to sell food online — you need a kitchen, a phone, and a plan. Here's how home cooks and small kitchens in Anambra get their first paying customers.",
    category: 'For Sellers',
    readTime: '7 min read',
    illustration: 'phone-order',
    intro:
      "Some of the busiest kitchens on food delivery apps started in someone's home kitchen — no shopfront, no signage, just good food and a phone. If you can cook well and consistently, here's the realistic path from \u201cI cook for my family\u201d to \u201cI run a real online food business.\u201d",
    sections: [
      {
        heading: 'Decide what you\u2019re actually known for',
        paragraphs: [
          'Trying to cook everything is the fastest way to be forgotten. The kitchens that grow fastest online usually own one thing — the best jollof rice in their zone, or the most consistent pepper soup, or a specific local delicacy done properly.',
          'Pick two or three dishes you can make well every single time, with ingredients you can reliably source. Consistency matters more than variety when you\u2019re starting out.',
        ],
      },
      {
        heading: 'Get your business basics in order',
        ordered: true,
        list: [
          'Set a fair price per dish — cover your ingredients, your time, and a real profit margin, not just a break-even number.',
          'Prepare a simple menu with clear names and prices, even if it\u2019s just two or three dishes at first.',
          'Take clear, well-lit photos of your food — natural daylight and a clean plate beat any filter.',
          'Register your kitchen on BigFoods and complete your restaurant profile with your real location, so nearby customers can actually find you.',
          'Add your dishes to your menu with accurate prices and at least two honest photos per item.',
        ],
      },
      {
        heading: 'Photos that actually sell food',
        list: [
          'Shoot from slightly above the plate, not straight down or from the side',
          'Use daylight near a window rather than harsh indoor bulbs, which make food look dull',
          'Show the food close-up — steam, texture, and color are what make someone hungry enough to order',
          'Keep the plate and background clean; nothing kills an appetite faster than clutter',
        ],
      },
      {
        heading: 'Getting your first real customers',
        paragraphs: [
          'New kitchens on BigFoods start with a visibility boost, which puts you in front of customers browsing nearby before you\u2019ve built up reviews — use that early window to nail every order.',
          'Your first ten orders matter more than your next hundred. Get the portion size right, the packaging right, and the timing right, because those first customers are the ones who decide whether to order from you again — and whether to tell their friends.',
          'Once you have real reviews and repeat customers, consider running a promotion during a slow period to bring in new faces without waiting for word of mouth alone.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Do I need a registered business name to start?',
        a: 'No — many sellers start as an individual home kitchen and formalize later once the business has real, consistent demand.',
      },
      {
        q: 'How many dishes should my menu have when I launch?',
        a: 'Start small — two or three dishes you can make perfectly every time beats ten dishes you can only make okay. You can always expand the menu later.',
      },
      {
        q: 'What if I don\u2019t have professional food photos?',
        a: 'A phone camera and good daylight is enough. Focus on a clean plate and a close, well-lit shot — that matters far more than expensive equipment.',
      },
    ],
  },
  {
    slug: 'run-a-successful-online-restaurant-in-anambra',
    title: 'How to Run a Successful Online Restaurant in Anambra',
    excerpt:
      "Taking an existing restaurant online is a different game from running a dining room. Here's how to manage orders, menus, and delivery zones without the chaos.",
    category: 'For Restaurants',
    readTime: '8 min read',
    illustration: 'storefront',
    intro:
      "Running a restaurant that people walk into is one skill. Running one that people order from without ever seeing the building is another. The kitchens that do well online treat it as its own operation — not an afterthought bolted onto the dining room.",
    sections: [
      {
        heading: 'Keep your menu honest and current',
        paragraphs: [
          'Nothing kills trust faster than a customer ordering a dish that\u2019s no longer available. If something runs out for the day, that\u2019s a small operational habit to fix — check your menu against what\u2019s actually in your kitchen before your shift starts.',
          'Organize your menu into clear categories with sub-categories where it makes sense — swallow and soups separate from drinks and snacks, for example. A customer who can find what they want in seconds orders faster and orders more.',
        ],
      },
      {
        heading: 'Set a delivery zone that matches your kitchen\u2019s reality',
        paragraphs: [
          'A wider delivery radius means more potential customers, but it also means longer travel times — and food that travels 25 kilometers doesn\u2019t arrive the way food that travels 5 kilometers does.',
          'Start with a tighter radius while you learn your order volume and prep times, then expand once you\u2019re confident your packaging and timing hold up over longer distances.',
        ],
      },
      {
        heading: 'Handling the order rush',
        ordered: true,
        list: [
          'Accept an incoming order the moment you see it — a fast acceptance keeps customers confident their food is actually being made.',
          'Prep in the order orders arrive, not by what\u2019s easiest to cook first.',
          'Confirm the assigned rider\u2019s name and details before handing over any order — this protects both your kitchen and the customer.',
          'Keep hot food hot and cold food cold until the exact moment of handoff, especially during peak hours when a rider might be a few minutes out.',
        ],
      },
      {
        heading: 'Turning first-time customers into regulars',
        list: [
          'Get the small things right consistently — correct order, correct change, food that still looks appetizing on arrival',
          'Use a promotion period strategically, like launching a new dish or reaching a new part of your delivery zone',
          'Watch which dishes actually sell and lean into them rather than spreading attention evenly across a menu customers don\u2019t equally want',
          'Respond to problems quickly. A customer whose issue gets resolved well often becomes more loyal than one who never had a problem at all',
        ],
      },
    ],
    faqs: [
      {
        q: 'Should I put my entire physical menu online?',
        a: 'Not necessarily. Start with the dishes that travel well and hold up during delivery — heavy soups and swallow generally do better than delicate plated dishes that can shift or spill in transit.',
      },
      {
        q: 'How do I decide my delivery radius?',
        a: 'Start narrower than you think you need, based on how long your food realistically holds quality after leaving the kitchen, then widen it gradually as you get comfortable with timing.',
      },
      {
        q: 'What\u2019s the biggest mistake new online restaurants make?',
        a: 'Treating online orders as secondary to walk-in customers. The kitchens that do best treat every online order with the same urgency as someone standing at the counter.',
      },
    ],
  },
  {
    slug: 'how-to-deliver-food-to-customers-guide',
    title: 'The Complete Guide to Delivering Food to Customers for Online Food Businesses',
    excerpt:
      "Great food that arrives badly packaged or late is a bad experience no matter how it tasted in the kitchen. Here's how packaging, timing, and communication work together.",
    category: 'Operations',
    readTime: '7 min read',
    illustration: 'delivery-route',
    intro:
      "The moment food leaves your kitchen, quality becomes a logistics problem, not a cooking one. A dish that was perfect on the plate can arrive cold, soggy, or spilled — and the customer only ever experiences the version that reaches their door. Here's how to close that gap.",
    sections: [
      {
        heading: 'Packaging that actually protects the food',
        list: [
          'Keep soups, stews, and swallow in separate, leak-proof containers — never in the same compartment',
          'Use containers sized to the portion; too much empty space lets food shift and spill during the ride',
          'Wrap or seal hot items to hold in steam and heat for longer',
          'Label multi-item orders clearly so nothing gets mixed up between deliveries',
        ],
      },
      {
        heading: 'Timing your prep against real delivery time',
        paragraphs: [
          'Food that\u2019s ready too early sits and loses quality before it even leaves the kitchen. Food that\u2019s ready too late holds up the rider and the customer\u2019s patience. The goal is to finish a dish as close as possible to when the rider is expected.',
          'For orders during busy periods, prep in stages rather than finishing everything for every order in one batch — it keeps food fresher at the actual moment of handoff.',
        ],
      },
      {
        heading: 'The handoff moment matters more than people think',
        ordered: true,
        list: [
          'Confirm the rider\u2019s identity before handing over food — matching their details to who\u2019s actually assigned to the order protects everyone involved.',
          'Do a final check that the order is complete and nothing\u2019s missing before it leaves your hands.',
          'Make sure containers are sealed and won\u2019t shift during transit, especially for motorcycle deliveries over rougher roads.',
          'Hand off promptly once a rider arrives — a rider waiting too long affects how quickly they can complete other deliveries too.',
        ],
      },
      {
        heading: 'When something goes wrong',
        paragraphs: [
          'Delays happen — traffic, weather, or a longer-than-expected route. What matters is how it\u2019s handled. A customer who\u2019s informed and reassured is far more forgiving than one left wondering where their food is.',
          'If an order genuinely arrives in poor condition, resolving it quickly and professionally protects the relationship far more than it costs to make it right. One bad experience handled well often becomes a customer\u2019s reason to trust you more, not less.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What\u2019s the biggest cause of food arriving in poor condition?',
        a: 'Usually packaging, not the ride itself — containers that aren\u2019t sealed properly or that let hot and cold items mix are the most common cause of a bad delivery experience.',
      },
      {
        q: 'Should soups and swallow be packed together?',
        a: 'No — always separate, leak-proof containers. Packing them together is one of the most common reasons a delivery arrives messy.',
      },
      {
        q: 'How do I handle a customer complaint about a late delivery?',
        a: 'Acknowledge it directly, explain what happened if you know, and focus on making the current experience right rather than over-explaining. Customers remember how issues are resolved more than the issue itself.',
      },
    ],
  },
  {
    slug: 'delivery-rider-earnings-in-anambra',
    title: 'How Much Do Delivery Riders Earn in Anambra? Real Numbers and Tips',
    excerpt:
      "What actually determines how much a delivery rider takes home — zone, timing, consistency — and practical ways to earn more from the same hours on the road.",
    category: 'For Riders',
    readTime: '6 min read',
    illustration: 'earnings',
    intro:
      "\u201cHow much can I actually make?\u201d is the first question every new rider asks, and the honest answer is: it depends heavily on when, where, and how consistently you ride. Here's what actually moves the number.",
    sections: [
      {
        heading: 'What determines your earnings',
        list: [
          'How many hours you\u2019re online and actively accepting deliveries',
          'Which zone you operate in — busier commercial areas and dense residential zones generate more order volume',
          'Time of day — lunch and dinner windows consistently produce more deliveries than mid-afternoon lulls',
          'How quickly you accept and complete deliveries, which affects how often you get matched to new orders',
          'Your rating and reliability over time',
        ],
      },
      {
        heading: 'Practical ways to earn more from the same hours',
        ordered: true,
        list: [
          'Learn your zone\u2019s peak windows and prioritize being online during them, rather than spreading your hours evenly across the day.',
          'Stay near clusters of popular restaurants during quiet periods so you\u2019re first in line when an order comes in.',
          'Accept orders quickly — hesitation costs you the match to a faster rider nearby.',
          'Keep your rating high by handling handoffs professionally and delivering food in good condition — riders with strong ratings tend to get matched more consistently.',
          'Plan efficient routes between drop-off points rather than backtracking, especially if you\u2019re handling deliveries close together.',
        ],
      },
      {
        heading: 'Setting realistic expectations',
        paragraphs: [
          'Your first two weeks are usually your slowest, simply because you\u2019re still learning the zone, the app, and which restaurants are fastest to prepare orders. Riders who stick through that early period consistently see their numbers improve as they build familiarity and routine.',
          'Treat it like any other job that rewards consistency — riders who show up reliably during peak hours, day after day, out-earn riders who ride occasionally whenever it\u2019s convenient.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What are the best hours to ride for higher earnings?',
        a: 'Lunch and dinner windows are consistently the busiest across most zones, along with weekends. Learning your specific area\u2019s pattern over the first couple of weeks will show you exactly when demand peaks locally.',
      },
      {
        q: 'Does my rating actually affect how much I earn?',
        a: 'Yes, indirectly — a strong, reliable rating tends to mean more consistent order matching over time, which is really what drives higher earnings.',
      },
      {
        q: 'Is it better to focus on one zone or cover a wider area?',
        a: 'Most experienced riders do better focusing on one zone they know well — faster navigation and familiarity with popular restaurants usually beats spreading thin across unfamiliar streets.',
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
