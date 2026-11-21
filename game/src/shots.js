// Dusk Garden — shots: the screenshot scenes. Each one plays the real
// game forward from a fresh start with a scripted autopilot, so the frame
// is what a short game really looks like and the same scene always gives
// the same frame. The autopilot walks the fox between waypoints and, when
// a lantern catches it, retreats to the last safe spot and waits for the
// alert to fade — the way a careful player would.
// `api` gives the shot the live game: getState(), startGame(), updatePlay().
const DT = 1 / 60;

/** The four scenes, in the order the screenshots are named. */
const SHOTS = {
  // Cover: mid-game, a firefly caught, the fox slipping past the fountain
  // while two lantern cones sweep the lawn. The fox runs the left edge
  // straight up while the first gardener still walks east, slips around
  // the west end of the top hedge to the first firefly, then down to the
  // fountain — speed, not waiting, is what keeps it unseen.
  play: {
    waypoints: [
      { x: 90, y: 200 },
      { x: 120, y: 80 },
      { x: 200, y: 80 },
      { x: 350, y: 280 },
      { x: 400, y: 340 },
    ],
    maxSeconds: 45,
  },
  // The endgame: all three fireflies gathered, the gate glowing open,
  // the fox a breath away from slipping out.
  gate: {
    waypoints: [
      { x: 90, y: 200 },
      { x: 120, y: 80 },
      { x: 200, y: 80 },
      { x: 300, y: 180 },
      { x: 420, y: 260 },
      { x: 460, y: 440 },
      // Slip south under the middle gardener's patrol, then east along
      // the bottom path (clear of the hedges) to the last firefly.
      // Wait at the bottom path until the middle gardener turns north
      // and walks up — crossing his line while he faces south is a catch.
      {
        x: 460, y: 570,
        waitFor: (state) => {
          const moss = state.guards[1];
          return moss.angle < -Math.PI / 3 && moss.y > 400;
        },
      },
      { x: 700, y: 570 },
      { x: 820, y: 520 },
      // Wait on the right lawn until the east gardener turns west and
      // walks away — climbing the right edge while he sweeps south is
      // a catch.
      {
        x: 860, y: 450,
        waitFor: (state) => {
          const thorn = state.guards[2];
          return Math.abs(thorn.angle) > 2.6;
        },
      },
      { x: 880, y: 200 },
      { x: 880, y: 60 },
    ],
    maxSeconds: 120,
    // Stop just short of the gate, so the frame shows the fox at the
    // open gate instead of the win panel.
    stopNearGate: 55,
  },
  // Caught in the light: the fox walks straight into a lantern cone and
  // the alert climbs. The last stop is on the middle gardener's patrol
  // line, right in front of his lantern.
  spotted: {
    waypoints: [
      { x: 300, y: 560 },
      { x: 480, y: 560 },
      { x: 540, y: 480 },
      { x: 560, y: 400 },
    ],
    maxSeconds: 40,
    // Freeze the frame while the alert is high, before the catch.
    stopAtAlert: 70,
  },
  // The title screen, with the garden and its patrolling lanterns behind.
  start: { titleSeconds: 6 },
};

/**
 * Drive the fox toward `target` for one step; returns the move vector.
 * @returns {{x:number, y:number}}
 */
function steer(fox, target) {
  const dx = target.x - fox.x;
  const dy = target.y - fox.y;
  const d = Math.hypot(dx, dy);
  if (d < 10) return { x: 0, y: 0, arrived: true };
  return { x: dx / d, y: dy / d, arrived: false };
}

/**
 * Play one scene forward and freeze it. Returns { t, screen, note }.
 * `t` is the game time to render at; `screen` is where the game ended.
 */
export function runShot(name, api) {
  const shot = SHOTS[name];
  if (!shot) throw new Error(`unknown shot: ${name}`);
  // The title scene never starts a run: it is the garden behind the panel.
  if (shot.titleSeconds) {
    for (let i = 0; i < shot.titleSeconds / DT; i += 1) {
      // Step the guards by hand: no alert, no win or lose on the title.
      api.stepTitle(DT);
    }
    return { t: shot.titleSeconds, screen: api.getState().screen, note: 'title' };
  }

  api.startGame();
  let t = 0;
  let index = 0;
  // The last waypoint the fox actually reached: the safe spot to fall
  // back to when a lantern catches it.
  let lastSafe = 0;
  // The first moment a lantern finds the fox (for debugging a route).
  let firstSeen = null;
  const maxSteps = Math.ceil(shot.maxSeconds / DT);
  for (let step = 0; step < maxSteps; step += 1) {
    const state = api.getState();
    if (state.screen !== 'play') break;
    if (state.seen && !firstSeen) {
      const g = state.guards.map((gd) => `${gd.name}@(${Math.round(gd.x)},${Math.round(gd.y)})a${Math.round((gd.angle * 180) / Math.PI)}`).join(' ');
      firstSeen = `t=${t.toFixed(1)} fox=(${Math.round(state.fox.x)},${Math.round(state.fox.y)}) alert=${Math.round(state.alert)} guards: ${g}`;
    }
    // A high alert freezes the spotted scene before the catch.
    if (shot.stopAtAlert && state.alert >= shot.stopAtAlert) break;
    // The gate scene stops a breath from the gate, gate glowing open.
    if (shot.stopNearGate) {
      const gate = state.level.gate;
      const gx = gate.x + gate.w / 2;
      const gy = gate.y + gate.h / 2;
      if (state.gateOpen && Math.hypot(gx - state.fox.x, gy - state.fox.y) < shot.stopNearGate) break;
    }
    // Pick the target: forward to the next waypoint, or back to the last
    // safe one while the alert is up.
    const dest = shot.waypoints[index];
    let target;
    if (state.alert > 25 && index > 0) {
      target = shot.waypoints[lastSafe];
    } else {
      target = dest;
    }
    const move = steer(state.fox, target);
    api.updatePlay(DT, move);
    t += DT;
    const after = api.getState();
    if (after.screen !== 'play') break;
    if (!move.arrived) continue;
    if (state.alert > 25 && index > 0) {
      // Arrived back at the safe spot: wait for the alert to fade.
      if (after.alert < 10) index += 1;
    } else if (dest.waitFor && !dest.waitFor(after)) {
      // A waypoint with a wait condition: hold here until it is safe to
      // move on (a patrol turning the right way, for instance).
    } else {
      lastSafe = index;
      index += 1;
      // The spotted scene does not end when the fox arrives: it stays
      // where it stands until a lantern finds it (stopAtAlert above).
      if (index >= shot.waypoints.length && !shot.stopAtAlert) break;
      if (index >= shot.waypoints.length) index = shot.waypoints.length - 1;
    }
  }
  const end = api.getState();
  return {
    t,
    screen: end.screen,
    note: `${name}: ${end.screen}, alert ${Math.round(end.alert)}, ` +
      `fireflies ${end.level.fireflies.filter((f) => f.taken).length}/3, ` +
      `fox at (${Math.round(end.fox.x)}, ${Math.round(end.fox.y)})` +
      (firstSeen ? ` | first seen: ${firstSeen}` : ' | never seen'),
  };
}
