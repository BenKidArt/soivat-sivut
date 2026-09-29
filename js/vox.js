'use strict';
/* ════════════════════ Vokaalipätkät: tavut, sävelkorkeuskäyrät ja vokaalien formantit ════════════════════ */

// Formanttikehykset: [taajuus, Q, voimakkuus] × 3
const F = {
  ee: [[330, 6, 1], [2500, 12, .5], [3300, 14, .3]],
  eh: [[600, 6, 1], [1900, 10, .55], [2700, 12, .25]],
  ah: [[800, 6, 1], [1250, 9, .6], [2700, 12, .25]],
  ae: [[700, 6, 1], [1700, 9, .6], [2600, 12, .25]],
  oh: [[480, 6, 1], [850, 8, .45], [2500, 10, .15]],
  oo: [[330, 6, 1], [750, 8, .35], [2400, 10, .12]],
  uh: [[620, 6, 1], [1150, 8, .5], [2500, 10, .15]],
};

/*
 * Yksi tavu. o: t, dur, out, v, src, f: [[osuus, Hz], ...], forms: [[osuus, F.x], ...],
 * am: [taajuus, syvyys], noise, jitter (sentit), vib: [taajuus, sentit], attack, release, dry
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
    const am = gainNode(1 - o.am[1] / 2);
    lfo(o.am[0], t, end, am.gain, o.am[1] / 2);
    g.connect(am);
    tail = am;
  }
  tail.connect(out);

  const src = ctx.createOscillator();
  src.type = o.src || 'sawtooth';
  src.frequency.setValueAtTime(o.f[0][1], t);
  for (let i = 1; i < o.f.length; i++) src.frequency.exponentialRampToValueAtTime(o.f[i][1], t + o.f[i][0] * dur);
  if (o.vib) vibrato([src], t, end, o.vib[0], o.vib[1], o.vibDelay || .1);
  if (o.jitter) {
    lfo(rand(11, 17), t, end, src.detune, o.jitter, 0, 'triangle');
    lfo(rand(23, 31), t, end, src.detune, o.jitter * .7, 0, 'triangle');
  }
  const mouth = biquad('lowpass', 7000, .7);
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
  mouth.connect(gainNode(o.dry == null ? .06 : o.dry, g));
  if (o.noise) noise(t, end, filt('bandpass', o.noiseF || forms[0][1][1][0], 1.2, gainNode(o.noise, g)));
  src.start(t);
  src.stop(end);
  track(src);
}

// Konsonantin (h, k, t, j) lyhyt kohinapurske
function burstN(t, f, len, v, out) {
  noise(t, t + len + .05, filt('bandpass', f, 1.2, env(out, t, .002, v, 0, len / 3)));
}

// Hype-huudot. r = sävelkorkeuskerroin
const CHOPS = {
  hey(t, out, r = 1, v = 1) {
    const f = 230 * r;
    burstN(t, 1800, .06, .35 * v, out);
    syl({ t: t + .04, dur: .32, out, v: .75 * v, attack: .02, release: .08,
      f: [[0, f * 1.05], [.3, f * 1.12], [1, f * .78]], forms: [[0, F.eh], [.6, F.eh], [1, F.ee]],
      jitter: 25, noise: .1, am: [70, .25] });
  },
  yeah(t, out, r = 1, v = 1) {
    const f = 210 * r;
    syl({ t, dur: .55, out, v: .75 * v, attack: .03, release: .12,
      f: [[0, f * .9], [.25, f * 1.15], [1, f * .75]], forms: [[0, F.ee], [.2, F.eh], [.55, F.ae], [1, F.ah]],
      jitter: 20, noise: .07, am: [60, .2] });
  },
  ay(t, out, r = 1, v = 1) {          // Memphis-tyylinen "ay"
    const f = 150 * r;
    syl({ t, dur: .38, out, v: .85 * v, attack: .02, release: .08,
      f: [[0, f * 1.1], [.4, f * 1.2], [1, f * .8]], forms: [[0, F.ae], [.6, F.ae], [1, F.ee]],
      jitter: 35, noise: .12, am: [55, .35] });
  },
  uh(t, out, r = 1, v = 1) {
    const f = 140 * r;
    syl({ t, dur: .2, out, v: .9 * v, attack: .01, release: .05,
      f: [[0, f * 1.1], [1, f * .8]], forms: [[0, F.uh], [1, F.uh]], jitter: 40, noise: .15, am: [45, .4] });
  },
  woo(t, out, r = 1, v = 1) {
    const f = 330 * r;
    syl({ t, dur: .6, out, v: .6 * v, attack: .05, release: .12,
      f: [[0, f * .75], [.35, f * 1.35], [1, f * 1.1]], forms: [[0, F.oo], [1, F.oo]], jitter: 12, vib: [6, 30] });
  },
  oh(t, out, r = 1, v = 1) {
    const f = 250 * r;
    syl({ t, dur: .5, out, v: .7 * v, attack: .04, release: .12,
      f: [[0, f], [.5, f * 1.08], [1, f * .9]], forms: [[0, F.oh], [1, F.oh]], jitter: 10, vib: [5.5, 20] });
  },
  ooh(t, out, r = 1, v = 1) {        // pehmeä lo-fi "uuh"
    [1, 1.26, 1.5].forEach(k => syl({ t, dur: 1.2, out, v: .22 * v, src: 'triangle', attack: .25, release: .4,
      f: [[0, 260 * r * k], [1, 250 * r * k]], forms: [[0, F.oo], [1, F.oh]], dry: .5, vib: [5, 14] }));
  },
};

// Melodinen vokaalipätkä: sävelessä laulava "ah / oh"
function voxNote(m, t, dur, out, v = 1, e) {
  const f = mtof(m);
  const vowel = e && e.vowel ? F[e.vowel] : F.ah;
  syl({ t, dur: Math.max(dur, .12), out, v: .55 * v, attack: .015, release: .06,
    f: [[0, f], [1, f]], forms: [[0, vowel], [1, vowel]], vib: [5.5, 15], vibDelay: .15, dry: .1 });
}
