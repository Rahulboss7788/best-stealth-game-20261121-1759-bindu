// Dusk Garden — sound: small WebAudio effects, made on the fly, no files.
// A soft pluck when a firefly is caught, a low warning pulse while a
// lantern is on you, a chime for the gate, a thud for being spotted.
// Audio starts on the first key or click (browsers need a gesture).

/** @returns an audio object; every method is safe to call before unlock. */
export function createAudio() {
  let ctx = null;
  let muted = false;
  let warnOsc = null;
  let warnGain = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    /** Call on the first key/click so later sounds are allowed. */
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopWarning();
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** A firefly caught: two bright plucks. */
    pluck() {
      tone(880, 0.18, 'sine', 0.16);
      tone(1318, 0.24, 'sine', 0.12, 0.07);
    },
    /** A soft footstep tick, throttled by the caller. */
    step() {
      tone(190, 0.05, 'triangle', 0.045);
    },
    /** The gate swings open: a rising chime. */
    gate() {
      tone(523, 0.22, 'sine', 0.14);
      tone(659, 0.22, 'sine', 0.14, 0.1);
      tone(784, 0.34, 'sine', 0.16, 0.2);
    },
    /** Caught: a low thud and a falling note. */
    caught() {
      tone(160, 0.3, 'sawtooth', 0.16, 0, 70);
      tone(90, 0.4, 'triangle', 0.18, 0.05, 50);
    },
    /** Winning: a small dusk melody. */
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'sine', 0.14, i * 0.12));
    },
    /** Start the low warning pulse while a lantern is on the fox. */
    startWarning() {
      if (muted || warnOsc) return;
      const ac = ensure();
      if (!ac) return;
      warnOsc = ac.createOscillator();
      warnGain = ac.createGain();
      warnOsc.type = 'sine';
      warnOsc.frequency.value = 110;
      warnGain.gain.value = 0.0001;
      warnGain.gain.exponentialRampToValueAtTime(0.07, ac.currentTime + 0.1);
      warnOsc.connect(warnGain).connect(ac.destination);
      warnOsc.start();
    },
    stopWarning() {
      if (!warnOsc) return;
      try {
        warnGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        warnOsc.stop(ctx.currentTime + 0.12);
      } catch {
        /* already stopped */
      }
      warnOsc = null;
      warnGain = null;
    },
  };
}
