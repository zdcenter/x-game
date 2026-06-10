import { createOsc, createGain, createNoise, createLpf, createHpf } from './audio-utils';

export function playMinesweeperSound(audioCtx: AudioContext, out: AudioNode, name: 'dig' | 'flag' | 'explosion' | 'win') {
  const t = audioCtx.currentTime;

  if (name === 'dig') {
    const o = createOsc(audioCtx, 'sine', 900);
    const g = createGain(audioCtx, 0.25);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.1);
  } else if (name === 'flag') {
    const o1 = createOsc(audioCtx, 'triangle', 600);
    const o2 = createOsc(audioCtx, 'triangle', 400);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o1.connect(g); o2.connect(g); g.connect(out);
    o1.start(t); o1.stop(t + 0.15);
    o2.start(t + 0.06); o2.stop(t + 0.18);
  } else if (name === 'explosion') {
    // 主爆炸：低通白噪声
    const n = createNoise(audioCtx, 1.2);
    const lp = createLpf(audioCtx, 800);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 1.2);

    // 次低频：冲击波
    const sub = createOsc(audioCtx, 'sine', 60);
    const sg = createGain(audioCtx, 0);
    sg.gain.setValueAtTime(0.8, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    sub.connect(sg); sg.connect(out);
    sub.start(t); sub.stop(t + 0.5);

    // 高频碎裂
    const crack = createNoise(audioCtx, 0.15);
    const hpf = createHpf(audioCtx, 2000);
    const cg = createGain(audioCtx, 0.7);
    crack.connect(hpf); hpf.connect(cg); cg.connect(out);
    crack.start(t); crack.stop(t + 0.15);
  } else if (name === 'win') {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.1;
      g.gain.setValueAtTime(0, dt);
      g.gain.linearRampToValueAtTime(0.28, dt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.4);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.45);
    });
  }
}
