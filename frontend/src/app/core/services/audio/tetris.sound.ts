import { createOsc, createGain, createNoise, createLpf, createBpf } from './audio-utils';

export function playTetrisSound(audioCtx: AudioContext, out: AudioNode, name: 'move' | 'rotate' | 'land' | 'clear') {
  const t = audioCtx.currentTime;

  if (name === 'move') {
    // 方块左右移动 —— 极短方波点击
    const o = createOsc(audioCtx, 'square', 220);
    const g = createGain(audioCtx, 0.15);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.07);
  } else if (name === 'rotate') {
    // 方块旋转 —— 音调快速上扬
    const o = createOsc(audioCtx, 'sine', 440);
    o.frequency.linearRampToValueAtTime(660, t + 0.08);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.14);
  } else if (name === 'land') {
    // 方块落地 —— 低频冲击 + 噪声
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
  } else if (name === 'clear') {
    // 消行 —— 高频噪声扫 + 上升和弦
    const n = createNoise(audioCtx, 0.3);
    const bp = createBpf(audioCtx, 2000, 2);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    n.connect(bp); bp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.3);

    [523, 659, 784].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const og = createGain(audioCtx, 0);
      const dt = t + i * 0.07;
      og.gain.setValueAtTime(0.22, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + 0.2);
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + 0.25);
    });
  }
}
