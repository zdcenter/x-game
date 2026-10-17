import { createOsc, createGain, createNoise, createLpf, createBpf } from './audio-utils';

export function playBlockSound(audioCtx: AudioContext, out: AudioNode, name: 'place' | 'clear' | 'error', combo: number = 0) {
  const t = audioCtx.currentTime;

  if (name === 'place') {
    // 晶莹微晶落子：极其清脆解压的微点击瞬态 + 短促温润落槽声
    // 1. 瞬态高频微敲击 (0.03s)
    const n = createNoise(audioCtx, 0.05);
    const bp = createBpf(audioCtx, 2200, 4.0);
    const ng = createGain(audioCtx, 0);
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.04);

    // 2. 温润宝石下沉微共振 (0.08s)
    const o = createOsc(audioCtx, 'sine', 240);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.07);
    const og = createGain(audioCtx, 0);
    og.gain.setValueAtTime(0.3, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.08);

  } else if (name === 'clear') {
    // 💥 殿堂级爆炸消融音效：超重低音轰鸣 (Sub Impact) + 水晶爆裂 (Crystal Shatter) + 繁星琶音 (Stardust Arpeggio)
    const pitchFactor = 1 + Math.min(Math.max(0, combo - 1), 8) * 0.09;

    // A. 超重低音能量轰鸣 (Sub-bass Shockwave): 营造真实爆炸力量
    const sub = createOsc(audioCtx, 'sine', 95 * Math.min(pitchFactor, 1.15));
    sub.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const subGain = createGain(audioCtx, 0);
    subGain.gain.setValueAtTime(0.45, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    sub.connect(subGain); subGain.connect(out);
    sub.start(t); sub.stop(t + 0.25);

    // B. 水晶爆碎 (Crystal Shatter Noise): 模拟千万碎钻瞬间爆开的脆感
    const noise = createNoise(audioCtx, 0.22);
    const bpNoise = createBpf(audioCtx, 2600 * pitchFactor, 2.5);
    const noiseGain = createGain(audioCtx, 0);
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    noise.connect(bpNoise); bpNoise.connect(noiseGain); noiseGain.connect(out);
    noise.start(t); noise.stop(t + 0.18);

    // C. 晶莹上扬琶音 (Stardust Chimes): 快速水滴般飞掠
    const chord = [587.33, 739.99, 880.00, 1174.66, 1479.98]; // D大调纯净光芒音阶
    chord.forEach((freq, idx) => {
      const chime = createOsc(audioCtx, 'triangle', freq * pitchFactor);
      const chimeGain = createGain(audioCtx, 0);
      const noteTime = t + idx * 0.026;
      chimeGain.gain.setValueAtTime(0.26, noteTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);
      chime.connect(chimeGain); chimeGain.connect(out);
      chime.start(noteTime); chime.stop(noteTime + 0.2);
    });

    // D. 高连击专属金属微鸣 (Combo Zing! 2连击及以上激活)
    if (combo >= 2) {
      const zing = createOsc(audioCtx, 'sine', 1975.53 * pitchFactor); // 高音B6
      const zingGain = createGain(audioCtx, 0);
      zingGain.gain.setValueAtTime(0.22, t + 0.05);
      zingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      zing.connect(zingGain); zingGain.connect(out);
      zing.start(t + 0.05); zing.stop(t + 0.36);
    }

  } else if (name === 'error') {
    const o = createOsc(audioCtx, 'sawtooth', 120);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.15);
  }
}
