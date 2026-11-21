// Dusk Garden — guards: patrol routes, lantern vision cones, line of
// sight through the garden, and the alert meter that decides a catch.
// A guard sees the fox only when the fox is inside the cone AND no hedge,
// bush or fountain stands between them.
import { ALERT, GUARD } from './config.js';

/** A guard's live state, built from one of the level's patrol routes. */
export function makeGuard(route) {
  const first = route.waypoints[0];
  return {
    name: route.name,
    waypoints: route.waypoints,
    speed: route.speed,
    x: first.x,
    y: first.y,
    // Index of the waypoint the guard is walking toward.
    target: 1 % route.waypoints.length,
    // Facing angle in radians; starts looking down the patrol route.
    angle: Math.atan2(
      route.waypoints[1 % route.waypoints.length].y - first.y,
      route.waypoints[1 % route.waypoints.length].x - first.x,
    ),
    // 'patrol' or 'look': a suspicious guard pauses to stare.
    mode: 'patrol',
    lookTimer: 0,
    // Where the guard last saw the fox (for the look direction).
    lastSeen: null,
  };
}

/** Move a point along the patrol loop; guards never leave their route. */
function walkPatrol(guard, dt) {
  const goal = guard.waypoints[guard.target];
  const dx = goal.x - guard.x;
  const dy = goal.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const step = guard.speed * dt;
  if (dist <= step) {
    guard.x = goal.x;
    guard.y = goal.y;
    guard.target = (guard.target + 1) % guard.waypoints.length;
  } else {
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
    guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), 6 * dt);
  }
}

/** Turn `from` toward `to` by at most `maxStep` radians, shortest way. */
function turnToward(from, to, maxStep) {
  let diff = to - from;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxStep) return to;
  return from + Math.sign(diff) * maxStep;
}

/** Does the segment (x1,y1)-(x2,y2) cross the rectangle? */
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Does the segment (x1,y1)-(x2,y2) pass through the circle? */
function segmentHitsCircle(x1, y1, x2, y2, c) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(c.x - x1, c.y - y1) < c.r;
  let t = ((c.x - x1) * dx + (c.y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return Math.hypot(c.x - px, c.y - py) < c.r;
}

/**
 * Is the line from the guard to the fox blocked by any cover?
 * Hedges, bushes and the fountain all stop a lantern's light.
 */
export function lineBlocked(level, x1, y1, x2, y2) {
  for (const h of level.hedges) {
    if (segmentHitsRect(x1, y1, x2, y2, h)) return true;
  }
  for (const b of level.bushes) {
    if (segmentHitsCircle(x1, y1, x2, y2, b)) return true;
  }
  if (segmentHitsCircle(x1, y1, x2, y2, level.fountain)) return true;
  return false;
}

/**
 * Can this guard see the fox right now? Inside the cone, in range,
 * and with a clear line of sight.
 */
export function guardSeesFox(guard, fox, level) {
  const dx = fox.x - guard.x;
  const dy = fox.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.coneRange + fox.radius) return false;
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > GUARD.coneHalfAngle) return false;
  if (lineBlocked(level, guard.x, guard.y, fox.x, fox.y)) return false;
  return true;
}

/**
 * Step every guard one frame. Returns true when any guard sees the fox.
 * A suspicious guard (alert over the threshold) pauses its patrol and
 * stares at where it last saw the fox, then gives up and walks on.
 */
export function updateGuards(guards, fox, level, alert, dt) {
  let anySees = false;
  for (const guard of guards) {
    const sees = guardSeesFox(guard, fox, level);
    if (sees) {
      anySees = true;
      guard.lastSeen = { x: fox.x, y: fox.y };
    }
    if (alert >= ALERT.investigateAt && guard.lastSeen) {
      guard.mode = 'look';
      guard.lookTimer = 1.6;
      const want = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
      guard.angle = turnToward(guard.angle, want, 5 * dt);
      guard.lookTimer -= dt;
      if (guard.lookTimer <= 0 && !sees) {
        guard.mode = 'patrol';
        guard.lastSeen = null;
      }
    } else {
      guard.mode = 'patrol';
      walkPatrol(guard, dt);
    }
  }
  return anySees;
}
