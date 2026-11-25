// Orders: what a ticket shows, which recipe steps the cook has already done
// for it, and how serving matches a finished dish to a waiting ticket.

import { DISHES, ITEMS, choppedId, choppedName } from './config.js';
import { trayHas } from './state.js';

/** One step of a dish's recipe, as a ticket draws it: icon id + label + state. */
export function recipeSteps(dishId) {
  return DISHES[dishId].needs.map((need) => {
    if (need.endsWith('_chopped')) {
      const base = need.slice(0, -'_chopped'.length);
      return { id: need, label: choppedName(base), chop: true };
    }
    return { id: need, label: ITEMS[need].name, chop: false };
  });
}

/**
 * For a ticket, mark each recipe step done when the matching ingredient is in
 * the tray, chopped and waiting on the board, cooking on its station, sitting
 * on a plate, or already in the cook's hand.
 */
export function stepStates(state, order) {
  const dish = DISHES[order.dish];
  const boardOutput = state.board.output;
  const boardJob = state.board.job ? choppedId(state.board.job.item) : null;
  const stationJob = dish.station === 'wok' ? state.wok.job : dish.station === 'grill' ? state.grill.job : state.kettle.job;
  const cookingDish = stationJob && !stationJob.burnt ? stationJob.dish : null;
  return dish.needs.map((need) => {
    const inTray = trayHas(state, need);
    const onBoard = boardOutput === need || boardJob === need;
    const cooking = cookingDish === order.dish;
    const plated = state.plates.includes(order.dish);
    const carried = state.carrying === order.dish;
    return {
      need,
      done: inTray || onBoard || cooking || plated || carried,
      cooking,
      plated: plated || carried,
    };
  });
}

/** The ticket index whose dish matches the carried plate, or -1. */
export function matchingOrderIndex(state) {
  if (!state.carrying) return -1;
  return state.orders.findIndex((order) => order.dish === state.carrying);
}

/** Patience as a 0..1 fraction, for the ticket's timer bar. */
export function patienceFrac(order) {
  return Math.max(0, order.patience / order.patienceMax);
}

/** The timer bar colour: green while calm, amber while hurrying, red when late. */
export function patienceColor(order) {
  const frac = patienceFrac(order);
  if (frac > 0.5) return '#58b368';
  if (frac > 0.25) return '#f2a541';
  return '#d93a2b';
}

/** A short "what to do next" line for the selected ticket. */
export function nextStepHint(state, order) {
  if (!order) return 'Click a ticket, then gather its ingredients.';
  const dish = DISHES[order.dish];
  const steps = stepStates(state, order);
  if (state.carrying === order.dish) return `Serve ${dish.name} at the window!`;
  if (state.plates.includes(order.dish)) return `Pick up ${dish.name} from the plating counter.`;
  const stationJob = dish.station === 'wok' ? state.wok.job : dish.station === 'grill' ? state.grill.job : state.kettle.job;
  if (stationJob && stationJob.dish === order.dish && !stationJob.burnt) {
    return dish.station === 'kettle' ? `${dish.name} is pouring…` : `Take ${dish.name} off the ${dish.station} in the green zone!`;
  }
  const firstUndone = steps.find((s) => !s.done);
  if (!firstUndone) return `Start ${dish.name} at the ${dish.station}.`;
  const need = firstUndone.need;
  if (need.endsWith('_chopped')) {
    const base = need.slice(0, -'_chopped'.length);
    return trayHas(state, base)
      ? `Chop the ${ITEMS[base].name} on the board.`
      : `Grab ${ITEMS[base].name} from the pantry, then chop it.`;
  }
  return `Grab ${ITEMS[need].name} from the pantry.`;
}
