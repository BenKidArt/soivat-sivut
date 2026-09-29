'use strict';
/* ════════════════════ Sekvensseri, raidat ja DJ-efektit ════════════════════ */

let genre = GENRE.phonk;
let tempo = genre.bpm, swing = genre.swing, transpose = 0;
const transport = { running: false, step: 0, next: 0, timer: 0 };
const tracks = new Map();          // sarake → { loop, from, bus, queued }
const bpm = () => tempo;
const stepDur = () => 60 / bpm() / 4;
const listeners = { beat: [], note: [], change: [] };
const emit = (name, ...args) => listeners[name].forEach(fn => fn(...args));

function at(t, fn) {
  setTimeout(fn, Math.max(0, (t - ctx.currentTime) * 1000));
}

const nextStep = grid => Math.ceil(transport.step / grid) * grid;
const stepTime = step => transport.next + (step - transport.step) * stepDur();

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

// Silmukka käännetään 64 askeleen taulukoksi, välimuistissa
const compiled = new Map();
function loopSteps(g, col, k) {
  const key = g.id + col + k;
  let steps = compiled.get(key);
  if (!steps) {
    steps = Array.from({ length: 64 }, () => []);
    for (const e of g.cols[col][k].gen(g)) steps[e.s % 64].push(e);
    compiled.set(key, steps);
  }
  return steps;
}

function playEvent(e, loop, t, out, sd) {
  const len = e.d * sd * .95;
  if (e.snd && e.p != null && transpose) e = Object.assign({}, e, { p: e.p + transpose });
  if (e.snd) {
    if (e.roll) for (let i = 0; i < e.roll; i++) DRUMS[e.snd](t + i * sd / e.roll, e.v * (i ? .7 : 1), out, len, e);
    else DRUMS[e.snd](t, e.v, out, len, e);
  } else if (e.chop) {
    CHOPS[e.chop](t, out, e.r, e.v);
  } else if (e.fx) {
    FXS[e.fx](t, out, len);
  } else {
    const v = e.v / Math.sqrt(e.n.length);
    const tr = transpose;
    const ev = tr && e.from != null ? Object.assign({}, e, { from: e.from + tr }) : e;
    e.n.forEach((n, i) => VOICES[loop.inst](n + tr, t + (loop.inst === 'guitar' ? i * .025 : 0), len, out, v, ev));
  }
}

function scheduleStep(step, t) {
  const pos = step % 64;
  const sd = stepDur();
  // Swing viivästää joka toista kuudestoistaosaa
  const st = t + (pos % 2 ? swing * sd : 0);
  if (step % 4 === 0) at(t, () => emit('beat', pos));
  for (const [col, tr] of tracks) {
    if (step < tr.from) continue;
    if (tr.queued && step === tr.from) at(t, () => { tr.queued = false; emit('change'); });
    const loop = genre.cols[col][tr.loop];
    for (const e of loopSteps(genre, col, tr.loop)[pos]) {
      playEvent(e, loop, st, tr.bus, sd);
      // Sidechain: musiikki väistää basaria
      if (genre.pump && e.snd && e.snd.startsWith('kick')) duck(st);
      at(st, () => emit('note', col, e));
    }
  }
}

function duck(t) {
  const p = FX.pump.gain;
  p.setTargetAtTime(1 - genre.pump, t, .004);
  p.setTargetAtTime(1, t + .03, .09);
}

function toggleLoop(col, k) {
  if (!audio()) return;
  const tr = tracks.get(col);
  if (tr && tr.loop === k) { stopTrack(col); return; }
  if (tr) stopTrack(col, true);
  const bus = gainNode(.85, FX.strips[col].input);
  const loop = genre.cols[col][k];
  if (loop.send) bus.connect(gainNode(loop.send, FX.delayIn));
  let from = 0;
  if (!transport.running) startTransport();
  else from = nextStep(tracks.size ? 16 : 4);     // uusi silmukka alkaa seuraavan tahdin alusta
  tracks.set(col, { loop: k, from, bus, queued: from > 0 });
  emit('change');
}

function stopTrack(col, keepRunning) {
  const tr = tracks.get(col);
  if (!tr) return;
  tracks.delete(col);
  const g = tr.bus.gain, now = ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(0, now + .12);
  setTimeout(() => tr.bus.disconnect(), 3000);
  if (!keepRunning && !tracks.size) stopTransport();
  emit('change');
}

function stopAllLoops() {
  for (const col of [...tracks.keys()]) stopTrack(col, true);
  stopTransport();
  emit('change');
}

function setGenre(id) {
  if (genre.id === id) return;
  const playing = [...tracks.entries()].map(([c, tr]) => [c, tr.loop]);
  genre = GENRE[id];
  tempo = genre.bpm;
  swing = genre.swing;
  if (FX) setEchoTime();
  // Soivat silmukat jatkuvat samoissa paikoissa uuden tyylin äänillä
  if (playing.length && ctx) {
    for (const [c] of playing) stopTrack(c, true);
    for (const [c, k] of playing) toggleLoop(c, k);
  }
  emit('change');
}

// Arpoo valmiin yhdistelmän: rummut, hatit, basso ja 1–2 muuta
function jam() {
  if (!audio()) return;
  const cols = ['drums', 'hats', 'bass', ...(Math.random() < .5 ? ['synth', 'lead'] : [pick(['synth', 'lead', 'vox'])])];
  for (const c of COLS.map(c => c.id)) if (!cols.includes(c) && tracks.has(c)) stopTrack(c, true);
  for (const c of cols) {
    const k = Math.floor(Math.random() * 4);
    if (tracks.get(c)?.loop !== k) toggleLoop(c, k);
  }
}

/* ─── One-shotit ja pitkä painallus ─── */

function playShot(shot, t, v = 1) {
  const [, , kind, id] = shot;
  if (kind === 'fx') FXS[id](t, master, id === 'riser' ? stepDur() * 16 : undefined);
  else if (kind === 'chop') CHOPS[id](t, master, 1, v);
  else DRUMS[id](t, v, master, .3, {});
}

// Rulla: pitkä painallus toistaa ääntä tahdissa niin kauan kuin sormi on napilla
function holdRoll(play, grid = 2) {
  if (!audio()) return null;
  play(ctx.currentTime + .005, 0);
  let timer = 0, count = 0;
  const delay = setTimeout(() => {
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
  }, 260);
  return { release() { clearTimeout(delay); clearInterval(timer); } };
}

/* ─── DJ-efektit ─── */

function setEchoTime() {
  const now = ctx.currentTime;
  FX.dL.delayTime.setTargetAtTime(stepDur() * 3, now, .05);     // pisteellinen kahdeksasosa, ping-pong
  FX.dR.delayTime.setTargetAtTime(stepDur() * 3, now, .05);
  if (FX.gateLfo) FX.gateLfo.frequency.setTargetAtTime(1 / (stepDur() * 2), now, .02);
}

function setTempo(v) {
  tempo = Math.round(Math.max(60, Math.min(200, v)));
  if (FX) setEchoTime();
  emit('change');
}

function setSwing(v) { swing = Math.max(0, Math.min(.5, v)); emit('change'); }
function setTranspose(v) { transpose = Math.max(-12, Math.min(12, v)); emit('change'); }

// XY-suodin: x < .45 alipäästö, x > .55 ylipäästö, y = resonanssi
function setFilter(x, y) {
  if (!FX) return;
  const now = ctx.currentTime;
  const q = .7 + y * 13;
  const lp = x < .45 ? 150 * Math.pow(20000 / 150, x / .45) : 20000;
  const hp = x > .55 ? 10 * Math.pow(4000 / 10, (x - .55) / .45) : 10;
  FX.lpf.frequency.setTargetAtTime(lp, now, .03);
  FX.hpf.frequency.setTargetAtTime(hp, now, .03);
  FX.lpf.Q.setTargetAtTime(x < .45 ? q : .7, now, .03);
  FX.hpf.Q.setTargetAtTime(x > .55 ? q : .7, now, .03);
}

function setGate(on) {
  if (!audio()) return;
  const g = FX.gate.gain, now = ctx.currentTime;
  if (FX.gateLfo) { FX.gateLfo.stop(); FX.gateLfo = null; }
  g.cancelScheduledValues(now);
  if (!on) { g.setTargetAtTime(1, now, .01); return; }
  // Kuudestoistaosa-gate, joka alkaa tahdissa
  const t = transport.running ? Math.max(stepTime(nextStep(1)), now + .01) : now + .01;
  g.setValueAtTime(.5, t);
  const l = ctx.createOscillator();
  l.type = 'square';
  l.frequency.value = 1 / (stepDur() * 2);
  l.connect(gainNode(.5, g));
  l.start(t);
  FX.gateLfo = l;
}

function setEcho(on) {
  if (!audio()) return;
  setEchoTime();
  FX.echoThrow.gain.setTargetAtTime(on ? .6 : 0, ctx.currentTime, .02);
}

// BREAK: rummut pois niin kauan kuin nappia pidetään; päästettäessä ne palaavat seuraavalla iskulla ja räjähdyksellä
function setBreak(on) {
  if (!audio()) return;
  const g = FX.drumGroup.gain, now = ctx.currentTime;
  g.cancelScheduledValues(now);
  if (on) {
    g.setTargetAtTime(0, now, .02);
    FX.lpf.frequency.setTargetAtTime(900, now, .3);
    FXS.riser(now, master, stepDur() * 8);
  } else {
    const t = transport.running ? Math.max(stepTime(nextStep(4)), now + .02) : now + .02;
    g.setValueAtTime(0, now);
    g.setValueAtTime(1, t);
    FX.lpf.frequency.setValueAtTime(20000, t);
    FXS.impact(t, master);
    at(t, () => emit('drop'));
  }
}
listeners.drop = [];
