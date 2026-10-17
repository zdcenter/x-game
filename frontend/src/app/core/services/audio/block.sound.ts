import { createOsc, createGain, createNoise, createLpf, createBpf } from './audio-utils';

export function playBlockSound(audioCtx: AudioContext, out: AudioNode, name: 'place' | 'clear' | 'error', combo: number = 0) {
  const t = audioCtx.currentTime;

  if (name === 'place') {
    // 坚实清脆的方块落入槽位音效
    const n = createNoise(audioCtx, 0.1);
    const lp = createLpf(audioCtx, 650);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.09);

    const o = createOsc(audioCtx, 'sine', 160);
    const og = createGain(audioCtx, 0.2);
    og.gain.setValueAtTime(0.2, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.09);
  } else if (name === 'clear') {
    // 爽快利落消除音：冲击噪声 + 上扬音阶琶音 + 连击音调提升
    const pitchFactor = 1 + Math.min(Math.max(0, combo - 1), 7) * 0.07;

    // 冲击高频打击感
    const n = createNoise(audioCtx, 0.35);
    const bp = createBpf(audioCtx, 1600 * pitchFactor, 3.0);
    const ng = createGain(audioCtx, 0);
    ng.gain.setValueAtTime(0.85, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.15);

    // 上扬清脆琶音（快速扫过，极具穿透力）
    const baseFreqs = [523, 659, 784, 1047, 1319];
    baseFreqs.forEach((freq, i) => {
      const o = createOsc(audioCtx, 'triangle', freq * pitchFactor);
      const og = createGain(audioCtx, 0);
      const dt = t + i * 0.035; // 压缩间隔，更清脆迅速
      og.gain.setValueAtTime(0.25, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + 0.18);
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + 0.2);
    });

    // 饱满共鸣低音
    const bass = createOsc(audioCtx, 'sine', 100 * Math.min(pitchFactor, 1.2));
    const bg = createGain(audioCtx, 0);
    bg.gain.setValueAtTime(0.3, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    bass.connect(bg); bg.connect(out);
    bass.start(t); bass.stop(t + 0.18);
  } else if (name === 'error') {
    const o = createOsc(audioCtx, 'sawtooth', 120);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.15);
  }
}
