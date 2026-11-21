// Dusk Garden — main: the game loop, the state machine, movement and
// collision, collecting fireflies, opening the gate, and winning or being
// spotted. The fox, the guards and the level meet here.
import { ALERT, FOX, WALL, WORLD } from './config.js';
import { buildLevel, firefliesLeft } from './level.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { guardSeesFox, makeGuard, updateGuards } from './guards.js';
import { render } from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = WORLD.width;
canvas.height = WORLD.height;

/** Push a circle out of a rectangle (hedges). Returns the corrected point. */
function resolveRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x, y };
  if (d2 === 0) return { x: x + r, y };
  const d = Math.sqrt(d2);
  return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
}

/** Push a circle out of another circle (bushes, fountain). */
function resolveCircle(x, y, r, c) {
  const dx = x - c.x;
  const dy = y - c.y;
  const d = Math.hypot(dx, dy);
  const min = r + c.r;
  if (d >= min) return { x, y };
  if (d === 0) return { x: c.x + min, y: c.y };
  return { x: c.x + (dx / d) * min, y: c.y + (dy / d) * min };
}

/** Keep the fox inside the garden walls and out of every solid thing. */
function collide(state, x, y) {
  const r = FOX.radius;
  x = Math.max(WALL + r, Math.min(WORLD.width - WALL - r, x));
  y = Math.max(WALL + r, Math.min(WORLD.height - WALL - r, y));
  for (const h of state.level.hedges) {
    const p = resolveRect(x, y, r, h);
    x = p.x;
    y = p.y;
  }
  for (const b of state.level.bushes) {
    const p = resolveCircle(x, y, r, b);
    x = p.x;
    y = p.y;
  }
  const f = resolveCircle(x, y, r, state.level.fountain);
  x = f.x;
  y = f.y;
  return { x, y };
}

/** Move the fox by (dx, dy), sliding along walls: X first, then Y. */
function moveFox(state, dx, dy) {
  let p = collide(state, state.fox.x + dx, state.fox.y);
  state.fox.x = p.x;
  p = collide(state, state.fox.x, state.fox.y + dy);
  state.fox.y = p.y;
}

/** A fresh game: new level, fox at the spawn, guards on their routes. */
function newGame() {
  const level = buildLevel();
  const wild = [];
  for (let i = 0; i < 14; i += 1) {
    wild.push({
      x: 60 + ((i * 67) % 840),
      y: 60 + ((i * 113) % 520),
      speed: 0.4 + (i % 5) * 0.15,
      phase: i * 1.3,
    });
  }
  return {
    screen: 'title',
    level,
    fox: {
      x: level.spawn.x,
      y: level.spawn.y,
      radius: FOX.radius,
      angle: -Math.PI / 2,
      moving: false,
      walkPhase: 0,
      target: null,
    },
    guards: level.guards.map(makeGuard),
    alert: 0,
    seen: false,
    time: 0,
    gateOpen: false,
    gateAnnounced: false,
    message: '',
    messageTimer: 0,
    flash: 0,
    wild,
    stepTimer: 0,
  };
}

let state = newGame();
const input = createInput();
input.attach(canvas);
const audio = createAudio();

/** The HUD's alert word for the current meter. */
function alertLabel() {
  if (state.alert >= ALERT.spottedAt) return 'SPOTTED!';
  if (state.alert >= 70) return 'ALMOST SEEN!';
  if (state.alert >= ALERT.investigateAt) return 'SUSPICIOUS';
  if (state.alert > 0) return 'GLIMPSED';
  return 'UNSEEN';
}

function objectiveText() {
  const left = firefliesLeft(state.level);
  if (left > 0) return `Gather fireflies: ${state.level.fireflies.length - left} / ${state.level.fireflies.length}`;
  if (!state.gateOpen) return 'All fireflies gathered!';
  return 'Reach the golden gate!';
}

/** Start (or restart) a run: fresh level, fox at the spawn, play screen. */
function startGame() {
  state = newGame();
  state.screen = 'play';
  audio.unlock();
}

/** One frame of the play state. `move` is the normalised move vector. */
function updatePlay(dt, move) {
  state.time += dt;
  // Move the fox (keyboard, or click-to-stroll toward a target).
  let mx = move.x;
  let my = move.y;
  if (mx === 0 && my === 0 && state.fox.target) {
    const dx = state.fox.target.x - state.fox.x;
    const dy = state.fox.target.y - state.fox.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      state.fox.target = null;
    } else {
      mx = dx / d;
      my = dy / d;
    }
  }
  state.fox.moving = mx !== 0 || my !== 0;
  if (state.fox.moving) {
    state.fox.angle = Math.atan2(my, mx);
    state.fox.walkPhase += dt * 12;
    moveFox(state, mx * FOX.speed * dt, my * FOX.speed * dt);
    state.stepTimer -= dt;
    if (state.stepTimer <= 0) {
      audio.step();
      state.stepTimer = 0.32;
    }
  }
  // Guards patrol, look, and watch. The alert rises in a lit cone and
  // falls again once the fox is hidden — a chance to recover.
  state.seen = updateGuards(state.guards, state.fox, state.level, state.alert, dt);
  if (state.seen) {
    state.alert = Math.min(100, state.alert + ALERT.risePerSecond * dt);
    audio.startWarning();
  } else {
    state.alert = Math.max(0, state.alert - ALERT.decayPerSecond * dt);
    audio.stopWarning();
  }
  if (state.alert >= ALERT.spottedAt) {
    state.screen = 'lose';
    state.flash = 1;
    audio.stopWarning();
    audio.caught();
    return;
  }
  // Fireflies: walk close and one is caught.
  for (const f of state.level.fireflies) {
    if (!f.taken && Math.hypot(f.x - state.fox.x, f.y - state.fox.y) < FOX.radius + 22) {
      f.taken = true;
      audio.pluck();
      const got = state.level.fireflies.filter((g) => g.taken).length;
      state.message = `Firefly caught — ${got} of ${state.level.fireflies.length}`;
      state.messageTimer = 2.2;
      if (firefliesLeft(state.level) === 0 && !state.gateOpen) {
        state.gateOpen = true;
        state.gateAnnounced = true;
        audio.gate();
        state.message = 'All three fireflies — the garden gate is open!';
        state.messageTimer = 3;
      }
    }
  }
  // The gate: reach it once it is open and the fox slips out.
  if (state.gateOpen) {
    const gate = state.level.gate;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    if (Math.hypot(gx - state.fox.x, gy - state.fox.y) < 36) {
      state.screen = 'win';
      audio.stopWarning();
      audio.win();
      return;
    }
  }
  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) state.message = '';
  }
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.5);
}

/** What the HUD shows this frame (kept on the state for the renderer). */
function hudState() {
  return {
    ...state,
    alertLabel: alertLabel(),
    objective: objectiveText(),
  };
}

let last = performance.now();

/** The animation frame: read input, step the game, draw it. */
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (input.mute) {
    const m = audio.toggleMute();
    state.message = m ? 'Sound off (M to turn back on)' : 'Sound on';
    state.messageTimer = 1.5;
  }
  if (state.screen === 'title' && (input.confirm || input.clicked)) {
    audio.unlock();
    startGame();
  } else if ((state.screen === 'win' || state.screen === 'lose') && (input.confirm || input.clicked)) {
    audio.unlock();
    startGame();
  } else if (state.screen === 'play') {
    if (input.clicked && input.mouse) {
      state.fox.target = { x: input.mouse.x, y: input.mouse.y };
    }
    updatePlay(dt, input.moveVector());
  } else if (state.screen === 'title') {
    // The garden lives behind the title: guards keep patrolling.
    updateGuards(state.guards, state.fox, state.level, 0, dt);
  }
  input.endFrame();
  render(ctx, hudState(), t);
  requestAnimationFrame(frame);
}

// Screenshot scenes (?shot=...) run the real game forward with an
// autopilot, freeze on a frame, and say so — the capture script waits
// for window.__shotReady. No animation loop runs in shot mode.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const result = runShot(shot, {
    getState: () => state,
    startGame,
    updatePlay,
    // The autopilot checks whether a waypoint is safe to step onto.
    guardSeesFox,
    // The title scene steps the guards by hand (no alert, no win/lose).
    stepTitle: (dt) => updateGuards(state.guards, state.fox, state.level, 0, dt),
  });
  // Keep the frozen frame on screen for the capture.
  render(ctx, hudState(), result.t);
  window.__shotReady = true;
  window.__shot = shot;
  window.__game = { state, result };
} else {
  window.__game = { get state() { return state; }, startGame };
  requestAnimationFrame(frame);
}

// Keep the page from scrolling on touch devices.
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
