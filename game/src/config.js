// Dapur Kilat — every tuning number, dish, recipe and layout rect in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Seconds in one service day. */
export const DAY_LENGTH = 150;

/** Hearts lost when an order's patience runs out; 0 hearts ends the run. */
export const HEARTS = 3;

/** How many ingredients the cook can carry at once. */
export const TRAY_SIZE = 4;

/** How many finished dishes the plating counter holds. */
export const PLATE_SLOTS = 3;

/** How many order tickets can wait on the board at once. */
export const MAX_ORDERS = 4;

export const CHEF_SPEED = 540;

/** Ingredient catalogue. `chop` means the pantry item must visit the board first. */
export const ITEMS = {
  rice: { name: 'Rice', short: 'Rice', color: '#f5f0e1', chop: false },
  noodle: { name: 'Noodles', short: 'Noodle', color: '#f2a541', chop: false },
  chicken: { name: 'Chicken', short: 'Chicken', color: '#e07856', chop: true },
  greens: { name: 'Greens', short: 'Greens', color: '#58b368', chop: true },
  egg: { name: 'Egg', short: 'Egg', color: '#ffd66b', chop: false },
  chili: { name: 'Chili', short: 'Chili', color: '#d93a2b', chop: true },
  skewer: { name: 'Skewers', short: 'Skewer', color: '#c98f5a', chop: false },
  peanut: { name: 'Peanut Sauce', short: 'Peanut', color: '#a06a35', chop: false },
  tea: { name: 'Tea', short: 'Tea', color: '#8a5a2b', chop: false },
  ice: { name: 'Ice', short: 'Ice', color: '#a8d8ea', chop: false },
};

/** Chopped form of a choppable ingredient. */
export function choppedId(id) {
  return `${id}_chopped`;
}

export function choppedName(id) {
  return `Chopped ${ITEMS[id].name}`;
}

/**
 * The menu. Each dish lists what the cook must carry to start its station job,
 * which station cooks it, how long it cooks, the perfect window (fractions of
 * the cook time) and what it pays.
 */
export const DISHES = {
  'nasi-goreng': {
    name: 'Nasi Goreng',
    station: 'wok',
    needs: ['rice', 'egg', 'chili_chopped'],
    cookTime: 4.5,
    perfect: [0.55, 0.9],
    coins: 120,
    color: '#e2574c',
    blurb: 'Wok-fried rice, egg, chili',
  },
  'mie-ayam': {
    name: 'Mie Ayam',
    station: 'wok',
    needs: ['noodle', 'chicken_chopped', 'greens_chopped'],
    cookTime: 5.0,
    perfect: [0.55, 0.9],
    coins: 140,
    color: '#f2a541',
    blurb: 'Chicken noodles with greens',
  },
  'sate-ayam': {
    name: 'Sate Ayam',
    station: 'grill',
    needs: ['skewer', 'peanut'],
    cookTime: 4.0,
    perfect: [0.5, 0.85],
    coins: 160,
    color: '#c98f5a',
    blurb: 'Grilled skewers, peanut sauce',
  },
  'es-teh': {
    name: 'Es Teh',
    station: 'kettle',
    needs: ['tea', 'ice'],
    cookTime: 1.5,
    perfect: [0, 1],
    coins: 60,
    color: '#a06a35',
    blurb: 'Sweet iced tea, quick pour',
  },
};

export const DISH_IDS = Object.keys(DISHES);

/** Which dishes each day unlocks (day 1 starts with two, the rest join in). */
export function dishesForDay(day) {
  if (day <= 1) return ['nasi-goreng', 'mie-ayam'];
  if (day === 2) return ['nasi-goreng', 'mie-ayam', 'sate-ayam'];
  return DISH_IDS;
}

/** Order pacing per day: seconds between new tickets, and ticket patience. */
export function dayPacing(day) {
  return {
    spawnEvery: Math.max(5.5, 9 - day * 0.8),
    patience: Math.max(22, 46 - day * 3),
  };
}

/** The pantry bins, in the order they sit on the shelf. */
export const PANTRY = ['rice', 'noodle', 'chicken', 'greens', 'egg', 'chili', 'skewer', 'peanut', 'tea', 'ice'];

/** Layout rects, in logical pixels. */
export const LAYOUT = {
  header: { x: 0, y: 0, w: 1280, h: 54 },
  orders: { x: 16, y: 62, w: 296, h: 92, gap: 8 },
  pantry: { x: 16, y: 172, w: 300, h: 148 },
  board: { x: 332, y: 172, w: 210, h: 148 },
  wok: { x: 558, y: 172, w: 210, h: 148 },
  grill: { x: 784, y: 172, w: 210, h: 148 },
  kettle: { x: 1010, y: 172, w: 254, h: 148 },
  plating: { x: 16, y: 340, w: 560, h: 158 },
  window: { x: 592, y: 340, w: 520, h: 158 },
  trash: { x: 1128, y: 340, w: 136, h: 158 },
  floorY: 560,
  tray: { x: 16, y: 664, w: 1248, h: 48 },
};

/** Where the cook stands to use each station. */
export function standPoint(stationId) {
  const r = LAYOUT[stationId];
  if (!r) return { x: FIELD.width / 2, y: 620 };
  // The window's hint text sits left of the hatch; the cook stands at its
  // right edge so the carried plate never covers the text.
  if (stationId === 'window') return { x: r.x + r.w - 70, y: r.y + r.h + 40 };
  return { x: r.x + r.w / 2, y: r.y + r.h + 40 };
}

export const PALETTE = {
  wall: '#f3d9b0',
  wallTop: '#e8b98a',
  floor: '#c98f5a',
  floorDark: '#b57a48',
  counter: '#2e6f6a',
  counterTop: '#3d8a83',
  counterEdge: '#245954',
  wood: '#8a5a2b',
  woodLight: '#a06a35',
  board: '#e8c98f',
  ticket: '#fff8e7',
  ticketEdge: '#d9c48f',
  text: '#2b2118',
  muted: '#7a6a55',
  white: '#ffffff',
  gold: '#f2c94c',
  red: '#d93a2b',
  green: '#58b368',
  amber: '#f2a541',
  ink: '#1d2733',
  panel: '#fff3d6',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';

/** Star thresholds on final score. */
export const STARS = [500, 1200, 2500];
