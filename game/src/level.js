// Dusk Garden — the level: walls, hedges, bushes, the fountain, fireflies,
// the gate, and the three gardener-guards with their patrol routes.
// Everything here is data: the game reads it, never hard-codes positions.
// Patrol lanes are kept clear of cover, and each firefly sits where a
// hedge or the fountain shields it from at least one patrol — so there is
// always a safe moment to take it, and always a risk in reaching it.
import { FIREFLY_COUNT } from './config.js';

/**
 * A rectangular hedge: blocks movement and blocks a guard's line of sight.
 * @typedef {{x:number, y:number, w:number, h:number}} Rect
 * A round bush or the fountain: blocks movement and sight the same way.
 * @typedef {{x:number, y:number, r:number}} Circle
 */

/** The whole garden, built fresh each game so a restart is identical. */
export function buildLevel() {
  return {
    // The gate is a doorway in the top wall. It stays shut until every
    // firefly is gathered, then it glows and the fox can slip out.
    gate: { x: 848, y: 4, w: 64, h: 30 },

    // Hedges: tall, trimmed, and solid. Hide behind them.
    hedges: [
      { x: 140, y: 110, w: 120, h: 26 }, // top-left, shields the first firefly
      { x: 140, y: 300, w: 26, h: 120 }, // left lawn, vertical
      { x: 420, y: 110, w: 120, h: 26 }, // top-centre
      { x: 620, y: 320, w: 26, h: 120 }, // right-centre, vertical
      { x: 700, y: 120, w: 120, h: 26 }, // top-right
      { x: 320, y: 440, w: 120, h: 26 }, // bottom-centre
    ],

    // Round bushes: soft cover that still stops a lantern's light.
    bushes: [
      { x: 350, y: 220, r: 24 },
      { x: 580, y: 220, r: 24 },
      { x: 230, y: 520, r: 24 },
      { x: 720, y: 400, r: 24 },
    ],

    // The old fountain in the middle of the garden.
    fountain: { x: 480, y: 330, r: 44 },

    // Flower beds are decoration only: they never block movement or sight.
    flowers: [
      { x: 60, y: 60, w: 70, h: 40 },
      { x: 560, y: 60, w: 70, h: 40 },
      { x: 830, y: 300, w: 70, h: 40 },
      { x: 60, y: 300, w: 70, h: 40 },
      { x: 360, y: 540, w: 70, h: 40 },
    ],

    // Stone paths the gardeners walk, drawn under everything.
    paths: [
      { x: 24, y: 556, w: 912, h: 36 },
      { x: 448, y: 24, w: 64, h: 592 },
    ],

    // The three golden fireflies to gather. Each sits in the open, near
    // cover, so reaching one always means crossing a lit patch — but a
    // hedge or the fountain always shields it from one patrol.
    fireflies: [
      { x: 200, y: 80, taken: false }, // north of the top-left hedge
      { x: 460, y: 440, taken: false }, // south of the fountain
      { x: 820, y: 520, taken: false }, // bottom-right corner
    ],

    // Where the fox starts: the bottom-left corner, in the dark.
    spawn: { x: 90, y: 570 },

    // The three gardeners. Each walks a clear lane and carries a lantern.
    guards: [
      {
        name: 'Bramble',
        waypoints: [
          { x: 100, y: 200 },
          { x: 300, y: 200 },
        ],
        speed: 58,
      },
      {
        name: 'Moss',
        waypoints: [
          { x: 560, y: 280 },
          { x: 560, y: 480 },
        ],
        speed: 62,
      },
      {
        name: 'Thorn',
        waypoints: [
          { x: 700, y: 300 },
          { x: 880, y: 300 },
        ],
        speed: 58,
      },
    ],
  };
}

export function firefliesLeft(level) {
  return level.fireflies.filter((f) => !f.taken).length;
}

export function firefliesTotal() {
  return FIREFLY_COUNT;
}
