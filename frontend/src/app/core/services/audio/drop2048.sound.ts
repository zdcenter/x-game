import { createOsc, createGain, createNoise, createLpf } from './audio-utils';

export function playDrop2048Sound(audioCtx: AudioContext, out: AudioNode, name: 'move' | 'drop' | 'merge', combo: number = 0) {
  const t = audioCtx.currentTime;

  if (name === 'move') {
    // 轻微的左右移动声
    const o = createOsc(audioCtx, 'square', 300);
    const g = createGain(audioCtx, 0.1);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.06);
  } else if (name === 'drop') {
    // 方块落地的撞击声
    const n = createNoise(audioCtx, 0.15);
    const lp = createLpf(audioCtx, 300);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.15);

    const o = createOsc(audioCtx, 'sine', 100);
    const og = createGain(audioCtx, 0.2);
    og.gain.setValueAtTime(0.2, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.12);
  } else if (name === 'merge') {
    // 合并的“啵”声，随着 combo（连击次数）音高逐渐升高
    const baseFreq = 440;
    // 每个 combo 升高 2 个半音（全音）
    const freq = baseFreq * Math.pow(1.059463, combo * 2);
    
    const o = createOsc(audioCtx, 'sine', freq);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.25);
    
    // 如果 combo 比较高（>= 2），加上高频“闪音”
    if (combo >= 2) {
      const sparkle = createOsc(audioCtx, 'sine', freq * 2);
      const sg = createGain(audioCtx, 0);
      sg.gain.setValueAtTime(0, t + 0.05);
      sg.gain.linearRampToValueAtTime(0.15, t + 0.07);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      sparkle.connect(sg); sg.connect(out);
      sparkle.start(t + 0.05); sparkle.stop(t + 0.2);
    }
  }
}
