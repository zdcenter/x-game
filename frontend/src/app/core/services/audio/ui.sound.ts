import { createOsc, createGain, createLpf, createBpf, createNoise } from './audio-utils';

export type UISoundName =
  | 'click'
  | 'victory'
  | 'pk_victory'
  | 'gameover'
  | 'pk_defeat'
  | 'error'
  | 'countdown'
  | 'countdown_go';

export function playUISound(audioCtx: AudioContext, out: AudioNode, name: UISoundName) {
  const t = audioCtx.currentTime;

  if (name === 'click') {
    const o = createOsc(audioCtx, 'sine', 1000);
    const g = createGain(audioCtx, 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.08);

  } else if (name === 'victory') {
    // === Single-Player Victory: High-Dopamine Arcade Fanfare + Slot Machine Crystal Cascade ===
    // 1. Physical chest-thumping sub-bass drop (120Hz -> 45Hz)
    const kick = createOsc(audioCtx, 'sine', 120);
    const kickG = createGain(audioCtx, 0.38);
    kick.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    kickG.gain.setValueAtTime(0.38, t);
    kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    kick.connect(kickG); kickG.connect(out);
    kick.start(t); kick.stop(t + 0.32);

    // 2. High-voltage lightning crystal arpeggio (7 rapid ascending notes in 0.24s)
    const arpNotes = [
      { f: 392.00, t: 0.00 }, // G4
      { f: 523.25, t: 0.035 }, // C5
      { f: 659.25, t: 0.07 }, // E5
      { f: 783.99, t: 0.105 }, // G5
      { f: 987.77, t: 0.14 }, // B5
      { f: 1046.50, t: 0.18 }, // C6
      { f: 1318.51, t: 0.22 }  // E6
    ];

    arpNotes.forEach(note => {
      const o = createOsc(audioCtx, 'triangle', note.f);
      const g = createGain(audioCtx, 0);
      const dt = t + note.t;
      g.gain.setValueAtTime(0, dt);
      g.gain.linearRampToValueAtTime(0.18, dt + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, dt + 0.28);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.30);
    });

    // 3. Grand triumphant C-major chord arrival (0.24s ~ 1.8s)
    const chordTime = t + 0.24;
    const grandChord = [
      { f: 261.63, wave: 'sine' as OscillatorType, gain: 0.20 }, // C4
      { f: 392.00, wave: 'triangle' as OscillatorType, gain: 0.16 }, // G4
      { f: 523.25, wave: 'triangle' as OscillatorType, gain: 0.18 }, // C5
      { f: 659.25, wave: 'sine' as OscillatorType, gain: 0.15 }, // E5
      { f: 1046.50, wave: 'sine' as OscillatorType, gain: 0.14 } // C6
    ];

    grandChord.forEach(c => {
      const osc = createOsc(audioCtx, c.wave, c.f);
      const gainNode = createGain(audioCtx, 0);
      gainNode.gain.setValueAtTime(0, chordTime);
      gainNode.gain.linearRampToValueAtTime(c.gain, chordTime + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.6);
      osc.connect(gainNode); gainNode.connect(out);
      osc.start(chordTime); osc.stop(chordTime + 1.65);
    });

    // 4. Dopamine Slot-Machine Golden Coins Cascade (high sparkly pings from 0.32s ~ 0.70s)
    [2093.0, 2349.3, 2637.0, 3135.9, 3520.0, 4186.0].forEach((freq, idx) => {
      const ping = createOsc(audioCtx, 'sine', freq);
      const pingG = createGain(audioCtx, 0);
      const pt = chordTime + 0.08 + idx * 0.06;
      pingG.gain.setValueAtTime(0, pt);
      pingG.gain.linearRampToValueAtTime(0.08, pt + 0.01);
      pingG.gain.exponentialRampToValueAtTime(0.001, pt + 0.45);
      ping.connect(pingG); pingG.connect(out);
      ping.start(pt); ping.stop(pt + 0.50);
    });

  } else if (name === 'pk_victory') {
    // === Multiplayer PK Victory: Triumphant esports brass fanfare + sub-bass boom ===
    // 1. Sub-bass punch impact (kick drop 160Hz -> 48Hz)
    const kick = createOsc(audioCtx, 'sine', 160);
    const kickG = createGain(audioCtx, 0.45);
    kick.frequency.exponentialRampToValueAtTime(48, t + 0.35);
    kickG.gain.setValueAtTime(0.45, t);
    kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    kick.connect(kickG); kickG.connect(out);
    kick.start(t); kick.stop(t + 0.4);

    // 2. Triumphant Brass chords:
    // Motif Beat 1 (0.08s): G4 (392) + D5 (587) + G5 (784)
    // Motif Beat 2 (0.24s): G4 (392) + E5 (659) + C6 (1046)
    // Grand Climax Beat 3 (0.44s): C4 (261) + G4 (392) + C5 (523) + E5 (659) + G5 (784) + C6 (1046)
    const brassMotifs = [
      { t: 0.08, freqs: [392, 587, 784], dur: 0.14, gain: 0.14 },
      { t: 0.24, freqs: [392, 659, 1046], dur: 0.16, gain: 0.16 },
      { t: 0.44, freqs: [261.6, 392, 523.25, 659.25, 783.99, 1046.5], dur: 1.8, gain: 0.20 }
    ];

    brassMotifs.forEach(b => {
      const bt = t + b.t;
      b.freqs.forEach(freq => {
        // Brass texture: triangle + lowpass filtered sawtooth
        const tri = createOsc(audioCtx, 'triangle', freq);
        const saw = createOsc(audioCtx, 'sawtooth', freq * 1.002);
        const lpf = createLpf(audioCtx, 1600);
        const g = createGain(audioCtx, 0);

        g.gain.setValueAtTime(0, bt);
        g.gain.linearRampToValueAtTime(b.gain, bt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, bt + b.dur);

        tri.connect(g);
        saw.connect(lpf); lpf.connect(g);
        g.connect(out);

        tri.start(bt); tri.stop(bt + b.dur + 0.05);
        saw.start(bt); saw.stop(bt + b.dur + 0.05);
      });
    });

    // 3. Shimmering Golden Chime Cascade at Climax (0.48s ~ 2.0s)
    const climaxTime = t + 0.44;
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
      const chime = createOsc(audioCtx, 'sine', freq);
      const chimeG = createGain(audioCtx, 0);
      const ct = climaxTime + idx * 0.06;
      chimeG.gain.setValueAtTime(0, ct);
      chimeG.gain.linearRampToValueAtTime(0.09, ct + 0.02);
      chimeG.gain.exponentialRampToValueAtTime(0.001, ct + 1.8);
      chime.connect(chimeG); chimeG.connect(out);
      chime.start(ct); chime.stop(ct + 1.85);
    });

    // 4. Low Sub-bass drone sustaining victory (C2: 65.4Hz)
    const drone = createOsc(audioCtx, 'sine', 65.4);
    const droneG = createGain(audioCtx, 0);
    droneG.gain.setValueAtTime(0, climaxTime);
    droneG.gain.linearRampToValueAtTime(0.24, climaxTime + 0.05);
    droneG.gain.exponentialRampToValueAtTime(0.001, climaxTime + 1.6);
    drone.connect(droneG); droneG.connect(out);
    drone.start(climaxTime); drone.stop(climaxTime + 1.65);

  } else if (name === 'gameover') {
    // === Single-Player Defeat: High-Tension "Near Miss" Dramatic Riser (Stimulates Revenge / Retry) ===
    // 1. Crisp punchy cinematic thud (130Hz -> 55Hz, tight 0.18s impact)
    const kick = createOsc(audioCtx, 'sine', 130);
    const kickG = createGain(audioCtx, 0.35);
    kick.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    kickG.gain.setValueAtTime(0.35, t);
    kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    kick.connect(kickG); kickG.connect(out);
    kick.start(t); kick.stop(t + 0.24);

    // 2. Suspenseful rising tension swell (120Hz -> 261Hz -> 392Hz)
    const riseOsc = createOsc(audioCtx, 'triangle', 120);
    const riseLpf = createLpf(audioCtx, 1200);
    const riseG = createGain(audioCtx, 0);
    riseOsc.frequency.setValueAtTime(120, t + 0.05);
    riseOsc.frequency.exponentialRampToValueAtTime(392, t + 0.45);
    riseG.gain.setValueAtTime(0, t + 0.05);
    riseG.gain.linearRampToValueAtTime(0.20, t + 0.35);
    riseG.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    riseOsc.connect(riseLpf); riseLpf.connect(riseG); riseG.connect(out);
    riseOsc.start(t + 0.05); riseOsc.stop(t + 0.90);

    // 3. Unresolved suspended chord (Csus4: C4, F4, G4) leaving open tension to RETRY!
    const chordTime = t + 0.35;
    [
      { f: 261.63, g: 0.14 }, // C4
      { f: 349.23, g: 0.15 }, // F4 (suspended 4th)
      { f: 392.00, g: 0.14 }  // G4
    ].forEach(c => {
      const osc = createOsc(audioCtx, 'sine', c.f);
      const gainNode = createGain(audioCtx, 0);
      gainNode.gain.setValueAtTime(0, chordTime);
      gainNode.gain.linearRampToValueAtTime(c.g, chordTime + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.75);
      osc.connect(gainNode); gainNode.connect(out);
      osc.start(chordTime); osc.stop(chordTime + 0.80);
    });

    // 4. Bright incentive question-mark bell (G5: 783.99Hz)
    const qBell = createOsc(audioCtx, 'sine', 783.99);
    const qBellG = createGain(audioCtx, 0);
    const bt = chordTime + 0.05;
    qBellG.gain.setValueAtTime(0, bt);
    qBellG.gain.linearRampToValueAtTime(0.12, bt + 0.015);
    qBellG.gain.exponentialRampToValueAtTime(0.001, bt + 0.65);
    qBell.connect(qBellG); qBellG.connect(out);
    qBell.start(bt); qBell.stop(bt + 0.70);

  } else if (name === 'pk_defeat') {
    // === Multiplayer PK Defeat: High-Voltage Cinematic Impact & Adrenaline Revenge Pulse ===
    // 1. Heavy cinematic bass drop (150Hz -> 45Hz)
    const kick = createOsc(audioCtx, 'sine', 150);
    const kickG = createGain(audioCtx, 0.42);
    kick.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    kickG.gain.setValueAtTime(0.42, t);
    kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    kick.connect(kickG); kickG.connect(out);
    kick.start(t); kick.stop(t + 0.38);

    // 2. High-energy dramatic brass swell on suspended chord (0.2s ~ 0.9s)
    const swellTime = t + 0.15;
    [
      { f: 220.00, wave: 'sawtooth' as OscillatorType, lpf: 600, g: 0.18 }, // A3
      { f: 329.63, wave: 'triangle' as OscillatorType, lpf: 900, g: 0.16 }, // E4
      { f: 440.00, wave: 'sine' as OscillatorType, lpf: 1200, g: 0.15 }     // A4
    ].forEach(c => {
      const osc = createOsc(audioCtx, c.wave, c.f);
      const lp = createLpf(audioCtx, c.lpf);
      const gainNode = createGain(audioCtx, 0);
      gainNode.gain.setValueAtTime(0, swellTime);
      gainNode.gain.linearRampToValueAtTime(c.g, swellTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, swellTime + 0.95);
      osc.connect(lp); lp.connect(gainNode); gainNode.connect(out);
      osc.start(swellTime); osc.stop(swellTime + 1.0);
    });

    // 3. Adrenaline heartbeat double-thud (0.65s and 0.88s) provoking immediate rematch
    [
      { t: 0.65, f: 110 },
      { t: 0.88, f: 125 }
    ].forEach(hb => {
      const ht = t + hb.t;
      const hOsc = createOsc(audioCtx, 'sine', hb.f);
      hOsc.frequency.exponentialRampToValueAtTime(60, ht + 0.18);
      const hGain = createGain(audioCtx, 0);
      hGain.gain.setValueAtTime(0, ht);
      hGain.gain.linearRampToValueAtTime(0.30, ht + 0.02);
      hGain.gain.exponentialRampToValueAtTime(0.001, ht + 0.22);
      hOsc.connect(hGain); hGain.connect(out);
      hOsc.start(ht); hOsc.stop(ht + 0.25);
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
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.09);
  } else if (name === 'countdown_go') {
    // Powerful arcade BATTLE / GO fanfare
    // Low sub-bass impact
    const sub = createOsc(audioCtx, 'sine', 140);
    const subG = createGain(audioCtx, 0.45);
    sub.frequency.exponentialRampToValueAtTime(45, t + 0.4);
    subG.gain.setValueAtTime(0.45, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    sub.connect(subG); subG.connect(out);
    sub.start(t); sub.stop(t + 0.48);

    // High brass triumphant chord (C major: C6, E6, G6)
    [1046.5, 1318.5, 1567.98].forEach(freq => {
      const o = createOsc(audioCtx, 'triangle', freq);
      const g = createGain(audioCtx, 0.16);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.65);
    });
  }
}
