// Dusk Garden — render: everything the player sees, drawn on one canvas.
// Order matters: lawn, paths, lantern cones, then cover (so hedges really
// stop the light), then fireflies, the gate, guards, the fox, and the dusk.
// The HUD and the title / win / lose screens are drawn last.
import { COLOURS, FOX, GUARD, WALL, WORLD } from './config.js';

/** Draw a soft glowing dot (fireflies, lanterns). */
function glow(ctx, x, y, radius, colour, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** One gardener: a round body, a wide hat, a lantern held ahead. */
function drawGuard(ctx, guard, t) {
  const { x, y, angle } = guard;
  // Lantern light pool at the guard's feet.
  glow(ctx, x, y, 46, 'rgba(255, 210, 122, 0.30)', 0.5);
  // Body: a gardener's green coat.
  ctx.fillStyle = '#4a6b3a';
  ctx.beginPath();
  ctx.arc(x, y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d8148';
  ctx.beginPath();
  ctx.arc(x, y - 3, GUARD.radius - 5, 0, Math.PI * 2);
  ctx.fill();
  // Wide-brim straw hat.
  ctx.fillStyle = '#d9b96a';
  ctx.beginPath();
  ctx.arc(x, y, GUARD.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b8933f';
  ctx.beginPath();
  ctx.arc(x, y, GUARD.radius - 6, 0, Math.PI * 2);
  ctx.fill();
  // The lantern, held out in front, warm and bright.
  const lx = x + Math.cos(angle) * (GUARD.radius + 10);
  const ly = y + Math.sin(angle) * (GUARD.radius + 10);
  glow(ctx, lx, ly, 20, 'rgba(255, 210, 122, 0.85)', 0.9);
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.arc(lx, ly, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.beginPath();
  ctx.arc(lx, ly, 2, 0, Math.PI * 2);
  ctx.fill();
  // A small "!" when the guard is staring (suspicious).
  if (guard.mode === 'look') {
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - GUARD.radius - 10);
  }
}

/** The fox, top-down: tail, ears, body, and a pale belly. */
function drawFox(ctx, fox) {
  const { x, y, angle } = fox;
  const bob = fox.moving ? Math.sin(fox.walkPhase) * 1.5 : 0;
  // Tail, swept behind, with a pale tip.
  const tx = x - Math.cos(angle) * 20;
  const ty = y - Math.sin(angle) * 20;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(angle);
  ctx.fillStyle = FOX.colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.ellipse(-11, 0, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Body.
  ctx.fillStyle = FOX.colour;
  ctx.beginPath();
  ctx.arc(x, y + bob * 0.4, FOX.radius, 0, Math.PI * 2);
  ctx.fill();
  // Belly.
  ctx.fillStyle = FOX.belly;
  ctx.beginPath();
  ctx.arc(x + Math.cos(angle) * 4, y + Math.sin(angle) * 4 + bob * 0.4, FOX.radius - 6, 0, Math.PI * 2);
  ctx.fill();
  // Two pointed ears at the front.
  for (const side of [-1, 1]) {
    const ex = x + Math.cos(angle) * 10 - Math.sin(angle) * side * 8;
    const ey = y + Math.sin(angle) * 10 + Math.cos(angle) * side * 8 + bob * 0.4;
    ctx.fillStyle = FOX.colour;
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(angle) * 4, ey - Math.sin(angle) * 4);
    ctx.lineTo(ex + Math.cos(angle) * 7, ey + Math.sin(angle) * 7);
    ctx.lineTo(ex - Math.sin(angle) * side * 5, ey + Math.cos(angle) * side * 5);
    ctx.closePath();
    ctx.fill();
  }
  // Eyes.
  ctx.fillStyle = '#241505';
  for (const side of [-1, 1]) {
    const ex = x + Math.cos(angle) * 7 - Math.sin(angle) * side * 5;
    const ey = y + Math.sin(angle) * 7 + Math.cos(angle) * side * 5;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A golden firefly to gather: a bright core with a pulsing halo. */
function drawFirefly(ctx, f, t) {
  const pulse = 0.65 + 0.35 * Math.sin(t * 3 + f.x);
  glow(ctx, f.x, f.y, 26, 'rgba(255, 215, 90, 0.55)', pulse);
  ctx.fillStyle = '#ffe9a3';
  ctx.beginPath();
  ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** The garden gate in the top wall: shut and dark, or open and glowing. */
function drawGate(ctx, gate, open, t) {
  const { x, y, w, h } = gate;
  ctx.fillStyle = open ? COLOURS.gateOpen : COLOURS.gate;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5c4a12';
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(x + 8 + i * 15, y + 4, 3, h - 8);
  }
  if (open) {
    const pulse = 0.5 + 0.3 * Math.sin(t * 4);
    glow(ctx, x + w / 2, y + h / 2, 60, 'rgba(255, 233, 163, 0.8)', pulse);
    ctx.fillStyle = '#fff6cf';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('GATE OPEN', x + w / 2, y + h + 18);
  }
}

/** A hedge: a dark block with a lighter trimmed top and a soft edge. */
function drawHedge(ctx, h) {
  ctx.fillStyle = COLOURS.hedge;
  ctx.beginPath();
  ctx.roundRect(h.x, h.y, h.w, h.h, 10);
  ctx.fill();
  ctx.fillStyle = COLOURS.hedgeTop;
  ctx.beginPath();
  ctx.roundRect(h.x + 4, h.y + 4, h.w - 8, h.h - 8, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(h.x + 4, h.y + 4, h.w - 8, 5, 4);
  ctx.fill();
}

/** The HUD bar: fireflies, the alert meter, the objective, and the time. */
function drawHud(ctx, state) {
  const { width } = WORLD;
  ctx.fillStyle = COLOURS.hudBg;
  ctx.beginPath();
  ctx.roundRect(10, 8, width - 20, 40, 10);
  ctx.fill();
  ctx.textBaseline = 'middle';
  // Fireflies gathered.
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLOURS.text;
  ctx.fillText('✦', 24, 29);
  for (let i = 0; i < state.level.fireflies.length; i += 1) {
    ctx.beginPath();
    ctx.arc(52 + i * 24, 28, 8, 0, Math.PI * 2);
    ctx.fillStyle = state.level.fireflies[i].taken ? '#ffd75a' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 90, 0.6)';
    ctx.stroke();
  }
  // Alert meter.
  const ax = width / 2 - 130;
  ctx.fillStyle = COLOURS.text;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(state.alertLabel, ax, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.roundRect(ax, 28, 260, 10, 5);
  ctx.fill();
  const alertFrac = Math.max(0, Math.min(1, state.alert / 100));
  ctx.fillStyle = alertFrac < 0.35 ? '#c9bfa5' : alertFrac < 0.7 ? '#ffb347' : COLOURS.danger;
  if (alertFrac > 0) {
    ctx.beginPath();
    ctx.roundRect(ax, 28, 260 * alertFrac, 10, 5);
    ctx.fill();
  }
  // Objective and time, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLOURS.textDim;
  ctx.font = '15px Georgia, serif';
  ctx.fillText(state.objective, width - 24, 20);
  ctx.fillStyle = COLOURS.text;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(formatTime(state.time), width - 24, 38);
  // A short message under the bar (e.g. "The gate is open!").
  if (state.message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a3';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(state.message, width / 2, 66);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** A centred panel for the title, win and lose screens. */
function drawPanel(ctx, title, lines, hint) {
  const { width, height } = WORLD;
  ctx.fillStyle = 'rgba(10, 6, 24, 0.72)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLOURS.hudBg;
  ctx.beginPath();
  ctx.roundRect(width / 2 - 300, height / 2 - 150, 600, 300, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 233, 163, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a3';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(title, width / 2, height / 2 - 96);
  ctx.fillStyle = COLOURS.text;
  ctx.font = '18px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, width / 2, height / 2 - 42 + i * 30));
  ctx.fillStyle = COLOURS.textDim;
  ctx.font = '16px Georgia, serif';
  ctx.fillText(hint, width / 2, height / 2 + 108);
}

/** Draw the whole game frame. `t` is seconds since the page loaded. */
export function render(ctx, state, t) {
  const { width, height } = WORLD;
  const { level } = state;
  // Dusk lawn.
  ctx.fillStyle = COLOURS.lawn;
  ctx.fillRect(0, 0, width, height);
  // Mown stripes for depth.
  ctx.fillStyle = COLOURS.lawnDark;
  for (let i = 0; i < 8; i += 1) {
    if (i % 2 === 0) ctx.fillRect(WALL, WALL + i * 74, width - WALL * 2, 74);
  }
  // Stone paths.
  ctx.fillStyle = COLOURS.path;
  for (const p of level.paths) ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (const p of level.paths) ctx.fillRect(p.x, p.y + 4, p.w, 3);
  // Flower beds.
  for (const f of level.flowers) {
    ctx.fillStyle = '#3d2f45';
    ctx.beginPath();
    ctx.roundRect(f.x, f.y, f.w, f.h, 8);
    ctx.fill();
    const cols = [COLOURS.flowerPink, COLOURS.flowerYellow, COLOURS.flowerWhite];
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = cols[(f.x + i) % 3];
      ctx.beginPath();
      ctx.arc(f.x + 10 + (i % 4) * 18, f.y + 12 + Math.floor(i / 4) * 18, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Lantern cones first: cover drawn over them stops the light visually.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const guard of state.guards) {
    const g = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, GUARD.coneRange);
    g.addColorStop(0, 'rgba(255, 210, 122, 0.34)');
    g.addColorStop(1, 'rgba(255, 210, 122, 0.02)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, GUARD.coneRange, guard.angle - GUARD.coneHalfAngle, guard.angle + GUARD.coneHalfAngle);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Cover: hedges, bushes, fountain.
  for (const h of level.hedges) drawHedge(ctx, h);
  for (const b of level.bushes) {
    ctx.fillStyle = COLOURS.bush;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f6b2e';
    ctx.beginPath();
    ctx.arc(b.x - 5, b.y - 5, b.r - 10, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fountain: stone rim, dark water, a shimmer.
  ctx.fillStyle = COLOURS.fountainRim;
  ctx.beginPath();
  ctx.arc(level.fountain.x, level.fountain.y, level.fountain.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.fountain;
  ctx.beginPath();
  ctx.arc(level.fountain.x, level.fountain.y, level.fountain.r - 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(t * 2)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(level.fountain.x, level.fountain.y, level.fountain.r - 20, t * 0.5, t * 0.5 + Math.PI * 1.2);
  ctx.stroke();
  // Fireflies to gather.
  for (const f of level.fireflies) {
    if (!f.taken) drawFirefly(ctx, f, t);
  }
  // The gate.
  drawGate(ctx, level.gate, state.gateOpen, t);
  // Drifting wild fireflies for atmosphere (never collectible).
  for (const w of state.wild) {
    const wx = w.x + Math.sin(t * w.speed + w.phase) * 8;
    const wy = w.y + Math.cos(t * w.speed * 0.8 + w.phase) * 6;
    glow(ctx, wx, wy, 8, 'rgba(180, 255, 170, 0.5)', 0.5 + 0.3 * Math.sin(t * 2 + w.phase));
  }
  // Guards, then the fox, then the garden wall on top of the edges.
  for (const guard of state.guards) drawGuard(ctx, guard, t);
  if (state.screen !== 'title') drawFox(ctx, state.fox);
  ctx.fillStyle = COLOURS.wall;
  ctx.fillRect(0, 0, width, WALL);
  ctx.fillRect(0, height - WALL, width, WALL);
  ctx.fillRect(0, 0, WALL, height);
  ctx.fillRect(width - WALL, 0, WALL, height);
  ctx.fillStyle = COLOURS.wallTop;
  ctx.fillRect(0, 0, width, 6);
  ctx.fillRect(0, height - 6, width, 6);
  ctx.fillRect(0, 0, 6, height);
  ctx.fillRect(width - 6, 0, 6, height);
  // The gate sits in the top wall: redraw it over the wall so it reads.
  drawGate(ctx, level.gate, state.gateOpen, t);
  // Dusk vignette: the edges of the garden fall into night.
  const vg = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.85);
  vg.addColorStop(0, 'rgba(12, 8, 28, 0)');
  vg.addColorStop(1, COLOURS.vignette);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);
  // A red flash while the fox is being spotted.
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 30, ${Math.min(0.4, state.flash * 0.4)})`;
    ctx.fillRect(0, 0, width, height);
  }
  // HUD on the play screens.
  if (state.screen === 'play' || state.screen === 'win' || state.screen === 'lose') {
    drawHud(ctx, state);
  }
  // Screens.
  if (state.screen === 'title') {
    drawPanel(
      ctx,
      'DUSK GARDEN',
      [
        'You are a fox in a walled garden at dusk.',
        'Gather the three golden fireflies, then slip out',
        'through the garden gate — without a lantern finding you.',
        'Hide behind hedges and bushes. A lit cone means danger.',
      ],
      'WASD / Arrow keys to move  •  Click to stroll  •  M to mute  •  Press Enter to begin',
    );
  } else if (state.screen === 'win') {
    drawPanel(
      ctx,
      'OUT LIKE A SHADOW',
      [
        `The gate swung open and the fox slipped into the night.`,
        `Three fireflies gathered in ${formatTime(state.time)}.`,
        'Not one lantern ever found you.',
      ],
      'Press Enter or click to play again',
    );
  } else if (state.screen === 'lose') {
    drawPanel(
      ctx,
      'SPOTTED!',
      [
        'A gardener’s lantern found the fox in the open.',
        `${state.level.fireflies.filter((f) => f.taken).length} of 3 fireflies gathered.`,
        'Next time, wait for the cone to pass — then move.',
      ],
      'Press Enter or click to try again',
    );
  }
}
