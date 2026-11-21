// Dusk Garden — configuration: the numbers that tune the whole game.
// One place for sizes, speeds, colours and the detection model, so tuning
// never means hunting through the game code.

export const WORLD = { width: 960, height: 640 };
export const WALL = 24; // thickness of the stone garden wall

export const FOX = {
  radius: 14,
  speed: 175, // px per second
  colour: '#e8803a',
  belly: '#f7c98a',
};

export const GUARD = {
  radius: 16,
  patrolSpeed: 58,
  // A lantern's vision cone: how far it reaches and how wide it opens.
  coneRange: 185,
  coneHalfAngle: (30 * Math.PI) / 180,
  lantern: '#ffd27a',
};

export const ALERT = {
  risePerSecond: 60, // while the fox is inside a lit cone with clear sight
  decayPerSecond: 30, // while hidden again
  investigateAt: 35, // a guard turns to look at where it last saw the fox
  spottedAt: 100, // full: the fox is caught
};

export const FIREFLY_COUNT = 3;

export const COLOURS = {
  lawn: '#2e4a2f',
  lawnDark: '#263d28',
  path: '#8a7a5c',
  wall: '#6b6257',
  wallTop: '#8d8478',
  hedge: '#1d3a1e',
  hedgeTop: '#2f5a2e',
  bush: '#224d22',
  fountain: '#3f6d8a',
  fountainRim: '#7a7268',
  flowerPink: '#e58bb1',
  flowerYellow: '#f2d06b',
  flowerWhite: '#f2ede0',
  gate: '#c9a227',
  gateOpen: '#ffe9a3',
  dusk: '#1c1430',
  vignette: 'rgba(12, 8, 28, 0.55)',
  hudBg: 'rgba(16, 10, 32, 0.72)',
  text: '#f5eeda',
  textDim: '#c9bfa5',
  danger: '#ff5a4e',
  ok: '#8fe388',
};
