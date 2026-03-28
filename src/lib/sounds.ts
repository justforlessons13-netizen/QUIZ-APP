/**
 * Web Audio API sound effects — no external files needed.
 * Each function lazily creates an AudioContext on first call (browser policy).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* ── helpers ── */

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function playNoise(duration: number, gain = 0.08) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  // Band-pass for a softer "shh"
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
  src.stop(c.currentTime + duration);
}

/* ── public API ── */

/** Short tick for countdown (last 5 seconds) */
export function playTick() {
  playTone(880, 0.08, 'sine', 0.12);
}

/** Urgent warning tick (last 3 seconds) */
export function playUrgentTick() {
  playTone(1100, 0.06, 'square', 0.08);
  setTimeout(() => playTone(1100, 0.06, 'square', 0.08), 100);
}

/** Time's up buzzer */
export function playTimesUp() {
  playTone(220, 0.4, 'sawtooth', 0.1);
  setTimeout(() => playTone(180, 0.5, 'sawtooth', 0.1), 150);
}

/** Correct answer chime — ascending two-note */
export function playCorrect() {
  playTone(523, 0.12, 'sine', 0.15); // C5
  setTimeout(() => playTone(784, 0.2, 'sine', 0.15), 120); // G5
}

/** Incorrect answer — descending buzz */
export function playIncorrect() {
  playTone(300, 0.15, 'square', 0.06);
  setTimeout(() => playTone(200, 0.25, 'square', 0.06), 150);
}

/** Winner fanfare — triumphant ascending arpeggio */
export function playFanfare() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sine', 0.15), i * 150);
  });
  // Add a shimmery noise burst at the end
  setTimeout(() => playNoise(0.4, 0.05), notes.length * 150);
}

/** Drumroll for dramatic reveals */
export function playDrumroll() {
  const c = getCtx();
  const duration = 1.5;
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  // Rapid noise pulses
  for (let i = 0; i < bufferSize; i++) {
    const beat = Math.sin(i / (c.sampleRate * 0.015)) > 0 ? 1 : 0.3;
    data[i] = (Math.random() * 2 - 1) * beat;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.setValueAtTime(0.04, c.currentTime);
  g.gain.linearRampToValueAtTime(0.1, c.currentTime + duration * 0.8);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
  src.stop(c.currentTime + duration);
}

/** Reveal step chime — single bright note */
export function playRevealStep() {
  playTone(660, 0.15, 'sine', 0.12);
}
