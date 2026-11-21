// Dusk Garden — input: keyboard (WASD and arrows) and mouse (click to
// stroll toward a point). The game reads this, never the DOM directly.

/** @returns an input object with live key and pointer state. */
export function createInput() {
  const keys = new Set();
  const input = {
    keys,
    // Where the mouse is pointing, in canvas pixels (or null).
    mouse: null,
    // True for one frame after the player clicks, then cleared by the game.
    clicked: false,
    // True for one frame after Enter/Space is pressed (start, restart).
    confirm: false,
    // True for one frame after M is pressed (mute toggle).
    mute: false,
    attach(canvas) {
      window.addEventListener('keydown', (event) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
          event.preventDefault();
        }
        if (event.repeat) return;
        keys.add(event.key.toLowerCase());
        if (event.key === 'Enter' || event.key === ' ') input.confirm = true;
        if (event.key.toLowerCase() === 'm') input.mute = true;
      });
      window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
      canvas.addEventListener('pointermove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        input.mouse = {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
      });
      canvas.addEventListener('pointerdown', (event) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        input.mouse = {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
        input.clicked = true;
      });
      window.addEventListener('blur', () => keys.clear());
    },
    /** The movement vector from the keys, normalised (or zero). */
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    hasMoveInput() {
      return (
        keys.has('a') || keys.has('d') || keys.has('w') || keys.has('s') ||
        keys.has('arrowleft') || keys.has('arrowright') || keys.has('arrowup') || keys.has('arrowdown')
      );
    },
    /** Clear the one-frame flags after the game has read them. */
    endFrame() {
      input.clicked = false;
      input.confirm = false;
      input.mute = false;
    },
  };
  return input;
}
