import { createOsc, createGain, createNoise, createLpf } from './audio-utils';

export function playGomokuSound(audioCtx: AudioContext, out: AudioNode, name: 'stoneDrop' | 'stoneWin') {
  // Use safety lookahead buffer of 5ms to guarantee parameter schedules are never in the past
  const t = audioCtx.currentTime + 0.005;

  if (name === 'stoneDrop') {
    // 【五子棋】落子 —— 真实木质/云子碰撞共鸣感
    // 原理：低通白噪声（落子敲击音）+ 双低频正弦（棋盘木质箱体共鸣）
    const n = createNoise(audioCtx, 0.12);
    const lp = createLpf(audioCtx, 1400);
    const g = createGain(audioCtx, 0.6);
    g.gain.setValueAtTime(0.6, t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.09);
    n.connect(lp); lp.connect(g); g.connect(out);
    n.start(t); n.stop(t + 0.12);

    const o = createOsc(audioCtx, 'sine', 300);
    const og = createGain(audioCtx, 0.35);
    og.gain.setValueAtTime(0.35, t);
    og.gain.linearRampToValueAtTime(0.001, t + 0.12);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.14);
  } else if (name === 'stoneWin') {
    // 【五子棋】五子连珠获胜 —— 上升明快和弦连奏
    const chords = [
      [262, 330, 392],
      [294, 370, 440],
      [330, 415, 494],
      [349, 440, 523],
    ];
    chords.forEach((chord, i) => {
      chord.forEach(freq => {
        const o = createOsc(audioCtx, 'sine', freq);
        const g = createGain(audioCtx, 0.18);
        const dt = t + i * 0.1;
        g.gain.setValueAtTime(0.18, dt);
        g.gain.linearRampToValueAtTime(0.001, dt + 0.4);
        o.connect(g); g.connect(out);
        o.start(dt); o.stop(dt + 0.45);
      });
    });
  }
}
