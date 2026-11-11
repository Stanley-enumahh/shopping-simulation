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
export const AISLES = { 1: 'Snacks', 2: 'Breakfast & Staples', 3: 'Drinks & Cooking', 4: 'Home & Health' };

const DEF = {
  box: { w: 0.26, h: 0.34, d: 0.08 }, bag: { w: 0.22, h: 0.3, d: 0.085 }, can: { r: 0.042, h: 0.122 }, jar: { r: 0.05, h: 0.12 },
  bottle: { r: 0.038, h: 0.3 }, carton: { w: 0.085, h: 0.24, d: 0.085 }, tub: { r: 0.06, h: 0.09 }, jug: { w: 0.15, h: 0.28, d: 0.1 },
};

// [brand, product, price in Naira, shape, main color, accent color, quantity, unit, description, options]
// Eight per shelf face, two per shelf, bottom shelf first. Brands are invented; the products are Nigerian staples.
const RAW = [
  // Aisle 1 · Snacks
  ['Dodo Crunch', 'Plantain Chips', 500, 'bag', '#f2b705', '#2e7d32', 150, 'g', 'Thin slices of unripe plantain, fried crisp and lightly salted.', { m: 4, w: 0.18, h: 0.26, d: 0.07 }],
  ['Mama Put', 'Crunchy Chin Chin', 1200, 'bag', '#c8102e', '#ffd166', 250, 'g', 'Sweet, crunchy fried dough bites with a hint of nutmeg.', { m: 3, w: 0.2, h: 0.28, d: 0.08 }],
  ['Kano Roast', 'Roasted Groundnuts', 700, 'bag', '#8d5524', '#ffe8c2', 200, 'g', 'Sand-roasted peanuts from the north. Best with garri and cold water.', { m: 3, w: 0.16, h: 0.22, d: 0.06 }],
  ['Kano Roast', 'Kuli Kuli', 600, 'bag', '#5d3a1a', '#f4c430', 150, 'g', 'Spicy groundnut sticks, fried until crunchy.', { m: 1, f: 'b', w: 0.16, h: 0.22, d: 0.06 }],
  ['Eko Sweets', 'Coconut Candy', 900, 'jar', '#f5f0e1', '#8b5a2b', 200, 'g', 'Chewy caramelised coconut, the way it is sold on Lagos streets.', { m: 0, cap: '#8b5a2b' }],
  ['Aya Gold', 'Tiger Nuts', 1100, 'jar', '#c99b5b', '#3e2a14', 250, 'g', 'Sweet, crunchy tiger nuts. Snack on them or blend into kunu.', { m: 4, r: 0.045, h: 0.13, cap: '#3e2a14' }],
  ['Tea Time', 'Hard Biscuits', 700, 'box', '#1565c0', '#ffd54f', 100, 'g', 'Hard, dry biscuits made for dipping in tea.', { m: 1, f: 'b', w: 0.22, h: 0.08, d: 0.07 }],
  ['Tea Time', 'Cream Crackers', 900, 'box', '#d32f2f', '#fff8e1', 200, 'g', 'Light, flaky crackers. Lovely with butter or sardines.', { m: 2, w: 0.2, h: 0.12, d: 0.06 }],

  // Aisle 2 · Breakfast
  ['Moo Naija', 'Full Cream Milk Powder', 5800, 'bag', '#0d47a1', '#ffffff', 400, 'g', 'Rich full cream powdered milk for tea, pap and cereal.', { m: 2, w: 0.2, h: 0.3, d: 0.07 }],
  ['Morning Sun', 'Corn Flakes', 3800, 'box', '#f9a825', '#c62828', 350, 'g', 'Crisp golden corn flakes. Add milk and a little sugar.', { m: 0 }],
  ['Jos Plateau', 'Oat Flakes', 3200, 'box', '#e9dcc0', '#33691e', 500, 'g', 'Rolled oats from cool highland farms. Cooks in five minutes.', { m: 4, w: 0.19, h: 0.28, d: 0.1 }],
  ['Sweet Cup', 'Vanilla Custard Powder', 2600, 'tub', '#fbc02d', '#c62828', 400, 'g', 'Smooth vanilla custard. Stir into hot water, then add milk and sugar.', { m: 0, r: 0.062, h: 0.13, cap: '#c62828' }],
  ['Power Up', 'Chocolate Malt Drink', 4500, 'tub', '#4e342e', '#43a047', 400, 'g', 'Chocolate malt powder for a strong start to the school day.', { m: 1, f: 'b', r: 0.06, h: 0.13, cap: '#43a047' }],
  ['Moo Naija', 'Evaporated Milk', 850, 'can', '#ffffff', '#0d47a1', 160, 'ml', 'Creamy unsweetened evaporated milk for tea and cooking.', { m: 2, r: 0.037, h: 0.078 }],
  ['Mambilla Highlands', 'Black Tea', 1200, 'box', '#1b5e20', '#ffca28', 50, 'ct', 'Fifty bags of strong black tea grown on the Mambilla Plateau.', { m: 4, w: 0.16, h: 0.09, d: 0.07 }],
  ['Sweet Savannah', 'Sugar Cubes', 1500, 'box', '#ffffff', '#1e88e5', 500, 'g', 'Neat white sugar cubes. Two per cup.', { m: 3, w: 0.15, h: 0.1, d: 0.08 }],

  // Aisle 2 · Staples
  ['Ofada Gold', 'Parboiled Long Grain Rice', 12500, 'bag', '#fafafa', '#c62828', 5000, 'g', 'Stone-free parboiled rice for jollof, fried rice and party trays.', { m: 4, w: 0.32, h: 0.38, d: 0.12 }],
  ['Ijebu Crisp', 'White Garri', 2800, 'bag', '#ffffff', '#2e7d32', 2000, 'g', 'Fine, sour and crunchy. For soaking or making eba.', { m: 3, w: 0.24, h: 0.34, d: 0.1 }],
  ['Oloyin Farms', 'Honey Beans', 3200, 'bag', '#a1622f', '#fff3e0', 1000, 'g', 'Sweet brown beans for ewa agoyin, moi moi and akara.', { m: 3, w: 0.22, h: 0.3, d: 0.09 }],
  ['Iyan Easy', 'Poundo Yam Flour', 3400, 'box', '#fff8e1', '#6d4c41', 1000, 'g', 'Smooth pounded yam without the mortar and pestle.', { m: 0, w: 0.2, h: 0.3, d: 0.1 }],
  ['Arewa Mills', 'Semolina', 2400, 'bag', '#ffe082', '#1565c0', 1000, 'g', 'Fine wheat semolina for a smooth swallow.', { m: 2, w: 0.2, h: 0.28, d: 0.08 }],
  ['Mama Nkechi', 'Ground Egusi', 3000, 'bag', '#f0e6c8', '#2e7d32', 500, 'g', 'Ground melon seeds, ready for a pot of egusi soup.', { m: 4, w: 0.16, h: 0.22, d: 0.06 }],
  ['Lagos Pasta Co.', 'Spaghetti', 1300, 'box', '#0d47a1', '#ffeb3b', 500, 'g', 'Long durum wheat spaghetti. Perfect for jollof spaghetti.', { m: 1, f: 'b', w: 0.09, h: 0.3, d: 0.05 }],
  ['Lagos Pasta Co.', 'Macaroni', 1250, 'box', '#c62828', '#ffeb3b', 500, 'g', 'Short elbow macaroni that soaks up stew.', { m: 1, f: 'b', w: 0.13, h: 0.22, d: 0.07 }],

  // Aisle 3 · Drinks
  ['Pure Spring', 'Sachet Water', 500, 'bag', '#b3e5fc', '#0277bd', 20, 'ct', 'A bag of twenty 50cl sachets of treated drinking water.', { m: 2, w: 0.3, h: 0.3, d: 0.13, size: '20 × 50cl' }],
  ['Calabar Fresh', 'Pineapple Juice', 2200, 'carton', '#ffca28', '#2e7d32', 1000, 'ml', 'Sweet pineapple juice with no added sugar.', { m: 4 }],
  ['Obudu Springs', 'Table Water', 250, 'bottle', '#4fc3f7', '#ffffff', 750, 'ml', 'Clean, cold table water from the hills.', { m: 2, cap: '#0277bd', body: '#d6f1fc', r: 0.036, h: 0.26 }],
  ['Fizzy Naija', 'Orange Soda', 450, 'bottle', '#ff8f00', '#1b5e20', 500, 'ml', 'Bright, fizzy orange soda. Serve ice cold.', { m: 0, cap: '#1b5e20', body: '#ffb74d', r: 0.035, h: 0.25 }],
  ['Hibiscus House', 'Zobo Drink', 700, 'bottle', '#880e4f', '#ffd54f', 500, 'ml', 'Hibiscus brewed with ginger, cloves and pineapple.', { m: 4, cap: '#ffd54f', body: '#ad1457', r: 0.035, h: 0.23 }],
  ['Arewa Mills', 'Kunu Aya', 600, 'bottle', '#f3e5c3', '#6d4c41', 500, 'ml', 'Creamy tiger nut drink with dates and ginger.', { m: 3, cap: '#6d4c41', body: '#efe3c8', r: 0.035, h: 0.23 }],
  ['Golden Malt', 'Malt Drink', 600, 'can', '#3e2723', '#ffc107', 330, 'ml', 'Rich, non-alcoholic malt drink. Best chilled.', { m: 1, f: 'b', r: 0.033, h: 0.115 }],
  ['Sunset Bar', 'Chapman Mix', 900, 'can', '#e53935', '#ffeb3b', 330, 'ml', 'Fruity Chapman with citrus, grenadine and bitters.', { m: 0, f: 'b', r: 0.033, h: 0.115 }],

  // Aisle 3 · Cooking
  ['Red Gold', 'Palm Oil', 3500, 'bottle', '#e65100', '#ffeb3b', 1000, 'ml', 'Pure red palm oil for banga, egusi and ofada stew.', { m: 0, cap: '#ffeb3b', body: '#d84315', r: 0.045, h: 0.3 }],
  ['Sahel Pure', 'Groundnut Oil', 4200, 'bottle', '#fdd835', '#2e7d32', 1000, 'ml', 'Groundnut oil from Kano, for frying and stew.', { m: 2, cap: '#2e7d32', body: '#fff176', r: 0.045, h: 0.3 }],
  ['Tomatino', 'Double Tomato Paste', 900, 'can', '#d50000', '#2e7d32', 210, 'g', 'Thick double-concentrated paste, the base of every good stew.', { m: 4, r: 0.04, h: 0.06 }],
  ['Highlife', 'Corned Beef', 2300, 'can', '#b71c1c', '#ffd54f', 340, 'g', 'Tender corned beef for sauces, sandwiches and plantain.', { m: 1, r: 0.045, h: 0.07 }],
  ['Sharp Sharp', 'Instant Noodles Chicken', 350, 'bag', '#ffeb3b', '#d50000', 70, 'g', 'Chicken-flavour noodles ready in three minutes. Add egg and pepper.', { m: 0, w: 0.15, h: 0.11, d: 0.035 }],
  ['Sharp Sharp', 'Instant Noodles Pepper Chicken', 350, 'bag', '#d50000', '#ffeb3b', 70, 'g', 'The same quick noodles with a peppery kick.', { m: 0, w: 0.15, h: 0.11, d: 0.035 }],
  ['Idunnu', 'Seasoning Cubes', 1600, 'box', '#c62828', '#ffd600', 100, 'ct', 'One hundred chicken seasoning cubes for soups and stews.', { m: 3, w: 0.14, h: 0.09, d: 0.06 }],
  ["Mallam's", 'Suya Spice (Yaji)', 900, 'jar', '#6d2f12', '#ffb300', 100, 'g', 'Ground peanut, ginger and pepper blend for suya at home.', { m: 3, r: 0.035, h: 0.09, cap: '#ffb300' }],

  // Aisle 4 · Home & Health
  ['Bright Wash', 'Detergent Powder', 2600, 'bag', '#1565c0', '#ffeb3b', 900, 'g', 'Hand-wash and machine detergent with a fresh scent.', { m: 2, w: 0.24, h: 0.32, d: 0.09 }],
  ['No Mosquito', 'Insect Killer Spray', 3200, 'can', '#2e7d32', '#ffeb3b', 400, 'ml', 'Kills mosquitoes and cockroaches. Spray, then close the room for 15 minutes.', { m: 1, f: 'b', r: 0.033, h: 0.2, size: '400 ml' }],
  ['Naija Glow', 'Bar Soap', 600, 'box', '#f8bbd0', '#ad1457', 150, 'g', 'Gentle bathing soap with shea butter.', { m: 4, w: 0.09, h: 0.06, d: 0.045 }],
  ['Comfy Days', 'Sanitary Pads', 1300, 'bag', '#ce93d8', '#4a148c', 10, 'ct', 'Ten soft, ultra-thin pads with wings.', { m: 0, w: 0.17, h: 0.2, d: 0.08 }],
  ['Smile Bright', 'Toothpaste', 1400, 'box', '#e3f2fd', '#d32f2f', 140, 'g', 'Fluoride toothpaste with mint. Fights cavities.', { m: 1, w: 0.2, h: 0.05, d: 0.045 }],
  ['Cool Breeze', 'Menthol Rub', 500, 'tub', '#26a69a', '#ffffff', 25, 'g', 'Cooling menthol rub for headaches, catarrh and aches.', { m: 2, r: 0.03, h: 0.03, cap: '#ffffff' }],
  ['SafeHaven', 'Ultra Thin Condoms', 1500, 'box', '#263238', '#00bcd4', 3, 'ct', 'Three ultra-thin latex condoms. Protects against pregnancy and STIs.', { m: 2, w: 0.085, h: 0.11, d: 0.03 }],
  ['SafeHaven', 'Classic Condoms', 5000, 'box', '#263238', '#e91e63', 12, 'ct', 'Twelve classic latex condoms in a discreet box.', { m: 2, w: 0.11, h: 0.14, d: 0.045 }],

  // Back wall · Chilled drinks fridges (one product per glass door)
  ['Golden Malt', 'Malt Drink Bottle', 700, 'bottle', '#3e2723', '#ffc107', 330, 'ml', 'Ice-cold malt in a returnable glass bottle.', { m: 1, f: 'b', fridge: 0, body: '#2b1a10', cap: '#ffc107', r: 0.033, h: 0.23 }],
  ['Moo Naija', 'Strawberry Yoghurt Drink', 1100, 'bottle', '#f8bbd0', '#c2185b', 500, 'ml', 'Sweet, thick strawberry yoghurt. Keep refrigerated.', { m: 3, fridge: 1, body: '#fce4ec', cap: '#c2185b', r: 0.036, h: 0.22 }],
  ['Arewa Mills', 'Fura da Nono', 1200, 'bottle', '#fff8e1', '#795548', 500, 'ml', 'Millet balls in cultured milk. Shake well and drink cold.', { m: 4, fridge: 2, body: '#fffde7', cap: '#795548', r: 0.036, h: 0.22 }],
  ['Fizzy Naija', 'Cola', 450, 'can', '#b71c1c', '#ffffff', 330, 'ml', 'Classic cola, straight from the fridge.', { m: 2, f: 'b', fridge: 3, r: 0.033, h: 0.115 }],
  ['Fizzy Naija', 'Lemon Lime', 450, 'can', '#7cb342', '#ffffff', 330, 'ml', 'Crisp lemon-lime soda.', { m: 2, f: 'b', fridge: 4, r: 0.033, h: 0.115 }],
  ['Volt Up', 'Energy Drink', 900, 'can', '#212121', '#00e5ff', 250, 'ml', 'Caffeine and B vitamins for long Lagos traffic.', { m: 1, f: 'b', fridge: 5, r: 0.028, h: 0.13 }],
  ['Obudu Springs', 'Chilled Water', 200, 'bottle', '#4fc3f7', '#ffffff', 500, 'ml', 'Cold table water. Mind the condensation.', { m: 2, fridge: 6, cap: '#0277bd', body: '#d6f1fc', r: 0.032, h: 0.22 }],
  ['Calabar Fresh', 'Pineapple Ginger', 1300, 'bottle', '#ffca28', '#6d4c41', 500, 'ml', 'Freshly pressed pineapple with a ginger kick.', { m: 4, fridge: 7, cap: '#6d4c41', body: '#ffe082', r: 0.035, h: 0.22 }],
];
// The fridge bank on the back wall: 8 glass doors, each 0.8 m wide.
export const FRIDGE = { x0: -3.2, door: 0.8, front: -10.25, back: -10.95, levels: [0.25, 0.68, 1.11, 1.54], doors: 8 };
// The till by the entrance. You stand on the -Z side; the cashier stands behind it.
export const TILL = {
  cx: 5.0, cz: 9.0, w: 3.0, d: 0.7, h: 0.9,
  beltX0: 3.65, beltX1: 5.25, scanX: 5.52, posX: 5.85, screenX: 6.1, bagX: 6.2, basketX: 3.95,
  stand: [4.7, 8.05], zone: { x0: 3.4, x1: 6.6, z0: 7.3, z1: 8.62 },
};
export const FRIDGE_FACE ={ fridge: true, aisle: 0, cat: 'Chilled Drinks', g: 0, side: 1 };

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
export const placeName = (p) => (p.fridge != null ? 'the fridges at the back' : 'aisle ' + p.face.aisle);

export const PRODUCTS = RAW.map((r, i) => {
  const [brand, line, price, shape, c1, c2, q, u, desc, o] = r;
  const d = { ...DEF[shape], ...o };
  const round = shape === 'can' || shape === 'jar' || shape === 'bottle' || shape === 'tub';
  const W = round ? d.r * 2 : d.w;
  const D = round ? d.r * 2 : d.d;
  return {
    id: i, brand, line, price, shape, c1, c2, desc, round,
    m: o.m || 0, f: o.f || 'f', cap: o.cap || c2, body: o.body || null, spray: !!o.spray,
    dims: d, W, D, H: d.h, maxDim: Math.max(W, D, d.h),
    face: o.fridge != null ? FRIDGE_FACE : FACES[Math.floor(i / 8)], level: Math.floor((i % 8) / 2), half: i % 2,
    fridge: o.fridge != null ? o.fridge : null,
    size: o.size || sizeLabel(q, u), unit: unitPrice(price, q, u),
  };
});
