import { createOsc, createGain, createNoise, createBpf } from './audio-utils';

export function playWaterSortSound(audioCtx: AudioContext, out: AudioNode, name: 'clink' | 'pour' | 'bottle_full') {
  const t = audioCtx.currentTime;

  if (name === 'clink') {
    // 类似于 pipeConnect
    const notes = [523, 659, 784];
    const delays = [0, 0.12, 0.22];
    notes.forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sine', freq);
      const g = createGain(audioCtx, 0);
      const dt = t + delays[i];
      g.gain.setValueAtTime(0, dt);
      g.gain.linearRampToValueAtTime(0.3, dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.35);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.4);
    });
  } else if (name === 'pour') {
    // waterFill / waterFlow
    const dur = 0.5; // Shortened for pouring a little bit
    const n = createNoise(audioCtx, dur);
    const f = createBpf(audioCtx, 400, 0.7);
    f.frequency.setValueAtTime(400, t);
    f.frequency.linearRampToValueAtTime(1400, t + dur - 0.1);

    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + dur);

    n.connect(f); f.connect(g); g.connect(out);
    n.start(t); n.stop(t + dur);

    // 气泡
    for (let i = 0; i < 3; i++) {
      const bo = createOsc(audioCtx, 'sine', 300 + i * 80);
      const bg = createGain(audioCtx, 0);
      const bt = t + i * 0.15 + 0.1;
      bg.gain.setValueAtTime(0, bt);
      bg.gain.linearRampToValueAtTime(0.12, bt + 0.04);
      bg.gain.exponentialRampToValueAtTime(0.001, bt + 0.18);
      bo.connect(bg); bg.connect(out);
      bo.start(bt); bo.stop(bt + 0.2);
    }
  } else if (name === 'bottle_full') {
    // uiSuccess logic / pipeConnect
    [[523, 659, 784], [659, 784, 1047]].forEach((chord, i) => {
      chord.forEach(freq => {
        const o = createOsc(audioCtx, 'sine', freq);
        const g = createGain(audioCtx, 0);
        const dt = t + i * 0.18;
        g.gain.setValueAtTime(0.15, dt);
        g.gain.exponentialRampToValueAtTime(0.001, dt + 0.5);
        o.connect(g); g.connect(out);
        o.start(dt); o.stop(dt + 0.55);
      });
    });
  }
}
