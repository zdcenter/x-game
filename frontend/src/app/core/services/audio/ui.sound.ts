import { createOsc, createGain, createLpf } from './audio-utils';

export function playUISound(audioCtx: AudioContext, out: AudioNode, name: 'click' | 'victory' | 'gameover' | 'error' | 'countdown') {
  const t = audioCtx.currentTime;

  if (name === 'click') {
    const o = createOsc(audioCtx, 'sine', 1000);
    const g = createGain(audioCtx, 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.08);
  } else if (name === 'victory') {
    // Satisfying ascending magical fanfare (C major arpeggio)
    const notes = [
      { f: 392, t: 0.0 },  // G4
      { f: 523, t: 0.1 },  // C5
      { f: 659, t: 0.2 },  // E5
      { f: 784, t: 0.3 },  // G5
      { f: 1046, t: 0.45 } // C6 (sustained)
    ];

    notes.forEach((note, i) => {
      // Mix triangle and sine for a richer "bell/synth" tone
      const o1 = createOsc(audioCtx, 'triangle', note.f);
      const o2 = createOsc(audioCtx, 'sine', note.f * 1.005); // slight detune
      const g = createGain(audioCtx, 0);
      
      const dt = t + note.t;
      const isLast = i === notes.length - 1;
      
      g.gain.setValueAtTime(0, dt);
      g.gain.linearRampToValueAtTime(0.12, dt + 0.02); // quick attack
      
      if (isLast) {
        g.gain.exponentialRampToValueAtTime(0.001, dt + 1.5); // long decay for final note
        o1.start(dt); o1.stop(dt + 1.55);
        o2.start(dt); o2.stop(dt + 1.55);
      } else {
        g.gain.exponentialRampToValueAtTime(0.001, dt + 0.3); // short decay for arpeggio
        o1.start(dt); o1.stop(dt + 0.35);
        o2.start(dt); o2.stop(dt + 0.35);
      }
      
      o1.connect(g);
      o2.connect(g);
      g.connect(out);
    });

    // Add a sparkly background chord on the final note to make it grand
    [523, 659, 784, 1046].forEach(freq => {
        const osc = createOsc(audioCtx, 'sine', freq);
        const gain = createGain(audioCtx, 0);
        const dt = t + 0.45;
        gain.gain.setValueAtTime(0, dt);
        gain.gain.linearRampToValueAtTime(0.05, dt + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, dt + 1.5);
        osc.connect(gain); gain.connect(out);
        osc.start(dt); osc.stop(dt + 1.55);
    });
  } else if (name === 'gameover') {
    [300, 240].forEach((freq, i) => {
      const o = createOsc(audioCtx, 'sawtooth', freq);
      const lp = createLpf(audioCtx, 600);
      const g = createGain(audioCtx, 0);
      const dt = t + i * 0.15;
      g.gain.setValueAtTime(0.25, dt);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.14);
      o.connect(lp); lp.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.16);
    });
  } else if (name === 'error') {
    const o = createOsc(audioCtx, 'sawtooth', 150);
    const lp = createLpf(audioCtx, 500);
    const g = createGain(audioCtx, 0);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.15);
  } else if (name === 'countdown') {
    const o = createOsc(audioCtx, 'sine', 880);
    const g = createGain(audioCtx, 0.22);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.08);
  }
}
