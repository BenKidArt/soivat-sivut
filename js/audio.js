'use strict';
/* ════════════════════ Äänet: syntikat, rummut ja tehosteet (moottori: engine.js) ════════════════════ */

/* ─── Ennalta lasketut äänet ─── */

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
  const a = 1 - Math.exp(-2 * Math.PI * fc / sr);
  let lp = 0;
  const n = Math.min(d.length, Math.floor(sr * len));
  for (let i = 0; i < n; i++) {
    lp += ((Math.random() * 2 - 1) - lp) * a;
    d[i] += lp * amp * Math.exp(-i / (sr * tau));
  }
}

// Piano: epäharmoniset osasävelet, kaksivaiheinen vaimeneminen, kaksi huojuvaa kieltä ja vasaran isku
function pianoBuffer(m) {
  const f0 = mtof(m);
  return cachedBuffer('piano' + m, m < 55 ? 3.6 : m < 72 ? 3 : 2.2, (d, sr) => {
    const B = .00012 * Math.pow(2, (m - 60) / 18);
    const sus = Math.pow(261.6 / f0, .5);
    const det = rand(.5, 1.1) / 1731;
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

// Karplus–Strong-kieli, viritetty tarkasti toistonopeudella
function ksBuffer(key, m, sec, loss, smooth) {
  const sr = ctx.sampleRate;
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

// Vinyylirätinä: kohinaa ja satunnaisia napsahduksia
function crackleBuffer() {
  return cachedBuffer('crackle', 4, (d, sr) => {
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * .08;
      d[i] = lp * .12;
      if (Math.random() < 9 / sr) {
        const amp = rand(.3, 1) * (Math.random() < .5 ? 1 : -1);
        for (let k = 0; k < 40 && i + k < d.length; k++) d[i + k] += amp * Math.exp(-k / 6);
      }
    }
  });
}

/* ─── Melodiset äänet: VOICES[id](sävel, aika, kesto, ulostulo, voimakkuus, tapahtuma) ─── */

function eight08(m, t, dur, out, v, e, k) {
  const f = mtof(m), end = t + dur + .8;
  const g = env(out, t, .003, .65 * v, .45 * v, Math.max(.35, dur * .8), t + dur, .08);
  const sh = drive(k, filt('lowpass', 700 + k * 350, .7, g));
  const o = osc('sine', f, t, end, sh);
  if (e && e.from != null) {                       // liuku edellisestä sävelestä
    o.frequency.setValueAtTime(mtof(e.from), t);
    o.frequency.exponentialRampToValueAtTime(f, t + Math.min(.14, dur * .6));
  } else {
    o.frequency.setValueAtTime(f * 2.3, t);
    o.frequency.exponentialRampToValueAtTime(f, t + .045);
  }
}

const VOICES = {
  sub(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .3;
    const g = env(out, t, .005, .75 * v, .7 * v, .5, t + dur, .03);
    const sh = drive(1.6, g);
    osc('sine', f, t, end, sh);
    osc('sine', f * 2, t, end, sh, .15);
  },

  b808(m, t, dur, out, v = 1, e) { eight08(m, t, dur, out, v, e, 1.8); },
  b808x(m, t, dur, out, v = 1, e) { eight08(m, t, dur, out, v * .8, e, 5); },    // phonkin rouhea 808

  acid(m, t, dur, out, v = 1, e) {
    const f = mtof(m), end = t + dur + .3;
    const g = env(out, t, .003, .45 * v, .35 * v, .2, t + dur, .03);
    const lp = biquad('lowpass', 300, 13);
    chain(g, lp, drive(2.2));
    const peak = (e && e.acc ? 4200 : 2000) * v;
    lp.frequency.setValueAtTime(Math.max(peak, f * 2), t);
    lp.frequency.setTargetAtTime(220 + f, t + .005, e && e.acc ? .14 : .09);
    const o = osc('sawtooth', f, t, end, lp);
    if (e && e.from != null) {
      o.frequency.setValueAtTime(mtof(e.from), t);
      o.frequency.exponentialRampToValueAtTime(f, t + .06);
    }
  },

  reese(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .4;
    const g = env(out, t, .01, .55 * v, .5 * v, .3, t + dur, .06);
    const lp = biquad('lowpass', 750, 2);
    chain(g, lp, drive(1.8));
    lfo(.35, t, end, lp.frequency, 450);
    const [l, r] = wide(lp, .5);
    osc('sawtooth', f, t, end, l, .5, -17);
    osc('sawtooth', f, t, end, r, .5, 17);
    osc('sine', f / 2, t, end, g, .45);
  },

  organ(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .3;
    const g = env(out, t, .002, .6 * v, .24 * v, .22, t + dur, .05);
    osc(organWave(), f, t, end, filt('lowpass', 5500, .7, g));
    noise(t, t + .02, filt('highpass', 3000, .7, env(out, t, .001, .05 * v, 0, .004)));
  },

  rhodes(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + Math.max(dur, .4) + 1.2;
    const trem = panner(0, out);
    if (trem.pan) lfo(4.2, t, end, trem.pan, .45, .05);
    const g = env(trem, t, .003, .42 * v, .12 * v, .9, t + Math.max(dur, .4), .25);
    const car = osc('sine', f, t, end, g);
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.8 * v, t);
    mg.gain.setTargetAtTime(f * .25, t, .35);
    const mod = osc('sine', f, t, end, mg);
    mg.connect(car.frequency);
    osc('sine', f * 14.1, t, t + .2, env(out, t, .001, .06 * v, 0, .025));    // tine-kilahdus
    return mod;
  },

  stab(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + .8;
    const g = env(out, t, .003, .7 * v, 0, .16);
    const lp = filt('lowpass', 2400, 3, g);
    lp.frequency.setTargetAtTime(500, t, .09);
    const [l, r] = wide(lp, .5);
    [-9, 0, 9].forEach((d, i) => osc('sawtooth', f, t, end, [l, lp, r][i], .45, d));
  },

  pad(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + 1.6;
    const g = env(out, t, .3, .7 * v, .65 * v, .3, t + dur, .4);
    const [l, r] = wide(filt('lowpass', 2600, .7, g), .8);
    [-16, -7, 0, 7, 16].forEach((d, i) => osc('sawtooth', f, t, end, i % 2 ? r : l, .32, d));
  },

  darkpad(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + 2;
    const g = env(out, t, .5, .8 * v, .76 * v, .4, t + dur, .6);
    const lp = filt('lowpass', 800, 1.5, g);
    lfo(.12, t, end, lp.frequency, 350);
    const [l, r] = wide(lp, .6);
    [-12, 0, 12].forEach((d, i) => osc('sawtooth', f, t, end, i % 2 ? r : l, .4, d));
    osc('triangle', f / 2, t, end, g, .3);
  },

  choir(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + 1.2;
    const g = env(out, t, .35, 1.5 * v, 1.4 * v, .3, t + dur, .4);
    const mix = gainNode(1);
    [[800, 7, 1], [1150, 9, .6], [2900, 12, .25]].forEach(([ff, q, a]) => mix.connect(filt('bandpass', ff, q, gainNode(a * 2.5, g))));
    const [l, r] = wide(mix, .6);
    const oscs = [-8, 0, 8].map((d, i) => osc('sawtooth', f, t, end, [l, mix, r][i], .4, d));
    vibrato(oscs, t, end, 5, 12, .3);
  },

  pluck(m, t, dur, out, v = 1) {
    const f = mtof(m);
    const g = env(out, t, .003, .55 * v, 0, .15);
    const lp = filt('lowpass', f * 8, 2, g);
    lp.frequency.setTargetAtTime(f * 1.5, t, .08);
    const [l, r] = wide(lp, .4);
    osc('square', f, t, t + .9, l, .5);
    osc('sawtooth', f, t, t + .9, r, .5, 8);
  },

  lead(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .5;
    const g = env(out, t, .01, .38 * v, .3 * v, .2, t + dur, .1);
    const lp = filt('lowpass', f * 2, 3, g);
    lp.frequency.setValueAtTime(f * 2, t);
    lp.frequency.linearRampToValueAtTime(Math.min(f * 12, 14000), t + .02);
    lp.frequency.setTargetAtTime(Math.min(f * 5, 9000), t + .03, .18);
    const [l, r] = wide(lp, .45);
    const oscs = [-12, 0, 12].map((d, i) => osc('sawtooth', f, t, end, [l, lp, r][i], .42, d));
    vibrato(oscs, t, end, 5.5, 10, .3);
  },

  hoover(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .4;
    const g = env(out, t, .02, .3 * v, .26 * v, .2, t + dur, .1);
    const pre = gainNode(1);
    chain(g, pre, drive(2), biquad('lowpass', 3800, 1));
    const [l, r] = wide(pre, .6);
    const oscs = [-35, -15, 0, 15, 35].map((d, i) => osc('sawtooth', f, t, end, [l, l, pre, r, r][i], .3, d));
    oscs.forEach(o => {                                              // hooverin tunnusomainen sävelnotkahdus
      o.detune.setValueAtTime(o.detune.value + 120, t);
      o.detune.linearRampToValueAtTime(o.detune.value - 90, t + .08);
      o.detune.linearRampToValueAtTime(o.detune.value, t + .22);
    });
  },

  bleep(m, t, dur, out, v = 1) {
    const f = mtof(m);
    const g = env(out, t, .002, .3 * v, 0, .07);
    osc('sine', f, t, t + .5, g);
    osc('square', f * 2, t, t + .5, g, .08);
  },

  bells(m, t, dur, out, v = 1) {
    playBuffer(glockBuffer(m), t, env(panner(rand(-.35, .35), out), t, .001, .45 * v, .45 * v, 1));
  },

  piano(m, t, dur, out, v = 1) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(.8 * v, t);
    g.gain.setTargetAtTime(0, t + Math.max(dur, .25) + .1, .12);
    g.connect(panner(Math.max(-.5, Math.min(.5, (m - 62) / 50)), out));
    playBuffer(pianoBuffer(m), t, filt('lowpass', 2500 + 7000 * v, .5, g));
  },

  lofipiano(m, t, dur, out, v = 1) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.1 * v, t);
    g.gain.setTargetAtTime(0, t + Math.max(dur, .3) + .2, .2);
    g.connect(out);
    const s = playBuffer(pianoBuffer(m), t, filt('lowpass', 2200, .6, g));
    if (s.detune) lfo(.7, t, t + 4, s.detune, 14);                   // kasetin huojunta
  },

  guitar(m, t, dur, out, v = 1) {
    const { buf, rate } = ksBuffer('ks', m, 2, .996, .5);
    const g = env(out, t, .002, .9 * v, .9 * v, 1, t + Math.max(dur, 1.2), .15);
    playBuffer(buf, t, filt('lowpass', 3000, .5, g), rate);
  },

  flute(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .5;
    const trem = gainNode(1, out);
    const g = env(trem, t, .06, .45 * v, .38 * v, .2, t + dur, .07);
    const o = osc(fluteWave(), f, t, end, g);
    vibrato([o], t, end, 5, 10, .15);
    lfo(5, t, end, trem.gain, .12, .15);
    noise(t, t + .1, filt('bandpass', f * 2, 2, env(out, t, .005, .12 * v, 0, .03)));
    noise(t, end, filt('bandpass', f, 4, env(out, t, .05, .06 * v, .04 * v, .1, t + dur, .06)));
  },

  cow(m, t, dur, out, v = 1) {            // pitchattu 808-lehmänkello, phonkin tavaramerkki
    const f = mtof(m);
    const g = env(out, t, .001, .5 * v, .15 * v, .05, t + Math.max(dur, .12), .12);
    const bp = filt('bandpass', f * 1.25, 1.6, drive(1.6, filt('lowpass', 7000, .7, g)));
    osc('square', f, t, t + 1.2, bp);
    osc('square', f * 1.48, t, t + 1.2, bp);
  },

  lofibass(m, t, dur, out, v = 1) {
    const f = mtof(m), end = t + dur + .3;
    const g = env(out, t, .006, .8 * v, .5 * v, .4, t + dur, .06);
    const lp = filt('lowpass', 520, .8, drive(1.4, g));
    osc('sine', f, t, end, lp);
    osc('triangle', f, t, end, lp, .5);
  },

  vox(m, t, dur, out, v = 1, e) { voxNote(m, t, dur, out, v, e); },
};

// Pitkissä äänissä nuotti soi niin kauan kuin nappia pidetään
const SUSTAINED = new Set(['sub', 'b808', 'b808x', 'acid', 'reese', 'organ', 'pad', 'darkpad', 'choir', 'lead', 'hoover', 'flute', 'lofibass', 'vox']);

/* ─── Rummut: DRUMS[nimi](aika, voimakkuus, ulostulo, kesto, tapahtuma) ─── */

function kick(t, v, out, f0, f1, sweep, decay, click, k) {
  const g = env(out, t, .0015, v, 0, decay);
  const dest = k ? drive(k, g) : g;
  const o = osc('sine', f0, t, t + decay * 8, dest);
  o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
  // Punch: lyhyt yläsävel iskun alussa
  const p = osc('sine', f0 * 1.5, t, t + .08, env(out, t, .001, .22 * v, 0, .014));
  p.frequency.exponentialRampToValueAtTime(f1 * 2, t + .03);
  if (click) {
    noise(t, t + .02, filt('highpass', 2500, .7, env(out, t, .001, click * v, 0, .004)));
    osc('sine', 2600, t, t + .012, env(out, t, .0005, click * .5 * v, 0, .0018));
  }
}

// 808-tyylinen metallinen lähde hi-hateille ja rideille
function metal(t, decay, v, out, bp = 10000, hp = 7000) {
  const g = env(out, t, .001, v, 0, decay);
  const f = chain(g, biquad('bandpass', bp, .8), biquad('highpass', hp, .7));
  [205.3, 304.4, 369.6, 522.7, 540, 800].forEach(fr => osc('square', fr * 1.6, t, t + decay * 8 + .05, f, .3));
  noise(t, t + decay * 8 + .05, filt('highpass', 9000, .7, gainNode(.35, g)));     // ilmaa ja sihinää
  return g;
}

// Open hat katkeaa, kun closed hat soi (kuten oikeassa rumpukoneessa)
let openHat = null;
function chokeOpenHat(t) {
  if (openHat && openHat.t < t) {
    openHat.g.gain.cancelScheduledValues(t);
    openHat.g.gain.setTargetAtTime(0, t, .008);
    openHat = null;
  }
}

function snare(t, v, out, hp, ndec, tone, tdec, nlev = .55) {
  const nb = env(out, t, .001, nlev * v, 0, ndec);
  noise(t, t + ndec * 8, chain(nb, biquad('highpass', hp, .7), biquad('peaking', 5000, 1, 4)));
  // Kaksi kalvon värähtelymuotoa
  [[tone, .45, 1], [tone * 1.62, .2, .7]].forEach(([f, a, k]) => {
    const o = osc('triangle', f, t, t + tdec * 8, env(out, t, .001, a * v, 0, tdec * k));
    o.frequency.exponentialRampToValueAtTime(f * .75, t + .08);
  });
}

function clap(t, v = 1, f = 1150, out = master, tail = .07) {
  [0, .009, .019, .029].forEach((d, i) => {
    const last = i === 3;
    const dest = panner(rand(-.25, .25), out);
    noise(t + d, t + d + tail * 6 + .05, filt('bandpass', f * rand(.92, 1.08), 1.2, env(dest, t + d, .001, (last ? 1.3 : 1) * v, 0, last ? tail : .006)));
  });
}

const DRUMS = {
  kick909(t, v, out) { kick(t, v, out, 175, 48, .09, .16, .18); },
  kickT(t, v, out) { kick(t, v * .95, out, 160, 44, .1, .22, .15, 2.2); },
  kickDnb(t, v, out) { kick(t, v, out, 210, 52, .06, .12, .3, 1.5); },
  kickLofi(t, v, out) { kick(t, v * .9, out, 120, 50, .08, .14, 0); },
  kick808(t, v, out, dur, e) { VOICES.b808(e && e.p ? e.p : 41, t, .5, out, v); },
  kick808x(t, v, out, dur, e) { VOICES.b808x(e && e.p ? e.p : 42, t, .4, out, v * .9); },
  rumble(t, v, out) {           // teknon jylinä: basarin tumma kaiku
    const g = env(out, t + .02, .05, .5 * v, 0, .18);
    osc('sine', 52, t, t + 1, drive(3, filt('lowpass', 140, 1, g)));
    noise(t, t + 1, filt('lowpass', 160, 2, env(out, t + .02, .06, .5 * v, 0, .15)));
  },
  clap(t, v, out) { clap(t, v, 1150, out); },
  clapT(t, v, out) { clap(t, v, 1350, out, .14); },
  snare909(t, v, out) { snare(t, v, out, 1800, .1, 190, .07); },
  snareTrap(t, v, out) { snare(t, v, out, 1500, .12, 220, .05, .65); clap(t, v * .5, 1400, out); },
  snareDnb(t, v, out) { snare(t, v * 1.1, out, 2400, .11, 240, .06, .6); },
  snareLofi(t, v, out) { snare(t, v * .8, filt('lowpass', 4500, .7, out), 1200, .1, 180, .06); },
  rim(t, v, out) {
    const g = env(out, t, .001, .35 * v, 0, .012);
    const bp = filt('bandpass', 1700, 3, g);
    osc('square', 1700, t, t + .1, bp);
    osc('triangle', 460, t, t + .1, g, .6);
  },
  hat(t, v, out) { chokeOpenHat(t); metal(t, .035, .32 * v, out); },
  hatO(t, v, out) { openHat = { g: metal(t, .22, .26 * v, out), t }; },
  ride(t, v, out) { metal(t, .5, .16 * v, out, 5200, 3500); },
  shaker(t, v, out) { noise(t, t + .2, filt('bandpass', 6500, 1, env(out, t, .012, .22 * v, 0, .035))); },
  tom(t, v, out) { kick(t, .7 * v, out, 190, 95, .25, .18, 0); },
  conga(t, v, out) { kick(t, .55 * v, out, 330, 250, .05, .12, .05); },
  snap(t, v, out) { noise(t, t + .1, filt('bandpass', 2600, 2, env(out, t, .001, .55 * v, 0, .012))); },
  crash(t, v, out) {
    [-.5, .5].forEach(p => noise(t, t + 2.6, filt('highpass', 5000, .5, env(panner(p, out), t, .001, .24 * v, 0, .55))));
    metal(t, .6, .1 * v, out, 6000, 4000);
  },
  cowbell(t, v, out, dur, e) { VOICES.cow(e && e.p ? e.p : 79, t, .1, out, v); },
  crackle(t, v, out, dur) {
    const s = playBuffer(crackleBuffer(), t, gainNode(.5 * v, out));
    s.loop = true;
    s.stop(t + dur);
  },
};

/* ─── Tehosteet (one-shot) ─── */

const FXS = {
  riser(t, out, len = 2.2) {
    const g = env(out, t, len, .35, .35, 1, t + len, .05);
    const bp = filt('bandpass', 400, 3, g);
    bp.frequency.exponentialRampToValueAtTime(9000, t + len);
    noise(t, t + len + .3, bp);
    const o = osc('sawtooth', 200, t, t + len + .3, filt('lowpass', 3000, 1, gainNode(.25, g)));
    o.frequency.exponentialRampToValueAtTime(1600, t + len);
  },
  impact(t, out) {
    const o = osc('sine', 110, t, t + 2.5, drive(2, env(out, t, .003, .9, 0, .55)));
    o.frequency.exponentialRampToValueAtTime(30, t + 1.5);
    noise(t, t + 2, filt('lowpass', 900, .7, env(out, t, .002, .5, 0, .3)));
    DRUMS.crash(t, .8, out);
  },
  drop808(t, out) {
    const o = osc('sine', 90, t, t + 2.2, drive(3, filt('lowpass', 1200, .7, env(out, t, .003, .8, 0, .7))));
    o.frequency.exponentialRampToValueAtTime(28, t + 1.8);
  },
  airhorn(t, out) {                      // BWAAP BWAP BWAAAAP
    [[0, .22], [.3, .12], [.48, .55]].forEach(([d, len]) => {
      const g = env(out, t + d, .01, .22, .2, .1, t + d + len, .04);
      const pre = gainNode(1);
      chain(g, pre, drive(3), biquad('bandpass', 1400, .6));
      [0, 7, -8, 12].forEach(det => {
        const o = osc('sawtooth', 466, t + d, t + d + len + .3, pre, .3, det);
        o.frequency.setValueAtTime(420, t + d);
        o.frequency.exponentialRampToValueAtTime(466, t + d + .05);
      });
    });
  },
  laser(t, out) {
    const o = osc('square', 3200, t, t + .5, filt('lowpass', 5000, 2, env(out, t, .002, .25, 0, .1)));
    o.frequency.exponentialRampToValueAtTime(120, t + .35);
  },
  siren(t, out) {
    const g = env(out, t, .05, .2, .2, .2, t + 1.8, .15);
    const o = osc('square', 700, t, t + 2.3, filt('lowpass', 2500, 1, g));
    lfo(3, t, t + 2.3, o.frequency, 260, 0, 'triangle');
  },
  scratch(t, out) {
    const g = env(out, t, .005, .5, .5, .1, t + .45, .03);
    const bp = filt('bandpass', 1200, 1.5, g);
    const s = noise(t, t + .6, bp, 1);
    const o = osc('sawtooth', 180, t, t + .6, bp, .6);
    [[0, 1], [.08, 3], [.16, .6], [.24, 2.5], [.32, .8], [.4, 2]].forEach(([d, r]) => {
      s.playbackRate.linearRampToValueAtTime(r, t + d);
      o.frequency.linearRampToValueAtTime(120 * r, t + d);
      bp.frequency.linearRampToValueAtTime(900 * r, t + d);
    });
  },
  rewind(t, out) {
    const g = env(out, t, .01, .35, .35, .2, t + 1.2, .1);
    const bp = filt('bandpass', 1500, 2, g);
    const o = osc('sawtooth', 300, t, t + 1.5, bp);
    lfo(9, t, t + 1.5, o.frequency, 250);
    o.frequency.linearRampToValueAtTime(900, t + 1.1);
    noise(t, t + 1.5, bp);
  },
  chime(t, out) {
    [84, 88, 91, 96].forEach((m, i) => VOICES.bells(m, t + i * .08, .2, out, .6));
  },
  revcym(t, out) {
    const len = 1.6;
    noise(t, t + len + .1, filt('highpass', 4500, .5, env(out, t, len, .35, .35, 1, t + len, .01)));
  },
};
