import { createOsc, createGain, createNoise, createBpf } from './audio-utils';

export type TileMatchSoundType = 'select' | 'match' | 'blocked' | 'slot_full' | 'powerup';

export function playTileMatchSound(
  audioCtx: AudioContext,
  out: AudioNode,
  name: TileMatchSoundType,
  combo: number = 0
) {
  const t = Math.max(audioCtx.currentTime, 0.001) + 0.003;

  if (name === 'select') {
    // 🀄 卡牌飞入卡槽：清脆灵动水润入槽声
    const o = createOsc(audioCtx, 'sine', 680);
    o.frequency.setValueAtTime(680, t);
    o.frequency.exponentialRampToValueAtTime(1040, t + 0.045);
    const g = createGain(audioCtx, 0.22);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.055);

  } else if (name === 'match') {
    // 💥 3张同类爆裂多巴胺消除：水晶爆裂 + 连击音阶升调琶音
    const pitchFactor = 1 + Math.min(Math.max(0, combo - 1), 7) * 0.12;

    // 1. 水晶碎裂微爆音
    const n = createNoise(audioCtx, 0.14);
    const bp = createBpf(audioCtx, 2800 * pitchFactor, 2.8);
    const ng = createGain(audioCtx, 0.5);
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.14);

    // 2. 清亮大三和弦琶音 (Do - Mi - Sol - Do!)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const o = createOsc(audioCtx, 'triangle', freq * pitchFactor);
      const g = createGain(audioCtx, 0);
      const startT = t + idx * 0.028;
      g.gain.setValueAtTime(0, startT);
      g.gain.linearRampToValueAtTime(0.28, startT + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, startT + 0.22);
      o.connect(g); g.connect(out);
      o.start(startT); o.stop(startT + 0.25);
    });

    // 3. 高连击专属高频空灵微鸣
    if (combo >= 2) {
      const zing = createOsc(audioCtx, 'sine', 2093.00 * pitchFactor); // C7
      const zg = createGain(audioCtx, 0.2);
      zg.gain.setValueAtTime(0.2, t + 0.06);
      zg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      zing.connect(zg); zg.connect(out);
      zing.start(t + 0.06); zing.stop(t + 0.36);
    }

  } else if (name === 'blocked') {
    // 阻挡提示：低沉受阻咚声
    const o = createOsc(audioCtx, 'sine', 220);
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    const g = createGain(audioCtx, 0.16);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.1);

  } else if (name === 'slot_full') {
    // 槽位已满警报：双重顿音
    [180, 140].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'triangle', freq);
      const g = createGain(audioCtx, 0.25);
      const startT = t + i * 0.08;
      g.gain.setValueAtTime(0.25, startT);
      g.gain.exponentialRampToValueAtTime(0.001, startT + 0.12);
      o.connect(g); g.connect(out);
      o.start(startT); o.stop(startT + 0.14);
    });

  } else if (name === 'powerup') {
    // 仙术道具释放：魔幻上升音
    [440, 554.37, 659.25, 880, 1108.73].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const startT = t + i * 0.035;
      g.gain.setValueAtTime(0, startT);
      g.gain.linearRampToValueAtTime(0.22, startT + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, startT + 0.18);
      o.connect(g); g.connect(out);
      o.start(startT); o.stop(startT + 0.2);
    });
  }
}
