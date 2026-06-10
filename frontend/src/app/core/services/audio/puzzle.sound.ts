import { createOsc, createGain, createNoise, createLpf, createHpf } from './audio-utils';

export function playPuzzleSound(audioCtx: AudioContext, out: AudioNode, name: 'move' | 'toggle' | 'guess' | 'success' | 'error') {
  const t = audioCtx.currentTime;

  if (name === 'move') {
    // 华容道滑块摩擦声
    const n = createNoise(audioCtx, 0.1);
    const lpf = createLpf(audioCtx, 800);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    n.connect(lpf); lpf.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.12);
  } else if (name === 'toggle') {
    // 点灯/开关点击声
    const o = createOsc(audioCtx, 'square', 400);
    const g = createGain(audioCtx, 0.1);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.06);
  } else if (name === 'guess') {
    // 猜密码的转动/确认声
    const o = createOsc(audioCtx, 'sine', 800);
    const g = createGain(audioCtx, 0.15);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.1);
  } else if (name === 'success') {
    // 解谜成功/猜对
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'triangle', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.05;
      g.gain.setValueAtTime(0.2, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.3);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.35);
    });
  } else if (name === 'error') {
    // 猜错/失败
    const o = createOsc(audioCtx, 'sawtooth', 180);
    const g = createGain(audioCtx, 0.25);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.3);
  }
}
