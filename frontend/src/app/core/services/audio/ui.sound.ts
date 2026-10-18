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
    // === Single-Player Victory: Uplifting, crystal-clear magical arpeggio & shimmer ===
    const notes = [
      { f: 392.00, t: 0.00 }, // G4
      { f: 523.25, t: 0.09 }, // C5
      { f: 659.25, t: 0.18 }, // E5
      { f: 783.99, t: 0.27 }, // G5
      { f: 987.77, t: 0.36 }, // B5
      { f: 1046.50, t: 0.46 } // C6 (grand sustained climax)
    ];

    notes.forEach((note, i) => {
      const o1 = createOsc(audioCtx, 'triangle', note.f);
      const o2 = createOsc(audioCtx, 'sine', note.f * 1.004); // subtle harmonic shimmer
      const g = createGain(audioCtx, 0);

      const dt = t + note.t;
      const isClimax = i === notes.length - 1;

      g.gain.setValueAtTime(0, dt);
      g.gain.linearRampToValueAtTime(isClimax ? 0.22 : 0.14, dt + 0.02);

      const decayTime = isClimax ? 1.8 : 0.35;
      g.gain.exponentialRampToValueAtTime(0.001, dt + decayTime);

      o1.connect(g); o2.connect(g); g.connect(out);
      o1.start(dt); o1.stop(dt + decayTime + 0.05);
      o2.start(dt); o2.stop(dt + decayTime + 0.05);
    });

    // Deep warm foundation bass on resolution (C3: 130.81Hz)
    const dtFinal = t + 0.46;
    const bass = createOsc(audioCtx, 'sine', 130.81);
    const bassG = createGain(audioCtx, 0);
    bassG.gain.setValueAtTime(0, dtFinal);
    bassG.gain.linearRampToValueAtTime(0.18, dtFinal + 0.04);
    bassG.gain.exponentialRampToValueAtTime(0.001, dtFinal + 1.6);
    bass.connect(bassG); bassG.connect(out);
    bass.start(dtFinal); bass.stop(dtFinal + 1.65);

    // Sparkly crystal bells on climax (E6: 1318.5Hz, G6: 1567.98Hz, C7: 2093.0Hz)
    [1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
      const bell = createOsc(audioCtx, 'sine', freq);
      const bellG = createGain(audioCtx, 0);
      const bellDt = dtFinal + 0.08 + idx * 0.07;
      bellG.gain.setValueAtTime(0, bellDt);
      bellG.gain.linearRampToValueAtTime(0.07, bellDt + 0.015);
      bellG.gain.exponentialRampToValueAtTime(0.001, bellDt + 1.2);
      bell.connect(bellG); bellG.connect(out);
      bell.start(bellDt); bell.stop(bellDt + 1.25);
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
    // === Single-Player Defeat: Warm, mellow, comforting descending motif (music box / Rhodes) ===
    // Replaces the harsh buzzer with a comforting, reflective acoustic cue
    const chords = [
      { t: 0.00, freqs: [392.0, 329.6], dur: 0.30 }, // G4 + E4
      { t: 0.20, freqs: [349.2, 293.7], dur: 0.32 }, // F4 + D4
      { t: 0.44, freqs: [311.1, 261.6, 130.8], dur: 1.2 }  // Eb4 + C4 + C3 (warm gentle minor resolution)
    ];

    chords.forEach(c => {
      const ct = t + c.t;
      c.freqs.forEach((freq, fi) => {
        const osc = createOsc(audioCtx, 'triangle', freq);
        const lpf = createLpf(audioCtx, 850);
        const g = createGain(audioCtx, 0);

        const peakGain = fi === 2 ? 0.18 : 0.13;
        g.gain.setValueAtTime(0, ct);
        g.gain.linearRampToValueAtTime(peakGain, ct + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, ct + c.dur);

        osc.connect(lpf); lpf.connect(g); g.connect(out);
        osc.start(ct); osc.stop(ct + c.dur + 0.05);
      });
    });

    // Comforting subtle high bell ringing out (C5: 523.25Hz)
    const bellDt = t + 0.65;
    const bell = createOsc(audioCtx, 'sine', 523.25);
    const bellG = createGain(audioCtx, 0);
    bellG.gain.setValueAtTime(0, bellDt);
    bellG.gain.linearRampToValueAtTime(0.06, bellDt + 0.03);
    bellG.gain.exponentialRampToValueAtTime(0.001, bellDt + 1.0);
    bell.connect(bellG); bellG.connect(out);
    bell.start(bellDt); bell.stop(bellDt + 1.05);

  } else if (name === 'pk_defeat') {
    // === Multiplayer PK Defeat: Dramatic cinematic gong & heartbeat tension cue ===
    // 1. Heavy dark gong impact (filtered noise body + low resonance)
    try {
      const noise = createNoise(audioCtx, 0.6);
      const bpf = createBpf(audioCtx, 360, 3);
      const noiseG = createGain(audioCtx, 0.28);
      noiseG.gain.setValueAtTime(0.28, t);
      noiseG.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      noise.connect(bpf); bpf.connect(noiseG); noiseG.connect(out);
      noise.start(t); noise.stop(t + 0.6);
    } catch {
      // Noise fallback if buffer fails
    }

    // Heavy low metallic resonance (detuned low tones 98Hz & 103Hz)
    [98, 103].forEach(freq => {
      const o = createOsc(audioCtx, 'sawtooth', freq);
      const lpf = createLpf(audioCtx, 320);
      const g = createGain(audioCtx, 0.22);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      o.connect(lpf); lpf.connect(g); g.connect(out);
      o.start(t); o.stop(t + 1.15);
    });

    // 2. Slow dramatic cello glide (164Hz E3 -> 130Hz C3 -> 110Hz A2)
    const drone = createOsc(audioCtx, 'sawtooth', 164.8);
    const droneLpf = createLpf(audioCtx, 450);
    const droneG = createGain(audioCtx, 0);
    const dtDrone = t + 0.12;

    drone.frequency.setValueAtTime(164.8, dtDrone);
    drone.frequency.exponentialRampToValueAtTime(110.0, dtDrone + 0.9);

    droneG.gain.setValueAtTime(0, dtDrone);
    droneG.gain.linearRampToValueAtTime(0.18, dtDrone + 0.05);
    droneG.gain.exponentialRampToValueAtTime(0.001, dtDrone + 1.0);

    drone.connect(droneLpf); droneLpf.connect(droneG); droneG.connect(out);
    drone.start(dtDrone); drone.stop(dtDrone + 1.05);

    // 3. Motivational heartbeat pulse for rematch (Dum-Dum)
    [
      { t: 0.70, f1: 110, f2: 75, dur: 0.16, gain: 0.25 },
      { t: 0.95, f1: 120, f2: 80, dur: 0.20, gain: 0.28 }
    ].forEach(hb => {
      const ht = t + hb.t;
      const hOsc = createOsc(audioCtx, 'sine', hb.f1);
      hOsc.frequency.exponentialRampToValueAtTime(hb.f2, ht + hb.dur);
      const hGain = createGain(audioCtx, 0);
      hGain.gain.setValueAtTime(0, ht);
      hGain.gain.linearRampToValueAtTime(hb.gain, ht + 0.02);
      hGain.gain.exponentialRampToValueAtTime(0.001, ht + hb.dur);
      hOsc.connect(hGain); hGain.connect(out);
      hOsc.start(ht); hOsc.stop(ht + hb.dur + 0.03);
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
