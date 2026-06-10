import { createOsc, createGain, createNoise, createLpf } from './audio-utils';

export function playGomokuSound(audioCtx: AudioContext, out: AudioNode, name: 'stoneDrop' | 'stoneWin') {
  const t = audioCtx.currentTime;

  if (name === 'stoneDrop') {
    // 【五子棋】落子 —— 木质碰撞感
    // 原理：低通白噪声（碰撞噪声）+ 低频正弦（共鸣）
    const n = createNoise(audioCtx, 0.15);
    const lp = createLpf(audioCtx, 1200);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.15);

    const o = createOsc(audioCtx, 'sine', 280);
    const og = createGain(audioCtx, 0.25);
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.18);
  } else if (name === 'stoneWin') {
    // 【五子棋】五子连珠获胜 —— 上升和弦连奏
    const chords = [
      [262, 330, 392],
      [294, 370, 440],
      [330, 415, 494],
      [349, 440, 523],
    ];
    chords.forEach((chord, i) => {
      chord.forEach(freq => {
        const o = createOsc(audioCtx, 'sine', freq);
        const g = createGain(audioCtx, 0);
        const dt = t + i * 0.1;
        g.gain.setValueAtTime(0.18, dt);
        g.gain.exponentialRampToValueAtTime(0.001, dt + 0.4);
        o.connect(g); g.connect(out);
        o.start(dt); o.stop(dt + 0.45);
      });
    });
  }
}
