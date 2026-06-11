// Procedural WebAudio sound: ambient wind + birdsong plus short UI cues, all
// synthesized (no audio assets — keeps the repo CC0-clean and the bundle
// tiny). The AudioContext is created on the first user gesture (browser
// autoplay policy); cues fired before that are simply dropped.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let birdLevel = 0.6; // 0..1, driven by biodiversity so a thriving world sings

const MUTE_KEY = 'flourish.muted';
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* private mode */
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  startAmbient();
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = ensure();
    if (c && c.state === 'suspended') void c.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.04);
}

/** Biodiversity 0..1 — scales how often/loud the ambient birds chirp. */
export function setBirdLevel(level: number): void {
  birdLevel = Math.min(1, Math.max(0, level));
}

// --- small synth helpers ---------------------------------------------------

interface ToneOpts {
  freq: number;
  glideTo?: number;
  type?: OscillatorType;
  delay?: number; // seconds after "now"
  dur?: number;
  peak?: number;
  release?: number;
}

function tone({ freq, glideTo, type = 'sine', delay = 0, dur = 0.18, peak = 0.1, release = 0.12 }: ToneOpts): void {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur + release);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.05);
}

function noiseBurst(delay: number, dur: number, peak: number, filterFreq: number): void {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

// --- UI cues ----------------------------------------------------------------

/** Soft earthy thud — building/action placed. */
export function sfxPlace(): void {
  tone({ freq: 170, glideTo: 62, type: 'triangle', dur: 0.13, peak: 0.22, release: 0.1 });
  noiseBurst(0, 0.07, 0.1, 900);
}

/** Low denied buzz — invalid placement / can't afford. */
export function sfxInvalid(): void {
  tone({ freq: 96, glideTo: 78, type: 'sawtooth', dur: 0.14, peak: 0.07, release: 0.06 });
}

/** Two-note discovery chime — tech unlocked. */
export function sfxTech(): void {
  tone({ freq: 740, type: 'sine', dur: 0.14, peak: 0.09 });
  tone({ freq: 988, type: 'sine', delay: 0.1, dur: 0.2, peak: 0.09, release: 0.3 });
}

/** Rising four-note fanfare — new age. */
export function sfxAgeUp(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) =>
    tone({ freq: f, type: 'triangle', delay: i * 0.15, dur: 0.22, peak: 0.11, release: i === notes.length - 1 ? 0.6 : 0.18 }),
  );
}

/** Bright little up-chirp — a species arrived. */
export function sfxArrival(): void {
  tone({ freq: 1500, glideTo: 2400, type: 'sine', dur: 0.09, peak: 0.06, release: 0.05 });
  tone({ freq: 1800, glideTo: 2600, type: 'sine', delay: 0.13, dur: 0.1, peak: 0.05, release: 0.08 });
}

/** Falling sigh — a species left. */
export function sfxDeparture(): void {
  tone({ freq: 620, glideTo: 380, type: 'sine', dur: 0.32, peak: 0.07, release: 0.2 });
}

// --- ambient bed ------------------------------------------------------------

function startAmbient(): void {
  if (!ctx || !master) return;

  // Wind: looped noise through a slowly-breathing lowpass.
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const wind = ctx.createBufferSource();
  wind.buffer = buf;
  wind.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 340;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.028;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain).connect(filter.frequency);
  wind.connect(filter).connect(windGain).connect(master);
  wind.start();
  lfo.start();

  // Birds: occasional procedural chirps, denser when biodiversity is high.
  const chirp = () => {
    if (ctx && !muted && birdLevel > 0.05 && document.visibilityState === 'visible') {
      const base = 1700 + Math.random() * 900;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        tone({
          freq: base * (0.95 + Math.random() * 0.1),
          glideTo: base + 500 + Math.random() * 400,
          type: 'sine',
          delay: i * (0.12 + Math.random() * 0.05),
          dur: 0.07 + Math.random() * 0.05,
          peak: 0.028 * (0.4 + 0.6 * birdLevel),
          release: 0.05,
        });
      }
    }
    const wait = 2500 + Math.random() * 9000 * (1.6 - birdLevel);
    window.setTimeout(chirp, wait);
  };
  window.setTimeout(chirp, 2000);
}
