import { createOsc, createGain, createNoise, createLpf, createBpf } from './audio-utils';

export function playSokobanSound(audioCtx: AudioContext, out: AudioNode, name: 'move' | 'push' | 'bump' | 'target') {
  const t = audioCtx.currentTime;

  if (name === 'move') {
    // blockMove logic
    const o = createOsc(audioCtx, 'square', 220);
    const g = createGain(audioCtx, 0.15);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.07);
  } else if (name === 'push') {
    // stoneDrop logic / sliding heavy block
    const n = createNoise(audioCtx, 0.15);
    const lp = createLpf(audioCtx, 1200);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.15);

    const o = createOsc(audioCtx, 'sine', 280);
    const og = createGain(audioCtx, 0.25);
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.18);
  } else if (name === 'bump') {
    // blockLand logic
    const n = createNoise(audioCtx, 0.2);
    const lp = createLpf(audioCtx, 400);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.2);

    const o = createOsc(audioCtx, 'sine', 120);
    const og = createGain(audioCtx, 0.3);
    og.gain.setValueAtTime(0.3, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.12);
  } else if (name === 'target') {
    // blockRotate / uiClick logic for target
    const o = createOsc(audioCtx, 'sine', 440);
    o.frequency.linearRampToValueAtTime(660, t + 0.08);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.14);
  }
}
