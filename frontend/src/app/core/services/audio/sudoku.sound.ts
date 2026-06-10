import { createOsc, createGain, createNoise, createHpf } from './audio-utils';

export function playSudokuSound(audioCtx: AudioContext, out: AudioNode, name: 'input' | 'clear' | 'success' | 'error') {
  const t = audioCtx.currentTime;

  if (name === 'input') {
    // 落笔的“嗒”声
    const o = createOsc(audioCtx, 'triangle', 600);
    const g = createGain(audioCtx, 0.1);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.06);
  } else if (name === 'clear') {
    // 橡皮擦声，高频摩擦声
    const n = createNoise(audioCtx, 0.1);
    const hpf = createHpf(audioCtx, 4000);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.08);
    n.connect(hpf); hpf.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.1);
  } else if (name === 'success') {
    // 填对一行的奖励音
    [659, 880, 1047].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.06;
      g.gain.setValueAtTime(0.15, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.2);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.25);
    });
  } else if (name === 'error') {
    // 填错的短促警报
    const o = createOsc(audioCtx, 'sawtooth', 200);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.2);
  }
}
