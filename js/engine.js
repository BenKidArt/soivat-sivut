'use strict';
/* ════════════════════ Äänimoottori: stereoketju, mikserikanavat, reverb, kaiku ja masteröinti ════════════════════ */

let ctx = null, noiseBuf = null;
let master = null;       // oletusulostulo: SHOTS-kanava
let FX = null;           // väylät, efektit ja mittarit
let NODES = null;        // pitkän painalluksen aikana kerätyt äänilähteet

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const dbToGain = db => db <= -60 ? 0 : Math.pow(10, db / 20);

// Mikserin kanavat. Rumpukanavat kulkevat BREAK-väylän kautta, musiikki sidechain-pumpun kautta.
const CHANNELS = [
  { id: 'drums', name: 'DRUMS', h: 0, group: 'drums', pan: 0, rev: .06, dly: 0, vol: 0 },
  { id: 'hats', name: 'HATS', h: 40, group: 'drums', pan: .18, rev: .1, dly: 0, vol: -2 },
  { id: 'bass', name: 'BASS', h: 280, group: 'music', pan: 0, rev: 0, dly: 0, vol: -1 },
  { id: 'synth', name: 'SYNTH', h: 200, group: 'music', pan: -.12, rev: .28, dly: .08, vol: -2 },
  { id: 'lead', name: 'LEAD', h: 150, group: 'music', pan: .1, rev: .22, dly: .15, vol: -2 },
  { id: 'vox', name: 'VOX', h: 320, group: 'music', pan: 0, rev: .3, dly: .12, vol: -1 },
  { id: 'shots', name: 'SHOTS', h: 55, group: 'dry', pan: 0, rev: .15, dly: .05, vol: -2 },
];

// Tallennettavat mikseriasetukset
const MIX = {
  ch: Object.fromEntries(CHANNELS.map(c => [c.id, { vol: c.vol, pan: c.pan, rev: c.rev, dly: c.dly, mute: false, solo: false }])),
  master: 0, reverb: 'hall', drive: .2,
};
try {
  const saved = JSON.parse(localStorage.getItem('biittipad-mix') || 'null');
  if (saved) {
    Object.assign(MIX, { master: saved.master ?? 0, reverb: saved.reverb || 'hall', drive: saved.drive ?? .2 });
    for (const id in MIX.ch) Object.assign(MIX.ch[id], saved.ch?.[id] || {}, { solo: false });
  }
} catch (e) { /* ei tallennettuja asetuksia */ }
function saveMix() {
  try { localStorage.setItem('biittipad-mix', JSON.stringify(MIX)); } catch (e) { /* yksityinen tila */ }
}

const REVERBS = {
  room: { name: 'ROOM', sec: 1.1, damp: .85, pre: .008, er: .5 },
  hall: { name: 'HALL', sec: 2.8, damp: .65, pre: .025, er: .35 },
  plate: { name: 'PLATE', sec: 1.9, damp: .3, pre: .004, er: .15 },
};

/*
 * Signaaliketju (stereo):
 *   kanava: sisään → panorointi → häivytin → mute → [ryhmä] ─┬→ dryBus → mixBus → DJ-suotimet → gate → EQ →
 *                                                          ├→ reverb-lähetys      glue-kompressori → soft clip → master → limitteri → ulos
 *                                                          └→ kaikulähetys        (+ tallennus ja mittarit limitterin jälkeen)
 *   reverb- ja kaikupaluut → mixBus (ei takaisin kaikuun, joten takaisinkytkentää ei synny)
 */
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    buildGraph();
  }
  if (ctx.state !== 'running') ctx.resume();
  return ctx;
}

function buildGraph() {
  {

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = .001;
    limiter.release.value = .08;
    limiter.connect(ctx.destination);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = .75;
    limiter.connect(analyser);
    const meterL = ctx.createAnalyser(), meterR = ctx.createAnalyser();
    meterL.fftSize = meterR.fftSize = 1024;
    const split = ctx.createChannelSplitter(2);
    limiter.connect(split);
    split.connect(meterL, 0);
    split.connect(meterR, 1);

    const masterFader = gainNode(dbToGain(MIX.master), limiter);
    const clipIn = gainNode(1);
    const clip = drive(1.2, masterFader);
    clipIn.connect(clip);
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16;
    glue.knee.value = 8;
    glue.ratio.value = 2.5;
    glue.attack.value = .012;
    glue.release.value = .18;
    glue.connect(clipIn);
    const hiShelf = biquad('highshelf', 9000, null, 1.5);
    hiShelf.connect(glue);
    const loShelf = biquad('lowshelf', 70, null, 1.5);
    loShelf.connect(hiShelf);
    const gate = gainNode(1, loShelf);
    const hpf = biquad('highpass', 10, .7); hpf.connect(gate);
    const lpf = biquad('lowpass', 20000, .7); lpf.connect(hpf);
    const mixBus = gainNode(1, lpf);
    const dryBus = gainNode(.72, mixBus);

    // Reverb
    const verb = ctx.createConvolver();
    const revIn = gainNode(1, verb);
    verb.connect(gainNode(1, mixBus));

    // Stereo ping-pong-kaiku, synkattu tempoon
    const dL = ctx.createDelay(2), dR = ctx.createDelay(2);
    const tone = biquad('lowpass', 3500, .5);
    const hpTone = biquad('highpass', 250, .5);
    const fb = gainNode(.45);
    const merger = ctx.createChannelMerger(2);
    const delayIn = gainNode(1);
    delayIn.connect(hpTone);
    hpTone.connect(dL);
    dL.connect(merger, 0, 0);
    dL.connect(dR);
    dR.connect(merger, 0, 1);
    dR.connect(tone);
    tone.connect(fb);
    fb.connect(dL);
    merger.connect(gainNode(.8, mixBus));
    const echoThrow = gainNode(0, delayIn);
    dryBus.connect(echoThrow);

    const drumGroup = gainNode(1, dryBus);
    const pump = gainNode(1, dryBus);

    FX = { limiter, analyser, meterL, meterR, masterFader, clipIn, glue, gate, hpf, lpf, mixBus, dryBus, verb, revIn,
      dL, dR, delayIn, echoThrow, drumGroup, pump, gateLfo: null, strips: {}, tap: limiter };

    for (const c of CHANNELS) FX.strips[c.id] = makeStrip(c);
    master = FX.strips.shots.input;
    applyMix();
    setReverb(MIX.reverb);
    setDrive(MIX.drive);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
}

function makeStrip(c) {
  const input = gainNode(1);
  const pan = panner(0);
  const fader = gainNode(1);
  const mute = gainNode(1);
  input.connect(pan);
  pan.connect(fader);
  fader.connect(mute);
  const dest = c.group === 'drums' ? FX.drumGroup : c.group === 'music' ? FX.pump : FX.dryBus;
  mute.connect(dest);
  const rev = gainNode(0, FX.revIn);
  const dly = gainNode(0, FX.delayIn);
  mute.connect(rev);
  mute.connect(dly);
  const meter = ctx.createAnalyser();
  meter.fftSize = 512;
  mute.connect(meter);
  return { input, pan, fader, mute, rev, dly, meter };
}

// Päivittää kaikki kanavat MIX-asetuksista (myös solo)
function applyMix() {
  if (!FX) return;
  const now = ctx.currentTime;
  const anySolo = CHANNELS.some(c => MIX.ch[c.id].solo);
  for (const c of CHANNELS) {
    const m = MIX.ch[c.id], s = FX.strips[c.id];
    const audible = !m.mute && (!anySolo || m.solo);
    s.fader.gain.setTargetAtTime(dbToGain(m.vol), now, .02);
    s.mute.gain.setTargetAtTime(audible ? 1 : 0, now, .01);
    if (s.pan.pan) s.pan.pan.setTargetAtTime(m.pan, now, .02);
    s.rev.gain.setTargetAtTime(m.rev, now, .02);
    s.dly.gain.setTargetAtTime(m.dly, now, .02);
  }
  FX.masterFader.gain.setTargetAtTime(dbToGain(MIX.master), now, .02);
  saveMix();
}

function setReverb(type) {
  MIX.reverb = type;
  if (FX) FX.verb.buffer = makeIR(REVERBS[type]);
  saveMix();
}

// Masterin saturaatio / "lämpö": syöttötaso soft clipperiin
function setDrive(v) {
  MIX.drive = v;
  if (FX) FX.clipIn.gain.setTargetAtTime(.8 + v * 1.4, ctx.currentTime, .05);
  saveMix();
}

// Stereo-reverbin impulssivaste: esiviive, varhaiset heijastukset ja taajuusriippuvainen vaimeneminen
function makeIR({ sec, damp, pre, er }) {
  const sr = ctx.sampleRate, len = Math.floor(sr * (sec + pre + .1));
  const buf = ctx.createBuffer(2, len, sr);
  const p0 = Math.floor(pre * sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let y = 0;
    for (let i = p0; i < len; i++) {
      const t = (i - p0) / sr;
      const coef = Math.min(.97, .05 + (t / sec) * damp);       // korkeat vaimenevat nopeammin
      y += ((Math.random() * 2 - 1) - y) * (1 - coef);
      d[i] = y * Math.exp(-t * 6.9 / sec) * (1 + coef);
    }
    for (let k = 0; k < 8; k++) {                                 // varhaiset heijastukset
      const at = p0 + Math.floor(rand(.003, .07) * sr);
      if (at < len) d[at] += rand(-1, 1) * er;
    }
  }
  return buf;
}

function gainNode(value, dest) {
  const g = ctx.createGain();
  g.gain.value = value;
  if (dest) g.connect(dest);
  return g;
}

function panner(p, dest) {
  const n = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  if (n.pan) n.pan.value = p;
  if (dest) n.connect(dest);
  return n;
}

/* ─── Rakennuspalikat ─── */

function track(node) {
  if (NODES) NODES.push(node);
  return node;
}

// Voimakkuuskäyrä: nousu → vaimeneminen tasolle sus → (valinnainen) päästö
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

function osc(type, f, t, end, dest, amp = 1, detune = 0) {
  const o = ctx.createOscillator();
  if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.connect(amp === 1 ? dest : gainNode(amp, dest));
  o.start(t);
  o.stop(end);
  return track(o);
}

function biquad(type, f, q, gain) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  if (q != null) b.Q.value = q;
  if (gain != null) b.gain.value = gain;
  return b;
}

function filt(type, f, q, dest) {
  const b = biquad(type, f, q);
  b.connect(dest);
  return b;
}

function chain(dest, ...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  nodes[nodes.length - 1].connect(dest);
  return nodes[0];
}

function noise(t, end, dest, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.playbackRate.value = rate;
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
  g.gain.linearRampToValueAtTime(depth, t + delay + .2);
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

// Säröttävä waveshaper (tanh), käyrät välimuistissa
const CURVES = new Map();
function drive(k, dest) {
  if (!CURVES.has(k)) {
    const c = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = i / 2047 * 2 - 1;
      c[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    CURVES.set(k, c);
  }
  const s = ctx.createWaveShaper();
  s.curve = CURVES.get(k);
  s.oversample = '2x';
  if (dest) s.connect(dest);
  return s;
}

// Leveä stereo: oskillaattorit jaetaan vasemmalle ja oikealle
function wide(dest, width = .7) {
  return [panner(-width, dest), panner(width, dest)];
}

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
const organWave = () => periodic('organ', harmonics([1, .9, .5, .6, 0, .3, 0, .25]));
const fluteWave = () => periodic('flute', harmonics([1, .22, .08, .03, .01]));
