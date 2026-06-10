export function createNoise(ctx: AudioContext, duration: number) {
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

export function createOsc(ctx: AudioContext, type: OscillatorType, freq: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

export function createGain(ctx: AudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

export function createBpf(ctx: AudioContext, freq: number, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

export function createLpf(ctx: AudioContext, freq: number) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  return f;
}

export function createHpf(ctx: AudioContext, freq: number) {
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq;
  return f;
}
