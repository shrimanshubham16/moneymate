// Mario-themed 8-bit sound engine using Web Audio API.
// All sounds are synthesized in real-time — zero external audio files.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq?.matches) return false;
  } catch { /* ignore */ }
  return localStorage.getItem('finflow_sound_enabled') !== 'false';
}

type OscType = OscillatorType;

function playNote(freq: number, duration: number, type: OscType = 'square', gain = 0.18, startTime = 0) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + startTime);
  g.gain.setValueAtTime(gain, ac.currentTime + startTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startTime + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(ac.currentTime + startTime);
  osc.stop(ac.currentTime + startTime + duration + 0.02);
}

function playSweep(startFreq: number, endFreq: number, duration: number, type: OscType = 'square', gain = 0.18) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + duration);
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration + 0.02);
}

// ─── Mario Sound Effects ────────────────────────────────────────────

/** Classic coin collect: two quick ascending tones (B5 → E6) */
export function soundCoin() {
  if (!isSoundEnabled()) return;
  playNote(988, 0.08, 'square', 0.15, 0);     // B5
  playNote(1319, 0.12, 'square', 0.12, 0.08);  // E6
}

/** 1-UP jingle: ascending 6-note melody */
export function soundOneUp() {
  if (!isSoundEnabled()) return;
  const notes = [659, 784, 1319, 1047, 1175, 1568]; // E5 G5 E6 C6 D6 G6
  const dur = 0.07;
  notes.forEach((freq, i) => playNote(freq, dur + 0.03, 'square', 0.14, i * dur));
}

/** Power-up: ascending 4-note arpeggio with longer final note */
export function soundPowerUp() {
  if (!isSoundEnabled()) return;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const dur = i === 3 ? 0.18 : 0.08;
    playNote(freq, dur, 'triangle', 0.16, i * 0.09);
  });
}

/** Fireball: descending pitch sweep */
export function soundFireball() {
  if (!isSoundEnabled()) return;
  playSweep(1800, 200, 0.15, 'square', 0.12);
}

/** Pipe warp: low frequency sweep upward */
export function soundPipe() {
  if (!isSoundEnabled()) return;
  playSweep(120, 600, 0.2, 'sawtooth', 0.1);
}

/** Block bump: short low thud */
export function soundBump() {
  if (!isSoundEnabled()) return;
  playNote(150, 0.06, 'triangle', 0.2, 0);
  playNote(100, 0.06, 'triangle', 0.15, 0.04);
}

/** Star power: rapid ascending 8-note sequence */
export function soundStar() {
  if (!isSoundEnabled()) return;
  const notes = [523, 587, 659, 784, 880, 988, 1175, 1568]; // C5→G6
  notes.forEach((freq, i) => playNote(freq, 0.06, 'square', 0.12, i * 0.065));
}

/** Game over: two descending notes */
export function soundGameOver() {
  if (!isSoundEnabled()) return;
  playNote(494, 0.15, 'square', 0.16, 0);    // B4
  playNote(330, 0.25, 'square', 0.14, 0.18);  // E4
}
