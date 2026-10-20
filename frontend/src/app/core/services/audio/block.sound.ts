import { createOsc, createGain, createNoise, createLpf, createBpf } from './audio-utils';

export type BlockSoundType = 'place' | 'clear' | 'error' | 'pickup' | 'gameover';

export function playBlockSound(audioCtx: AudioContext, out: AudioNode, name: BlockSoundType, combo: number = 0) {
  const t = Math.max(audioCtx.currentTime, 0.001) + 0.003;

  if (name === 'pickup') {
    // 轻轻拾起方块：晶润微脆微弹音 (0.04s)
    const o = createOsc(audioCtx, 'sine', 520);
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(780, t + 0.035);
    const g = createGain(audioCtx, 0.15);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.045);

  } else if (name === 'place') {
    // 晶莹微晶落子：极其清脆解压的微点击瞬态 + 短促温润落槽声
    // 1. 瞬态高频微敲击 (0.03s)
    const n = createNoise(audioCtx, 0.05);
    const bp = createBpf(audioCtx, 2200, 4.0);
    const ng = createGain(audioCtx, 0.35);
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.04);

    // 2. 温润宝石下沉微共振 (0.08s)
    const o = createOsc(audioCtx, 'sine', 240);
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.07);
    const og = createGain(audioCtx, 0.3);
    og.gain.setValueAtTime(0.3, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.08);

  } else if (name === 'clear') {
    // 💥 殿堂级爆炸消融音效：超重低音轰鸣 (Sub Impact) + 水晶爆裂 (Crystal Shatter) + 繁星琶音 (Stardust Arpeggio)
    const pitchFactor = 1 + Math.min(Math.max(0, combo - 1), 8) * 0.09;

    // A. 超重低音能量轰鸣 (Sub-bass Shockwave): 营造真实爆炸力量
    const sub = createOsc(audioCtx, 'sine', 95 * Math.min(pitchFactor, 1.15));
    sub.frequency.setValueAtTime(95 * Math.min(pitchFactor, 1.15), t);
    sub.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const subGain = createGain(audioCtx, 0.45);
    subGain.gain.setValueAtTime(0.45, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    sub.connect(subGain); subGain.connect(out);
    sub.start(t); sub.stop(t + 0.25);

    // B. 水晶爆碎 (Crystal Shatter Noise): 模拟千万碎钻瞬间爆开的脆感
    const noise = createNoise(audioCtx, 0.22);
    const bpNoise = createBpf(audioCtx, 2600 * pitchFactor, 2.5);
    const noiseGain = createGain(audioCtx, 0.7);
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    noise.connect(bpNoise); bpNoise.connect(noiseGain); noiseGain.connect(out);
    noise.start(t); noise.stop(t + 0.18);

    // C. 晶莹上扬琶音 (Stardust Chimes): 快速水滴般飞掠
    const chord = [587.33, 739.99, 880.00, 1174.66, 1479.98]; // D大调纯净光芒音阶
    chord.forEach((freq, idx) => {
      const chime = createOsc(audioCtx, 'triangle', freq * pitchFactor);
      chime.frequency.setValueAtTime(freq * pitchFactor, t);
      const chimeGain = createGain(audioCtx, 0.26);
      const noteTime = t + idx * 0.026;
      chimeGain.gain.setValueAtTime(0.26, noteTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);
      chime.connect(chimeGain); chimeGain.connect(out);
      chime.start(noteTime); chime.stop(noteTime + 0.2);
    });

    // D. 高连击专属金属微鸣 (Combo Zing! 2连击及以上激活)
    if (combo >= 2) {
      const zing = createOsc(audioCtx, 'sine', 1975.53 * pitchFactor); // 高音B6
      zing.frequency.setValueAtTime(1975.53 * pitchFactor, t);
      const zingGain = createGain(audioCtx, 0.22);
      zingGain.gain.setValueAtTime(0.22, t + 0.05);
      zingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      zing.connect(zingGain); zingGain.connect(out);
      zing.start(t + 0.05); zing.stop(t + 0.36);
    }

  } else if (name === 'error') {
    // 放置回弹/无效位：柔和低音回弹提示
    const o = createOsc(audioCtx, 'triangle', 200);
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.1);
    const g = createGain(audioCtx, 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.12);

  } else if (name === 'gameover') {
    // 无子可下终局：幽雅下行三连音
    const notes = [440, 370, 293.66]; // A4 -> F#4 -> D4
    notes.forEach((freq, idx) => {
      const o = createOsc(audioCtx, 'sine', freq);
      o.frequency.setValueAtTime(freq, t);
      const g = createGain(audioCtx, 0.22);
      const noteTime = t + idx * 0.14;
      g.gain.setValueAtTime(0.22, noteTime);
      g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);
      o.connect(g); g.connect(out);
      o.start(noteTime); o.stop(noteTime + 0.3);
    });
  }
}
