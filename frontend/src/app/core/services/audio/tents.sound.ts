import { createOsc, createGain, createNoise, createBpf, createHpf } from './audio-utils';

export type TentsSoundType = 'tent' | 'removeTent' | 'grass' | 'removeGrass' | 'autoGrass' | 'conflict' | 'hint' | 'win';

/**
 * 帐篷与树 (Tents & Trees) 治愈系自然露营音效合成器
 * 纯 Web Audio API 合成，零外部资源加载，即时响应
 */
export function playTentsSound(audioCtx: AudioContext, out: AudioNode, name: TentsSoundType) {
  const t = audioCtx.currentTime;

  switch (name) {
    case 'tent': {
      // 放置帐篷：木槌扎营地钉的爽脆敲击声 + 暖心木琴音
      // 1. 敲击瞬间的瞬态冲击 (Transient Click)
      const oscClick = createOsc(audioCtx, 'triangle', 720);
      oscClick.frequency.exponentialRampToValueAtTime(140, t + 0.04);
      const gainClick = createGain(audioCtx, 0.28);
      gainClick.gain.setValueAtTime(0.28, t);
      gainClick.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      oscClick.connect(gainClick);
      gainClick.connect(out);
      oscClick.start(t);
      oscClick.stop(t + 0.06);

      // 2. 扎营成功后木质露营共鸣微泛音 (Warm Thump)
      const oscWarm = createOsc(audioCtx, 'sine', 392); // G4
      oscWarm.frequency.setValueAtTime(392, t);
      oscWarm.frequency.exponentialRampToValueAtTime(523.25, t + 0.08); // C5
      const gainWarm = createGain(audioCtx, 0.18);
      gainWarm.gain.setValueAtTime(0.18, t);
      gainWarm.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      oscWarm.connect(gainWarm);
      gainWarm.connect(out);
      oscWarm.start(t);
      oscWarm.stop(t + 0.13);
      break;
    }

    case 'removeTent': {
      // 拔出地钉/收起帐篷：轻柔的轻声木质微弹音
      const osc = createOsc(audioCtx, 'sine', 440);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);
      const gain = createGain(audioCtx, 0.12);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.08);
      break;
    }

    case 'grass': {
      // 标记草地：微风拂过草丛的沙沙清新声 + 晶莹露珠微音
      const noise = createNoise(audioCtx, 0.07);
      const bpf = createBpf(audioCtx, 3200, 3.5);
      const gainNoise = createGain(audioCtx, 0.09);
      gainNoise.gain.setValueAtTime(0.09, t);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      noise.connect(bpf);
      bpf.connect(gainNoise);
      gainNoise.connect(out);
      noise.start(t);
      noise.stop(t + 0.08);

      // 轻微露珠纯音
      const osc = createOsc(audioCtx, 'sine', 1174.66); // D6
      const gain = createGain(audioCtx, 0.08);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.07);
      break;
    }

    case 'removeGrass': {
      // 清理草地：轻微的高通气流音
      const noise = createNoise(audioCtx, 0.05);
      const hpf = createHpf(audioCtx, 4500);
      const gain = createGain(audioCtx, 0.06);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.connect(hpf);
      hpf.connect(gain);
      gain.connect(out);
      noise.start(t);
      noise.stop(t + 0.06);
      break;
    }

    case 'autoGrass': {
      // 满足行列后自动铺草：欢快连贯的多重露水水滴连奏
      const freqs = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
      freqs.forEach((freq, i) => {
        const dt = t + i * 0.04;
        const osc = createOsc(audioCtx, 'sine', freq);
        const gain = createGain(audioCtx, 0.09);
        gain.gain.setValueAtTime(0.09, dt);
        gain.gain.exponentialRampToValueAtTime(0.001, dt + 0.1);
        osc.connect(gain);
        gain.connect(out);
        osc.start(dt);
        osc.stop(dt + 0.11);
      });
      break;
    }

    case 'conflict': {
      // 冲突提示：两块软木轻碰的双音“笃-笃”，柔和不刺耳
      [220, 196].forEach((freq, i) => {
        const dt = t + i * 0.07;
        const osc = createOsc(audioCtx, 'triangle', freq);
        const gain = createGain(audioCtx, 0.14);
        gain.gain.setValueAtTime(0.14, dt);
        gain.gain.exponentialRampToValueAtTime(0.001, dt + 0.06);
        osc.connect(gain);
        gain.connect(out);
        osc.start(dt);
        osc.stop(dt + 0.07);
      });
      break;
    }

    case 'hint': {
      // 锦囊提示：仙灵晨露音阶叮咚（光芒绽放）
      const notes = [783.99, 1046.5, 1318.51, 1567.98]; // G5, C6, E6, G6
      notes.forEach((freq, i) => {
        const dt = t + i * 0.05;
        const osc = createOsc(audioCtx, 'sine', freq);
        const gain = createGain(audioCtx, 0.11);
        gain.gain.setValueAtTime(0.11, dt);
        gain.gain.exponentialRampToValueAtTime(0.001, dt + 0.18);
        osc.connect(gain);
        gain.connect(out);
        osc.start(dt);
        osc.stop(dt + 0.2);
      });
      break;
    }

    case 'win': {
      // 完美通关：晨光森林凯旋大七和弦爬音 (C5 -> E5 -> G5 -> B5 -> C6 -> E6)
      const arpeggio = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
      arpeggio.forEach((freq, idx) => {
        const dt = t + idx * 0.07;
        const osc = createOsc(audioCtx, 'triangle', freq);
        const gain = createGain(audioCtx, 0.13);
        gain.gain.setValueAtTime(0.13, dt);
        gain.gain.exponentialRampToValueAtTime(0.001, dt + 0.35);
        osc.connect(gain);
        gain.connect(out);
        osc.start(dt);
        osc.stop(dt + 0.38);
      });
      break;
    }
  }
}
