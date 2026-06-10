import { createOsc, createGain, createNoise, createLpf, createBpf } from './audio-utils';

export function playBlockSound(audioCtx: AudioContext, out: AudioNode, name: 'place' | 'clear' | 'error') {
  const t = audioCtx.currentTime;

  if (name === 'place') {
    // 类似木块或石块落入槽位的坚实音效
    const n = createNoise(audioCtx, 0.15);
    const lp = createLpf(audioCtx, 500);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.12);

    const o = createOsc(audioCtx, 'sine', 150);
    const og = createGain(audioCtx, 0.2);
    og.gain.setValueAtTime(0.2, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.1);
  } else if (name === 'clear') {
    // 清脆的玻璃或冰块破裂连消声
    const n = createNoise(audioCtx, 0.3);
    const bp = createBpf(audioCtx, 2500, 3);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(bp); bp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.25);

    [880, 1047, 1319].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const og = createGain(audioCtx, 0);
      const dt = t + i * 0.05;
      og.gain.setValueAtTime(0.15, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + 0.2);
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + 0.25);
    });
  } else if (name === 'error') {
    const o = createOsc(audioCtx, 'sawtooth', 120);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.15);
  }
}
