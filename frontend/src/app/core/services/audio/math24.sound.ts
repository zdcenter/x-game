import { createOsc, createGain, createNoise, createHpf } from './audio-utils';

export function playMath24Sound(audioCtx: AudioContext, out: AudioNode, name: 'flip' | 'correct' | 'error') {
  const t = audioCtx.currentTime;

  if (name === 'flip') {
    // 翻牌声 —— 纸牌摩擦声
    const n = createNoise(audioCtx, 0.12);
    const hpf = createHpf(audioCtx, 3000);
    const g = createGain(audioCtx, 0.4);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    n.connect(hpf); hpf.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.12);
  } else if (name === 'correct') {
    // 24点答对 —— 五音上升音阶
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.08;
      g.gain.setValueAtTime(0.22, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.3);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.35);
    });
  } else if (name === 'error') {
    // 答错声音
    const o = createOsc(audioCtx, 'sawtooth', 150);
    const g = createGain(audioCtx, 0.3);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.3);
  }
}
