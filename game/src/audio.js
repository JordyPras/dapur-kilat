// Dapur Kilat's sounds: every bleep is synthesised with WebAudio at run time.
// No audio files, no network. The context is created on the first user gesture
// (browsers refuse audio before one) and every sound is a short envelope.

/**
 * Create the sound engine. Call `unlock()` from a pointer/key handler once;
 * the rest of the game calls `play(name)` and never touches the context.
 */
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let sizzleNodes = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  const SOUNDS = {
    /** A pantry item lands in the tray. */
    pop() {
      tone(520, 0.08, 'sine', 0.25, 760);
    },
    /** One chop on the board. */
    chop() {
      noiseBurst(0.07, 0.5, 900);
      tone(180, 0.06, 'triangle', 0.3, 120);
    },
    /** A job starts on the wok or grill. */
    sizzleStart() {
      noiseBurst(0.25, 0.3, 2400);
    },
    /** A dish is plated. */
    plate() {
      tone(660, 0.1, 'sine', 0.25);
      tone(990, 0.14, 'sine', 0.22);
    },
    /** A served order: two bright notes and a coin sparkle. */
    serve() {
      tone(880, 0.12, 'sine', 0.28);
      tone(1174, 0.18, 'sine', 0.28);
      tone(1568, 0.2, 'triangle', 0.12);
    },
    /** Wrong station, full tray, or a dish that matches nothing. */
    buzz() {
      tone(140, 0.18, 'sawtooth', 0.2, 90);
    },
    /** A dish burned. */
    burn() {
      noiseBurst(0.3, 0.4, 500);
      tone(220, 0.3, 'sawtooth', 0.18, 110);
    },
    /** An order's patience ran out. */
    miss() {
      tone(392, 0.2, 'triangle', 0.25, 311);
      tone(311, 0.3, 'triangle', 0.25, 233);
    },
    /** A day ends. */
    dayEnd() {
      tone(523, 0.15, 'sine', 0.25);
      tone(659, 0.15, 'sine', 0.25);
      tone(784, 0.3, 'sine', 0.25);
    },
    /** A ticket arrives on the board. */
    ticket() {
      tone(740, 0.07, 'square', 0.12);
      tone(988, 0.09, 'square', 0.12);
    },
  };

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    play(name) {
      if (!ensure()) return;
      const fn = SOUNDS[name];
      if (fn) fn();
    },
    /** A looping wok sizzle while any station cooks; call every frame. */
    setSizzle(on) {
      if (!ensure() || muted) {
        if (sizzleNodes) {
          try {
            sizzleNodes.src.stop();
          } catch {
            // Already stopped.
          }
          sizzleNodes = null;
        }
        return;
      }
      if (on && !sizzleNodes) {
        const len = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        const gain = ctx.createGain();
        gain.gain.value = 0.05;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        src.start();
        sizzleNodes = { src, gain };
      } else if (!on && sizzleNodes) {
        try {
          sizzleNodes.src.stop();
        } catch {
          // Already stopped.
        }
        sizzleNodes = null;
      }
    },
  };
}
