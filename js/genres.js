'use strict';
/* ════════════════════ Tyylit: phonk, techno, house, trap, drum & bass, lo-fi ════════════════════ */

// Silmukka = 4 tahtia = 64 kuudestoistaosaa. Tapahtuma: { s, d, v, n?, snd?, chop?, fx?, from?, acc?, roll?, p?, vowel? }

const COLS = [
  { id: 'drums', name: 'DRUMS', icon: '🥁', h: 0, bus: 'drums' },
  { id: 'hats', name: 'HATS', icon: '🎩', h: 40, bus: 'drums' },
  { id: 'bass', name: 'BASS', icon: '🔊', h: 280, bus: 'music' },
  { id: 'synth', name: 'SYNTH', icon: '🎹', h: 200, bus: 'music' },
  { id: 'lead', name: 'LEAD', icon: '🎵', h: 150, bus: 'music' },
  { id: 'vox', name: 'VOX', icon: '🎤', h: 320, bus: 'music' },
];

const MINOR_PENTA = [0, 3, 5, 7, 10];
const MAJOR_PENTA = [0, 2, 4, 7, 9];

/* ─── Kuvioapurit ─── */

function repeat64(list, len) {
  const out = [];
  for (let off = 0; off < 64; off += len) list.forEach(e => out.push(Object.assign({}, e, { s: e.s + off })));
  return out;
}

// Rumpukuvio: { ääni: '16 tai 64 merkkiä' }. x = kova, o = hiljainen, X = aksentti, 2/3/4 = rulla
function drums(obj, pitch) {
  const out = [];
  for (const [snd, pat] of Object.entries(obj)) {
    const full = pat.length >= 64 ? pat : pat.repeat(Math.ceil(64 / pat.length)).slice(0, 64);
    for (let s = 0; s < 64; s++) {
      const c = full[s];
      if (c === '.') continue;
      const e = { s, snd, d: 1, v: c === 'X' ? 1 : c === 'o' ? .45 : /[234]/.test(c) ? .6 : .9 };
      if (/[234]/.test(c)) e.roll = +c;
      if (pitch) e.p = pitch(Math.floor(s / 16));
      out.push(e);
    }
  }
  return out;
}

// Soinnut rytmillä: rh = [[askel, kesto], ...]
const chords = (rh, o = 0, v = .6) => G => [0, 1, 2, 3].flatMap(b =>
  rh.map(([s, d]) => ({ s: b * 16 + s, n: G.bars[b].notes.map(x => x + o), d, v })));

const sustain = (o = 0, v = .5) => chords([[0, 16]], o, v);

// Arpeggio sointujen sävelistä
const arp = (rate, o = 0, pat = [0, 1, 2, 3, 2, 1, 0, 1], v = .6) => G => [0, 1, 2, 3].flatMap(b => {
  const n = [...G.bars[b].notes].sort((a, c) => a - c);
  const tones = [...n, n[0] + 12, n[1] + 12];
  return Array.from({ length: 16 / rate }, (_, i) => ({ s: b * 16 + i * rate, n: [tones[pat[i % pat.length] % tones.length] + o], d: rate, v }));
});

// Basso: pat = [[askel, intervalli, kesto, 'a' aksentti / 's' liuku], ...] suhteessa tahdin pohjasäveleen
const bass = (pat, o = 0, v = .85) => G => {
  const out = [];
  let prev = null;
  for (let b = 0; b < 4; b++) {
    for (const [s, iv, d, flag = ''] of pat) {
      const n = G.bars[b].root + iv + o;
      const e = { s: b * 16 + s, n: [n], d, v: flag.includes('a') ? 1 : v };
      if (flag.includes('a')) e.acc = true;
      if (flag.includes('s') && prev != null) e.from = prev;
      out.push(e);
      prev = n;
    }
  }
  return out;
};

// Melodia pentatonisen asteikon asteilla: [[askel, aste, kesto, 'a'/'s'], ...], kuvio toistuu len askeleen välein
const mel = (pat, len = 16, o = 0, v = .7, extra) => G => {
  const scale = [];
  for (let oct = -1; oct < 3; oct++) G.scale.forEach(iv => scale.push(G.melBase + oct * 12 + iv));
  const base = G.scale.length;              // aste 0 = melBase
  let prev = null;
  const list = pat.map(([s, deg, d = 1, flag = '']) => {
    const n = scale[base + deg] + o;
    const e = Object.assign({ s, n: [n], d, v: flag.includes('a') ? Math.min(1, v + .25) : v }, extra);
    if (flag.includes('a')) e.acc = true;
    if (flag.includes('s') && prev != null) e.from = prev;
    prev = n;
    return e;
  });
  return repeat64(list, len);
};

// Satunnaiset mutta toistuvat helmet
const sparkle = (seed, density = .4, o = 12, v = .45) => G => {
  let x = seed * 9301 + 49297;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const out = [];
  for (let s = 0; s < 64; s += 2) {
    if (r() < density) {
      const n = G.bars[Math.floor(s / 16)].notes;
      out.push({ s, n: [n[Math.floor(r() * n.length)] + o], d: 2, v });
    }
  }
  return out;
};

const chops = (list, len = 16) => () => repeat64(list.map(([s, chop, r = 1, v = .9]) => ({ s, chop, r, v, d: 1 })), len);
const fxs = (list, len = 64) => () => repeat64(list.map(([s, fx, d = 16]) => ({ s, fx, d, v: 1 })), len);

const L = (name, inst, gen, send = 0) => ({ name, inst, gen, send });
const D = (name, pat, pitched) => ({ name, gen: G => drums(pat, pitched ? b => G.bars[b].root : null) });

/* ─── Tyylit ─── */

const GENRES = [
  {
    id: 'phonk', name: 'PHONK', icon: '💀', desc: 'Drift, lehmänkello ja rouhea 808', bpm: 132, swing: 0, pump: .4, hues: [285, 330],
    melBase: 66, scale: MINOR_PENTA,
    bars: [{ root: 42, notes: [57, 61, 66] }, { root: 42, notes: [57, 61, 66] }, { root: 38, notes: [57, 62, 66] }, { root: 40, notes: [56, 59, 64] }],
    cols: {
      drums: [
        D('DRIFT', { kick808x: 'x...x...x...x...', snareTrap: '....x.......x...' }, true),
        D('MEMPHIS', { kick808x: 'x..x......x..x..', snareTrap: '....x.......x...', clap: '............x...' }, true),
        D('BRAZIL', { kick808x: 'x..x...x.x..x...', clap: '...x..x....x..x.' }, true),
        D('HALF', { kick808x: 'x.........x.....', snareTrap: '........x.......' }, true),
      ],
      hats: [
        D('16THS', { hat: 'xoxoxoxoxoxoxoxo' }),
        D('ROLLS', { hat: 'x.x.x.3.x.x.x.4.' }),
        D('OPEN', { hatO: '..x...x...x...x.', hat: 'x...x...x...x...' }),
        D('SHAKE', { shaker: 'xoxoxoxoxoxoxoxo', rim: '......x.......x.' }),
      ],
      bass: [
        L('808 LONG', 'b808x', bass([[0, 0, 16]])),
        L('GLIDE', 'b808x', bass([[0, 0, 6], [6, 0, 2], [8, 12, 4, 's'], [12, 7, 4, 's']])),
        L('BOUNCE', 'b808x', bass([[0, 0, 3], [3, 0, 3], [6, 0, 2], [10, 0, 2], [12, 3, 4, 's']])),
        L('STAB', 'b808x', bass([[0, 0, 1], [2, 0, 1], [4, 12, 1], [6, 0, 1], [8, 0, 1], [10, 0, 1], [12, 12, 1], [14, 7, 1]])),
      ],
      synth: [
        L('DARK PAD', 'darkpad', sustain(0, .5)),
        L('CHOIR', 'choir', sustain(0, .45)),
        L('BELLS', 'bells', arp(2, 12), .25),
        L('PIANO', 'piano', chords([[0, 8], [8, 8]], -12, .6)),
      ],
      lead: [
        L('COWBELL', 'cow', mel([[0, 5], [2, 5], [3, 7], [5, 5], [6, 8], [8, 7], [10, 5], [11, 4], [13, 5], [14, 3]]), .2),
        L('COW 2', 'cow', mel([[0, 7], [1, 7], [3, 8], [4, 7], [6, 5], [7, 5], [9, 4], [10, 5], [12, 7], [14, 9],
          [16, 9], [18, 8], [19, 7], [21, 5], [22, 7], [24, 8], [26, 7], [28, 5], [30, 4]], 32), .2),
        L('BELL MEL', 'bells', mel([[0, 5, 4], [4, 7, 4], [8, 8, 6], [14, 7, 2], [16, 5, 4], [20, 4, 4], [24, 3, 8]], 32), .3),
        L('KEYS', 'piano', mel([[0, 5, 2], [3, 7, 1], [4, 8, 2], [6, 7, 2], [8, 5, 4], [12, 4, 4]], 16, -12)),
      ],
      vox: [
        L('AY', null, chops([[0, 'ay'], [10, 'ay', 1.1]])),
        L('YEAH', null, chops([[0, 'yeah'], [24, 'uh'], [28, 'uh']], 32)),
        L('RISER', null, fxs([[0, 'impact'], [48, 'riser', 16]])),
        L('VINYL', null, () => [{ s: 0, snd: 'crackle', d: 64, v: .8 }]),
      ],
    },
    shots: [['AIRHORN', '📯', 'fx', 'airhorn'], ['AY!', '🗣️', 'chop', 'ay'], ['YEAH', '🔥', 'chop', 'yeah'],
      ['808 DROP', '💣', 'fx', 'drop808'], ['IMPACT', '💥', 'fx', 'impact'], ['RISER', '🚀', 'fx', 'riser']],
  },
  {
    id: 'techno', name: 'TECHNO', icon: '⚙️', desc: 'Jyräävä basari, acid ja dub-stabit', bpm: 130, swing: 0, pump: .45, hues: [190, 225],
    melBase: 69, scale: MINOR_PENTA,
    bars: [{ root: 45, notes: [57, 60, 64] }, { root: 45, notes: [57, 60, 64] }, { root: 41, notes: [57, 60, 65] }, { root: 43, notes: [55, 59, 62] }],
    cols: {
      drums: [
        D('FOUR', { kickT: 'x...x...x...x...' }),
        D('CLAP', { kickT: 'x...x...x...x...', clapT: '....x.......x...' }),
        D('RUMBLE', { kickT: 'x...x...x...x...', rumble: '.x...x...x...x..' }),
        D('BROKEN', { kickT: 'x..x..x...x.x...', clapT: '....x.......x...' }),
      ],
      hats: [
        D('OPEN', { hatO: '..x...x...x...x.' }),
        D('16TH', { hat: 'xoxoxoxoxoxoxoxo' }),
        D('RIDE', { ride: 'x.x.x.x.x.x.x.x.' }),
        D('PERC', { rim: '..x..x..x..x.x..', shaker: '..x...x...x...x.' }),
      ],
      bass: [
        L('OFFBEAT', 'sub', bass([[2, 0, 2], [6, 0, 2], [10, 0, 2], [14, 0, 2]])),
        L('ROLLING', 'sub', bass([1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15].map(s => [s, s % 4 === 3 ? 12 : 0, 1]))),
        L('ACID', 'acid', bass([[0, 0, 2, 'a'], [2, 12, 1], [3, 0, 1, 's'], [6, 7, 2, 'a'], [8, 0, 1], [10, 12, 2, 'as'], [12, 3, 1], [14, 0, 2]])),
        L('SUB', 'sub', bass([[0, 0, 16]])),
      ],
      synth: [
        L('DUB STAB', 'stab', chords([[3, 1], [10, 1]]), .5),
        L('HYPNO', 'pluck', arp(1, 12, [0, 2, 1, 3, 0, 2, 4, 1]), .2),
        L('DRONE', 'darkpad', sustain(0, .45)),
        L('HOOVER', 'hoover', bass([[0, 0, 3], [6, 0, 3], [12, 0, 4]], 24)),
      ],
      lead: [
        L('ACID HI', 'acid', mel([[0, 0, 1, 'a'], [1, 0, 1], [2, 3, 1, 's'], [4, 5, 1, 'a'], [6, 0, 1], [7, 7, 1, 's'], [8, 5, 1],
          [10, 3, 1, 'a'], [11, 0, 1], [12, 5, 1, 's'], [14, 7, 2, 'a']], 16, -12)),
        L('ARP', 'pluck', arp(1, 24, [0, 1, 2, 3, 4, 3, 2, 1]), .25),
        L('BLEEPS', 'bleep', sparkle(4, .35, 24), .4),
        L('HOOVER', 'hoover', mel([[0, 0, 3], [3, 0, 3], [6, 2, 2], [8, 3, 4], [12, 2, 4]], 16, -12)),
      ],
      vox: [
        L('HEY', null, chops([[12, 'hey']], 32)),
        L('SIREN', null, fxs([[32, 'siren']])),
        L('RISER', null, fxs([[0, 'impact'], [48, 'riser', 16]])),
        L('WOO', null, chops([[0, 'woo'], [30, 'hey', 1.1]], 64)),
      ],
    },
    shots: [['HEY', '🙌', 'chop', 'hey'], ['LASER', '⚡', 'fx', 'laser'], ['SIREN', '🚨', 'fx', 'siren'],
      ['IMPACT', '💥', 'fx', 'impact'], ['RISER', '🚀', 'fx', 'riser'], ['CRASH', '🔔', 'drum', 'crash']],
  },
  {
    id: 'house', name: 'HOUSE', icon: '🏠', desc: 'M1-urut, piano ja vokaalit', bpm: 124, swing: .08, pump: .3, hues: [45, 320],
    melBase: 69, scale: MINOR_PENTA,
    bars: [{ root: 45, notes: [57, 60, 64, 67] }, { root: 38, notes: [57, 60, 62, 65] }, { root: 41, notes: [57, 60, 64, 65] }, { root: 40, notes: [55, 59, 62, 64] }],
    cols: {
      drums: [
        D('HOUSE', { kick909: 'x...x...x...x...', clap: '....x.......x...' }),
        D('KICK', { kick909: 'x...x...x...x...' }),
        D('FILL', { kick909: 'x...x...x...x...', clap: '....x.......x...', snare909: '.'.repeat(48) + '........x.xxxxxx' }),
        D('TRIBAL', { kick909: 'x...x...x...x...', conga: '..x..x.x..x..x.x', tom: '......x.......x.' }),
      ],
      hats: [
        D('OPEN', { hatO: '..x...x...x...x.' }),
        D('SHAKER', { shaker: 'xoxoxoxoxoxoxoxo' }),
        D('CLOSED', { hat: 'oxoxoxoxoxoxoxox' }),
        D('BONGO', { conga: 'x..x..x...x.x...', rim: '....x.......x...' }),
      ],
      bass: [
        L('ORGAN', 'organ', bass([[0, 0, 2], [3, 0, 1], [6, 12, 2], [10, 0, 2], [14, 12, 1]])),
        L('OFFBEAT', 'sub', bass([[2, 0, 2], [6, 0, 2], [10, 0, 2], [14, 0, 2]])),
        L('DEEP', 'sub', bass([[0, 0, 3], [4, 7, 2], [8, 0, 3], [12, 12, 2]])),
        L('DISCO', 'sub', bass([0, 2, 4, 6, 8, 10, 12, 14].map((s, i) => [s, i % 2 ? 12 : 0, 1]))),
      ],
      synth: [
        L('PIANO', 'piano', chords([[0, 2], [3, 2], [6, 2], [10, 2]], 12, .55)),
        L('ORGAN', 'organ', chords([[2, 1], [6, 1], [10, 1], [14, 1]], 12, .5)),
        L('RHODES', 'rhodes', chords([[0, 8], [8, 8]], 0, .5)),
        L('STRINGS', 'pad', sustain(12, .4)),
      ],
      lead: [
        L('VOX CHOP', 'vox', mel([[0, 5, 2], [3, 4, 1], [4, 5, 2], [8, 7, 2], [11, 5, 1], [12, 4, 4]], 16, -12), .2),
        L('PIANO', 'piano', mel([[0, 5, 1], [2, 7, 1], [3, 5, 1], [6, 8, 2], [8, 7, 1], [10, 5, 2], [12, 4, 2], [14, 5, 2]])),
        L('PLUCK', 'pluck', arp(1, 12), .25),
        L('LEAD', 'lead', mel([[0, 5, 6], [6, 4, 2], [8, 3, 8], [16, 5, 4], [20, 7, 4], [24, 8, 8]], 32, -12)),
      ],
      vox: [
        L('OH YEAH', null, chops([[0, 'oh'], [8, 'yeah']], 32)),
        L('HEY', null, chops([[4, 'hey'], [12, 'hey', 1.06]], 32)),
        L('WOO', null, chops([[62, 'woo']], 64)),
        L('RISER', null, fxs([[0, 'impact'], [48, 'riser', 16]])),
      ],
    },
    shots: [['YEAH', '🙌', 'chop', 'yeah'], ['WOO!', '🎉', 'chop', 'woo'], ['HEY', '👋', 'chop', 'hey'],
      ['OH', '😮', 'chop', 'oh'], ['RISER', '🚀', 'fx', 'riser'], ['CRASH', '🔔', 'drum', 'crash']],
  },
  {
    id: 'trap', name: 'TRAP', icon: '🔥', desc: '808-liu\'ut, hi-hat-rullat ja huilu', bpm: 140, swing: 0, pump: 0, hues: [0, 25],
    melBase: 65, scale: MINOR_PENTA,
    bars: [{ root: 41, notes: [56, 60, 65] }, { root: 37, notes: [56, 61, 65] }, { root: 44, notes: [56, 60, 63] }, { root: 39, notes: [55, 58, 63] }],
    cols: {
      drums: [
        D('TRAP', { kick808: 'x.........x.....', snareTrap: '........x.......' }, true),
        D('BOUNCE', { kick808: 'x..x......x..x..', snareTrap: '........x.......' }, true),
        D('HARD', { kick808: 'x.....x.x.......', snareTrap: '........x.......', clap: '........x.......' }, true),
        D('DRILL', { kick808: 'x......x..x.....', snareTrap: '......x.....x...' }, true),
      ],
      hats: [
        D('8THS', { hat: 'x.x.x.x.x.x.3.x.' }),
        D('TRIPLET', { hat: 'x3x.x.4.x.x3x.x.' }),
        D('32NDS', { hat: '2222x.x.2222x.x.' }),
        D('PERC', { snap: '...x......x..x..', hatO: '......x.......x.' }),
      ],
      bass: [
        L('GLIDE', 'b808', bass([[0, 0, 6], [6, 12, 2, 's'], [8, 0, 4, 's'], [12, 7, 4, 's']])),
        L('SLIDES', 'b808', bass([[0, 0, 4], [4, 3, 2, 's'], [6, 0, 2, 's'], [10, 7, 2], [12, 0, 4, 's']])),
        L('LONG', 'b808', bass([[0, 0, 16]])),
        L('STUTTER', 'b808', bass([[0, 0, 1], [1, 0, 1], [2, 0, 2], [6, 0, 1], [8, 0, 2], [11, 0, 1], [12, 12, 2, 's'], [14, 0, 2, 's']])),
      ],
      synth: [
        L('BELLS', 'bells', arp(2, 12), .25),
        L('PIANO', 'piano', chords([[0, 4], [4, 4], [8, 4], [12, 4]], 0, .5)),
        L('CHOIR', 'choir', sustain(0, .45)),
        L('PLUCK', 'pluck', arp(1, 12, [0, 2, 1, 3]), .25),
      ],
      lead: [
        L('FLUTE', 'flute', mel([[0, 5, 3], [3, 6, 1], [4, 5, 2], [6, 4, 2], [8, 3, 4], [12, 2, 2], [14, 3, 2],
          [16, 5, 3], [19, 7, 1], [20, 6, 2], [22, 5, 2], [24, 3, 6], [30, 2, 2]], 32, 12), .15),
        L('BELL MEL', 'bells', mel([[0, 5, 4], [4, 4, 4], [8, 3, 4], [12, 1, 4], [16, 3, 8], [24, 2, 8]], 32, 12)),
        L('LEAD', 'lead', mel([[0, 3, 2], [2, 5, 2], [4, 6, 4], [8, 5, 2], [10, 3, 2], [12, 2, 4]], 16, -12)),
        L('VOX', 'vox', mel([[0, 5, 1], [2, 5, 1], [3, 4, 1], [6, 3, 2], [10, 5, 1], [12, 6, 2]], 16, -12), .2),
      ],
      vox: [
        L('YEAH', null, chops([[0, 'yeah']], 32)),
        L('UH UH', null, chops([[4, 'uh'], [7, 'uh', 1.1]])),
        L('AIRHORN', null, fxs([[0, 'airhorn'], [32, 'airhorn']])),
        L('DROP', null, fxs([[0, 'impact'], [52, 'revcym', 12]])),
      ],
    },
    shots: [['UH!', '😤', 'chop', 'uh'], ['YEAH', '🔥', 'chop', 'yeah'], ['AIRHORN', '📯', 'fx', 'airhorn'],
      ['808 DROP', '💣', 'fx', 'drop808'], ['LASER', '⚡', 'fx', 'laser'], ['REVERSE', '🌀', 'fx', 'revcym']],
  },
  {
    id: 'dnb', name: 'DRUM & BASS', short: 'DNB', icon: '⚡', desc: 'Breakbeat, reese ja hoover', bpm: 174, swing: 0, pump: .25, hues: [140, 95],
    melBase: 64, scale: MINOR_PENTA,
    bars: [{ root: 40, notes: [55, 59, 64] }, { root: 36, notes: [55, 60, 64] }, { root: 43, notes: [55, 59, 62] }, { root: 38, notes: [54, 57, 62] }],
    cols: {
      drums: [
        D('2-STEP', { kickDnb: 'x.........x.....', snareDnb: '....x.......x...' }),
        D('AMEN', { kickDnb: 'x.x.......xx....', snareDnb: '....x..o.x....x.' }),
        D('ROLLER', { kickDnb: 'x.........x..x..', snareDnb: '....x..o....x..o' }),
        D('HALFTIME', { kickDnb: 'x.........x.....', snareDnb: '........x.......' }),
      ],
      hats: [
        D('8THS', { hat: 'x.x.x.x.x.x.x.x.' }),
        D('RIDE', { ride: 'x.x.x.x.x.x.x.x.' }),
        D('SHAKER', { shaker: 'xoxoxoxoxoxoxoxo' }),
        D('TOPS', { hat: 'xoxxxoxoxoxxxoxo', hatO: '......x.......x.' }),
      ],
      bass: [
        L('REESE', 'reese', bass([[0, 0, 8], [8, 0, 8]])),
        L('ROLLING', 'reese', bass([[0, 0, 3], [3, 0, 3], [6, 0, 2], [8, 0, 3], [11, 7, 3], [14, 0, 2]])),
        L('SUB', 'sub', bass([[0, 0, 6], [10, 0, 6]])),
        L('WOBBLE', 'reese', bass([[0, 0, 2], [2, 12, 2], [4, 0, 2], [6, 7, 2], [8, 0, 2], [10, 12, 2], [12, 0, 4]])),
      ],
      synth: [
        L('LIQUID', 'pad', sustain(0, .4)),
        L('RHODES', 'rhodes', chords([[0, 6], [6, 2], [8, 6], [14, 2]], 0, .5)),
        L('STABS', 'stab', chords([[0, 1], [10, 1]], 12), .45),
        L('ARP', 'pluck', arp(1, 12), .2),
      ],
      lead: [
        L('HOOVER', 'hoover', mel([[0, 5, 4], [4, 4, 2], [6, 3, 2], [8, 5, 8]], 16, -12)),
        L('PLUCK', 'pluck', mel([[0, 5], [2, 7], [3, 5], [5, 8], [6, 7], [8, 5], [10, 4], [11, 3], [13, 4], [14, 5]]), .3),
        L('VOX', 'vox', mel([[0, 5, 4], [4, 7, 4], [8, 8, 8], [16, 7, 4], [20, 5, 4], [24, 4, 8]], 32, -12, .7, { vowel: 'oh' }), .25),
        L('BELLS', 'bells', sparkle(9, .35, 12), .3),
      ],
      vox: [
        L('SIREN', null, fxs([[0, 'siren']])),
        L('HEY', null, chops([[12, 'hey']], 32)),
        L('RISER', null, fxs([[0, 'impact'], [48, 'riser', 16]])),
        L('REWIND', null, fxs([[0, 'rewind']])),
      ],
    },
    shots: [['SIREN', '🚨', 'fx', 'siren'], ['REWIND', '⏪', 'fx', 'rewind'], ['HEY', '🙌', 'chop', 'hey'],
      ['LASER', '⚡', 'fx', 'laser'], ['IMPACT', '💥', 'fx', 'impact'], ['RISER', '🚀', 'fx', 'riser']],
  },
  {
    id: 'lofi', name: 'LO-FI', icon: '☕', desc: 'Swing, Rhodes ja vinyylirätinä', bpm: 84, swing: .22, pump: 0, hues: [30, 260],
    melBase: 72, scale: MAJOR_PENTA,
    bars: [{ root: 41, notes: [57, 60, 64, 67] }, { root: 40, notes: [55, 59, 62, 64] }, { root: 38, notes: [53, 57, 60, 64] }, { root: 36, notes: [52, 55, 59, 62] }],
    cols: {
      drums: [
        D('BOOM BAP', { kickLofi: 'x......x.x......', snareLofi: '....x.......x...' }),
        D('LAID BACK', { kickLofi: 'x.....x...x.....', snareLofi: '....x.......x...', rim: '..........x.....' }),
        D('MINIMAL', { kickLofi: 'x.......x.......', snap: '....x.......x...' }),
        D('JAZZY', { kickLofi: 'x..x......x.....', snareLofi: '....x..o....x...' }),
      ],
      hats: [
        D('SWING', { hat: 'x.o.x.o.x.o.x.o.' }),
        D('SHAKER', { shaker: 'oooooooooooooooo' }),
        D('RIDE', { ride: 'x.o.x.o.x.o.x.o.' }),
        D('OPEN', { hatO: '..o...o...o...o.', rim: '......x.......x.' }),
      ],
      bass: [
        L('ROOTS', 'lofibass', bass([[0, 0, 6], [7, 0, 1], [8, 7, 6]])),
        L('WALK', 'lofibass', bass([[0, 0, 4], [4, 7, 4], [8, 12, 4], [12, 7, 4]])),
        L('LONG', 'lofibass', bass([[0, 0, 16]])),
        L('OCTAVE', 'lofibass', bass([[0, 0, 2], [3, 12, 1], [6, 0, 2], [10, 12, 2], [14, 7, 2]])),
      ],
      synth: [
        L('RHODES', 'rhodes', chords([[0, 6], [6, 2], [8, 8]], 0, .5)),
        L('PIANO', 'lofipiano', chords([[0, 16]], 0, .5)),
        L('GUITAR', 'guitar', arp(2, 0, [0, 1, 2, 3, 2, 1, 2, 3], .5)),
        L('PAD', 'pad', sustain(12, .3)),
      ],
      lead: [
        L('RHODES', 'rhodes', mel([[0, 4, 3], [3, 3, 1], [4, 2, 4], [8, 1, 2], [10, 2, 2], [12, 0, 4],
          [16, 2, 3], [19, 3, 1], [20, 4, 6], [26, 3, 2], [28, 2, 4]], 32, -12)),
        L('GUITAR', 'guitar', mel([[0, 2], [1, 3], [2, 4, 2], [6, 3], [7, 2], [8, 1, 4], [14, 0, 2]], 16, -12)),
        L('FLUTE', 'flute', mel([[0, 4, 6], [6, 3, 2], [8, 2, 8], [16, 3, 6], [22, 2, 2], [24, 1, 8]], 32)),
        L('MUSIC BOX', 'bells', sparkle(2, .3, 24), .2),
      ],
      vox: [
        L('VINYL', null, () => [{ s: 0, snd: 'crackle', d: 64, v: 1 }]),
        L('OOH', null, chops([[0, 'ooh', 1, .9]], 32)),
        L('CHIMES', null, fxs([[0, 'chime']])),
        L('SCRATCH', null, fxs([[56, 'scratch']])),
      ],
    },
    shots: [['SCRATCH', '💿', 'fx', 'scratch'], ['OOH', '🌙', 'chop', 'ooh'], ['CHIME', '✨', 'fx', 'chime'],
      ['SNAP', '🫰', 'drum', 'snap'], ['CLAP', '👏', 'drum', 'clap'], ['REVERSE', '🌀', 'fx', 'revcym']],
  },
];
const GENRE = Object.fromEntries(GENRES.map(g => [g.id, g]));
