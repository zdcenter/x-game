import { createOsc, createGain, createNoise, createHpf, createLpf } from './audio-utils';

export function playIdiomSound(
  audioCtx: AudioContext,
  out: AudioNode,
  name: 'fill' | 'erase' | 'correct' | 'wrong' | 'mastered' | 'correcting_done' | 'next'
) {
  const t = audioCtx.currentTime;

  if (name === 'fill') {
    // 填入一个字 —— 轻脆的笔落声
    const o = createOsc(audioCtx, 'triangle', 900);
    const g = createGain(audioCtx, 0.12);
    o.frequency.linearRampToValueAtTime(700, t + 0.04);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.07);

  } else if (name === 'erase') {
    // 擦除字 —— 短促高频摩擦
    const n = createNoise(audioCtx, 0.08);
    const hpf = createHpf(audioCtx, 5000);
    const g = createGain(audioCtx, 0.15);
    g.gain.setValueAtTime(0.15, t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.07);
    n.connect(hpf); hpf.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.08);

  } else if (name === 'correct') {
    // 答对 —— 三音上扬，清脆悦耳（宫商角）
    [523, 659, 784].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.09;
      g.gain.setValueAtTime(0.2, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.28);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.32);
    });

  } else if (name === 'wrong') {
    // 答错 —— 低沉下行两音，不刺耳
    [280, 210].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'triangle', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.14;
      g.gain.setValueAtTime(0.18, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.2);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.25);
    });

  } else if (name === 'mastered') {
    // 已掌握 —— 五音小号式上扬，庆祝感强
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.07;
      g.gain.setValueAtTime(0.22, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.35);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.4);
    });
    // 加一层低频底鼓增厚感
    const kick = createOsc(audioCtx, 'sine', 80);
    const kg = createGain(audioCtx, 0.3);
    kick.frequency.exponentialRampToValueAtTime(30, t + 0.1);
    kg.gain.setValueAtTime(0.3, t);
    kg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    kick.connect(kg); kg.connect(out);
    kick.start(t); kick.stop(t + 0.15);

  } else if (name === 'correcting_done') {
    // 订正完成 —— 轻柔两音，鼓励而非庆祝
    [659, 880].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.1;
      g.gain.setValueAtTime(0.16, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.25);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.3);
    });

  } else if (name === 'next') {
    // 切换下一题 —— 纸张翻动的沙沙声
    const n = createNoise(audioCtx, 0.12);
    const lpf = createLpf(audioCtx, 2000);
    const g = createGain(audioCtx, 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.1);
    n.connect(lpf); lpf.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.12);
  }
}
