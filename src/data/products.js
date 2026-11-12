// Prices are whole Naira.
export const fmt = (naira) => '₦' + Math.round(naira).toLocaleString('en-US');

// Three gondolas make four aisles. Each gondola has two shelf faces.
export const GONDOLAS = [-4, 0, 4];
export const LEVELS = [0.15, 0.58, 1.01, 1.44];
export const AISLE_X = [-6.2, -2, 2, 6.2];
export const FACES = [
  { g: -4, side: -1, aisle: 1, cat: 'Snacks' },
  { g: -4, side: 1, aisle: 2, cat: 'Breakfast' },
  { g: 0, side: -1, aisle: 2, cat: 'Staples' },
  { g: 0, side: 1, aisle: 3, cat: 'Drinks' },
  { g: 4, side: -1, aisle: 3, cat: 'Cooking' },
  { g: 4, side: 1, aisle: 4, cat: 'Home & Health' },
];
export const AISLES = { 1: 'Snacks & Fashion', 2: 'Breakfast & Staples', 3: 'Drinks & Cooking', 4: 'Home & Health' };
// Fashion corner along the left wall of aisle 1: wall shelves for shoes, eyewear, caps and folded clothes,
// plus face-out arms with hanging clothes. Products face +X (into the aisle).
export const FASHION = {
  wallX: -8, depth: 0.4,
  shoes: { levels: [0.35, 0.8, 1.25], runs: [[-7.0, -4.9], [-4.7, -2.6]] },
  glasses: { levels: [0.62, 0.98], runs: [[-2.4, -0.7], [-0.5, 1.0]] },
  caps: { levels: [1.34, 1.68], runs: [[-2.4, -0.7], [-0.5, 1.0]] },
  mirror: { z: 1.3, w: 0.5 },
  folded: { levels: [0.3, 0.72], runs: [[1.6, 4.2], [4.4, 7.0]] },
  hang: { hook: 1.98, arms: [2.4, 4.3, 6.2], length: 0.68 },
};
// "Grab & go" stand beside the till: small items, facing the queue (-Z).
export const RACK = { x: 3.15, z0: 8.42, depth: 0.22, width: 0.5, levels: [0.5, 0.86, 1.22] };
// Promo end-caps on the front end of each gondola: a pallet plus two shelves, facing the entrance.
export const ENDCAP = { z: 7.22, depth: 0.4, levels: [0.12, 0.68, 1.2] };

// Default sizes per pack type (metres). Round packs use r, flat ones w × h × d.
const DEF = {
  box: { w: 0.26, h: 0.34, d: 0.08 }, pillow: { w: 0.18, h: 0.26, d: 0.06 }, sack: { w: 0.3, h: 0.4, d: 0.12 },
  keg: { w: 0.24, h: 0.34, d: 0.14 }, bale: { w: 0.3, h: 0.3, d: 0.13 }, carton: { w: 0.085, h: 0.24, d: 0.085 },
  can: { r: 0.033, h: 0.115 }, tin: { r: 0.04, h: 0.06 }, jar: { r: 0.045, h: 0.11 }, pet: { r: 0.036, h: 0.25 },
  glass: { r: 0.033, h: 0.23 }, tub: { r: 0.06, h: 0.09 },
  shoe: { w: 0.22, h: 0.11, d: 0.29 }, cap: { w: 0.2, h: 0.09, d: 0.27 }, glasses: { w: 0.14, h: 0.05, d: 0.14 },
  folded: { w: 0.32, h: 0.06, d: 0.26 }, hanger: { w: 0.5, h: 0.74, d: 0.03 },
};
const ROUND = new Set(['can', 'tin', 'jar', 'pet', 'glass', 'tub']);

// [brand, product, price ₦, pack, main colour, accent colour, quantity, unit, description, options]
// options: art (label illustration), badge, finish ('paper' | 'foil' | 'gloss' | 'fabric'), window (see-through panel),
//          liquid { c, fill, op }, contents (jar fill colour), lid, promo { was }, placement (fridge / endcap / strip).
// The first 48 fill the six shelf faces: eight per face, two per shelf, bottom shelf first. All brands are invented.
const RAW = [
  // Aisle 1 · Snacks
  ['Dodo Crunch', 'Plantain Chips', 500, 'pillow', '#f2b705', '#2e7d32', 150, 'g', 'Thin slices of unripe plantain, fried crisp and lightly salted.', { art: 'chips', window: 'chips', finish: 'foil', w: 0.18, h: 0.26, d: 0.06 }],
  ['Mama Put', 'Crunchy Chin Chin', 1200, 'pillow', '#c8102e', '#ffd166', 250, 'g', 'Sweet, crunchy fried dough bites with a hint of nutmeg.', { art: 'chinchin', window: 'chinchin', finish: 'gloss', badge: 'Extra crunchy', w: 0.2, h: 0.28, d: 0.07 }],
  ['Kano Roast', 'Roasted Groundnuts', 700, 'pillow', '#8d5524', '#ffe8c2', 200, 'g', 'Sand-roasted peanuts from the north. Best with garri and cold water.', { art: 'nuts', window: 'nuts', finish: 'gloss', w: 0.16, h: 0.22, d: 0.05 }],
  ['Kano Roast', 'Kuli Kuli', 600, 'pillow', '#5d3a1a', '#f4c430', 150, 'g', 'Spicy groundnut sticks, fried until crunchy.', { art: 'nuts', window: 'kulikuli', finish: 'gloss', w: 0.16, h: 0.22, d: 0.05 }],
  ['Eko Sweets', 'Coconut Candy', 900, 'jar', '#f5f0e1', '#8b5a2b', 200, 'g', 'Chewy caramelised coconut, the way it is sold on Lagos streets.', { art: 'coconut', contents: '#c8955a', cap: '#8b5a2b' }],
  ['Aya Gold', 'Tiger Nuts', 1100, 'jar', '#c99b5b', '#3e2a14', 250, 'g', 'Sweet, crunchy tiger nuts. Snack on them or blend into kunu.', { art: 'nuts', contents: '#a9763f', r: 0.045, h: 0.13, cap: '#3e2a14' }],
  ['Tea Time', 'Hard Biscuits', 700, 'box', '#1565c0', '#ffd54f', 100, 'g', 'Hard, dry biscuits made for dipping in tea.', { art: 'biscuit', badge: 'Tea time favourite', w: 0.22, h: 0.08, d: 0.07 }],
  ['Tea Time', 'Cream Crackers', 900, 'box', '#d32f2f', '#fff8e1', 200, 'g', 'Light, flaky crackers. Lovely with butter or sardines.', { art: 'biscuit', w: 0.2, h: 0.12, d: 0.06 }],

  // Aisle 2 · Breakfast
  ['Moo Naija', 'Full Cream Milk Powder', 5800, 'pillow', '#0d47a1', '#ffffff', 400, 'g', 'Rich full cream powdered milk for tea, pap and cereal. Refill pack.', { art: 'milk', finish: 'foil', badge: 'Fortified with Vitamin A', w: 0.2, h: 0.3, d: 0.07 }],
  ['Morning Sun', 'Corn Flakes', 3800, 'box', '#f9a825', '#c62828', 350, 'g', 'Crisp golden corn flakes. Add milk and a little sugar.', { art: 'flakes', badge: 'With iron & vitamins' }],
  ['Jos Plateau', 'Oat Flakes', 3200, 'box', '#e9dcc0', '#33691e', 500, 'g', 'Rolled oats from cool highland farms. Cooks in five minutes.', { art: 'flakes', w: 0.19, h: 0.28, d: 0.1 }],
  ['Sweet Cup', 'Vanilla Custard Powder', 2600, 'tin', '#fbc02d', '#c62828', 400, 'g', 'Smooth vanilla custard. Stir into hot water, then add milk and sugar.', { art: 'custard', lid: true, r: 0.06, h: 0.13, cap: '#c62828' }],
  ['Power Up', 'Chocolate Malt Drink', 4500, 'tin', '#4e342e', '#43a047', 400, 'g', 'Chocolate malt powder for a strong start to the school day.', { art: 'cocoa', lid: true, badge: 'Energy for school', r: 0.06, h: 0.13, cap: '#43a047' }],
  ['Moo Naija', 'Evaporated Milk', 850, 'tin', '#ffffff', '#0d47a1', 160, 'g', 'Creamy unsweetened evaporated milk for tea and cooking.', { art: 'milk', r: 0.037, h: 0.078 }],
  ['Mambilla Highlands', 'Black Tea', 1200, 'box', '#1b5e20', '#ffca28', 50, 'ct', 'Fifty bags of strong black tea grown on the Mambilla Plateau.', { art: 'tea', w: 0.16, h: 0.09, d: 0.07 }],
  ['Sweet Savannah', 'Sugar Cubes', 1500, 'box', '#ffffff', '#1e88e5', 500, 'g', 'Neat white sugar cubes. Two per cup.', { art: 'sugar', w: 0.15, h: 0.1, d: 0.08 }],

  // Aisle 2 · Staples
  ['Ofada Gold', 'Parboiled Long Grain Rice', 12500, 'sack', '#fafafa', '#c62828', 5000, 'g', 'Stone-free parboiled rice for jollof, fried rice and party trays.', { art: 'rice', finish: 'fabric', badge: 'Stone free', w: 0.32, h: 0.38, d: 0.12 }],
  ['Ijebu Crisp', 'White Garri', 2800, 'sack', '#ffffff', '#2e7d32', 2000, 'g', 'Fine, sour and crunchy. For soaking or making eba.', { art: 'garri', window: 'garri', finish: 'gloss', w: 0.24, h: 0.32, d: 0.1 }],
  ['Oloyin Farms', 'Honey Beans', 3200, 'sack', '#a1622f', '#fff3e0', 1000, 'g', 'Sweet brown beans for ewa agoyin, moi moi and akara.', { art: 'beans', window: 'beans', finish: 'gloss', w: 0.2, h: 0.28, d: 0.09 }],
  ['Iyan Easy', 'Poundo Yam Flour', 3400, 'box', '#fff8e1', '#6d4c41', 1000, 'g', 'Smooth pounded yam without the mortar and pestle.', { art: 'yam', w: 0.2, h: 0.3, d: 0.1 }],
  ['Arewa Mills', 'Semolina', 2400, 'pillow', '#ffe082', '#1565c0', 1000, 'g', 'Fine wheat semolina for a smooth swallow.', { art: 'grain', finish: 'paper', w: 0.2, h: 0.28, d: 0.08 }],
  ['Mama Nkechi', 'Ground Egusi', 3000, 'pillow', '#f0e6c8', '#2e7d32', 500, 'g', 'Ground melon seeds, ready for a pot of egusi soup.', { art: 'egusi', window: 'egusi', finish: 'gloss', w: 0.16, h: 0.22, d: 0.05 }],
  ['Lagos Pasta Co.', 'Spaghetti', 1300, 'box', '#0d47a1', '#ffeb3b', 500, 'g', 'Long durum wheat spaghetti. Perfect for jollof spaghetti.', { art: 'pasta', w: 0.09, h: 0.3, d: 0.05 }],
  ['Lagos Pasta Co.', 'Macaroni', 1250, 'box', '#c62828', '#ffeb3b', 500, 'g', 'Short elbow macaroni that soaks up stew.', { art: 'pasta', w: 0.13, h: 0.22, d: 0.07 }],

  // Aisle 3 · Drinks
  ['Pure Spring', 'Sachet Water', 500, 'bale', '#b3e5fc', '#0277bd', 20, 'ct', 'A bag of twenty 50cl sachets of treated drinking water.', { art: 'water', size: '20 × 50cl' }],
  ['Calabar Fresh', 'Pineapple Juice', 2200, 'carton', '#ffca28', '#2e7d32', 1000, 'ml', 'Sweet pineapple juice with no added sugar.', { art: 'pineapple', badge: '100% juice' }],
  ['Obudu Springs', 'Table Water', 250, 'pet', '#4fc3f7', '#ffffff', 750, 'ml', 'Clean, cold table water from the hills.', { art: 'water', cap: '#0277bd', liquid: { c: '#d6f1fc', fill: 0.9, op: 0.35 }, r: 0.036, h: 0.26 }],
  ['Fizzy Naija', 'Orange Soda', 450, 'pet', '#ff8f00', '#1b5e20', 500, 'ml', 'Bright, fizzy orange soda. Serve ice cold.', { art: 'orange', cap: '#1b5e20', liquid: { c: '#ff9800', fill: 0.88, op: 0.85 }, r: 0.035, h: 0.25 }],
  ['Hibiscus House', 'Zobo Drink', 700, 'pet', '#880e4f', '#ffd54f', 500, 'ml', 'Hibiscus brewed with ginger, cloves and pineapple.', { art: 'hibiscus', cap: '#ffd54f', liquid: { c: '#7b0f2e', fill: 0.9, op: 0.92 }, r: 0.035, h: 0.23 }],
  ['Arewa Mills', 'Kunu Aya', 600, 'pet', '#f3e5c3', '#6d4c41', 500, 'ml', 'Creamy tiger nut drink with dates and ginger.', { art: 'nuts', cap: '#6d4c41', liquid: { c: '#ead8b5', fill: 0.88, op: 1 }, r: 0.035, h: 0.23 }],
  ['Golden Malt', 'Malt Drink', 600, 'can', '#3e2723', '#ffc107', 330, 'ml', 'Rich, non-alcoholic malt drink. Best chilled.', { art: 'malt', r: 0.033, h: 0.115 }],
  ['Sunset Bar', 'Chapman Mix', 900, 'can', '#e53935', '#ffeb3b', 330, 'ml', 'Fruity Chapman with citrus, grenadine and bitters.', { art: 'fruit', r: 0.033, h: 0.115 }],

  // Aisle 3 · Cooking
  ['Red Gold', 'Palm Oil', 3500, 'pet', '#e65100', '#ffeb3b', 1000, 'ml', 'Pure red palm oil for banga, egusi and ofada stew.', { art: 'palm', cap: '#ffeb3b', liquid: { c: '#c62200', fill: 0.92, op: 0.95 }, r: 0.045, h: 0.3 }],
  ['Sahel Pure', 'Groundnut Oil', 4200, 'pet', '#fdd835', '#2e7d32', 1000, 'ml', 'Groundnut oil from Kano, for frying and stew.', { art: 'nuts', cap: '#2e7d32', liquid: { c: '#f2c14e', fill: 0.92, op: 0.75 }, r: 0.045, h: 0.3 }],
  ['Tomatino', 'Double Tomato Paste', 900, 'tin', '#d50000', '#2e7d32', 210, 'g', 'Thick double-concentrated paste, the base of every good stew.', { art: 'tomato', r: 0.04, h: 0.06 }],
  ['Highlife', 'Corned Beef', 2300, 'tin', '#b71c1c', '#ffd54f', 340, 'g', 'Tender corned beef for sauces, sandwiches and plantain.', { art: 'meat', r: 0.045, h: 0.07 }],
  ['Sharp Sharp', 'Instant Noodles Chicken', 350, 'pillow', '#ffeb3b', '#d50000', 70, 'g', 'Chicken-flavour noodles ready in three minutes. Add egg and pepper.', { art: 'noodles', finish: 'foil', badge: 'New improved taste', promo: { was: 400 }, w: 0.15, h: 0.11, d: 0.035 }],
  ['Sharp Sharp', 'Instant Noodles Pepper Chicken', 350, 'pillow', '#d50000', '#ffeb3b', 70, 'g', 'The same quick noodles with a peppery kick.', { art: 'noodles', finish: 'foil', badge: 'Hot!', w: 0.15, h: 0.11, d: 0.035 }],
  ['Idunnu', 'Seasoning Cubes', 1600, 'box', '#c62828', '#ffd600', 100, 'ct', 'One hundred chicken seasoning cubes for soups and stews.', { art: 'cubes', w: 0.14, h: 0.09, d: 0.06 }],
  ["Mallam's", 'Suya Spice (Yaji)', 900, 'jar', '#6d2f12', '#ffb300', 100, 'g', 'Ground peanut, ginger and pepper blend for suya at home.', { art: 'chili', contents: '#8d3b12', r: 0.035, h: 0.09, cap: '#ffb300' }],

  // Aisle 4 · Home & Health
  ['Bright Wash', 'Detergent Powder', 2600, 'pillow', '#1565c0', '#ffeb3b', 900, 'g', 'Hand-wash and machine detergent with a fresh scent.', { art: 'bubbles', finish: 'gloss', badge: 'Removes tough stains', w: 0.24, h: 0.32, d: 0.09 }],
  ['No Mosquito', 'Insect Killer Spray', 3200, 'can', '#2e7d32', '#ffeb3b', 400, 'ml', 'Kills mosquitoes and cockroaches. Spray, then close the room for 15 minutes.', { art: 'mosquito', r: 0.033, h: 0.2, size: '400 ml' }],
  ['Naija Glow', 'Bar Soap', 600, 'box', '#f8bbd0', '#ad1457', 150, 'g', 'Gentle bathing soap with shea butter.', { art: 'flower', w: 0.09, h: 0.06, d: 0.045 }],
  ['Comfy Days', 'Sanitary Pads', 1300, 'pillow', '#ce93d8', '#4a148c', 10, 'ct', 'Ten soft, ultra-thin pads with wings.', { art: 'feather', finish: 'gloss', w: 0.17, h: 0.2, d: 0.07 }],
  ['Smile Bright', 'Toothpaste', 1400, 'box', '#e3f2fd', '#d32f2f', 140, 'g', 'Fluoride toothpaste with mint. Fights cavities.', { art: 'smile', w: 0.2, h: 0.05, d: 0.045 }],
  ['Cool Breeze', 'Menthol Rub', 500, 'tub', '#26a69a', '#ffffff', 25, 'g', 'Cooling menthol rub for headaches, catarrh and aches.', { art: 'leaf', r: 0.03, h: 0.03, cap: '#ffffff' }],
  ['SafeHaven', 'Ultra Thin Condoms', 1500, 'box', '#263238', '#00bcd4', 3, 'ct', 'Three ultra-thin latex condoms. Protects against pregnancy and STIs.', { art: 'shield', w: 0.085, h: 0.11, d: 0.03 }],
  ['LoveGuard', 'Classic Condoms', 5000, 'box', '#4a148c', '#e91e63', 12, 'ct', 'Twelve classic latex condoms in a discreet box.', { art: 'shield', w: 0.11, h: 0.14, d: 0.045 }],

  // Back wall · Chilled drinks fridges (one product per glass door)
  ['Golden Malt', 'Malt Drink Bottle', 700, 'glass', '#3e2723', '#ffc107', 330, 'ml', 'Ice-cold malt in a returnable glass bottle.', { art: 'malt', fridge: 0, r: 0.033, h: 0.23 }],
  ['Moo Naija', 'Strawberry Yoghurt Drink', 1100, 'pet', '#f8bbd0', '#c2185b', 500, 'ml', 'Sweet, thick strawberry yoghurt. Keep refrigerated.', { art: 'strawberry', fridge: 1, cap: '#c2185b', liquid: { c: '#f6b3c9', fill: 0.9, op: 1 }, r: 0.036, h: 0.22 }],
  ['Arewa Mills', 'Fura da Nono', 1200, 'pet', '#fff8e1', '#795548', 500, 'ml', 'Millet balls in cultured milk. Shake well and drink cold.', { art: 'grain', fridge: 2, cap: '#795548', liquid: { c: '#f3ead2', fill: 0.88, op: 1 }, r: 0.036, h: 0.22 }],
  ['Fizzy Naija', 'Cola', 450, 'can', '#b71c1c', '#ffffff', 330, 'ml', 'Classic cola, straight from the fridge.', { art: 'fizz', fridge: 3, r: 0.033, h: 0.115 }],
  ['Fizzy Naija', 'Lemon Lime', 450, 'can', '#7cb342', '#ffffff', 330, 'ml', 'Crisp lemon-lime soda.', { art: 'fruit', fridge: 4, r: 0.033, h: 0.115 }],
  ['Volt Up', 'Energy Drink', 900, 'can', '#212121', '#00e5ff', 250, 'ml', 'Caffeine and B vitamins for long Lagos traffic.', { art: 'bolt', fridge: 5, r: 0.028, h: 0.13 }],
  ['Obudu Springs', 'Chilled Water', 200, 'pet', '#4fc3f7', '#ffffff', 500, 'ml', 'Cold table water. Mind the condensation.', { art: 'water', fridge: 6, cap: '#0277bd', liquid: { c: '#d6f1fc', fill: 0.9, op: 0.35 }, r: 0.032, h: 0.22 }],
  ['Calabar Fresh', 'Pineapple Ginger', 1300, 'pet', '#ffca28', '#6d4c41', 500, 'ml', 'Freshly pressed pineapple with a ginger kick.', { art: 'pineapple', fridge: 7, cap: '#6d4c41', liquid: { c: '#ffd54f', fill: 0.9, op: 0.9 }, r: 0.035, h: 0.22 }],

  // Promo end-caps at the front of each gondola: big sizes next to the everyday ones
  ['Sharp Sharp', 'Noodles Carton (40 Packs)', 12500, 'box', '#8d6e63', '#ffeb3b', 40, 'ct', 'A full carton of chicken noodles. Forty packs for the whole house.', { art: 'noodles', badge: 'Carton of 40', endcap: [0, 0], w: 0.42, h: 0.27, d: 0.3, promo: { was: 14000 } }],
  ['Sharp Sharp', 'Instant Noodles Big Pack', 550, 'pillow', '#ffeb3b', '#d50000', 120, 'g', 'The big pack, for when one small noodles is not enough.', { art: 'noodles', finish: 'foil', badge: 'Big pack 120 g', endcap: [0, 1], w: 0.19, h: 0.13, d: 0.045 }],
  ['Dodo Crunch', 'Plantain Chips Family Pack', 1300, 'pillow', '#f2b705', '#2e7d32', 400, 'g', 'Share-size plantain chips for parties and long drives.', { art: 'chips', window: 'chips', finish: 'foil', badge: 'Family size', endcap: [0, 2], w: 0.26, h: 0.34, d: 0.09, promo: { was: 1500 } }],
  ['Ofada Gold', 'Parboiled Rice 10 kg', 24000, 'sack', '#fafafa', '#c62828', 10000, 'g', 'The big bag. Stone-free rice for the whole month.', { art: 'rice', finish: 'fabric', badge: 'Promo', endcap: [1, 0], w: 0.4, h: 0.46, d: 0.15, promo: { was: 26500 } }],
  ['Ijebu Crisp', 'Yellow Garri', 5200, 'sack', '#ffe082', '#2e7d32', 4000, 'g', 'Palm-oil yellow garri, smooth and tasty. Big 4 kg bag.', { art: 'garri', window: 'garri', finish: 'gloss', endcap: [1, 1], w: 0.28, h: 0.38, d: 0.12 }],
  ['Tomatino', 'Tomato Paste Small Tin', 350, 'tin', '#d50000', '#2e7d32', 70, 'g', 'Small tin, just right for one pot of stew.', { art: 'tomato', endcap: [1, 2], r: 0.03, h: 0.045 }],
  ['Red Gold', 'Palm Oil 5 Litres', 16500, 'keg', '#e65100', '#ffeb3b', 5000, 'ml', 'A 5-litre keg of pure red palm oil. Best value per litre.', { art: 'palm', cap: '#ffeb3b', liquid: { c: '#c62200', fill: 0.85, op: 0.95 }, endcap: [2, 0], w: 0.26, h: 0.36, d: 0.16, promo: { was: 18000 } }],
  ['Sahel Pure', 'Groundnut Oil 3 Litres', 11800, 'keg', '#fdd835', '#2e7d32', 3000, 'ml', 'Groundnut oil in a handy 3-litre keg.', { art: 'nuts', cap: '#2e7d32', liquid: { c: '#f2c14e', fill: 0.85, op: 0.75 }, endcap: [2, 1], w: 0.22, h: 0.3, d: 0.13 }],
  ['Bright Wash', 'Detergent Powder 2 kg', 5400, 'pillow', '#1565c0', '#ffeb3b', 2000, 'g', 'The big bag of washing powder. Lasts the whole month.', { art: 'bubbles', finish: 'gloss', badge: 'Value pack', endcap: [2, 2], w: 0.3, h: 0.4, d: 0.11 }],

  // Sachet strips hanging off the cooking shelf
  ['Idunnu', 'Seasoning Sachet', 50, 'pillow', '#c62828', '#ffd600', 10, 'g', 'A single sachet of chicken seasoning. Enough for one pot.', { art: 'cubes', finish: 'foil', strip: [4, 1, 3.4], w: 0.07, h: 0.095, d: 0.012 }],
  ['Tomatino', 'Tomato Paste Sachet', 150, 'pillow', '#d50000', '#2e7d32', 70, 'g', 'Tomato paste in a handy sachet. No tin opener needed.', { art: 'tomato', finish: 'foil', strip: [4, 1, -3.4], w: 0.08, h: 0.11, d: 0.014 }],

  // Fashion corner · shoes (each is a pair)
  ['StrideNaija', 'White Sneakers', 18500, 'shoe', '#f5f5f5', '#1f7a55', 1, 'ct', 'Light everyday trainers with a cushioned sole.', { style: 'sneaker', size: 'Size 42', fashion: ['shoes', 0] }],
  ['Oja Kicks', 'Canvas Shoes', 9500, 'shoe', '#1a237e', '#ffffff', 1, 'ct', 'Classic lace-up canvas shoes with a rubber toe cap.', { style: 'canvas', size: 'Size 41', fashion: ['shoes', 1] }],
  ['Ikoyi Leather', 'Leather Loafers', 32000, 'shoe', '#6d3b1f', '#c9a227', 1, 'ct', 'Handmade brown leather loafers for work and owambe.', { style: 'loafer', size: 'Size 43', fashion: ['shoes', 2] }],
  ['Aba Made', 'Palm Slippers', 4500, 'shoe', '#8d6e63', '#3e2723', 1, 'ct', 'Leather palm slippers with crossed straps, made in Aba.', { style: 'palm', size: 'Size 42', fashion: ['shoes', 3] }],
  ['StrideNaija', 'Sports Slides', 6000, 'shoe', '#212121', '#43a047', 1, 'ct', 'Comfy slides for the house, the beach and the gym.', { style: 'slide', size: 'Size 43', fashion: ['shoes', 4] }],
  ['Aba Made', 'Leather Sandals', 12000, 'shoe', '#a1662f', '#3e2723', 1, 'ct', 'Strappy leather sandals with a brass buckle.', { style: 'sandal', size: 'Size 42', fashion: ['shoes', 5] }],
  // Fashion corner · eyewear
  ['SunGuard', 'Black Sunglasses', 7500, 'glasses', '#111111', '#2a2a2a', 1, 'ct', 'UV400 sunglasses for Lagos sunshine.', { style: 'sun', size: 'One size', fashion: ['glasses', 0] }],
  ['SunGuard', 'Pilot Sunglasses', 9000, 'glasses', '#c9a227', '#2e4a2e', 1, 'ct', 'Gold-frame pilot sunglasses with green lenses.', { style: 'pilot', size: 'One size', fashion: ['glasses', 1] }],
  ['ClearView Optics', 'Reading Glasses +1.5', 5000, 'glasses', '#5d4037', '#e3f2fd', 1, 'ct', 'Light reading glasses, strength +1.5.', { style: 'clear', size: '+1.5', fashion: ['glasses', 2] }],
  ['ClearView Optics', 'Blue Light Glasses', 8500, 'glasses', '#1565c0', '#d6ecff', 1, 'ct', 'Cuts blue light from phone and laptop screens.', { style: 'clear', size: 'One size', fashion: ['glasses', 3] }],
  // Fashion corner · caps and hats
  ['Eko Mart', 'Logo Cap', 3500, 'cap', '#1f7a55', '#ffffff', 1, 'ct', 'Eko Mart green cap with an embroidered logo.', { style: 'baseball', size: 'Adjustable', fashion: ['caps', 0] }],
  ['Lagos Lids', 'Baseball Cap', 4000, 'cap', '#212121', '#ffd600', 1, 'ct', 'Black six-panel cap with a curved brim.', { style: 'baseball', size: 'Adjustable', fashion: ['caps', 1] }],
  ['Ankara House', 'Aso-Oke Fila', 6500, 'cap', '#6a1b9a', '#ffd54f', 1, 'ct', 'Handwoven aso-oke cap for weddings and Sunday best.', { style: 'fila', size: 'Size 58', w: 0.2, h: 0.11, d: 0.2, fashion: ['caps', 2] }],
  ['Lagos Lids', 'Bucket Hat', 5000, 'cap', '#e8dcc0', '#795548', 1, 'ct', 'Soft cotton bucket hat for sun and shade.', { style: 'bucket', size: 'One size', w: 0.26, h: 0.085, d: 0.26, fashion: ['caps', 3] }],
  // Fashion corner · folded clothes
  ['Eko Threads', 'Plain White T-Shirt', 5500, 'folded', '#fafafa', '#1f7a55', 1, 'ct', 'Soft cotton crew-neck tee.', { fabric: 'tee', size: 'Size L', fashion: ['folded', 0] }],
  ['Naija Denim Co.', 'Blue Jeans', 15000, 'folded', '#3f5a8a', '#e08a2e', 1, 'ct', 'Straight-leg denim jeans with a leather patch.', { fabric: 'denim', size: 'W32 L32', fashion: ['folded', 1] }],
  ['Ankara House', 'Ankara Wrapper (6 Yards)', 18000, 'folded', '#e65100', '#1a237e', 1, 'ct', 'Six yards of bold wax-print fabric, ready for the tailor.', { fabric: 'ankara', c3: '#ffd600', size: '6 yards', fashion: ['folded', 2] }],
  ['Eko Threads', 'Kids T-Shirt', 3500, 'folded', '#ffca28', '#d32f2f', 1, 'ct', 'Bright cotton tee for kids.', { fabric: 'tee', w: 0.24, d: 0.2, size: 'Age 6–8', fashion: ['folded', 3] }],
  // Fashion corner · hanging clothes
  ['Ankara House', 'Ankara Print Shirt', 12000, 'hanger', '#00897b', '#ffd600', 1, 'ct', 'Short-sleeve shirt in a bold ankara print.', { fabric: 'ankara', c3: '#d84315', style: 'shirt', size: 'Size L', fashion: ['hang', 0] }],
  ['Eko Threads', 'Green-White Football Jersey', 10000, 'hanger', '#008751', '#ffffff', 1, 'ct', 'Green and white jersey for match day.', { fabric: 'jersey', style: 'jersey', size: 'Size M', fashion: ['hang', 1] }],
  ['Ankara House', 'Embroidered Kaftan', 25000, 'hanger', '#f3ede1', '#c9a227', 1, 'ct', 'Flowing kaftan with gold embroidery at the neck.', { fabric: 'kaftan', style: 'kaftan', size: 'Size XL', w: 0.58, h: 1.05, fashion: ['hang', 2] }],

  // Grab & go stand by the till
  ['LoveGuard', 'Strawberry Condoms', 1800, 'box', '#c2185b', '#ffffff', 3, 'ct', 'Three strawberry-flavoured latex condoms.', { art: 'strawberry', w: 0.085, h: 0.11, d: 0.03, rack: 0 }],
  ['SafeHaven', 'Studded Condoms', 1800, 'box', '#263238', '#ff9800', 3, 'ct', 'Three studded latex condoms.', { art: 'shield', w: 0.085, h: 0.11, d: 0.03, rack: 1 }],
  ['LoveGuard', 'Extra Large Condoms', 2000, 'box', '#4a148c', '#ffd600', 3, 'ct', 'Three extra-large latex condoms.', { art: 'shield', badge: 'XL', w: 0.085, h: 0.11, d: 0.03, rack: 2 }],
  ['Minty Pop', 'Chewing Gum', 300, 'box', '#00acc1', '#ffffff', 10, 'ct', 'Ten pieces of peppermint gum.', { art: 'leaf', w: 0.08, h: 0.05, d: 0.02, rack: 3 }],
  ['Cool Drops', 'Menthol Sweets', 200, 'pillow', '#1e88e5', '#ffffff', 20, 'ct', 'A bag of cooling menthol sweets.', { art: 'leaf', finish: 'foil', w: 0.09, h: 0.12, d: 0.025, rack: 4 }],
  ['Lolly Land', 'Fruit Lollipops', 1500, 'jar', '#e91e63', '#ffeb3b', 30, 'ct', 'A jar of thirty fruity lollipops.', { art: 'strawberry', contents: '#f06292', r: 0.055, h: 0.14, cap: '#ffeb3b', rack: 5 }],
];

// The fridge bank on the back wall: 8 glass doors, each 0.8 m wide.
export const FRIDGE = { x0: -3.2, door: 0.8, front: -10.25, back: -10.95, levels: [0.25, 0.68, 1.11, 1.54], doors: 8 };
// The till by the entrance. You stand on the -Z side; the cashier stands behind it.
export const TILL = {
  cx: 5.0, cz: 9.0, w: 3.0, d: 0.7, h: 0.9,
  beltX0: 3.65, beltX1: 5.25, scanX: 5.52, posX: 5.85, screenX: 6.1, bagX: 6.2, basketX: 3.95,
  stand: [4.7, 8.05], zone: { x0: 3.4, x1: 6.6, z0: 7.3, z1: 8.62 },
};
export const FRIDGE_FACE = { fridge: true, aisle: 0, cat: 'Chilled Drinks', g: 0, side: 1 };
const ENDCAP_FACE = (gi) => ({ endcap: true, aisle: 0, cat: 'Promo · Big sizes', g: GONDOLAS[gi], side: 1 });

function sizeLabel(q, u) {
  if (u === 'ml') return q >= 1000 ? q / 1000 + ' L' : q >= 250 && q % 10 === 0 ? q / 10 + 'cl' : q + ' ml';
  if (u === 'g') return q >= 1000 ? q / 1000 + ' kg' : q + ' g';
  return q + ' ct';
}
function unitPrice(price, q, u) {
  if (u === 'g') return fmt((price / q) * 1000) + ' / kg';
  if (u === 'ml') return fmt((price / q) * 1000) + ' / L';
  return fmt(price / q) + ' each';
}

/** Where a product lives, for the product card and messages. */
export const placeName = (p) => (p.fridge != null ? 'the fridges at the back' : p.endcap ? 'the promo stand at the front'
  : p.fashion ? 'the fashion corner in aisle 1' : p.rack != null ? 'the stand by the till' : 'aisle ' + p.face.aisle);
const FASHION_CAT = { shoes: 'Shoes', glasses: 'Eyewear', caps: 'Caps & hats', folded: 'Clothing', hang: 'Clothing' };

// A NAFDAC-style registration number, made up but stable per product.
const nafdac = (i) => `${'ABCD'[i % 4]}${1 + (i % 9)}-${String(1000 + ((i * 7919) % 8999)).padStart(4, '0')}`;

export const PRODUCTS = RAW.map((r, i) => {
  const [brand, line, price, shape, c1, c2, q, u, desc, o] = r;
  const d = { ...DEF[shape], ...o };
  const round = ROUND.has(shape);
  const W = round ? d.r * 2 : d.w;
  const D = round ? d.r * 2 : d.d;
  const face = o.fridge != null ? FRIDGE_FACE : o.endcap ? ENDCAP_FACE(o.endcap[0]) : o.strip ? FACES[o.strip[0]]
    : o.fashion ? { fashion: true, aisle: 1, cat: 'Fashion · ' + FASHION_CAT[o.fashion[0]], g: FASHION.wallX, side: 1 }
      : o.rack != null ? { rack: true, aisle: 0, cat: 'Grab & go', g: RACK.x, side: -1 } : FACES[Math.floor(i / 8)];
  return {
    id: i, brand, line, price, shape, c1, c2, desc, round, q, u,
    art: o.art || 'leaf', badge: o.badge || null, finish: o.finish || (shape === 'sack' ? 'fabric' : 'paper'),
    window: o.window || null, liquid: o.liquid || null, contents: o.contents || null, lid: !!o.lid,
    cap: o.cap || c2, promo: o.promo || null,
    dims: d, W, D, H: d.h, maxDim: Math.max(W, D, d.h),
    face, level: Math.floor((i % 8) / 2), half: i % 2,
    fridge: o.fridge != null ? o.fridge : null, endcap: o.endcap || null, strip: o.strip || null,
    fashion: o.fashion || null, rack: o.rack != null ? o.rack : null, style: o.style || null, fabric: o.fabric || null, c3: o.c3 || c2,
    size: o.size || sizeLabel(q, u), unit: unitPrice(price, q, u), nafdac: nafdac(i),
    // hanging clothes are folded before they go in a basket
    fold: shape === 'hanger' ? { W: 0.3, H: 0.05, D: 0.24 } : null,
  };
});
