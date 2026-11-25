// The screenshot scenes behind ?shot=cover|orders|cooking|serve. Each one
// hand-builds a real mid-game state (real tickets, real jobs, real plates) so
// the frame is what a busy service really looks like — and the same seed
// always gives the same frame. Nothing here runs the loop.

import { createState, addParticle, addPopup } from './state.js';
import { SCREEN_PLAY } from './render.js';

function baseState(seed) {
  const state = createState(seed);
  state.screen = SCREEN_PLAY;
  return state;
}

function ticket(state, dish, patience, patienceMax) {
  const order = {
    id: state.nextOrderId,
    dish,
    patience,
    patienceMax,
    x: 0,
    born: state.time,
  };
  state.nextOrderId += 1;
  state.orders.push(order);
  return order;
}

function steamAt(state, x, y, n) {
  for (let i = 0; i < n; i += 1) {
    addParticle(state, x - 20 + i * 8, y - (i % 3) * 10, 4, -28, 0.8, 'rgba(255,255,255,0.85)', 3);
  }
}

/** Set `state` to the named scene and return the screen to draw over it. */
export function stageShot(name, state) {
  const seed = state.seed;
  const staged = baseState(seed);
  for (const key of Object.keys(staged)) state[key] = staged[key];

  if (name === 'orders') {
    state.dayTime = 148;
    ticket(state, 'nasi-goreng', 44, 46);
    ticket(state, 'mie-ayam', 40, 46);
    ticket(state, 'sate-ayam', 36, 46);
    ticket(state, 'es-teh', 30, 46);
    state.selectedOrder = 0;
    state.chef.x = 640;
    state.chef.y = 620;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'cooking') {
    state.day = 2;
    state.dayTime = 96;
    state.coins = 260;
    state.score = 260;
    state.combo = 2;
    ticket(state, 'mie-ayam', 26, 43);
    ticket(state, 'sate-ayam', 34, 43);
    ticket(state, 'nasi-goreng', 12, 43);
    state.selectedOrder = 0;
    state.tray = ['noodle', 'chicken_chopped'];
    state.board.job = { item: 'greens', progress: 0.45, duration: 2.2 };
    state.wok.job = { dish: 'mie-ayam', progress: 0.62, cookTime: 5.0, done: false, burnt: false };
    state.grill.job = { dish: 'sate-ayam', progress: 0.5, cookTime: 4.0, done: false, burnt: false };
    state.kettle.job = { dish: 'es-teh', progress: 0.5, cookTime: 1.5, done: false, burnt: false };
    state.chef.x = 437;
    state.chef.y = 360;
    steamAt(state, 663, 210, 5);
    steamAt(state, 889, 210, 4);
    return { screen: SCREEN_PLAY, best: 260 };
  }

  if (name === 'serve') {
    state.day = 2;
    state.dayTime = 74;
    state.coins = 480;
    state.score = 480;
    state.combo = 4;
    state.bestCombo = 4;
    state.served = 5;
    ticket(state, 'nasi-goreng', 25, 43);
    ticket(state, 'mie-ayam', 18, 43);
    state.selectedOrder = 0;
    state.carrying = 'nasi-goreng';
    state.plates = ['mie-ayam', null, null];
    state.chef.x = 1042;
    state.chef.y = 538;
    addPopup(state, 1000, 470, '+132', '#58b368');
    return { screen: SCREEN_PLAY, best: 480 };
  }

  // cover: the busiest frame — orders waiting, a dish mid-cook on the wok,
  // chopping in progress, and a finished drink already plated to serve.
  state.dayTime = 121;
  state.coins = 340;
  state.score = 340;
  state.combo = 3;
  state.bestCombo = 3;
  state.served = 3;
  ticket(state, 'nasi-goreng', 30, 46);
  ticket(state, 'mie-ayam', 18, 46);
  ticket(state, 'sate-ayam', 40, 46);
  state.selectedOrder = 0;
  state.tray = ['rice', 'egg', 'chili_chopped'];
  state.board.job = { item: 'chicken', progress: 0.6, duration: 2.2 };
  state.wok.job = { dish: 'nasi-goreng', progress: 0.7, cookTime: 4.5, done: false, burnt: false };
  state.plates = ['es-teh', null, null];
  state.chef.x = 663;
  state.chef.y = 360;
  steamAt(state, 663, 210, 5);
  return { screen: SCREEN_PLAY, best: 340 };
}
