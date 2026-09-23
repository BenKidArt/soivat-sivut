'use strict';
/* ════════════════════ Musiikki: soittimet, silmukat, tyylit ja tahdissa pysyvä sekvensseri ════════════════════ */

const svg = body => `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;

const FLUTE_SVG = svg(`<g transform="rotate(-35 50 50)">
  <rect x="4" y="41" width="92" height="18" rx="9" fill="#d5dde8" stroke="#56627a" stroke-width="3"/>
  <rect x="9" y="44" width="82" height="5" rx="2.5" fill="#fff" opacity=".8"/>
  <ellipse cx="20" cy="50" rx="4.5" ry="3.2" fill="#2f3850"/>
  ${[44, 55, 66, 79].map(x => `<circle cx="${x}" cy="50" r="3.4" fill="#f6c343" stroke="#56627a" stroke-width="1.5"/>`).join('')}
  <rect x="90" y="39" width="7" height="22" rx="3" fill="#b8c2d2" stroke="#56627a" stroke-width="3"/></g>`);

const XYLO_SVG = svg(`
  <path d="M6 33 L94 41 M6 69 L94 61" stroke="#8a5528" stroke-width="7" stroke-linecap="round"/>
  ${[0, 1, 2, 3, 4, 5].map(i => {
    const h = 62 - i * 6, x = 9 + i * 14, y = 51 - h / 2;
    return `<rect x="${x}" y="${y}" width="12" height="${h}" rx="4" fill="hsl(${i * 55} 90% 58%)" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>
            <circle cx="${x + 6}" cy="${y + 6}" r="1.6" fill="#fff"/><circle cx="${x + 6}" cy="${y + h - 6}" r="1.6" fill="#fff"/>`;
  }).join('')}
  <path d="M62 4 L86 26" stroke="#c98b4a" stroke-width="3.5" stroke-linecap="round"/><circle cx="60" cy="4" r="6" fill="#ff4f7b"/>
  <path d="M96 12 L76 30" stroke="#c98b4a" stroke-width="3.5" stroke-linecap="round"/><circle cx="97" cy="10" r="6" fill="#4f8bff"/>`);

const KANTELE_SVG = svg(`
  <path d="M8 30 L92 18 L92 82 L8 70 Z" fill="#c8843f" stroke="#6b3b12" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M14 34 L86 25 L86 75 L14 66 Z" fill="#e0a45e"/>
  <circle cx="50" cy="50" r="9" fill="#6b3b12"/><circle cx="50" cy="50" r="5.5" fill="#2b1406"/>
  ${[0, 1, 2, 3, 4].map(i => `<path d="M12 ${38 + i * 6} L90 ${29 + i * 10}" stroke="#f3f0e6" stroke-width="1.6"/>`).join('')}
  ${[0, 1, 2, 3, 4].map(i => `<circle cx="88" cy="${29 + i * 10}" r="2.4" fill="#333"/>`).join('')}`);

const BASS_ART = '<span style="display:inline-block;filter:hue-rotate(190deg) saturate(1.4)">🎸</span>';

// Sävelet MIDI-numeroina (60 = keski-C). tune: [sävel | sointu | null, iskujen määrä]
const INSTRUMENTS = [
  { id: 'piano', name: 'Piano', word: 'Pling plong!', art: '🎹', h1: 205, h2: 290, base: 60, bpm: 170,
    tune: [[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]] },
  { id: 'drums', name: 'Rummut', word: 'Bum bum tsak!', art: '🥁', h1: 8, h2: 280, bpm: 190, drum: true,
    pads: ['BUM', 'TSAK', 'TSS', 'TUM', 'PLÄS', 'LÄPS', 'TSSH', 'KLONK'],
    tune: [[0,1],[2,1],[1,1],[2,1],[0,1],[0,1],[1,1],[2,1],[3,.5],[3,.5],[3,.5],[3,.5],[1,.5],[1,.5],[1,.5],[1,.5],[[0,4],3]] },
  { id: 'trumpet', name: 'Trumpetti', word: 'Töö-töö-töö!', art: '🎺', h1: 45, h2: 320, base: 60, bpm: 150,
    tune: [[67,.5],[72,.5],[76,.5],[79,1.5],[76,.5],[79,3]] },
  { id: 'guitar', name: 'Kitara', word: 'Tsing tsang!', art: '🎸', h1: 280, h2: 170, base: 48, bpm: 140,
    tune: [[48,.5],[55,.5],[60,.5],[64,.5],[[48,52,55,60,64],1.5],[[43,47,50,55,59,67],1.5],[[48,52,55,60,64,72],3]] },
  { id: 'violin', name: 'Viulu', word: 'Viuu viuu!', art: '🎻', h1: 340, h2: 175, base: 60, bpm: 130,
    tune: [[67,1],[69,1],[71,1],[67,1],[67,1],[69,1],[71,1],[67,1],[71,1],[72,1],[74,2],[71,1],[72,1],[74,2]] },
  { id: 'flute', name: 'Huilu', word: 'Tii-tii-tii!', art: FLUTE_SVG, h1: 160, h2: 300, base: 72, bpm: 200,
    tune: [[72,1],[72,1],[72,1],[76,1],[74,1],[74,1],[74,1],[77,1],[76,1],[76,1],[74,1],[74,1],[72,3]] },
  { id: 'sax', name: 'Saksofoni', word: 'Duu-bi-duu!', art: '🎷', h1: 25, h2: 260, base: 60, bpm: 150,
    tune: [[60,.5],[63,.5],[65,.5],[66,.5],[67,1],[null,.5],[70,.5],[72,2.5]] },
  { id: 'accordion', name: 'Harmonikka', word: 'Humppa humppa!', art: '🪗', h1: 120, h2: 330, base: 60, bpm: 190,
    tune: [[48,.5],[[64,67,72],.5],[43,.5],[[64,67,72],.5],[48,.5],[[64,67,72],.5],[43,.5],[[62,65,71],.5],
           [72,.5],[71,.5],[72,.5],[74,.5],[[76,72,67],2]] },
  { id: 'bells', name: 'Kellopeli', word: 'Kilin kalin!', art: '🔔', h1: 50, h2: 215, base: 72, bpm: 210,
    tune: [[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,3]] },
  { id: 'xylo', name: 'Ksylofoni', word: 'Kling klang!', art: XYLO_SVG, h1: 190, h2: 20, base: 72, bpm: 180,
    tune: [[72,.5],[74,.5],[76,.5],[79,.5],[81,.5],[84,.5],[86,.5],[88,.5],[91,1],[88,.5],[84,.5],[81,.5],[79,.5],[76,.5],[72,2]] },
  { id: 'synth', name: 'Syntikka', word: 'Viuu-vau!', art: '🎛️', h1: 300, h2: 180, base: 60, bpm: 256,
    tune: [[69,1],[72,1],[76,1],[69,1],[74,1],[72,1],[67,1],[64,1],[69,1],[72,1],[76,1],[81,1],[79,4]] },
  { id: 'bass', name: 'Basso', word: 'Dum dum dum!', art: BASS_ART, h1: 250, h2: 60, base: 36, bpm: 240,
    tune: [[36,1],[48,1],[36,1],[43,1],[45,1],[43,1],[40,1],[43,1],[36,1],[36,1],[48,1],[36,1],[43,2],[36,2]] },
  { id: 'kantele', name: 'Kantele', word: 'Tiling taling!', art: KANTELE_SVG, h1: 95, h2: 25, base: 60, bpm: 150,
    tune: [[69,.5],[72,.5],[74,.5],[76,1],[74,.5],[72,.5],[69,1],[67,.5],[69,.5],[72,2]] },
  { id: 'horn', name: 'Käyrätorvi', word: 'Tuu-tuu-tuu!', art: '📯', h1: 35, h2: 210, base: 48, bpm: 130,
    tune: [[60,1],[64,.5],[67,.5],[72,2],[67,1],[64,1],[60,2]] },
];
const BY_ID = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]));

const PENTA8 = [0, 2, 4, 7, 9, 12, 14, 16];
const SOLFA8 = ['do', 're', 'mi', 'so', 'la', 'do', 're', 'mi'];
const PAD_HUES = [0, 30, 55, 120, 170, 205, 255, 300];
const LOOP_SYMBOLS = ['★', '●', '▲', '♥'];
const LOOP_HUES = [320, 190, 55, 140];

const padNotes = ins => ins.drum ? PENTA8.map((_, i) => i) : PENTA8.map(p => ins.base + p);

/* ─── Tyylit: tempo ja sointukulku. Kaikki äänet ovat C-duurin pentatonisessa, joten kaikki sopii yhteen ─── */

const CH = {
  C:  { root: 48, chord: [60, 64, 67], gtr: [48, 52, 55, 60, 64] },
  G:  { root: 43, chord: [59, 62, 67], gtr: [43, 47, 50, 55, 59, 67] },
  Am: { root: 45, chord: [60, 64, 69], gtr: [45, 52, 57, 60, 64] },
  F:  { root: 41, chord: [60, 65, 69], gtr: [41, 48, 53, 57, 60, 65] },
};
const STYLES = {
  pop:   { name: 'POP', bpm: 110, prog: [CH.C, CH.G, CH.Am, CH.F] },
  tekno: { name: 'TEKNO', bpm: 124, prog: [CH.Am, CH.F, CH.C, CH.G] },
};
let style = 'pop';

/* ─── Silmukkageneraattorit. Silmukka = 4 tahtia = 64 kuudestoistaosaa ─── */

const ev = (s, n, d, v = .7, extra) => Object.assign({ s, n, d, v }, extra);
const bars = fn => [0, 1, 2, 3].flatMap(b => fn(b).map(e => Object.assign(e, { s: e.s + b * 16 })));
const tonesHi = c => [...c.chord, c.chord[0] + 12, c.chord[1] + 12].map(n => n + 12);

const MOTIFS = {
  A: [[0, 0, 2], [2, 1, 2], [4, 2, 2], [6, 1, 2], [8, 3, 4], [12, 2, 4]],
  B: [[0, 2, 3], [3, 2, 3], [6, 1, 2], [8, 0, 2], [10, 1, 2], [12, 2, 2], [14, 3, 2]],
  C: [[0, 1, 8], [8, 2, 8]],
  R: [[0, 0, 2], [3, 1, 1], [4, 2, 2], [6, 1, 1], [8, 0, 2], [10, 2, 2], [12, 3, 2], [14, 1, 2]],
};

function seeded(seed) {
  let x = seed * 9301 + 49297;
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
}

const GEN = {
  chords: (P, o) => bars(b => [[0, 6], [6, 2], [8, 6], [14, 2]].map(([s, d]) => ev(s, P[b].chord.map(n => n + o), d, .6))),
  sustain: (P, o) => bars(b => [ev(0, P[b].chord.map(n => n + o), 16, .5)]),
  stabs: (P, o) => bars(b => [2, 6, 10, 14].map(s => ev(s, P[b].chord.map(n => n + o), 1, .55))),
  rave: (P, o) => bars(b => [0, 3, 6, 10, 13].map(s => ev(s, P[b].chord.map(n => n + o), 2, .5))),
  strum: (P, o) => bars(b => [[0, 3], [3, 3], [6, 2], [8, 3], [11, 3], [14, 2]].map(([s, d], i) =>
    ev(s, P[b].gtr.map(n => n + o), d, i % 2 ? .5 : .75))),
  arp: (P, o, rate = 2) => bars(b => {
    const c = P[b].chord, tones = [c[0], c[1], c[2], c[0] + 12], pat = [0, 1, 2, 3, 2, 1, 0, 1];
    return Array.from({ length: 16 / rate }, (_, i) => ev(i * rate, [tones[pat[i % 8]] + o], rate, .6));
  }),
  motif: (P, o, M) => bars(b => MOTIFS[M].map(([s, k, d]) => ev(s, [tonesHi(P[b])[k] + o], d, .7))),
  long: (P, o) => bars(b => [ev(0, [P[b].chord[1] + 12 + o], 16, .55)]),
  sparkle: (P, o, seed = 3) => {
    const r = seeded(seed);
    return bars(b => {
      const out = [];
      for (let s = 0; s < 16; s += 2) if (r() < .45) out.push(ev(s, [pick2(tonesHi(P[b]), r) + o], 2, .45));
      return out;
    });
  },
  run: (P, o) => bars(b => b % 2
    ? [72, 74, 76, 79, 81, 84, 86, 88].map((n, i) => ev(8 + i, [n + o], 1, .5))
    : [ev(0, [tonesHi(P[b])[2] + o], 8, .5)]),
  bass: (P, o, kind) => bars(b => {
    const r = P[b].root + o;
    const third = r + ((P[b].chord[1] - P[b].root) % 12);
    switch (kind) {
      case 'offbeat': return [2, 6, 10, 14].map(s => ev(s, [r], 2, .8));
      case 'rolling': return Array.from({ length: 16 }, (_, s) => ev(s, [s % 4 === 2 ? r + 12 : r], 1, s % 4 ? .55 : .8));
      case 'acid': return [[0, r], [3, r + 12], [6, r], [8, r + 7], [10, r + 12], [12, r], [14, r + 7]].map(([s, n]) => ev(s, [n], 2, s % 4 ? .6 : .9));
      case 'bounce': return Array.from({ length: 8 }, (_, i) => ev(i * 2, [i % 2 ? r + 12 : r], 2, .75));
      case 'walk': return [[0, r], [4, third], [8, r + 7], [12, r + 12]].map(([s, n]) => ev(s, [n], 4, .75));
      case 'long': return [ev(0, [r], 16, .8)];
      default: return Array.from({ length: 8 }, (_, i) => ev(i * 2, [r], 2, i % 2 ? .6 : .8));
    }
  }),
  oompah: (P, o) => bars(b => {
    const r = P[b].root + o, c = P[b].chord.map(n => n + o);
    return [ev(0, [r], 3, .75), ev(4, c, 3, .45), ev(8, [r + 7], 3, .7), ev(12, c, 3, .45)];
  }),
};
function pick2(a, r) { return a[Math.floor(r() * a.length)]; }

// Rumpukuviot: 16 (tai 64) merkkiä per soitin, x = kova, o = hiljainen
const DRUMS = {
  T1: { 0: 'x...x...x...x...', 5: '....x.......x...', 6: '..x...x...x...x.', 2: '.o.o.o.o.o.o.o.o' },
  T2: { 0: 'x...x...x...x...', 2: 'xoxoxoxoxoxoxoxo', 1: '....x.......x...'.repeat(3) + '....x...xoxoxxxx' },
  T3: { 0: 'x.........x.....', 1: '....x.......x..o', 2: 'x.x.x.x.x.x.x.x.', 5: '............x...' },
  T4: { 0: 'x...x...x...x...', 7: '..x..x....x..x..', 5: '....x.......x...', 4: 'x' + '.'.repeat(63) },
  P1: { 0: 'x.......x.x.....', 1: '....x.......x...', 2: 'x.x.x.x.x.x.x.x.' },
  P2: { 0: 'x...x...x...x...', 6: '..x...x...x...x.', 5: '....x.......x...', 2: 'x...x...x...x...' },
  P3: { 0: 'x.......x.......', 5: '....x.......x...', 2: 'xoxoxoxoxoxoxoxo' },
  P4: { 0: 'x.......x.......', 3: '...x..x....x.x..', 1: '....x.......x...', 4: 'x' + '.'.repeat(63) },
};
function drumLoop(name) {
  const out = [];
  for (const [snd, pat] of Object.entries(DRUMS[name])) {
    const full = pat.length >= 64 ? pat : pat.repeat(64 / pat.length);
    for (let s = 0; s < 64; s++) {
      if (full[s] === 'x' || full[s] === 'o') out.push(ev(s, [+snd], 1, full[s] === 'x' ? .9 : .45));
    }
  }
  return out;
}

// Eläinsilmukat: eläimet laulavat sävelessä
const A = (s, animal, n, v = .8, cut = 0) => ev(s, [n], 0, v, { animal, cut });
const ANIMAL_LOOPS = [
  { art: '🐮', name: 'Lehmäbasso', gen: P => bars(b => [A(0, 'cow', P[b].root + 12, .9, .95), A(8, 'cow', P[b].root + 19, .7, .9), A(14, 'pig', null, .7, .25)]) },
  { art: '🐶', name: 'Eläinrummut', gen: () => bars(() => [
      A(0, 'frog', null, .9, .2), A(8, 'frog', null, .9, .2),
      A(4, 'dog', null, .8, .24), A(12, 'dog', null, .8, .24),
      ...[2, 6, 10, 14].map(s => A(s, 'duck', null, .55, .16))]) },
  { art: '🐱', name: 'Kissakuoro', gen: P => bars(b => MOTIFS.A.map(([s, k, d]) => A(s, 'cat', tonesHi(P[b])[k], .7, d * .11))) },
  { art: '🐓', name: 'Aamukuoro', gen: P => bars(b => [
      b === 0 ? A(0, 'rooster', null, .8) : b === 2 ? A(0, 'owl', null, .9) : A(0, 'sheep', P[b].chord[2], .8, 1),
      A(6, 'bird', null, .7, .5), A(12, 'bird', P[b].chord[1] + 36, .6, .4)]) },
];

// Launchpadin sarakkeet: [pop-silmukat, tekno-silmukat]; silmukka = { inst, gen(P) }
const L = (inst, gen, art) => ({ inst, gen, art: art || BY_ID[inst]?.art || '🎵' });
const LP_COLUMNS = [
  { id: 'beat', name: 'Biitti', art: '🥁', h: 0,
    pop: ['P1', 'P2', 'P3', 'P4'].map(n => L('drums', () => drumLoop(n))),
    tekno: ['T1', 'T2', 'T3', 'T4'].map(n => L('drums', () => drumLoop(n))) },
  { id: 'bass', name: 'Basso', art: BASS_ART, h: 265,
    pop: ['root8', 'bounce', 'walk', 'long'].map(k => L('bass', P => GEN.bass(P, 0, k))),
    tekno: ['offbeat', 'rolling', 'acid', 'long'].map(k => L('synthbass', P => GEN.bass(P, 0, k), '🎛️')) },
  { id: 'chords', name: 'Soinnut', art: '🎹', h: 200,
    pop: [L('piano', P => GEN.chords(P, 0)), L('guitar', P => GEN.strum(P, 0)), L('accordion', P => GEN.oompah(P, 0)), L('kantele', P => GEN.arp(P, 12, 2))],
    tekno: [L('pad', P => GEN.sustain(P, 0), '🌌'), L('synth', P => GEN.stabs(P, 0)), L('pluck', P => GEN.arp(P, 12, 1), '💎'), L('accordion', P => GEN.rave(P, 0))] },
  { id: 'melody', name: 'Melodia', art: '🎺', h: 50,
    pop: [L('flute', P => GEN.motif(P, 0, 'A')), L('trumpet', P => GEN.motif(P, -12, 'B')), L('xylo', P => GEN.arp(P, 12, 2)), L('violin', P => GEN.motif(P, 0, 'C'))],
    tekno: [L('synth', P => GEN.motif(P, 0, 'B')), L('bells', P => GEN.arp(P, 24, 1)), L('xylo', P => GEN.motif(P, 0, 'R')), L('horn', P => GEN.long(P, -12))] },
  { id: 'animals', name: 'Eläimet', art: '🐾', h: 120,
    pop: ANIMAL_LOOPS.map(a => ({ inst: 'animal', gen: a.gen, art: a.art })),
    tekno: ANIMAL_LOOPS.map(a => ({ inst: 'animal', gen: a.gen, art: a.art })) },
];

// Soitinsivujen omat silmukat: [generaattori, oktaavisiirto, lisäparametri]
const BOOK_LOOPS = {
  piano: [['chords', 0], ['arp', 0, 2], ['motif', 0, 'A'], ['sparkle', 0, 3]],
  trumpet: [['stabs', 0], ['motif', -12, 'A'], ['motif', -12, 'B'], ['long', -12]],
  guitar: [['strum', 0], ['arp', -12, 2], ['bass', 0, 'walk'], ['motif', -12, 'R']],
  violin: [['long', 0], ['motif', 0, 'B'], ['arp', 12, 4], ['motif', 0, 'A']],
  flute: [['motif', 0, 'A'], ['sparkle', 0, 5], ['motif', 0, 'B'], ['long', 12]],
  sax: [['motif', -12, 'R'], ['bass', 24, 'root8'], ['motif', -12, 'B'], ['long', 0]],
  accordion: [['oompah', 0], ['motif', 0, 'A'], ['sustain', 0], ['motif', 0, 'B']],
  bells: [['sparkle', 12, 7], ['arp', 24, 2], ['motif', 12, 'A'], ['run', 0]],
  xylo: [['motif', 0, 'R'], ['arp', 12, 1], ['motif', 0, 'B'], ['run', 0]],
  synth: [['motif', 0, 'B'], ['arp', 12, 1], ['stabs', 0], ['motif', 0, 'C']],
  bass: [['bass', -12, 'root8'], ['bass', -12, 'bounce'], ['bass', -12, 'walk'], ['bass', -12, 'acid']],
  kantele: [['arp', 12, 2], ['motif', 0, 'A'], ['arp', 0, 1], ['sparkle', 0, 9]],
  horn: [['long', -12], ['motif', -24, 'C'], ['stabs', -12], ['motif', -12, 'A']],
};
function bookLoop(ins, k) {
  if (ins.drum) {
    const names = style === 'tekno' ? ['T1', 'T2', 'T3', 'T4'] : ['P1', 'P2', 'P3', 'P4'];
    return { inst: 'drums', gen: () => drumLoop(names[k]) };
  }
  const [g, o, x] = BOOK_LOOPS[ins.id][k];
  return { inst: ins.id, gen: P => GEN[g](P, o, x) };
}

// Silmukka käännetään kuudestoistaosien taulukoksi, välimuistissa tyylikohtaisesti
const compiled = new Map();
function compile(key, loop) {
  const ck = key + ':' + style;
  let steps = compiled.get(ck);
  if (!steps) {
    steps = Array.from({ length: 64 }, () => []);
    for (const e of loop.gen(STYLES[style].prog)) steps[e.s % 64].push(e);
    compiled.set(ck, steps);
  }
  return steps;
}

// Raidan silmukka: 'lp:<sarake>' tai 'ins:<soitin>'
function resolveLoop(trackId, k) {
  if (trackId.startsWith('lp:')) {
    const col = LP_COLUMNS.find(c => c.id === trackId.slice(3));
    return col[style][k];
  }
  return bookLoop(BY_ID[trackId.slice(4)], k);
}

/* ─── Sekvensseri: katsoo 150 ms eteenpäin ja ajastaa äänet tarkasti äänikellon mukaan ─── */

const transport = { running: false, step: 0, next: 0, timer: 0 };
const tracks = new Map();          // raidan id → { loop, from, bus, queued }
const bpm = () => STYLES[style].bpm;
const stepDur = () => 60 / bpm() / 4;
const listeners = { beat: [], note: [], change: [] };
const emit = (name, ...args) => listeners[name].forEach(fn => fn(...args));

function at(t, fn) {
  setTimeout(fn, Math.max(0, (t - ctx.currentTime) * 1000));
}

function startTransport() {
  transport.running = true;
  transport.step = 0;
  transport.next = ctx.currentTime + .08;
  transport.timer = setInterval(tick, 25);
  tick();
}

function stopTransport() {
  clearInterval(transport.timer);
  transport.running = false;
}

function tick() {
  const now = ctx.currentTime;
  // Jos välilehti on ollut taustalla, hypätään nykyhetkeen eikä soiteta rästissä olevia
  if (transport.next < now - .2) {
    const skip = Math.ceil((now - transport.next) / stepDur());
    transport.next += skip * stepDur();
    transport.step += skip;
  }
  while (transport.next < now + .15) {
    scheduleStep(transport.step, transport.next);
    transport.next += stepDur();
    transport.step++;
  }
}

const nextStep = grid => Math.ceil(transport.step / grid) * grid;
const stepTime = step => transport.next + (step - transport.step) * stepDur();

function scheduleStep(step, t) {
  const pos = step % 64;
  if (step % 4 === 0) at(t, () => emit('beat', pos));
  for (const [id, tr] of tracks) {
    if (step < tr.from) continue;
    if (tr.queued && step === tr.from) at(t, () => { tr.queued = false; emit('change'); });
    const loop = resolveLoop(id, tr.loop);
    const evs = compile(id + ':' + tr.loop, loop)[pos];
    for (const e of evs) {
      const len = e.d * stepDur() * .95;
      if (e.animal) {
        playAnimal(e.animal, t, e.n[0], tr.bus, e.v, e.cut);
      } else {
        const v = e.v / Math.sqrt(e.n.length);
        e.n.forEach((n, k) => VOICES[loop.inst](n, t + (loop.inst === 'guitar' ? k * .022 : 0), len, tr.bus, v));
      }
      at(t, () => emit('note', id, loop, e));
    }
  }
}

function toggleLoop(trackId, k) {
  if (!audio()) return;
  const tr = tracks.get(trackId);
  if (tr && tr.loop === k) {
    stopTrack(trackId);
    return;
  }
  if (tr) stopTrack(trackId, true);
  const bus = ctx.createGain();
  bus.gain.value = .85;
  bus.connect(master);
  let from = 0;
  if (!transport.running) startTransport();
  else from = nextStep(4);            // aloitetaan seuraavalla iskulla, kohdassa joka sopii muihin
  tracks.set(trackId, { loop: k, from, bus, queued: from > 0 });
  emit('change');
}

function stopTrack(trackId, keepRunning) {
  const tr = tracks.get(trackId);
  if (!tr) return;
  tracks.delete(trackId);
  const g = tr.bus.gain, now = ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(0, now + .15);
  setTimeout(() => tr.bus.disconnect(), 500);
  if (!keepRunning && !tracks.size) stopTransport();
  emit('change');
}

function stopAllLoops() {
  for (const id of [...tracks.keys()]) stopTrack(id, true);
  stopTransport();
  emit('change');
}

function setStyle(s) {
  if (s === style) return;
  style = s;
  emit('change');
}

/* ─── Kappaleet (painettaessa isoa soitinta) ─── */

let tune = null;

function stopTune() {
  if (!tune || !ctx) return;
  tune.timers.forEach(clearTimeout);
  const bus = tune.bus, now = ctx.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(bus.gain.value, now);
  bus.gain.linearRampToValueAtTime(0, now + .08);
  setTimeout(() => bus.disconnect(), 300);
  tune = null;
}

function playTune(ins, onNote) {
  if (!audio()) return;
  stopTune();
  const bus = ctx.createGain();
  bus.connect(master);
  let beat = 60 / ins.bpm;
  let t = ctx.currentTime + .06;
  if (transport.running) {
    // Silmukoiden soidessa kappale alkaa seuraavalla iskulla ja samassa tempossa
    t = Math.max(stepTime(nextStep(4)), ctx.currentTime + .03);
    beat = 60 / (bpm() * (ins.bpm >= 175 ? 2 : 1));
  }
  const timers = [];
  ins.tune.forEach(([n, b]) => {
    const notes = n == null ? [] : Array.isArray(n) ? n : [n];
    const strum = ins.id === 'guitar' ? .035 : 0;
    notes.forEach((x, k) => VOICES[ins.id](x, t + k * strum, b * beat * .92, bus, 1 / Math.sqrt(notes.length)));
    if (notes.length && onNote) timers.push(setTimeout(() => onNote(notes), Math.max(0, (t - ctx.currentTime) * 1000)));
    t += b * beat;
  });
  const me = { bus, timers };
  timers.push(setTimeout(() => { if (tune === me) tune = null; }, (t - ctx.currentTime) * 1000 + 1500));
  tune = me;
}

/* ─── Napit: lyhyt napautus ja pitkä painallus ─── */

const HOLD_MAX = 8;

// Sävel, joka soi niin kauan kuin nappia pidetään pohjassa
function holdNote(inst, m, v = 1) {
  if (!audio()) return null;
  const t = ctx.currentTime + .005;
  const gate = ctx.createGain();
  gate.connect(master);
  NODES = [];
  VOICES[inst](m, t, HOLD_MAX, gate, v);
  const nodes = NODES;
  NODES = null;
  const started = ctx.currentTime;
  const kind = SUSTAINED.has(inst) ? 'sus' : (inst === 'bells' || inst === 'xylo') ? 'ring' : 'pluck';
  return {
    release() {
      if (kind === 'ring') return;                     // kellopeli ja ksylofoni saavat soida loppuun
      // Lyhytkin napautus saa soida hetken; näppäilysoitin vaimenee vasta sormen noustessa
      const minLen = kind === 'sus' ? .35 : .9;
      const at = Math.max(ctx.currentTime, started + minLen);
      const tau = kind === 'sus' ? .08 : .12;
      gate.gain.setTargetAtTime(0, at, tau);
      nodes.forEach(n => { try { n.stop(at + tau * 8); } catch (e) { /* jo pysäytetty */ } });
      setTimeout(() => gate.disconnect(), (at - ctx.currentTime + tau * 8 + .5) * 1000);
    },
  };
}

// Rulla: pitkä painallus toistaa ääntä kahdeksasosien tahdissa
function holdRoll(play) {
  if (!audio()) return null;
  play(ctx.currentTime + .005, 0);
  let timer = 0, count = 0;
  const startRoll = () => {
    const grid = 2;                                    // kahdeksasosa = 2 kuudestoistaosaa
    const interval = stepDur() * grid;
    let t = transport.running ? Math.max(stepTime(nextStep(grid)), ctx.currentTime + .02) : ctx.currentTime + .02;
    const pump = () => {
      while (t < ctx.currentTime + .12) {
        play(t, ++count, interval);
        t += interval;
      }
    };
    pump();
    timer = setInterval(pump, 25);
  };
  const delay = setTimeout(startRoll, 260);
  return {
    release() {
      clearTimeout(delay);
      clearInterval(timer);
    },
  };
}
