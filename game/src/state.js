// Dapur Kilat's state: one plain object, created fresh per run, advanced by
// `stepState`. Nothing here draws or listens; input.js decides what the cook
// tries to do, and this module decides what actually happens.

import {
  DAY_LENGTH, HEARTS, MAX_ORDERS, PLATE_SLOTS, TRAY_SIZE, CHEF_SPEED,
  DISHES, choppedId, dayPacing, dishesForDay,
} from './config.js';

/** A tiny seeded generator (mulberry32) so ?seed=N replays the same service. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createState(seed) {
  const rng = createRandom(seed);
  return {
    rng,
    seed,
    screen: 'title',
    time: 0,
    day: 1,
    dayTime: DAY_LENGTH,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    servedToday: 0,
    earnedToday: 0,
    missed: 0,
    hearts: HEARTS,
    orders: [],
    selectedOrder: 0,
    nextOrderId: 1,
    spawnTimer: 2.5,
    tray: [],
    carrying: null,
    chef: { x: 640, y: 620, tx: 640, ty: 620, moving: false, face: 1 },
    board: { job: null, output: null },
    wok: { job: null },
    grill: { job: null },
    kettle: { job: null },
    plates: Array.from({ length: PLATE_SLOTS }, () => null),
    particles: [],
    popups: [],
    hints: [],
    shake: 0,
    muted: false,
    daySummary: null,
    events: [],
  };
}

export function resetState(state, seed) {
  const fresh = createState(seed);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.screen = 'play';
}

/** One frame of simulation; `dt` is the fixed step. Sounds and visuals read `events`. */
export function stepState(state, dt) {
  state.time += dt;
  if (state.screen !== 'play') return;

  state.dayTime -= dt;
  if (state.dayTime <= 0) {
    state.dayTime = 0;
    endDay(state);
    return;
  }

  moveChef(state, dt);
  updateOrders(state, dt);
  updateJobs(state, dt);
  updateParticles(state, dt);
  updatePopups(state, dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
  if (state.hints.length > 0) state.hints[0].life -= dt;

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.orders.length < MAX_ORDERS) {
    spawnOrder(state);
    state.spawnTimer = dayPacing(state.day).spawnEvery * (0.85 + state.rng() * 0.3);
  }
}

function moveChef(state, dt) {
  const chef = state.chef;
  if (!chef.moving) return;
  const dx = chef.tx - chef.x;
  const dy = chef.ty - chef.y;
  const dist = Math.hypot(dx, dy);
  const step = CHEF_SPEED * dt;
  if (dist <= step) {
    chef.x = chef.tx;
    chef.y = chef.ty;
    chef.moving = false;
    if (chef.pendingAction) {
      const action = chef.pendingAction;
      chef.pendingAction = null;
      action();
    }
    return;
  }
  chef.x += (dx / dist) * step;
  chef.y += (dy / dist) * step;
  chef.face = dx >= 0 ? 1 : -1;
}

/** Walk the cook to a point, then run `action` on arrival (at once if already there). */
export function walkTo(state, x, y, action) {
  const chef = state.chef;
  const dist = Math.hypot(x - chef.x, y - chef.y);
  if (dist < 8) {
    action();
    return;
  }
  chef.tx = x;
  chef.ty = y;
  chef.moving = true;
  chef.pendingAction = action;
}

function updateOrders(state, dt) {
  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      state.missed += 1;
      state.hearts -= 1;
      state.combo = 0;
      state.events.push({ type: 'miss', order });
      const ticketX = 16 + i * (296 + 8) + 148;
      addPopup(state, ticketX, 110, 'MISSED!', '#d93a2b');
      if (state.selectedOrder >= state.orders.length) {
        state.selectedOrder = Math.max(0, state.orders.length - 1);
      }
      if (state.hearts <= 0) {
        state.hearts = 0;
        endRun(state);
        return;
      }
    }
  }
}

function updateJobs(state, dt) {
  updateChop(state, dt);
  updateCook(state, state.wok, dt, 663, 216);
  updateCook(state, state.grill, dt, 889, 216);
  updateCook(state, state.kettle, dt, 1137, 216);
}

function updateChop(state, dt) {
  const job = state.board.job;
  if (!job) return;
  job.progress += dt / job.duration;
  if (job.progress >= 1) {
    state.board.job = null;
    state.board.output = choppedId(job.item);
    state.events.push({ type: 'chopped', item: choppedId(job.item) });
  }
}

function updateCook(state, station, dt, sx, sy) {
  const job = station.job;
  if (!job || job.done) return;
  job.progress += dt / job.cookTime;
  if (!job.burnt && Math.random() < dt * 8) {
    addParticle(state, sx + (Math.random() - 0.5) * 50, sy, (Math.random() - 0.5) * 10, -30 - Math.random() * 20, 0.7, 'rgba(255,255,255,0.8)', 3);
  }
  if (job.progress >= 1) {
    if (job.dish === 'es-teh') {
      finishCook(state, station, job);
    } else {
      job.burnt = true;
      job.done = true;
      state.shake = 0.35;
      state.events.push({ type: 'burn', station });
    }
  }
}

/** A finished cook lands on the plating counter (or waits if it is full). */
function finishCook(state, station, job) {
  const slot = state.plates.indexOf(null);
  station.job = null;
  if (slot === -1) {
    state.events.push({ type: 'platesFull', dish: job.dish });
    return;
  }
  state.plates[slot] = job.dish;
  state.events.push({ type: 'plated', dish: job.dish, slot });
}

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 12 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updatePopups(state, dt) {
  for (let i = state.popups.length - 1; i >= 0; i -= 1) {
    const p = state.popups[i];
    p.life -= dt;
    p.y -= 34 * dt;
    if (p.life <= 0) state.popups.splice(i, 1);
  }
}

export function addParticle(state, x, y, vx, vy, life, color, size) {
  state.particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

export function addPopup(state, x, y, text, color) {
  state.popups.push({ x, y, text, color, life: 1.4 });
}

export function showHint(state, text) {
  state.hints = [{ text, life: 2.2 }];
}

/** Spawn one ticket from the day's menu. */
export function spawnOrder(state) {
  const menu = dishesForDay(state.day);
  const dishId = menu[Math.floor(state.rng() * menu.length)];
  const pacing = dayPacing(state.day);
  const order = {
    id: state.nextOrderId,
    dish: dishId,
    patience: pacing.patience,
    patienceMax: pacing.patience,
    x: 0,
    born: state.time,
  };
  state.nextOrderId += 1;
  state.orders.push(order);
  state.events.push({ type: 'ticket', order });
}

/** The tray holds raw and chopped ingredients, never finished dishes. */
export function trayHas(state, itemId) {
  return state.tray.includes(itemId);
}

export function trayTake(state, itemId) {
  const i = state.tray.indexOf(itemId);
  if (i === -1) return false;
  state.tray.splice(i, 1);
  return true;
}

/** Which dish, if any, the tray can start right now at its station. */
export function dishReadyInTray(state, stationId) {
  for (const dishId of Object.keys(DISHES)) {
    const dish = DISHES[dishId];
    if (dish.station !== stationId) continue;
    if (dish.needs.every((need) => trayHas(state, need))) return dishId;
  }
  return null;
}

/** The first ingredient of a dish the tray is still missing (for the hint line). */
export function missingForDish(state, stationId) {
  let best = null;
  for (const dishId of Object.keys(DISHES)) {
    const dish = DISHES[dishId];
    if (dish.station !== stationId) continue;
    const missing = dish.needs.filter((need) => !trayHas(state, need));
    if (missing.length === 0) return null;
    if (!best || missing.length < best.missing.length) best = { dishId, missing };
  }
  return best;
}

function endDay(state) {
  const served = state.servedToday;
  const stars = served >= 12 ? 3 : served >= 8 ? 2 : served >= 4 ? 1 : 0;
  state.daySummary = {
    day: state.day,
    served,
    earned: state.earnedToday,
    missed: state.missed,
    stars,
  };
  state.screen = 'dayover';
  state.events.push({ type: 'dayEnd' });
}

export function nextDay(state) {
  state.day += 1;
  state.dayTime = DAY_LENGTH;
  state.servedToday = 0;
  state.earnedToday = 0;
  state.orders.length = 0;
  state.spawnTimer = 2.0;
  state.screen = 'play';
  spawnOrder(state);
  spawnOrder(state);
}

function endRun(state) {
  state.screen = 'over';
  state.events.push({ type: 'gameOver' });
}

/** Stars for the final screen, from the final score. */
export function finalStars(score) {
  if (score >= 2500) return 3;
  if (score >= 1200) return 2;
  if (score >= 500) return 1;
  return 0;
}

/** Serve the carried dish to the matching ticket; returns the coins earned. */
export function serveDish(state, orderIndex) {
  const order = state.orders[orderIndex];
  if (!order || state.carrying !== order.dish) return 0;
  const dish = DISHES[order.dish];
  const patienceFrac = Math.max(0, order.patience / order.patienceMax);
  const tip = patienceFrac > 0.5 ? 1.2 : 1;
  const comboMult = 1 + Math.min(state.combo, 10) * 0.1;
  const coins = Math.round(dish.coins * tip * comboMult);
  state.orders.splice(orderIndex, 1);
  state.carrying = null;
  state.coins += coins;
  state.score += coins;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.served += 1;
  state.servedToday += 1;
  state.earnedToday += coins;
  if (state.selectedOrder >= state.orders.length) {
    state.selectedOrder = Math.max(0, state.orders.length - 1);
  }
  state.events.push({ type: 'serve', order, coins });
  return coins;
}
