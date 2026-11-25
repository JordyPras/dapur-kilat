// Input: mouse clicks walk the cook to a station and work it on arrival;
// keys select tickets, chop and cook, pause and mute. Nothing here draws.

import {
  FIELD, LAYOUT, PANTRY, ITEMS, DISHES, choppedId, standPoint,
} from './config.js';
import {
  walkTo, trayHas, trayTake, dishReadyInTray, missingForDish,
  addParticle, addPopup, showHint, serveDish,
} from './state.js';
import { matchingOrderIndex } from './orders.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;
export const ACTION_NEXT_DAY = 16;

const STATIONS = ['pantry', 'board', 'wok', 'grill', 'kettle', 'plating', 'window', 'trash'];

function stationRect(id) {
  return LAYOUT[id];
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Pantry bins sit in a 5x2 grid inside the pantry rect. */
export function pantryBinRect(index) {
  const r = LAYOUT.pantry;
  const cols = 5;
  const size = 52;
  const gap = 6;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const totalW = cols * size + (cols - 1) * gap;
  const totalH = 2 * size + gap;
  const x0 = r.x + (r.w - totalW) / 2;
  const y0 = r.y + 14 + (r.h - 14 - totalH) / 2;
  return { x: x0 + col * (size + gap), y: y0 + row * (size + gap), w: size, h: size };
}

function plateSlotRect(index) {
  const r = LAYOUT.plating;
  const w = 160;
  const gap = 16;
  const x0 = r.x + 20;
  return { x: x0 + index * (w + gap), y: r.y + 44, w, h: 96 };
}

function traySlotRect(index) {
  const r = LAYOUT.tray;
  return { x: r.x + 268 + index * 54 - 20, y: r.y + 4, w: 40, h: 40 };
}

function ticketRect(index) {
  const o = LAYOUT.orders;
  return { x: o.x + index * (o.w + o.gap), y: o.y, w: o.w, h: o.h };
}

/** What the cook does when they reach a station. Returns a sound name to play. */
function stationAction(state, stationId, detail) {
  const audio = detail.audio;
  switch (stationId) {
    case 'pantry': {
      const itemId = PANTRY[detail.bin];
      if (state.tray.length >= 4) {
        showHint(state, 'Tray is full — use or trash something first.');
        return 'buzz';
      }
      state.tray.push(itemId);
      addParticle(state, 640, 300, 0, -30, 0.5, ITEMS[itemId].color, 5);
      return 'pop';
    }
    case 'board': {
      if (state.board.output) {
        if (state.tray.length >= 4) {
          showHint(state, 'Tray is full — make room for the chopped item.');
          return 'buzz';
        }
        state.tray.push(state.board.output);
        state.board.output = null;
        return 'pop';
      }
      if (state.board.job) return boostChop(state);
      const choppable = state.tray.find((id) => ITEMS[id].chop);
      if (!choppable) {
        showHint(state, 'The board needs chicken, greens or chili from the tray.');
        return 'buzz';
      }
      trayTake(state, choppable);
      state.board.job = { item: choppable, progress: 0, duration: 2.2 };
      return 'chop';
    }
    case 'wok':
    case 'grill':
    case 'kettle': {
      return cookAction(state, stationId);
    }
    case 'plating': {
      const dish = state.plates[detail.slot];
      if (!dish) return null;
      if (state.carrying) {
        showHint(state, 'Hands full — serve what you are carrying first.');
        return 'buzz';
      }
      state.plates[detail.slot] = null;
      state.carrying = dish;
      return 'pop';
    }
    case 'window': {
      if (!state.carrying) {
        showHint(state, 'Nothing to serve — pick up a finished dish first.');
        return 'buzz';
      }
      const match = matchingOrderIndex(state);
      if (match === -1) {
        showHint(state, `No ticket wants ${DISHES[state.carrying].name} right now.`);
        return 'buzz';
      }
      const coins = serveDish(state, match);
      const win = LAYOUT.window;
      addPopup(state, win.x + win.w / 2, win.y - 6, `+${coins}`, '#58b368');
      burstConfetti(state, win.x + win.w / 2, win.y + 60);
      return 'serve';
    }
    case 'trash': {
      if (state.carrying) {
        state.carrying = null;
        addPopup(state, LAYOUT.trash.x + 68, LAYOUT.trash.y + 20, 'Trashed', '#7a6a55');
        return 'buzz';
      }
      showHint(state, 'The trash takes a carried dish.');
      return 'buzz';
    }
    default:
      return null;
  }
}

function boostChop(state) {
  const job = state.board.job;
  if (!job) return null;
  job.progress = Math.min(1, job.progress + 0.18);
  return 'chop';
}

function cookAction(state, stationId) {
  const station = state[stationId];
  const job = station.job;
  if (job && job.burnt) {
    station.job = null;
    addPopup(state, LAYOUT[stationId].x + LAYOUT[stationId].w / 2, LAYOUT[stationId].y + 10, 'Burnt — trashed', '#d93a2b');
    return 'burn';
  }
  if (job) {
    if (stationId === 'kettle') {
      showHint(state, 'The tea is pouring — wait a second.');
      return null;
    }
    const dish = DISHES[job.dish];
    const [lo, hi] = dish.perfect;
    if (job.progress >= lo && job.progress <= hi) {
      const slot = state.plates.indexOf(null);
      station.job = null;
      if (slot === -1) {
        showHint(state, 'Plating counter is full — serve a dish first.');
        return 'buzz';
      }
      state.plates[slot] = job.dish;
      state.events.push({ type: 'plated', dish: job.dish, slot });
      return 'plate';
    }
    if (job.progress > hi) {
      // Past the green zone: the dish overcooks and is lost.
      station.job = null;
      state.shake = 0.35;
      addPopup(state, LAYOUT[stationId].x + LAYOUT[stationId].w / 2, LAYOUT[stationId].y + 10, 'Overcooked!', '#d93a2b');
      return 'burn';
    }
    showHint(state, 'Still cooking — wait for the green zone.');
    return null;
  }
  const ready = dishReadyInTray(state, stationId);
  if (ready) {
    const dish = DISHES[ready];
    for (const need of dish.needs) trayTake(state, need);
    station.job = { dish: ready, progress: 0, cookTime: dish.cookTime, done: false, burnt: false };
    return 'sizzleStart';
  }
  const missing = missingForDish(state, stationId);
  if (missing) {
    const names = missing.missing.map((need) => (need.endsWith('_chopped') ? `chopped ${ITEMS[need.slice(0, -8)].name}` : ITEMS[need].name)).join(', ');
    showHint(state, `${DISHES[missing.dishId].name} needs: ${names}.`);
    return 'buzz';
  }
  showHint(state, 'Nothing to cook here yet — gather ingredients first.');
  return 'buzz';
}

function burstConfetti(state, x, y) {
  const colors = ['#f2c94c', '#58b368', '#e2574c', '#4fc3f7', '#f2a541'];
  for (let i = 0; i < 26; i += 1) {
    const angle = (i / 26) * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    addParticle(state, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 60, 0.9, colors[i % colors.length], 4);
  }
}

/** The station the cook is standing at, if any (within reach of its counter). */
export function stationAtChef(state) {
  for (const id of STATIONS) {
    const stand = standPoint(id);
    if (Math.hypot(state.chef.x - stand.x, state.chef.y - stand.y) < 70) return id;
  }
  return null;
}

/**
 * Attach pointer and keyboard handling to the canvas. `hooks` carries the
 * screen-level actions main.js owns (start, pause, restart, next day) and the
 * audio engine for unlocking and muting.
 */
export function createInput(canvas, state, audio, hooks) {
  let queued = 0;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  function doStation(stationId, detail) {
    const stand = standPoint(stationId);
    const run = () => {
      const sound = stationAction(state, stationId, { ...detail, audio });
      if (sound) audio.play(sound);
    };
    walkTo(state, stand.x, stand.y, run);
  }

  function handleClick(x, y) {
    audio.unlock();
    if (state.screen === 'title') {
      queued |= ACTION_CONFIRM;
      return;
    }
    if (state.screen === 'dayover') {
      queued |= ACTION_NEXT_DAY;
      return;
    }
    if (state.screen === 'over') {
      queued |= ACTION_RESTART;
      return;
    }
    if (state.screen !== 'play') return;

    for (let i = 0; i < state.orders.length; i += 1) {
      if (pointInRect(x, y, ticketRect(i))) {
        state.selectedOrder = i;
        audio.play('pop');
        return;
      }
    }
    for (let i = 0; i < PANTRY.length; i += 1) {
      if (pointInRect(x, y, pantryBinRect(i))) {
        const bin = pantryBinRect(i);
        const run = () => {
          const sound = stationAction(state, 'pantry', { bin: i, audio });
          if (sound) audio.play(sound);
        };
        walkTo(state, bin.x + bin.w / 2, LAYOUT.pantry.y + LAYOUT.pantry.h + 40, run);
        return;
      }
    }
    for (const id of ['board', 'wok', 'grill', 'kettle', 'window', 'trash']) {
      if (pointInRect(x, y, stationRect(id))) {
        doStation(id, {});
        return;
      }
    }
    for (let i = 0; i < state.plates.length; i += 1) {
      if (pointInRect(x, y, plateSlotRect(i))) {
        doStation('plating', { slot: i });
        return;
      }
    }
    for (let i = 0; i < state.tray.length; i += 1) {
      if (pointInRect(x, y, traySlotRect(i))) {
        const tossed = state.tray[i];
        state.tray.splice(i, 1);
        addPopup(state, x, LAYOUT.tray.y - 8, `Tossed ${ITEMS[tossed].name}`, '#7a6a55');
        audio.play('pop');
        return;
      }
    }
    // A click on the floor just walks the cook there.
    if (y > LAYOUT.floorY) {
      walkTo(state, Math.max(40, Math.min(FIELD.width - 40, x)), Math.max(560, Math.min(640, y)), () => {});
    }
  }

  function handleKey(event) {
    const key = event.key;
    if (key === 'm' || key === 'M') {
      queued |= ACTION_MUTE;
      return;
    }
    if (state.screen === 'title' && (key === ' ' || key === 'Enter')) {
      queued |= ACTION_CONFIRM;
      event.preventDefault();
      return;
    }
    if (state.screen === 'dayover' && (key === ' ' || key === 'Enter')) {
      queued |= ACTION_NEXT_DAY;
      event.preventDefault();
      return;
    }
    if (state.screen === 'over' && (key === 'r' || key === 'R' || key === ' ' || key === 'Enter')) {
      queued |= ACTION_RESTART;
      event.preventDefault();
      return;
    }
    if (state.screen !== 'play') return;
    if (key === 'p' || key === 'P' || key === 'Escape') {
      queued |= ACTION_PAUSE;
      return;
    }
    if (key >= '1' && key <= '4') {
      const index = Number(key) - 1;
      if (index < state.orders.length) {
        state.selectedOrder = index;
        audio.play('pop');
      }
      return;
    }
    if (key === ' ') {
      event.preventDefault();
      audio.unlock();
      const at = stationAtChef(state);
      if (at === 'board' && state.board.job) {
        const sound = boostChop(state);
        if (sound) audio.play(sound);
      } else if (at === 'wok' || at === 'grill' || at === 'kettle') {
        const sound = cookAction(state, at);
        if (sound) audio.play(sound);
      } else if (at === 'window' && state.carrying) {
        const sound = stationAction(state, 'window', { audio });
        if (sound) audio.play(sound);
      }
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    const p = toLogical(event);
    handleClick(p.x, p.y);
  });
  window.addEventListener('keydown', handleKey);

  return {
    /** Actions queued since the last call, as a bitmask (cleared on read). */
    takeActions() {
      const value = queued;
      queued = 0;
      return value;
    },
    handleClick,
    handleKey,
  };
}
