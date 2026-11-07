/**
 * Tiny synthesised sound effects (Web Audio): no audio files to download,
 * works offline, and stays subtle.
 */
export type SoundName = 'cat' | 'cross' | 'error' | 'win' | 'lose' | 'tap' | 'hint';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number, endFreq?: number): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playSound(name: SoundName): void {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case 'cat':
      tone(c, 620, t, 0.14, 'sine', 0.16, 980);
      tone(c, 1240, t + 0.05, 0.1, 'sine', 0.05);
      break;
    case 'cross':
      tone(c, 420, t, 0.06, 'triangle', 0.06, 300);
      break;
    case 'tap':
      tone(c, 700, t, 0.04, 'sine', 0.035);
      break;
    case 'hint':
      tone(c, 880, t, 0.12, 'sine', 0.08);
      tone(c, 1175, t + 0.08, 0.16, 'sine', 0.07);
      break;
    case 'error':
      tone(c, 220, t, 0.18, 'triangle', 0.14, 150);
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(c, f, t + i * 0.09, 0.28, 'sine', 0.12));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(c, f, t + i * 0.14, 0.3, 'triangle', 0.1));
      break;
  }
}

/** Light haptic feedback where supported (Android; iOS Safari ignores it). */
export function haptic(pattern: number | number[] = 8): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
