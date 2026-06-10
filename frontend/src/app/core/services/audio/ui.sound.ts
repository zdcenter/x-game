import { createOsc, createGain, createLpf } from './audio-utils';

export function playUISound(audioCtx: AudioContext, out: AudioNode, name: 'click' | 'victory' | 'gameover' | 'error' | 'countdown') {
  const t = audioCtx.currentTime;

  if (name === 'click') {
    const o = createOsc(audioCtx, 'sine', 1000);
    const g = createGain(audioCtx, 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.08);
  } else if (name === 'victory') {
    [[523, 659, 784], [659, 784, 1047]].forEach((chord, i) => {
      chord.forEach(freq => {
        const o = createOsc(audioCtx, 'sine', freq);
        const g = createGain(audioCtx, 0);
        const dt = t + i * 0.18;
        g.gain.setValueAtTime(0.15, dt);
        g.gain.exponentialRampToValueAtTime(0.001, dt + 0.5);
        o.connect(g); g.connect(out);
        o.start(dt); o.stop(dt + 0.55);
      });
    });
  } else if (name === 'gameover') {
    [300, 240].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sawtooth', freq);
      const lp = createLpf(audioCtx, 600);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.15;
      g.gain.setValueAtTime(0.25, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.14);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.16);
    });
  } else if (name === 'error') {
    const o = createOsc(audioCtx, 'sawtooth', 150);
    const lp = createLpf(audioCtx, 500);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.15);
  } else if (name === 'countdown') {
    const o = createOsc(audioCtx, 'sine', 880);
    const g = createGain(audioCtx, 0.22);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.08);
  }
}
