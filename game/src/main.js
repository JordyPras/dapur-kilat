// Dapur Kilat boot and the one loop: input is read every frame, the kitchen
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between title, play, paused, day-over and game-over screens.
//
// ?seed=N fixes the ticket pattern. ?shot=cover|orders|cooking|serve (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.

import { STEP, BEST_KEY } from './config.js';
import { createState, resetState, stepState, nextDay } from './state.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART, ACTION_NEXT_DAY } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_DAYOVER, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createState(seed);
const audio = createAudio();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, state, audio, {});
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetState(state, Math.floor(Math.random() * 4294967296));
    state.screen = SCREEN_PLAY;
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Playing. Grab ingredients from the pantry.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
    announce(`Service over. Score ${state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      state.muted = !state.muted;
      audio.setMuted(state.muted);
      announce(state.muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_RESTART && screen === SCREEN_OVER) startGame();
    else if (actions & ACTION_NEXT_DAY && screen === SCREEN_DAYOVER) {
      nextDay(state);
      screen = SCREEN_PLAY;
      announce(`Day ${state.day}. Faster tickets, shorter patience.`);
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function drainEvents() {
    for (const event of state.events) {
      if (event.type === 'serve') audio.play('serve');
      else if (event.type === 'ticket') audio.play('ticket');
      else if (event.type === 'miss') audio.play('miss');
      else if (event.type === 'burn') audio.play('burn');
      else if (event.type === 'plated') audio.play('plate');
      else if (event.type === 'dayEnd') audio.play('dayEnd');
      else if (event.type === 'gameOver') audio.play('miss');
    }
    state.events.length = 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    // The state machine inside state.js owns day-over and game-over; mirror it.
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        stepState(state, STEP);
        accumulator -= STEP;
        if (state.screen === SCREEN_DAYOVER) {
          screen = SCREEN_DAYOVER;
          announce(`Day ${state.daySummary.day} complete. ${state.daySummary.served} dishes served.`);
          break;
        }
        if (state.screen === SCREEN_OVER) {
          endGame();
          break;
        }
      }
      drainEvents();
      const cooking = Boolean(state.wok.job || state.grill.job || state.kettle.job);
      audio.setSizzle(cooking && screen === SCREEN_PLAY);
    } else {
      accumulator = 0;
      audio.setSizzle(false);
    }
    renderer.draw(state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Dapur Kilat. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
