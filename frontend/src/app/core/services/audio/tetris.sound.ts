import { createOsc, createGain, createNoise, createLpf, createBpf } from './audio-utils';

export function playTetrisSound(
  audioCtx: AudioContext,
  out: AudioNode,
  name: 'move' | 'rotate' | 'land' | 'clear' | 'hold' | 'hardDrop' | 'tetris' | 'dissolve' | 'attack' | 'garbage' | 'counter' | 'warning',
  linesCount = 1,
  combo = 0
) {
  const t = audioCtx.currentTime;

  if (name === 'warning') {
    // 敌袭预警提示 —— 清晰急促的战术警报双音 (880Hz -> 1175Hz)
    [880, 1174.66].forEach((freq, idx) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const og = createGain(audioCtx, 0.22);
      const dt = t + idx * 0.08;
      og.gain.setValueAtTime(0.22, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + 0.12);
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + 0.14);
    });
    return;
  }

  if (name === 'attack') {
    // 进攻攻击波 —— 锐利激光穿透 + 低音冲击飞掷
    const o = createOsc(audioCtx, 'sawtooth', 880);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.22);
    const g = createGain(audioCtx, 0.35);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.26);

    const sub = createOsc(audioCtx, 'sine', 150);
    sub.frequency.exponentialRampToValueAtTime(45, t + 0.2);
    const sg = createGain(audioCtx, 0.4);
    sg.gain.setValueAtTime(0.4, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    sub.connect(sg); sg.connect(out);
    sub.start(t); sub.stop(t + 0.24);
    return;
  }

  if (name === 'counter') {
    // 护盾格挡反制 —— 高频双金属撞击与清脆格挡消散
    [1046.5, 1567.98, 2093.0].forEach((freq, idx) => {
      const o = createOsc(audioCtx, 'triangle', freq);
      const og = createGain(audioCtx, 0.25);
      const dt = t + idx * 0.03;
      og.gain.setValueAtTime(0.25, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + 0.25);
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + 0.28);
    });
    return;
  }

  if (name === 'garbage') {
    // 垃圾行升起 —— 沉重机械齿轮推进与地壳抬升低频震颤
    const n = createNoise(audioCtx, 0.3);
    const lp = createLpf(audioCtx, 280);
    const ng = createGain(audioCtx, 0.5);
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    n.connect(lp); lp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.32);

    const sub = createOsc(audioCtx, 'sine', 75);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    const sg = createGain(audioCtx, 0.55);
    sg.gain.setValueAtTime(0.55, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    sub.connect(sg); sg.connect(out);
    sub.start(t); sub.stop(t + 0.4);
    return;
  }

  if (name === 'dissolve') {
    // 复活消融 —— 高能激光扫掠 + 粒子升华空灵向上泛音
    const n = createNoise(audioCtx, 0.35);
    const bp = createBpf(audioCtx, 1200, 3);
    bp.frequency.exponentialRampToValueAtTime(3600, t + 0.45);
    const g = createGain(audioCtx, 0.4);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    n.connect(bp); bp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.52);

    // 两个晶莹正弦波升调，带来治愈消融重生的质感
    [440, 660, 880, 1320].forEach((freq, idx) => {
      const o = createOsc(audioCtx, 'sine', freq);
      o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.4 + idx * 0.04);
      const og = createGain(audioCtx, 0);
      const dt = t + idx * 0.06;
      og.gain.setValueAtTime(0.18, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + 0.35);
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + 0.38);
    });
    return;
  }

  if (name === 'move') {
    // 左右移动 —— 极短清脆微滴答
    const o = createOsc(audioCtx, 'triangle', 280);
    const g = createGain(audioCtx, 0.12);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.06);
  } else if (name === 'rotate') {
    // 旋转 —— 双音快速微滑音
    const o = createOsc(audioCtx, 'sine', 480);
    o.frequency.exponentialRampToValueAtTime(720, t + 0.08);
    const g = createGain(audioCtx, 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.11);
  } else if (name === 'hold') {
    // 暂存换块 —— 轻快变幻滑音
    const o = createOsc(audioCtx, 'sine', 650);
    o.frequency.exponentialRampToValueAtTime(980, t + 0.12);
    const g = createGain(audioCtx, 0.2);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.16);
  } else if (name === 'land') {
    // 方块慢降落地 —— 低频冲击
    const n = createNoise(audioCtx, 0.15);
    const lp = createLpf(audioCtx, 360);
    const g = createGain(audioCtx, 0.35);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.14);

    const o = createOsc(audioCtx, 'sine', 110);
    const og = createGain(audioCtx, 0.25);
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.1);
  } else if (name === 'hardDrop') {
    // 硬降 —— 厚重机械重击 + 低音轰鸣
    const sub = createOsc(audioCtx, 'sine', 55);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.18);
    const sg = createGain(audioCtx, 0.45);
    sg.gain.setValueAtTime(0.45, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    sub.connect(sg); sg.connect(out);
    sub.start(t); sub.stop(t + 0.22);

    const n = createNoise(audioCtx, 0.25);
    const lp = createLpf(audioCtx, 550);
    const ng = createGain(audioCtx, 0.4);
    ng.gain.setValueAtTime(0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n.connect(lp); lp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.16);
  } else if (name === 'clear' || name === 'tetris') {
    const isTetris = linesCount >= 4 || name === 'tetris';
    
    // 冲击波低频
    const subFreq = isTetris ? 42 : 65;
    const subOsc = createOsc(audioCtx, 'sine', subFreq);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.3);
    const subGain = createGain(audioCtx, isTetris ? 0.6 : 0.35);
    subGain.gain.setValueAtTime(isTetris ? 0.6 : 0.35, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    subOsc.connect(subGain); subGain.connect(out);
    subOsc.start(t); subOsc.stop(t + 0.36);

    // 水晶碎裂噪声扫
    const n = createNoise(audioCtx, isTetris ? 0.4 : 0.25);
    const bp = createBpf(audioCtx, isTetris ? 2600 : 2000, 2.5);
    const g = createGain(audioCtx, isTetris ? 0.5 : 0.35);
    g.gain.setValueAtTime(isTetris ? 0.5 : 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isTetris ? 0.35 : 0.22));
    n.connect(bp); bp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.38);

    // 递进和弦序列
    const baseFreqs = isTetris 
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51] // C-E-G-C-E 华丽大调
      : linesCount === 3
      ? [587.33, 739.99, 880.00, 1174.66]          // D-F#-A-D 辉煌和弦
      : linesCount === 2
      ? [659.25, 830.61, 987.77]                   // E-G#-B 双行清脆
      : [783.99, 987.77];                          // G-B 单行明亮

    const comboPitchFactor = 1 + Math.min(combo * 0.05, 0.4);

    baseFreqs.forEach((freq, i) => {
      const o = createOsc(audioCtx, isTetris ? 'triangle' : 'sine', freq * comboPitchFactor);
      const og = createGain(audioCtx, 0);
      const dt = t + i * 0.05;
      const vol = isTetris ? 0.24 : 0.18;
      og.gain.setValueAtTime(vol, dt);
      og.gain.exponentialRampToValueAtTime(0.001, dt + (isTetris ? 0.35 : 0.2));
      o.connect(og); og.connect(out);
      o.start(dt); o.stop(dt + (isTetris ? 0.4 : 0.25));
    });
  }
}
