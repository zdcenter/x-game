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
    // 爽快消除音：冲击噪声 + 上扬琶音 + 低频共鸣
    // 冲击噪声
    const n = createNoise(audioCtx, 0.5);
    const bp = createBpf(audioCtx, 1400, 2.5);
    const ng = createGain(audioCtx, 0);
    ng.gain.setValueAtTime(0.9, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.2);

    // 上扬琶音（五声音阶风格）
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'triangle', freq);
      const og = createGain(audioCtx, 0);
      const dt = t + i * 0.055;
      og.gain.setValueAtTime(0.22, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + 0.28);
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + 0.3);
    });

    // 低频共鸣增加厚重感
    const bass = createOsc(audioCtx, 'sine', 90);
    const bg = createGain(audioCtx, 0);
    bg.gain.setValueAtTime(0.35, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    bass.connect(bg); bg.connect(out);
    bass.start(t); bass.stop(t + 0.24);
  } else if (name === 'error') {
    const o = createOsc(audioCtx, 'sawtooth', 120);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.15);
  }
}
