'use strict';
/* ════════════════════ Äänimoottori: kaikki äänet syntetisoidaan Web Audio API:lla ════════════════════ */

let ctx = null, master = null, noiseBuf = null;
let muted = false;
// Pitkän painalluksen aikana kerätään luodut äänilähteet, jotta ne voi pysäyttää sormen noustessa
let NODES = null;

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = muted ? 0 : .8;
    master.connect(comp);
    const verb = ctx.createConvolver();
    verb.buffer = impulse(2.4);
    const wet = ctx.createGain();
    wet.gain.value = .2;
    master.connect(verb);
    verb.connect(wet);
    wet.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running') ctx.resume();
  return ctx;
}

function impulse(sec) {
  const len = Math.floor(ctx.sampleRate * sec);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

function track(node) {
  if (NODES) NODES.push(node);
  return node;
}

// Äänenvoimakkuuskäyrä: nousu → vaimeneminen tasolle sus → (valinnainen) päästö
function env(dest, t, a, peak, sus, decay, releaseAt, release) {
  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(sus, t + a, decay);
  if (releaseAt != null) p.setTargetAtTime(0, Math.max(releaseAt, t + a), release);
  if (dest) g.connect(dest);
  return g;
}

// type voi olla aaltomuodon nimi tai PeriodicWave
function osc(type, f, t, end, dest, amp = 1, detune = 0) {
  const o = ctx.createOscillator();
  if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  if (amp !== 1) {
    const g = ctx.createGain();
    g.gain.value = amp;
    o.connect(g);
    g.connect(dest);
  } else {
    o.connect(dest);
  }
  o.start(t);
  o.stop(end);
  return track(o);
}

function filt(type, f, q, dest) {
  const b = biquad(type, f, q);
  b.connect(dest);
  return b;
}

function biquad(type, f, q, gain) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  if (q != null) b.Q.value = q;
  if (gain != null) b.gain.value = gain;
  return b;
}

// Kytkee solmut peräkkäin ja viimeisen kohteeseen; palauttaa ketjun alun
function chain(dest, ...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  nodes[nodes.length - 1].connect(dest);
  return nodes[0];
}

function noise(t, end, dest) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.connect(dest);
  s.start(t, Math.random() * 1.5);
  s.stop(end);
  return track(s);
}

function lfo(rate, t, end, param, depth, delay = 0, type = 'sine') {
  const l = ctx.createOscillator();
  l.type = type;
  l.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(depth, t + delay + .25);
  l.connect(g);
  g.connect(param);
  l.start(t);
  l.stop(end);
  return track(l);
}

function vibrato(oscs, t, end, rate, cents, delay) {
  oscs.forEach(o => lfo(rate, t, end, o.detune, cents, delay));
}

function playBuffer(buf, t, dest, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = rate;
  s.connect(dest);
  s.start(t);
  return track(s);
}

/* ─── Aaltomuodot ─── */

const PW = {};
function periodic(name, fill) {
  if (!PW[name]) {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    fill(re, im, N);
    PW[name] = ctx.createPeriodicWave(re, im);
  }
  return PW[name];
}
const harmonics = amps => (re, im) => amps.forEach((a, i) => { im[i + 1] = a; });
const brassWave = () => periodic('brass', harmonics([1, .85, .72, .6, .5, .4, .32, .25, .18, .13, .09, .06, .04, .03]));
const hornWave = () => periodic('horn', harmonics([1, .55, .3, .17, .1, .06, .035, .02]));
const fluteWave = () => periodic('flute', harmonics([1, .22, .08, .03, .01]));
// Kapea pulssiaalto muistuttaa harmonikan vapaata kieltä
const reedWave = () => periodic('reed', (re, im, N) => {
  for (let n = 1; n < N; n++) re[n] = 2 / (n * Math.PI) * Math.sin(n * Math.PI * .16);
});

let saxCurve = null;
function reedShaper() {
  if (!saxCurve) {
    saxCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = i / 1023 * 2 - 1;
      saxCurve[i] = Math.tanh(2.8 * x) / Math.tanh(2.8);
    }
  }
  const s = ctx.createWaveShaper();
  s.curve = saxCurve;
  s.oversample = '2x';
  return s;
}

/* ─── Ennalta lasketut äänet (fysikaaliset mallit), välimuistissa sävelittäin ─── */

const BUF = new Map();

function cachedBuffer(key, sec, fill) {
  let b = BUF.get(key);
  if (!b) {
    const sr = ctx.sampleRate;
    b = ctx.createBuffer(1, Math.floor(sr * sec), sr);
    const d = b.getChannelData(0);
    fill(d, sr);
    let peak = 0;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < d.length; i++) d[i] *= .9 / peak;
    BUF.set(key, b);
  }
  return b;
}

// Yksi vaimeneva osasävel kaksivaiheisella vaimenemisella (nopea alku, pitkä häntä)
function addPartial(d, sr, f, amp, tauA, tauB, mixB) {
  if (f >= sr * .45) return;
  const w = 2 * Math.PI * f / sr, c = Math.cos(w), s = Math.sin(w);
  const ka = Math.exp(-1 / (sr * tauA)), kb = Math.exp(-1 / (sr * tauB));
  let x = 1, y = 0, ea = amp * (1 - mixB), eb = amp * mixB;
  for (let i = 0; i < d.length; i++) {
    d[i] += y * (ea + eb);
    const nx = x * c - y * s;
    y = x * s + y * c;
    x = nx;
    ea *= ka;
    eb *= kb;
    if (ea + eb < 1e-5) break;
  }
}

function addClick(d, sr, len, tau, amp, fc) {
  // Suodatettu kohinaisku (vasara, malletti)
  const a = 1 - Math.exp(-2 * Math.PI * fc / sr);
  let lp = 0;
  const n = Math.min(d.length, Math.floor(sr * len));
  for (let i = 0; i < n; i++) {
    lp += ((Math.random() * 2 - 1) - lp) * a;
    d[i] += lp * amp * Math.exp(-i / (sr * tau));
  }
}

function pianoBuffer(m) {
  const f0 = mtof(m);
  return cachedBuffer('piano' + m, m < 55 ? 3.6 : m < 72 ? 3 : 2.2, (d, sr) => {
    const B = .00012 * Math.pow(2, (m - 60) / 18);     // kielen jäykkyys → epäharmoniset osasävelet
    const sus = Math.pow(261.6 / f0, .5);
    const det = rand(.5, 1.1) / 1731;                   // kaksi kieltä hieman eri vireessä → huojunta
    const nMax = Math.min(18, Math.floor(10000 / f0));
    for (let n = 1; n <= nMax; n++) {
      const fn = n * f0 * Math.sqrt(1 + B * n * n);
      const a = Math.exp(-(n - 1) * .3) * (.5 + .5 * Math.abs(Math.sin(n * Math.PI / 7.3))) / Math.pow(n, .2);
      const tA = .3 * sus / (1 + .3 * (n - 1)), tB = 2.6 * sus / (1 + .15 * (n - 1));
      addPartial(d, sr, fn * (1 - det), a * .5, tA, tB, .4);
      addPartial(d, sr, fn * (1 + det), a * .5, tA, tB, .4);
    }
    addClick(d, sr, .05, .007, .35, 1400);
    const att = Math.floor(sr * .002);
    for (let i = 0; i < att; i++) d[i] *= i / att;
  });
}

function glockBuffer(m) {
  const f0 = mtof(m);
  return cachedBuffer('glock' + m, 2.6, (d, sr) => {
    const k = Math.pow(1047 / f0, .35);
    [[1, 1, 2.2], [2.76, .3, .5], [5.4, .15, .2], [8.93, .07, .09], [13.3, .035, .04]]
      .forEach(([r, a, tau]) => addPartial(d, sr, f0 * r, a, tau * k, tau * k, 0));
    addClick(d, sr, .01, .0015, .5, 9000);
  });
}

function xyloBuffer(m) {
  const f0 = mtof(m);
  return cachedBuffer('xylo' + m, 1.4, (d, sr) => {
    const k = Math.pow(523 / f0, .5);
    [[1, 1, .42], [3, .38, .1], [6.2, .1, .045], [9.9, .05, .025]]
      .forEach(([r, a, tau]) => addPartial(d, sr, f0 * r, a, tau * k, tau * k, 0));
    addPartial(d, sr, f0, .3, .8 * k, .8 * k, 0);         // resonaattoriputki
    addClick(d, sr, .012, .0025, .6, 3000);
  });
}

// Karplus–Strong-kielimalli. Taajuusvirhe korjataan toistonopeudella, jotta kieli on vireessä.
function ksBuffer(key, m, sec, loss, smooth) {
  const sr = ctx ? ctx.sampleRate : 44100;
  const period = sr / mtof(m);
  const N = Math.max(2, Math.round(period));
  const buf = cachedBuffer(key + m, sec, d => {
    const ring = new Float32Array(N);
    let last = 0;
    for (let i = 0; i < N; i++) { last = last * smooth + (Math.random() * 2 - 1) * (1 - smooth); ring[i] = last; }
    let idx = 0;
    for (let i = 0; i < d.length; i++) {
      const cur = ring[idx], nxt = ring[(idx + 1) % N];
      ring[idx] = (cur + nxt) * .5 * loss;
      d[i] = cur;
      idx = (idx + 1) % N;
    }
  });
  return { buf, rate: (N + .5) / period };
}

/* ─── Soitinäänet: VOICES[id](sävel, aika, kesto, ulostulo, voimakkuus) ─── */

const VOICES = {
  piano(m, t, dur, out, v = 1) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(.8 * v, t);
    g.gain.setTargetAtTime(0, t + Math.max(dur, .25) + .1, .12);    // vaimentimet
    g.connect(out);
    playBuffer(pianoBuffer(m), t, filt('lowpass', 2500 + 7000 * v, .5, g));
  },

  bells(m, t, dur, out, v = 1) {
    playBuffer(glockBuffer(m), t, env(out, t, .001, .5 * v, .5 * v, 1));
  },

  xylo(m, t, dur, out, v = 1) {
    playBuffer(xyloBuffer(m), t, env(out, t, .001, .6 * v, .6 * v, 1));
  },

  guitar(m, t, dur, out, v = 1) {
    const { buf, rate } = ksBuffer('ks', m, 2, .996, .5);
    const g = env(out, t, .002, .9 * v, .9 * v, 1, t + Math.max(dur, 1.4), .15);
    playBuffer(buf, t, filt('lowpass', 3500, .5, g), rate);
  },

  kantele(m, t, dur, out, v = 1) {
    // Kaksi hieman eri vireistä kieltä ja pitkä, kirkas soinnin häntä
    const { buf, rate } = ksBuffer('kant', m, 3.5, .9985, .3);
    const g = env(out, t, .002, .42 * v, .42 * v, 1, t + Math.max(dur, 2.5), .2);
    const lp = filt('lowpass', 7000, .5, g);
    playBuffer(buf, t, lp, rate);
    playBuffer(buf, t, lp, rate * 1.0025);
  },

  bass(m, t, dur, out, v = 1) {
    const f = mtof(m);
    const { buf, rate } = ksBuffer('bass', m, 2.5, .994, .85);
    const g = env(out, t, .003, .75 * v, .66 * v, .6, t + Math.max(dur, .3), .06);
    playBuffer(buf, t, filt('lowpass', 1300, .7, g), rate);
    osc('sine', f, t, t + Math.max(dur, .3) + .5, env(g, t, .004, .45, .25, .5));
  },

  trumpet(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .5;
    const g = env(out, t, .025, .36 * v, .28 * v, .12, t + dur, .07);
    const lp = biquad('lowpass', f * 1.5, .8);
    chain(g, lp, biquad('peaking', 1300, 1, 5), biquad('highpass', 180, .7));
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(Math.min(f * 9, 12000), t + .045);
    lp.frequency.setTargetAtTime(Math.min(f * 5.5, 9000), t + .05, .15);
    lp.frequency.setTargetAtTime(f * 1.5, t + dur, .06);
    const o = osc(brassWave(), f, t, end, lp);
    o.detune.setValueAtTime(-70, t);
    o.detune.linearRampToValueAtTime(0, t + .045);
    vibrato([o], t, end, 5.3, 11, .25);
    noise(t, t + .08, filt('bandpass', 2200, 1.2, env(out, t, .005, .05 * v, 0, .02)));
  },

  horn(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .6;
    const g = env(out, t, .06, .4 * v, .34 * v, .2, t + dur, .1);
    const lp = biquad('lowpass', f * 1.5, .5);
    chain(g, lp, biquad('highpass', 90, .7));
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(Math.min(f * 4.5, 5000), t + .08);
    lp.frequency.setTargetAtTime(Math.min(f * 3, 4000), t + .1, .2);
    const o = osc(hornWave(), f, t, end, lp);
    o.detune.setValueAtTime(-30, t);
    o.detune.linearRampToValueAtTime(0, t + .08);
    vibrato([o], t, end, 4.8, 6, .35);
    noise(t, t + .1, filt('bandpass', 900, 1, env(out, t, .01, .03 * v, 0, .03)));
  },

  violin(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .6;
    const g = env(out, t, .09, .34 * v, .28 * v, .25, t + dur, .12);
    // Kaikukopan resonanssit ja "tallan kumpu" 3 kHz:n kohdalla
    const body = chain(g,
      biquad('highpass', 190, .7), biquad('peaking', 290, 3, 6), biquad('peaking', 470, 3, 4),
      biquad('peaking', 1600, 1.5, -4), biquad('peaking', 2900, 1.2, 7), biquad('lowpass', 7500, .6));
    const o = osc('sawtooth', f, t, end, body);
    vibrato([o], t, end, rand(5.4, 6.2), 22, .18);
    lfo(13, t, end, o.detune, 3, 0, 'triangle');
    noise(t, end, filt('bandpass', Math.min(f * 4, 6000), .8, env(out, t, .05, .04 * v, .02 * v, .2, t + dur, .1)));
  },

  flute(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .5;
    const trem = ctx.createGain();
    trem.gain.value = 1;
    trem.connect(out);
    const g = env(trem, t, .07, .4 * v, .33 * v, .2, t + dur, .07);
    const o = osc(fluteWave(), f, t, end, g);
    vibrato([o], t, end, 5, 8, .2);
    lfo(5, t, end, trem.gain, .12, .2);                          // huilun vibrato on enimmäkseen voimakkuutta
    osc('sine', f * 2, t, t + .15, env(out, t, .005, .12 * v, 0, .03));   // "tu"-alkuääni
    noise(t, t + .1, filt('bandpass', f * 2, 2, env(out, t, .005, .12 * v, 0, .03)));
    noise(t, end, filt('bandpass', f, 4, env(out, t, .05, .06 * v, .04 * v, .1, t + dur, .06)));
    noise(t, end, filt('highpass', 5000, .7, env(out, t, .05, .02 * v, .015 * v, .1, t + dur, .06)));
  },

  sax(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .5;
    const post = ctx.createGain();
    post.gain.value = .17 * v;
    post.connect(out);
    const body = chain(post,
      biquad('highpass', 150, .7), biquad('peaking', 650, 1.4, 6), biquad('peaking', 1700, 2, 4),
      biquad('peaking', 2900, 2.5, 2), biquad('lowpass', Math.min(f * 9, 8000), .7));
    const shaper = reedShaper();
    shaper.connect(body);
    // Voimakkaampi puhallus → enemmän ruokolehden säröä → kirkkaampi ääni
    const drive = env(shaper, t, .04, 1.1, .8, .15, t + dur, .07);
    const o = osc('sawtooth', f, t, end, drive);
    o.detune.setValueAtTime(-50, t);
    o.detune.linearRampToValueAtTime(0, t + .06);
    vibrato([o], t, end, 5.2, 18, .2);
    noise(t, end, filt('bandpass', 1400, 1, env(out, t, .02, .05 * v, .02 * v, .1, t + dur, .06)));
  },

  accordion(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .4;
    const g = env(out, t, .045, .5 * v, .44 * v, .15, t + dur, .06);
    const body = chain(g, biquad('highpass', 120, .7), biquad('peaking', 1000, 1, 3), biquad('lowpass', 4500, .7));
    const w = reedWave();
    osc(w, f, t, end, body, .5);
    osc(w, f, t, end, body, .45, 13);                           // musette-huojunta
    if (m >= 55) osc(w, f / 2, t, end, body, .3, -4);
    noise(t, end, filt('bandpass', 800, .8, env(out, t, .05, .015 * v, .01 * v, .2, t + dur, .06)));
  },

  synth(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .6;
    const g = env(out, t, .01, .42 * v, .33 * v, .2, t + dur, .12);
    const lp = filt('lowpass', f * 2, 4, g);
    lp.frequency.setValueAtTime(f * 2, t);
    lp.frequency.linearRampToValueAtTime(Math.min(f * 12, 14000), t + .02);
    lp.frequency.setTargetAtTime(Math.min(f * 5, 9000), t + .03, .18);
    const oscs = [-12, 0, 12].map(d => osc('sawtooth', f, t, end, lp, .45, d));
    osc('square', f / 2, t, end, lp, .25);
    vibrato(oscs, t, end, 5.5, 10, .3);
  },

  synthbass(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .4;
    const g = env(out, t, .004, .5 * v, .38 * v, .15, t + dur, .04);
    const lp = filt('lowpass', 150, 9, g);
    lp.frequency.setValueAtTime(200 + 2400 * v, t);
    lp.frequency.setTargetAtTime(220 + f * 1.5, t + .005, .08);
    osc('sawtooth', f, t, end, lp, .7);
    osc('square', f / 2, t, end, lp, .5);
    osc('sine', f, t, end, g, .35);
  },

  pad(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + 1.6;
    const g = env(out, t, .25, .36 * v, .33 * v, .3, t + dur, .35);
    const lp = filt('lowpass', 2600, .7, g);
    [-16, -7, 0, 7, 16].forEach(d => osc('sawtooth', f, t, end, lp, .35, d));
  },

  pluck(m, t, dur, out, v = 1) {
    const f = mtof(m);
    const g = env(out, t, .003, .6 * v, 0, .16);
    const lp = filt('lowpass', f * 8, 2, g);
    lp.frequency.setTargetAtTime(f * 1.5, t, .08);
    osc('square', f, t, t + .9, lp, .5);
    osc('sawtooth', f, t, t + .9, lp, .5, 8);
  },

  // Rummuissa "sävel" on lyömäsoittimen numero 0–7
  drums(n, t, dur, out, v = 1) {
    if (n === 0) {            // BUM – bassorumpu
      const o = osc('sine', 160, t, t + .7, env(out, t, .002, 1 * v, 0, .14));
      o.frequency.exponentialRampToValueAtTime(42, t + .16);
      noise(t, t + .02, filt('highpass', 3000, .7, env(out, t, .001, .15 * v, 0, .004)));
    } else if (n === 1) {     // TSAK – virveli
      noise(t, t + .4, filt('highpass', 1200, .7, env(out, t, .001, .5 * v, 0, .06)));
      const o = osc('triangle', 200, t, t + .3, env(out, t, .001, .4 * v, 0, .05));
      o.frequency.exponentialRampToValueAtTime(140, t + .1);
    } else if (n === 2) {     // TSS – hi-hat
      noise(t, t + .2, filt('highpass', 7500, 1, env(out, t, .001, .3 * v, 0, .025)));
    } else if (n === 3) {     // TUM – tomi
      const o = osc('sine', 230, t, t + .8, env(out, t, .002, .8 * v, 0, .14));
      o.frequency.exponentialRampToValueAtTime(110, t + .3);
    } else if (n === 4) {     // PLÄS – symbaali
      noise(t, t + 2.6, filt('highpass', 5000, .5, env(out, t, .001, .35 * v, 0, .55)));
      noise(t, t + 1, filt('bandpass', 3200, 1, env(out, t, .001, .2 * v, 0, .2)));
    } else if (n === 5) {     // LÄPS – käsientaputus
      clap(t, v, 1150, out);
    } else if (n === 6) {     // TSSH – avoin hi-hat
      noise(t, t + .6, filt('highpass', 7000, .8, env(out, t, .001, .28 * v, 0, .12)));
      noise(t, t + .4, filt('bandpass', 10000, 2, env(out, t, .001, .1 * v, 0, .1)));
    } else {                  // KLONK – lehmänkello
      const g = env(out, t, .001, .3 * v, 0, .09);
      const bp = filt('bandpass', 800, 1.5, g);
      osc('square', 562, t, t + .5, bp);
      osc('square', 845, t, t + .5, bp);
    }
  },
};

// Soittimen tyyppi ratkaisee, mitä pitkä painallus tekee
const SUSTAINED = new Set(['trumpet', 'horn', 'violin', 'flute', 'sax', 'accordion', 'synth', 'synthbass', 'pad']);

/* ─── Käsientaputus, aplodit ja luonnollinen hurraava väkijoukko ─── */

function clap(t, v = 1, f = 1100, out = master) {
  [0, .011, .022].forEach((d, i) => {
    noise(t + d, t + d + .25, filt('bandpass', f, 1.3, env(out, t + d, .001, .5 * v, 0, i < 2 ? .008 : .07)));
  });
}

function applause(t, dur, density, out = master) {
  const n = Math.round(dur * density);
  for (let i = 0; i < n; i++) {
    const at = Math.pow(Math.random(), 1.4) * dur;               // alussa tiheämpää, lopussa hiipuu
    const fade = 1 - .7 * at / dur;
    clap(t + at, rand(.12, .38) * fade, rand(800, 2200), out);
  }
}

// Lasten ja aikuisten vokaalien formantit
const VOWELS = {
  ee: [[370, 1], [3000, .5], [3700, .3]],
  ah: [[950, 1], [1500, .6], [3200, .3]],
  eh: [[650, 1], [2400, .55], [3400, .3]],
  oo: [[450, 1], [1000, .45], [3000, .2]],
};

// Yksi hurraava ääni: j-alku liukuu vokaaliin, sävelkorkeus nousee ja laskee kuin "jeee!"
function cheerVoice(t, f0, vowel, len, v, out) {
  const end = t + len + .5;
  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(v, t + rand(.04, .1));
  p.setTargetAtTime(v * .75, t + .15, .3);
  p.setTargetAtTime(0, t + len, rand(.08, .18));
  let dest = out;
  if (ctx.createStereoPanner) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-.8, .8);
    pan.connect(out);
    dest = pan;
  }
  g.connect(dest);

  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0 * .85, t);
  o.frequency.exponentialRampToValueAtTime(f0 * rand(1.15, 1.35), t + len * rand(.2, .4));
  o.frequency.exponentialRampToValueAtTime(f0 * rand(.72, .9), t + len);
  vibrato([o], t, end, rand(4.5, 6.5), rand(20, 45), .15);
  lfo(rand(9, 14), t, end, o.detune, rand(6, 14), 0, 'triangle');
  const soft = biquad('lowpass', 4000, .5);
  o.connect(soft);
  const target = VOWELS[vowel];
  VOWELS.ee.forEach(([f], i) => {
    const bp = biquad('bandpass', f, [7, 12, 14][i]);
    bp.frequency.setValueAtTime(f, t);
    bp.frequency.linearRampToValueAtTime(target[i][0], t + .12);
    const ag = ctx.createGain();
    ag.gain.value = target[i][1] * 3.2;
    soft.connect(bp);
    bp.connect(ag);
    ag.connect(g);
  });
  noise(t, end, chain(g, biquad('bandpass', target[1][0], 2), (() => { const n = ctx.createGain(); n.gain.value = .12; return n; })()));
  o.start(t);
  o.stop(end);
}

function whistle(t, out) {
  const g = env(out, t, .03, .06, .05, .2, t + .7, .08);
  const o = osc('sine', 1900, t, t + 1.2, g);
  o.frequency.exponentialRampToValueAtTime(2900, t + .25);
  o.frequency.setValueAtTime(2900, t + .45);
  o.frequency.exponentialRampToValueAtTime(1700, t + .75);
  vibrato([o], t, t + 1.2, 6, 25, .1);
}

function crowdCheer(t, voices, dur) {
  const bus = ctx.createGain();
  bus.gain.value = .9;
  bus.connect(master);
  for (let i = 0; i < voices; i++) {
    const kid = Math.random() < .7;
    cheerVoice(t + rand(0, .35), kid ? rand(260, 480) : rand(140, 250),
      pick(['ah', 'ah', 'eh', 'ee', 'oo']), rand(.8, dur), rand(.05, .1), bus);
  }
  whistle(t + rand(.2, .5), bus);
  applause(t + .1, dur + .8, 34, bus);
}

/* ─── Arvauspelin palauteäänet ─── */

function playCheer() {
  if (!audio()) return;
  const t = ctx.currentTime + .02;
  [[60, 0], [64, .1], [67, .2]].forEach(([m, d]) => VOICES.trumpet(m, t + d, .09, master, .7));
  VOICES.trumpet(72, t + .3, .6, master, .8);
  crowdCheer(t + .3, 16, 1.5);
  [84, 88, 91, 96, 100].forEach((m, i) => VOICES.bells(m, t + .45 + i * .07, .2, master, .4));
}

function playEncourage() {
  if (!audio()) return;
  const t = ctx.currentTime + .02;
  // Pehmeä "hups" ilman pettymyksen tuntua
  const o = osc('sine', 520, t, t + .5, env(master, t, .01, .35, 0, .12));
  o.frequency.exponentialRampToValueAtTime(260, t + .3);
  // Kannustavat taputukset ja nouseva "sinä pystyt siihen" -melodia
  clap(t + .35, .8);
  clap(t + .6, .8);
  [[67, .35], [69, .6], [72, .85], [76, 1.05]].forEach(([m, d]) => VOICES.xylo(m, t + d, .2, master, .8));
}

function playParty() {
  if (!audio()) return;
  const t = ctx.currentTime + .02;
  [[67, 0, .1], [72, .15, .1], [76, .3, .1], [79, .45, .4], [76, .9, .12], [79, 1.05, .9]]
    .forEach(([m, d, l]) => { VOICES.trumpet(m, t + d, l, master, .8); VOICES.trumpet(m - 12, t + d, l, master, .45); });
  crowdCheer(t + .9, 22, 2.4);
  VOICES.drums(4, t + 1.05, 1, master, 1);
}

function setMasterMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : .8, ctx.currentTime, .03);
}
