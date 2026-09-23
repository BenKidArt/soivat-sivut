'use strict';
/* ════════════════════ Eläinäänet: tavut, sävelkorkeuskäyrät ja vokaalien formantit ════════════════════ */

// Formanttikehykset: [taajuus, Q, voimakkuus] × 3
const F = {
  m:  [[250, 5, 1], [1100, 8, .08], [2500, 10, .03]],
  u:  [[350, 6, 1], [800, 8, .35], [2400, 10, .12]],
  o:  [[480, 6, 1], [950, 8, .45], [2600, 10, .15]],
  i:  [[380, 6, 1], [2700, 12, .5], [3400, 14, .3]],
  a:  [[900, 6, 1], [1500, 9, .6], [3000, 12, .25]],
  ae: [[760, 6, 1], [1800, 9, .6], [2700, 12, .25]],
  oe: [[450, 6, 1], [1400, 9, .45], [2300, 12, .2]],
  nas: [[1000, 9, 1], [2300, 12, .6], [3500, 14, .3]],
};

/*
 * Yksi tavu. o:
 *   t, dur, out, v, src (aaltomuoto), f: [[osuus, Hz], ...] sävelkäyrä,
 *   forms: [[osuus, F.x], ...] vokaalikäyrä, lp: [[osuus, Hz], ...] suun avautuminen,
 *   am: [taajuus, syvyys] karheus / määkiminen, noise: kohinan osuus, jitter: epätasaisuus sentteinä,
 *   vib: [taajuus, sentit], attack, release
 */
function syl(o) {
  const { t, dur, out } = o;
  const v = o.v == null ? 1 : o.v;
  const end = t + dur + .4;
  const attack = o.attack || .02, release = o.release || .06;

  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(v, t + attack);
  p.setTargetAtTime(v * .85, t + attack, dur * .4);
  p.setTargetAtTime(0, t + dur, release / 3);
  let tail = g;
  if (o.am) {
    const am = ctx.createGain();
    am.gain.value = 1 - o.am[1] / 2;
    lfo(o.am[0], t, end, am.gain, o.am[1] / 2, 0, o.amType || 'sine');
    g.connect(am);
    tail = am;
  }
  tail.connect(out);

  const src = ctx.createOscillator();
  src.type = o.src || 'sawtooth';
  const fp = o.f;
  src.frequency.setValueAtTime(fp[0][1], t);
  for (let i = 1; i < fp.length; i++) src.frequency.exponentialRampToValueAtTime(fp[i][1], t + fp[i][0] * dur);
  if (o.vib) vibrato([src], t, end, o.vib[0], o.vib[1], o.vibDelay || 0);
  if (o.jitter) {
    lfo(rand(11, 17), t, end, src.detune, o.jitter, 0, 'triangle');
    lfo(rand(23, 31), t, end, src.detune, o.jitter * .7, 0, 'triangle');
  }

  const mouth = biquad('lowpass', 8000, .7);
  if (o.lp) {
    mouth.frequency.setValueAtTime(o.lp[0][1], t);
    for (let i = 1; i < o.lp.length; i++) mouth.frequency.linearRampToValueAtTime(o.lp[i][1], t + o.lp[i][0] * dur);
  }
  src.connect(mouth);

  const forms = o.forms;
  for (let k = 0; k < 3; k++) {
    const bp = biquad('bandpass', forms[0][1][k][0], forms[0][1][k][1]);
    const fg = ctx.createGain();
    fg.gain.setValueAtTime(forms[0][1][k][2] * 3, t);
    for (let i = 1; i < forms.length; i++) {
      const at = t + forms[i][0] * dur;
      bp.frequency.linearRampToValueAtTime(forms[i][1][k][0], at);
      fg.gain.linearRampToValueAtTime(forms[i][1][k][2] * 3, at);
    }
    mouth.connect(bp);
    bp.connect(fg);
    fg.connect(g);
  }
  const dry = ctx.createGain();
  dry.gain.value = o.dry == null ? .06 : o.dry;
  mouth.connect(dry);
  dry.connect(g);
  if (o.noise) {
    const ng = ctx.createGain();
    ng.gain.value = o.noise;
    ng.connect(g);
    noise(t, end, filt('bandpass', o.noiseF || forms[0][1][1][0], 1.2, ng));
  }
  src.start(t);
  src.stop(end);
  track(src);
}

// Konsonantin (k, t, h) lyhyt kohinapurske
function burstN(t, f, len, v, out) {
  noise(t, t + len + .05, filt('bandpass', f, 1.2, env(out, t, .002, v, 0, len / 3)));
}

// r = sävelkorkeuskerroin (1 = eläimen luonnollinen ääni)
const ANIMAL_VOICES = {
  cow(t, r, out, v) {        // Ammuu – matala, nenäinen, aukeaa u-vokaaliin
    const f = 128 * r;
    syl({ t, dur: 1.25, out, v: .55 * v, attack: .12, release: .25,
      f: [[0, f * .92], [.2, f * 1.02], [.65, f * 1.06], [1, f * .78]],
      forms: [[0, F.m], [.22, F.m], [.45, F.u], [1, F.o]],
      lp: [[0, 500], [.3, 2200], [1, 1800]], jitter: 8, noise: .05, vib: [4, 12] });
  },
  cat(t, r, out, v) {        // Miau – i → a → u
    const f = 590 * r;
    syl({ t, dur: .75, out, v: .4 * v, attack: .05, release: .12,
      f: [[0, f * .82], [.3, f * 1.15], [.7, f * 1.04], [1, f * .72]],
      forms: [[0, F.m], [.1, F.i], [.45, F.a], [1, F.u]],
      lp: [[0, 900], [.12, 6000], [1, 4000]], jitter: 6, vib: [6, 25], vibDelay: .2 });
  },
  dog(t, r, out, v) {        // Hau hau – kaksi karheaa haukahdusta
    [0, .32].forEach((d, i) => {
      const f = 400 * r * (i ? .93 : 1);
      burstN(t + d, 1500, .04, .25 * v, out);
      syl({ t: t + d + .02, dur: .2, out, v: .9 * v, attack: .012, release: .05,
        f: [[0, f * .9], [.25, f * 1.1], [1, f * .7]],
        forms: [[0, F.a], [.6, F.a], [1, F.u]],
        am: [65, .5], jitter: 30, noise: .25, noiseF: 1300 });
    });
  },
  duck(t, r, out, v) {       // Kvaak – nenäinen ja rämisevä
    [0, .34].forEach(d => {
      const f = 290 * r;
      burstN(t + d, 2500, .03, .2 * v, out);
      syl({ t: t + d + .025, dur: .26, out, v: 1 * v, attack: .015, release: .05,
        f: [[0, f * 1.06], [1, f * .84]], forms: [[0, F.nas], [1, F.nas]],
        am: [48, .75], amType: 'square', jitter: 15, noise: .12, noiseF: 2300, dry: .15 });
    });
  },
  frog(t, r, out, v) {       // Kurr kurr – naksuva kurnutus
    [0, .5].forEach(d => {
      syl({ t: t + d, dur: .38, out, v: 1.1 * v, src: 'square', attack: .03, release: .06,
        f: [[0, 28 * r], [1, 23 * r]],
        forms: [[0, [[520 * r, 5, 1], [1450 * r, 6, .5], [2400, 8, .15]]], [1, [[480 * r, 5, 1], [1300 * r, 6, .5], [2400, 8, .15]]]],
        am: [13, .7], dry: .02 });
    });
  },
  bird(t, r, out, v) {       // Tsirp tsirp – nopeat korkeat liverrykset
    [0, .16, .32, .6, .76].forEach((d, i) => {
      const f = 3400 * r * (i % 2 ? 1.12 : 1);
      const g = env(out, t + d, .006, .35 * v, 0, .035);
      const o = osc('sine', f, t + d, t + d + .2, g);
      o.frequency.exponentialRampToValueAtTime(f * 1.45, t + d + .04);
      o.frequency.exponentialRampToValueAtTime(f * .9, t + d + .09);
      lfo(38, t + d, t + d + .2, o.detune, 90);
    });
  },
  sheep(t, r, out, v) {      // Bää – voimakas määkivä tremolo
    const f = 270 * r;
    syl({ t, dur: .95, out, v: .7 * v, attack: .06, release: .15,
      f: [[0, f * .95], [.15, f * 1.08], [1, f * .88]],
      forms: [[0, F.m], [.1, F.ae], [1, F.ae]], lp: [[0, 400], [.1, 5000], [1, 3500]],
      am: [7.5, .65], vib: [7.5, 70], jitter: 10, noise: .06 });
  },
  pig(t, r, out, v) {        // Röh röh – matala röhkäisy
    [0, .3].forEach(d => {
      const f = 105 * r;
      syl({ t: t + d, dur: .22, out, v: 1.3 * v, attack: .02, release: .05,
        f: [[0, f * 1.1], [1, f * .8]], forms: [[0, F.oe], [1, F.oe]],
        am: [34, .8], amType: 'square', jitter: 60, noise: .35, noiseF: 900 });
    });
  },
  rooster(t, r, out, v) {    // Kukko kiekuu
    const f = 560 * r;
    const parts = [
      [0, .11, f * .95, f, F.u], [.16, .11, f, f * 1.05, F.o],
      [.34, .2, f * 1.3, f * 1.5, F.i], [.58, .62, f * 1.45, f * 1.05, F.u],
    ];
    parts.forEach(([d, len, a, b, vow]) => {
      burstN(t + d - .02, 2200, .025, .15 * v, out);
      syl({ t: t + d, dur: len, out, v: .8 * v, attack: .02, release: .1,
        f: [[0, a], [.4, b], [1, b * .92]], forms: [[0, vow], [1, vow]],
        am: [85, .3], jitter: 20, noise: .06 });
    });
  },
  owl(t, r, out, v) {        // Huhuu – pehmeä ja pyöreä
    [[0, .22, 1], [.38, .7, .94]].forEach(([d, len, k]) => {
      const f = 390 * r * k;
      noise(t + d, t + d + len + .2, filt('lowpass', 1200, .7, env(out, t + d, .04, .03 * v, .02 * v, .1, t + d + len, .08)));
      syl({ t: t + d, dur: len, out, v: .15 * v, src: 'triangle', attack: .07, release: .15,
        f: [[0, f * 1.04], [.3, f], [1, f * .9]], forms: [[0, F.u], [1, F.u]], dry: .6, vib: [5, 8] });
    });
  },
};

const ANIMALS = [
  { id: 'cow', name: 'Lehmä', word: 'Ammuu!', art: '🐮', h: 30, nat: 48 },
  { id: 'cat', name: 'Kissa', word: 'Miau!', art: '🐱', h: 45, nat: 74 },
  { id: 'dog', name: 'Koira', word: 'Hau hau!', art: '🐶', h: 20, nat: 67 },
  { id: 'duck', name: 'Ankka', word: 'Kvaak!', art: '🦆', h: 140, nat: 62 },
  { id: 'frog', name: 'Sammakko', word: 'Kurr kurr!', art: '🐸', h: 110, nat: 60 },
  { id: 'bird', name: 'Lintu', word: 'Tsirp tsirp!', art: '🐦', h: 200, nat: 96 },
  { id: 'sheep', name: 'Lammas', word: 'Bää!', art: '🐑', h: 280, nat: 61 },
  { id: 'pig', name: 'Possu', word: 'Röh röh!', art: '🐷', h: 330, nat: 45 },
  { id: 'rooster', name: 'Kukko', word: 'Kukkokiekuu!', art: '🐓', h: 0, nat: 73 },
  { id: 'owl', name: 'Pöllö', word: 'Huhuu!', art: '🦉', h: 260, nat: 67 },
];
const ANIMAL = Object.fromEntries(ANIMALS.map(a => [a.id, a]));

// Soittaa eläimen: m = MIDI-sävel (null = luonnollinen), cut = katkaisu sekunteina (rulla)
function playAnimal(id, t, m, out = master, v = 1, cut = 0) {
  const a = ANIMAL[id];
  let r = 1;
  if (m != null) {
    // Siirretään oktaaveittain lähelle eläimen luonnollista ääntä, jotta eläin kuulostaa itseltään
    let n = m;
    while (n - a.nat > 6) n -= 12;
    while (a.nat - n > 6) n += 12;
    r = mtof(n) / mtof(a.nat);
  }
  const gate = ctx.createGain();
  gate.connect(out);
  if (cut) {
    gate.gain.setValueAtTime(1, t);
    gate.gain.setTargetAtTime(0, t + cut, .02);
    setTimeout(() => gate.disconnect(), (t - ctx.currentTime + cut + 1) * 1000);
  }
  ANIMAL_VOICES[id](t, r, gate, v);
}
