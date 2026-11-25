// Dapur Kilat's renderer: every pixel is drawn on one canvas — the warung
// kitchen, the order board, the stations, the cook and every overlay. No
// images, no fonts from the network, just shapes and the system font.

import {
  FIELD, LAYOUT, PALETTE, FONT, PANTRY, ITEMS, DISHES,
} from './config.js';
import { pantryBinRect } from './input.js';
import { recipeSteps, stepStates, patienceFrac, patienceColor, nextStepHint } from './orders.js';
import { finalStars } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DAYOVER = 'dayover';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

/** One ingredient's glyph, drawn in a `size` box centred on (cx, cy). */
export function drawItemIcon(ctx, itemId, cx, cy, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  switch (itemId) {
    case 'rice': {
      ctx.fillStyle = '#d9c48f';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.5, s * 0.95, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5f0e1';
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.arc(-s * 0.55 + (i % 4) * s * 0.32, -s * 0.25 + Math.floor(i / 4) * s * 0.3, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'noodle': {
      ctx.strokeStyle = '#f2a541';
      ctx.lineWidth = s * 0.28;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, s * 0.1, s * (0.75 - i * 0.2), Math.PI * 0.15, Math.PI * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.5, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chicken': {
      ctx.fillStyle = '#e07856';
      ctx.beginPath();
      ctx.ellipse(-s * 0.1, s * 0.1, s * 0.7, s * 0.55, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5f0e1';
      ctx.lineWidth = s * 0.22;
      ctx.beginPath();
      ctx.moveTo(s * 0.45, -s * 0.35);
      ctx.lineTo(s * 0.85, -s * 0.75);
      ctx.stroke();
      ctx.fillStyle = '#f5f0e1';
      ctx.beginPath();
      ctx.arc(s * 0.9, -s * 0.8, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'greens': {
      ctx.fillStyle = '#58b368';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(-s * 0.4 + i * s * 0.4, s * 0.1, s * 0.28, s * 0.55, (i - 1) * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.8, s * 0.62, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd66b';
      ctx.beginPath();
      ctx.arc(s * 0.1, s * 0.05, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chili': {
      ctx.strokeStyle = '#d93a2b';
      ctx.lineWidth = s * 0.34;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.7, Math.PI * 0.1, Math.PI * 0.95);
      ctx.stroke();
      ctx.strokeStyle = '#58b368';
      ctx.lineWidth = s * 0.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, -s * 0.55);
      ctx.lineTo(-s * 0.85, -s * 0.9);
      ctx.stroke();
      break;
    }
    case 'skewer': {
      ctx.strokeStyle = '#c98f5a';
      ctx.lineWidth = s * 0.16;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.3, -s * 0.8);
        ctx.lineTo(i * s * 0.3, s * 0.8);
        ctx.stroke();
      }
      ctx.fillStyle = '#e07856';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(i * s * 0.3, -s * 0.25, s * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(i * s * 0.3, s * 0.25, s * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'peanut': {
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.45, s * 0.9, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a06a35';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.8, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9a05a';
      ctx.beginPath();
      ctx.arc(-s * 0.3, 0, s * 0.18, 0, Math.PI * 2);
      ctx.arc(s * 0.25, -s * 0.1, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tea': {
      ctx.fillStyle = '#e2574c';
      roundRect(ctx, -s * 0.7, -s * 0.5, s * 1.4, s * 1.1, s * 0.2);
      ctx.fill();
      ctx.strokeStyle = '#e2574c';
      ctx.lineWidth = s * 0.18;
      ctx.beginPath();
      ctx.arc(s * 0.75, 0, s * 0.35, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = '#8a5a2b';
      roundRect(ctx, -s * 0.55, -s * 0.35, s * 1.1, s * 0.35, s * 0.12);
      ctx.fill();
      break;
    }
    case 'ice': {
      ctx.fillStyle = '#a8d8ea';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for (const [dx, dy, rot] of [[-0.35, -0.25, 0.2], [0.35, -0.3, -0.3], [0, 0.35, 0.5]]) {
        ctx.save();
        ctx.translate(dx * s, dy * s);
        ctx.rotate(rot);
        roundRect(ctx, -s * 0.34, -s * 0.34, s * 0.68, s * 0.68, s * 0.1);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    default: {
      if (itemId.endsWith('_chopped')) {
        const base = itemId.slice(0, -'_chopped'.length);
        // Diced: the base ingredient smaller, plus little cut cubes.
        drawItemIcon(ctx, base, 0, -s * 0.15, size * 0.75);
        ctx.fillStyle = ITEMS[base].color;
        ctx.strokeStyle = 'rgba(43,33,24,0.6)';
        ctx.lineWidth = 1.5;
        for (const [dx, dy] of [[-0.45, 0.5], [0.05, 0.62], [0.5, 0.42]]) {
          ctx.beginPath();
          ctx.rect(dx * s - s * 0.16, dy * s - s * 0.16, s * 0.32, s * 0.32);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}

/** A finished dish on a plate: a white plate with the dish's food on top. */
export function drawDishIcon(ctx, dishId, cx, cy, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9c48f';
  ctx.lineWidth = 2;
  ctx.stroke();
  const dish = DISHES[dishId];
  if (dishId === 'es-teh') {
    // A glass of iced tea: amber glass, dark tea, ice cubes, a straw.
    ctx.fillStyle = '#d9a441';
    roundRect(ctx, -s * 0.42, -s * 0.6, s * 0.84, s * 1.25, s * 0.12);
    ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    roundRect(ctx, -s * 0.36, -s * 0.2, s * 0.72, s * 0.78, s * 0.1);
    ctx.fill();
    ctx.fillStyle = '#cfe8f2';
    ctx.fillRect(-s * 0.26, -s * 0.42, s * 0.22, s * 0.22);
    ctx.fillRect(s * 0.06, -s * 0.34, s * 0.22, s * 0.22);
    ctx.strokeStyle = '#e2574c';
    ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.55);
    ctx.lineTo(s * 0.42, -s * 0.95);
    ctx.stroke();
  } else if (dishId === 'sate-ayam') {
    drawItemIcon(ctx, 'skewer', 0, -s * 0.1, size * 0.7);
    ctx.fillStyle = '#a06a35';
    ctx.beginPath();
    ctx.ellipse(s * 0.25, s * 0.35, s * 0.45, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = dish.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.72, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd66b';
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.1, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#58b368';
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.15, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawProgressRing(ctx, cx, cy, r, frac, color) {
  ctx.strokeStyle = 'rgba(43,33,24,0.25)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

/** A horizontal cook bar with the dish's green perfect zone marked. */
function drawCookBar(ctx, x, y, w, dish, progress, burnt) {
  ctx.fillStyle = 'rgba(43,33,24,0.3)';
  roundRect(ctx, x, y, w, 12, 6);
  ctx.fill();
  const [lo, hi] = dish.perfect;
  ctx.fillStyle = '#58b368';
  roundRect(ctx, x + w * lo, y, w * (hi - lo), 12, 6);
  ctx.fill();
  ctx.fillStyle = burnt ? '#1d2733' : '#d93a2b';
  const px = x + Math.min(1, progress) * w;
  ctx.fillRect(px - 2, y - 3, 4, 18);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    return dpr;
  }

  function draw(state, screen, best) {
    const dpr = fitCanvas();
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
    ctx.save();
    if (state.shake > 0) {
      const m = state.shake * 22;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    drawKitchen(state);
    drawHeader(state);
    drawOrders(state);
    drawStations(state);
    drawPlating(state);
    drawWindow(state);
    drawTrash(state);
    drawChef(state);
    drawTray(state);
    drawParticles(state);
    drawPopups(state);
    drawHint(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_DAYOVER) drawDayOver(state);
    if (screen === SCREEN_OVER) drawGameOver(state, best);
    ctx.restore();
  }

  function drawKitchen() {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, 560);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, 0, FIELD.width, 10);
    // Tile stripe behind the counters.
    ctx.fillStyle = '#e8c98f';
    ctx.fillRect(0, 158, FIELD.width, 6);
    // Window with a sunny street.
    ctx.fillStyle = '#9fd3e8';
    roundRect(ctx, 560, 8, 160, 40, 6);
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(690, 24, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#58b368';
    ctx.fillRect(560, 40, 160, 8);
    // Floor.
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 560, FIELD.width, 160);
    ctx.fillStyle = PALETTE.floorDark;
    for (let x = 0; x < FIELD.width; x += 80) ctx.fillRect(x, 560, 3, 160);
  }

  function drawHeader(state) {
    const h = LAYOUT.header;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    text(ctx, 'DAPUR KILAT', 20, 36, 26, '#f2c94c', 'left', '800');
    text(ctx, 'Warung Rush', 228, 36, 14, '#8b93a3');
    // Day + timer.
    const dayFrac = Math.max(0, state.dayTime / 150);
    text(ctx, `DAY ${state.day}`, 560, 24, 15, '#eef1f5', 'center');
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, 470, 30, 180, 10, 5);
    ctx.fill();
    ctx.fillStyle = dayFrac > 0.5 ? '#58b368' : dayFrac > 0.25 ? '#f2a541' : '#d93a2b';
    roundRect(ctx, 470, 30, 180 * dayFrac, 10, 5);
    ctx.fill();
    const mins = Math.floor(state.dayTime / 60);
    const secs = Math.floor(state.dayTime % 60);
    text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, 740, 40, 18, '#eef1f5', 'center');
    // Coins, score, combo, hearts.
    text(ctx, `🪙 ${state.coins}`, 900, 36, 18, '#f2c94c', 'center');
    text(ctx, `SCORE ${state.score}`, 1040, 36, 18, '#eef1f5', 'center');
    if (state.combo >= 2) text(ctx, `COMBO x${state.combo}`, 1160, 24, 14, '#ff9d5c', 'center');
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < state.hearts ? '♥' : '♡';
    text(ctx, hearts, 1160, 44, 18, '#e2574c', 'center');
  }

  function drawOrders(state) {
    const o = LAYOUT.orders;
    for (let i = 0; i < 4; i += 1) {
      const x = o.x + i * (o.w + o.gap);
      const order = state.orders[i];
      ctx.fillStyle = order ? PALETTE.ticket : 'rgba(255,248,231,0.35)';
      ctx.strokeStyle = i === state.selectedOrder && order ? '#f2a541' : PALETTE.ticketEdge;
      ctx.lineWidth = i === state.selectedOrder && order ? 3 : 1.5;
      roundRect(ctx, x, o.y, o.w, o.h, 10);
      ctx.fill();
      ctx.stroke();
      if (!order) {
        text(ctx, `Ticket ${i + 1} — waiting…`, x + o.w / 2, o.y + 52, 14, PALETTE.muted, 'center');
        continue;
      }
      const dish = DISHES[order.dish];
      text(ctx, `${i + 1}. ${dish.name}`, x + 12, o.y + 22, 16, PALETTE.text);
      text(ctx, `${dish.coins} coins`, x + o.w - 12, o.y + 22, 13, PALETTE.muted, 'right');
      // Recipe steps with done ticks.
      const steps = stepStates(state, order);
      steps.forEach((step, si) => {
        const sx = x + 26 + si * 52;
        const sy = o.y + 48;
        drawItemIcon(ctx, step.need, sx, sy, 30);
        if (step.done) {
          ctx.fillStyle = '#58b368';
          ctx.beginPath();
          ctx.arc(sx + 12, sy + 12, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sx + 8, sy + 12);
          ctx.lineTo(sx + 11, sy + 15);
          ctx.lineTo(sx + 17, sy + 8);
          ctx.stroke();
        }
      });
      // Patience bar.
      ctx.fillStyle = 'rgba(43,33,24,0.2)';
      roundRect(ctx, x + 12, o.y + 74, o.w - 24, 8, 4);
      ctx.fill();
      ctx.fillStyle = patienceColor(order);
      roundRect(ctx, x + 12, o.y + 74, (o.w - 24) * patienceFrac(order), 8, 4);
      ctx.fill();
    }
  }

  function drawStations(state) {
    drawPantry(state);
    drawBoard(state);
    drawCookStation(state, 'wok', 'WOK');
    drawCookStation(state, 'grill', 'GRILL');
    drawCookStation(state, 'kettle', 'TEA');
  }

  function stationShell(id, label, accent) {
    const r = LAYOUT[id];
    ctx.fillStyle = PALETTE.counter;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, r.x, r.y, r.w, 26, 12);
    ctx.fill();
    ctx.fillRect(r.x, r.y + 14, r.w, 12);
    text(ctx, label, r.x + r.w / 2, r.y + 19, 13, accent, 'center', '800');
    return r;
  }

  function drawPantry(state) {
    void state;
    const r = stationShell('pantry', 'PANTRY — click to grab', '#f2c94c');
    PANTRY.forEach((itemId, i) => {
      const b = pantryBinRect(i);
      ctx.fillStyle = '#fff8e7';
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.strokeStyle = '#d9c48f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawItemIcon(ctx, itemId, b.x + b.w / 2, b.y + 22, 30);
      text(ctx, ITEMS[itemId].short, b.x + b.w / 2, b.y + b.h - 5, 10, PALETTE.text, 'center');
    });
    void r;
  }

  function drawBoard(state) {
    const r = stationShell('board', 'CHOPPING BOARD', '#e8c98f');
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, r.x + 14, r.y + 40, r.w - 28, 76, 8);
    ctx.fill();
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 2;
    ctx.stroke();
    const job = state.board.job;
    if (job) {
      drawItemIcon(ctx, job.item, r.x + r.w / 2 - 34, r.y + 78, 44);
      drawProgressRing(ctx, r.x + r.w / 2 + 44, r.y + 78, 22, job.progress, '#e07856');
      text(ctx, 'Click / Space to chop faster!', r.x + r.w / 2, r.y + 132, 11, PALETTE.text, 'center');
    } else if (state.board.output) {
      drawItemIcon(ctx, state.board.output, r.x + r.w / 2, r.y + 78, 44);
      ctx.fillStyle = '#d93a2b';
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2 + 26, r.y + 52, 11, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '!', r.x + r.w / 2 + 26, r.y + 56, 14, '#ffffff', 'center', '800');
      text(ctx, 'Click to collect', r.x + r.w / 2, r.y + 132, 11, PALETTE.text, 'center');
    } else {
      text(ctx, 'Chop chicken, greens, chili', r.x + r.w / 2, r.y + 82, 12, PALETTE.muted, 'center');
    }
  }

  function drawCookStation(state, id, label) {
    const r = stationShell(id, label, '#f2c94c');
    const job = state[id].job;
    // Burner / grill bars.
    ctx.fillStyle = '#1d2733';
    roundRect(ctx, r.x + 16, r.y + 44, r.w - 32, 58, 8);
    ctx.fill();
    if (id === 'wok') {
      ctx.fillStyle = '#3a4556';
      ctx.beginPath();
      ctx.ellipse(r.x + r.w / 2, r.y + 74, 62, 26, 0, 0, Math.PI);
      ctx.fill();
    } else if (id === 'grill') {
      ctx.strokeStyle = '#8b93a3';
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(r.x + 26, r.y + 56 + i * 12);
        ctx.lineTo(r.x + r.w - 26, r.y + 56 + i * 12);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#e2574c';
      roundRect(ctx, r.x + r.w / 2 - 26, r.y + 48, 52, 44, 8);
      ctx.fill();
    }
    if (job) {
      const dish = DISHES[job.dish];
      if (job.burnt) {
        ctx.fillStyle = '#1d2733';
        ctx.beginPath();
        ctx.ellipse(r.x + r.w / 2, r.y + 74, 46, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, 'BURNT! Click to clear', r.x + r.w / 2, r.y + 132, 12, '#d93a2b', 'center', '800');
      } else {
        drawDishIcon(ctx, job.dish, r.x + r.w / 2, r.y + 74, 56);
        drawCookBar(ctx, r.x + 20, r.y + 112, r.w - 40, dish, job.progress, false);
        text(ctx, dish.name, r.x + r.w / 2, r.y + 136, 11, PALETTE.text, 'center');
      }
    } else {
      // Idle: a drawn glyph, never an emoji (headless fonts have none).
      if (id === 'wok') drawFlame(ctx, r.x + r.w / 2, r.y + 74, 22);
      else if (id === 'grill') drawItemIcon(ctx, 'skewer', r.x + r.w / 2, r.y + 74, 44);
      else drawItemIcon(ctx, 'tea', r.x + r.w / 2, r.y + 74, 44);
      text(ctx, id === 'kettle' ? 'Tea + ice, quick pour' : 'Bring the full recipe', r.x + r.w / 2, r.y + 132, 11, PALETTE.muted, 'center');
    }
  }

  /** A small flame: an orange teardrop with a yellow heart. */
  function drawFlame(ctx, cx, cy, size) {
    const s = size / 2;
    ctx.fillStyle = '#e2574c';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.2, cx + s * 0.7, cy + s * 0.7, cx, cy + s * 0.8);
    ctx.bezierCurveTo(cx - s * 0.7, cy + s * 0.7, cx - s * 0.9, cy - s * 0.2, cx, cy - s);
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.5, cy + s * 0.1, cx + s * 0.4, cy + s * 0.55, cx, cy + s * 0.6);
    ctx.bezierCurveTo(cx - s * 0.4, cy + s * 0.55, cx - s * 0.5, cy + s * 0.1, cx, cy - s * 0.35);
    ctx.fill();
  }

  function drawPlating(state) {
    const r = LAYOUT.plating;
    ctx.fillStyle = PALETTE.counter;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, r.x, r.y, r.w, 26, 12);
    ctx.fill();
    ctx.fillRect(r.x, r.y + 14, r.w, 12);
    text(ctx, 'PLATING — click a dish to pick it up', r.x + r.w / 2, r.y + 19, 13, '#f2c94c', 'center', '800');
    for (let i = 0; i < state.plates.length; i += 1) {
      const sx = r.x + 100 + i * 176;
      const sy = r.y + 96;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 62, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      if (state.plates[i]) {
        drawDishIcon(ctx, state.plates[i], sx, sy, 84);
        text(ctx, DISHES[state.plates[i]].name, sx, r.y + 146, 12, PALETTE.text, 'center');
      } else {
        text(ctx, 'empty', sx, sy + 4, 12, 'rgba(255,255,255,0.5)', 'center');
      }
    }
  }

  function drawWindow(state) {
    const r = LAYOUT.window;
    ctx.fillStyle = PALETTE.counter;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, r.x, r.y, r.w, 26, 12);
    ctx.fill();
    ctx.fillRect(r.x, r.y + 14, r.w, 12);
    text(ctx, 'SERVING WINDOW', r.x + r.w / 2, r.y + 19, 13, '#f2c94c', 'center', '800');
    // Customer silhouette waiting at the hatch.
    const cx = r.x + 90;
    const cy = r.y + 96;
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(cx, cy - 18, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2574c';
    roundRect(ctx, cx - 34, cy + 8, 68, 44, 12);
    ctx.fill();
    ctx.fillStyle = '#1d2733';
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 20, 3, 0, Math.PI * 2);
    ctx.arc(cx + 9, cy - 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d2733';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    const selected = state.orders[state.selectedOrder];
    if (selected) {
      const dish = DISHES[selected.dish];
      text(ctx, `Wants: ${dish.name}`, r.x + 190, r.y + 66, 18, PALETTE.text);
      text(ctx, dish.blurb, r.x + 190, r.y + 90, 13, PALETTE.muted);
      if (state.carrying === selected.dish) {
        text(ctx, '✓ Click to serve!', r.x + 190, r.y + 118, 16, '#58b368', 'left', '800');
      } else if (state.carrying) {
        text(ctx, `Carrying ${DISHES[state.carrying].name} — not this one`, r.x + 190, r.y + 118, 13, '#d93a2b');
      } else {
        text(ctx, nextStepHint(state, selected), r.x + 190, r.y + 118, 13, PALETTE.text);
      }
    } else {
      text(ctx, 'No orders yet — tickets appear above.', r.x + 190, r.y + 66, 15, PALETTE.muted);
    }
  }

  function drawTrash(state) {
    void state;
    const r = LAYOUT.trash;
    ctx.fillStyle = PALETTE.counter;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.fillStyle = '#3a4556';
    roundRect(ctx, r.x + 34, r.y + 44, 68, 74, 8);
    ctx.fill();
    ctx.fillStyle = '#5a6678';
    roundRect(ctx, r.x + 28, r.y + 36, 80, 12, 6);
    ctx.fill();
    text(ctx, 'TRASH', r.x + r.w / 2, r.y + 140, 12, '#8b93a3', 'center', '800');
  }

  function drawChef(state) {
    const chef = state.chef;
    const bob = chef.moving ? Math.sin(state.time * 14) * 3 : 0;
    ctx.save();
    ctx.translate(chef.x, chef.y + bob);
    // Drawn at 0.8 scale so the cook's hat clears the station labels above.
    ctx.scale(0.8, 0.8);
    // Body / apron.
    ctx.fillStyle = '#2e6f6a';
    roundRect(ctx, -22, -6, 44, 46, 12);
    ctx.fill();
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, -14, 2, 28, 30, 6);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath();
    ctx.arc(0, -22, 17, 0, Math.PI * 2);
    ctx.fill();
    // Chef hat.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-9, -36, 10, 0, Math.PI * 2);
    ctx.arc(9, -36, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-17, -38, 34, 8);
    // Eyes face the walking direction.
    ctx.fillStyle = '#1d2733';
    ctx.beginPath();
    ctx.arc(-6 + chef.face * 2, -22, 2.2, 0, Math.PI * 2);
    ctx.arc(6 + chef.face * 2, -22, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Carried dish above the head.
    if (state.carrying) {
      drawDishIcon(ctx, state.carrying, 0, -62, 44);
    }
    ctx.restore();
  }

  function drawTray(state) {
    const r = LAYOUT.tray;
    ctx.fillStyle = 'rgba(29,39,51,0.85)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    text(ctx, 'TRAY (click an item to toss it):', r.x + 14, r.y + 30, 13, '#eef1f5');
    for (let i = 0; i < 4; i += 1) {
      const sx = r.x + 268 + i * 54;
      const sy = r.y + 24;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, sx - 20, sy - 20, 40, 40, 8);
      ctx.fill();
      const item = state.tray[i];
      if (item) {
        drawItemIcon(ctx, item, sx, sy, 30);
      }
    }
    const carrying = state.carrying ? `Carrying: ${DISHES[state.carrying].name}` : 'Hands empty';
    text(ctx, carrying, r.x + 520, r.y + 30, 13, state.carrying ? '#f2c94c' : '#8b93a3');
    text(ctx, '1-4 select ticket · Space chop/cook · Click stations to work them', r.x + r.w - 14, r.y + 30, 12, '#8b93a3', 'right');
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPopups(state) {
    for (const p of state.popups) {
      ctx.globalAlpha = Math.min(1, p.life);
      text(ctx, p.text, p.x, p.y, 22, p.color, 'center', '800');
    }
    ctx.globalAlpha = 1;
  }

  function drawHint(state) {
    if (state.hints.length === 0 || state.hints[0].life <= 0) return;
    const hint = state.hints[0];
    ctx.globalAlpha = Math.min(1, hint.life);
    ctx.fillStyle = 'rgba(29,39,51,0.9)';
    ctx.font = `700 14px ${FONT}`;
    const w = ctx.measureText(hint.text).width + 28;
    roundRect(ctx, FIELD.width / 2 - w / 2, 600, w, 30, 15);
    ctx.fill();
    text(ctx, hint.text, FIELD.width / 2, 620, 14, '#ffffff', 'center');
    ctx.globalAlpha = 1;
  }

  function overlayPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(29,39,51,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 340, 120, 600, 470, 18);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, title, 640, 196, 40, PALETTE.text, 'center', '800');
    let y = 250;
    for (const line of lines) {
      text(ctx, line, 640, y, 18, PALETTE.text, 'center');
      y += 34;
    }
    return y;
  }

  function drawStars(cx, y, count) {
    for (let i = 0; i < 3; i += 1) {
      const x = cx + (i - 1) * 52;
      ctx.fillStyle = i < count ? '#f2c94c' : '#d9c48f';
      ctx.beginPath();
      for (let k = 0; k < 5; k += 1) {
        const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
        const r = k % 2 === 0 ? 20 : 12;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawTitle(state, best) {
    const y = overlayPanel('DAPUR KILAT', [
      'A fast-paced warung cooking game.',
      'Grab, chop, wok, grill — serve before time runs out!',
      '',
      'Click stations to walk the cook · 1-4 select a ticket',
      'Space chops and cooks · P pauses · M mutes',
      '',
      `Best score: ${best}`,
    ], '#f2a541');
    drawStars(640, y + 24, 3);
    text(ctx, 'CLICK OR PRESS SPACE TO START', 640, y + 70, 20, '#d93a2b', 'center', '800');
    void state;
  }

  function drawPaused() {
    overlayPanel('PAUSED', ['Take a breath — the wok is waiting.', '', 'Press P or click to keep cooking.'], '#4fc3f7');
  }

  function drawDayOver(state) {
    const s = state.daySummary;
    const y = overlayPanel(`DAY ${s.day} COMPLETE!`, [
      `Served: ${s.served} dishes · Earned: ${s.earned} coins`,
      `Missed orders: ${s.missed} · Hearts left: ${state.hearts}`,
      '',
    ], '#58b368');
    drawStars(640, y + 30, s.stars);
    text(ctx, 'CLICK OR PRESS SPACE FOR THE NEXT DAY', 640, y + 76, 18, '#d93a2b', 'center', '800');
  }

  function drawGameOver(state, best) {
    const stars = finalStars(state.score);
    const y = overlayPanel('SERVICE OVER!', [
      `Final score: ${state.score} · Coins: ${state.coins}`,
      `Dishes served: ${state.served} · Best combo: x${state.bestCombo}`,
      `Best score: ${Math.max(best, state.score)}`,
      '',
    ], '#d93a2b');
    drawStars(640, y + 30, stars);
    text(ctx, 'PRESS R OR CLICK TO COOK AGAIN', 640, y + 76, 18, '#d93a2b', 'center', '800');
  }

  return { draw };
}
