'use strict';
/* ════════════════════ Käyttöliittymä: tyylit, pädit, XY-suodin, efektit, tallennus ja MIDI ════════════════════ */

const gridEl = $('#grid'), shotsEl = $('#shots'), genresEl = $('#genres');
const gname = $('#gname'), beatsEl = $('#beats'), hintEl = $('#hint'), bpmVal = $('#bpmVal');
const stopBtn = $('#stopBtn'), jamBtn = $('#jamBtn'), recBtn = $('#recBtn'), recTime = $('#recTime');
const xyEl = $('#xy'), xyDot = $('#xydot'), startEl = $('#start'), toastEl = $('#toast');
const recList = $('#recList'), recCount = $('#recCount');
const vizCanvas = $('#viz'), vctx = vizCanvas.getContext('2d');
let view = 'pads';

function setHues(h1, h2) {
  document.documentElement.style.setProperty('--h1', h1);
  document.documentElement.style.setProperty('--h2', h2);
}

function flashKey(el, strength = 1) {
  if (!el || reduceMotion) return;
  el.animate([
    { filter: `brightness(${1 + 1.4 * strength})`, transform: `scale(${1 - .06 * strength})` },
    { filter: 'brightness(1)', transform: 'scale(1)' },
  ], { duration: 220, easing: 'ease-out' });
}

let toastTimer = 0;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600);
}

/* ─── Näkymät ─── */

function showView(v) {
  view = v;
  for (const id of ['pads', 'studio', 'recs']) $('#view-' + id).hidden = id !== v;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  document.body.dataset.view = v;
  if (v === 'studio') syncStudio();
  if (v === 'recs') renderRecs();
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) showView(b.dataset.view);
});
$('#bpmBox').addEventListener('click', () => showView('studio'));

/* ─── Rakentaminen ─── */

function buildGenres() {
  genresEl.innerHTML = GENRES.map(g =>
    `<button class="chip" data-genre="${g.id}" style="--h:${g.hues[0]}" title="${g.desc}"><span class="art">${g.icon}</span>${g.short || g.name}</button>`).join('');
}

function buildPads() {
  gridEl.innerHTML =
    COLS.map(c => `<div class="colhead" style="--h:${c.h}">${c.name}</div>`).join('') +
    [0, 1, 2, 3].map(k => COLS.map(c =>
      `<button class="key" data-kind="loop" data-col="${c.id}" data-k="${k}" style="--h:${c.h}"
        aria-label="${c.name} ${genre.cols[c.id][k].name}">${genre.cols[c.id][k].name}</button>`).join('')).join('');
  shotsEl.innerHTML = genre.shots.map(([label, icon], i) =>
    `<button class="key" data-kind="shot" data-i="${i}" style="--h:${(genre.hues[1] + i * 40) % 360}" aria-label="${label}">
      <span class="art">${icon}</span>${label}</button>`).join('');
  gridEl.dataset.genre = genre.id;
}

function applyGenre() {
  buildPads();
  setHues(genre.hues[0], genre.hues[1]);
  gname.textContent = genre.name;
  history.replaceState(null, '', '#' + genre.id);
  updateLive();
}

function updateLive() {
  const any = tracks.size > 0;
  stopBtn.hidden = !any;
  hintEl.hidden = any;
  bpmVal.textContent = tempo;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.genre === genre.id));
  document.querySelectorAll('.key[data-kind="loop"]').forEach(b => {
    const tr = tracks.get(b.dataset.col);
    const mine = tr && tr.loop === +b.dataset.k;
    b.classList.toggle('on', !!mine && !tr.queued);
    b.classList.toggle('queued', !!mine && tr.queued);
  });
  if (!transport.running) [...beatsEl.children].forEach(i => i.classList.remove('on'));
  if (view === 'studio') syncStudio();
}

/* ─── Sekvensserin tapahtumat näkyviin ─── */

listeners.change.push(() => {
  if (gridEl.dataset.genre !== genre.id) applyGenre();
  else updateLive();
});

listeners.beat.push(pos => {
  const beat = (pos / 4) % 4, bar = pos % 16 === 0;
  [...beatsEl.children].forEach((i, k) => i.classList.toggle('on', k === beat));
  sunBoost += bar ? 30 : 12;
  pulseTunnel(bar ? .45 : .22);
  if (!reduceMotion && view === 'pads') document.querySelectorAll('.key.on').forEach(k =>
    k.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 150, easing: 'ease-out' }));
});

listeners.note.push((col, e) => {
  if (col === 'hats' || view !== 'pads') return;
  const tr = tracks.get(col);
  if (!tr) return;
  const key = gridEl.querySelector(`.key[data-col="${col}"][data-k="${tr.loop}"]`);
  flashKey(key, e.v >= .8 ? .7 : .35);
  if (col === 'vox' && (e.chop || e.fx)) {
    const [x, y] = center(key);
    burst(x, y, COLS[5].h, 10, .9, ['star', 'cross']);
    sunBoost += 80;
  }
});

listeners.drop.push(() => {
  fireworks(5, 120);
  sunBoost += 400;
});

/* ─── Pädit: napautus, pitkä painallus ja sormen liu'utus ─── */

function pressKey(el, velocity = 1) {
  const [x, y] = center(el);
  const hue = parseFloat(el.style.getPropertyValue('--h')) || 0;
  if (el.dataset.kind === 'loop') {
    toggleLoop(el.dataset.col, +el.dataset.k);
    if (view === 'pads') burst(x, y, hue, 10, .7, ['tri', 'diamond', 'circle']);
    flashKey(el);
    return null;
  }
  const shot = genre.shots[+el.dataset.i];
  if (view === 'pads') burst(x, y, hue, 14, .9, ['star', 'cross', 'tri']);
  sunBoost += 60;
  return holdRoll((t, i) => {
    playShot(shot, t, (i ? .75 : 1) * velocity);
    if (i) at(t, () => flashKey(el));
  }, shot[2] === 'fx' ? 4 : 2);
}

const active = new Map();       // osoitin → { el, h }
const downs = new Map();        // osoitin → painettu tyyppi

function startKey(el, pid, velocity) {
  const h = pressKey(el, velocity);
  if (h) { active.set(pid, { el, h }); el.classList.add('held'); }
}

function endKey(pid) {
  const a = active.get(pid);
  if (!a) return;
  a.h.release();
  a.el.classList.remove('held');
  active.delete(pid);
}

document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.key');
  if (!el) return;
  e.preventDefault();
  if (!audio()) return;
  if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  downs.set(e.pointerId, el.dataset.kind);
  startKey(el, e.pointerId);
});
document.addEventListener('pointerover', e => {
  if (downs.get(e.pointerId) !== 'shot') return;
  const el = e.target.closest('.key[data-kind="shot"]');
  if (!el) return;
  const a = active.get(e.pointerId);
  if (a && a.el === el) return;
  endKey(e.pointerId);
  startKey(el, e.pointerId);
});
['pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, e => { endKey(e.pointerId); downs.delete(e.pointerId); }));
document.addEventListener('click', e => {
  const el = e.target.closest('.key');
  if (!el || e.detail !== 0) return;       // vain näppäimistöllä painettu
  audio();
  const h = pressKey(el);
  if (h) setTimeout(() => h.release(), 200);
});

/* ─── XY-kosketuspinta: DJ-suodin ─── */

let xyPid = null;
function xyAt(x, y) {
  xyDot.style.left = x * 100 + '%';
  xyDot.style.top = (1 - y) * 100 + '%';
  setFilter(x, y);
}
function xyMove(e) {
  const r = xyEl.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  xyAt(x, 1 - y);
  if (Math.random() < .25) burst(e.clientX, e.clientY, x < .5 ? genre.hues[0] : genre.hues[1], 2, .3, ['circle']);
}
function xyRelease() {
  xyEl.classList.remove('active');
  xyDot.style.left = '50%';
  xyDot.style.top = '100%';
  setFilter(.5, 0);                          // suodin palaa auki
}
xyEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!audio()) return;
  xyPid = e.pointerId;
  xyEl.setPointerCapture(e.pointerId);
  xyEl.classList.add('active');
  xyMove(e);
});
xyEl.addEventListener('pointermove', e => { if (e.pointerId === xyPid) xyMove(e); });
const xyEnd = e => {
  if (e.pointerId !== xyPid) return;
  xyPid = null;
  xyRelease();
};
xyEl.addEventListener('pointerup', xyEnd);
xyEl.addEventListener('pointercancel', xyEnd);

/* ─── Efektinapit: toimivat niin kauan kuin nappia pidetään ─── */

const FX_ACTIONS = { gate: setGate, echo: setEcho, break: setBreak };
const fxSetters = {};
document.querySelectorAll('.fxbtn').forEach(b => {
  const fn = FX_ACTIONS[b.dataset.fx];
  let on = false;
  const set = v => {
    if (on === v) return;
    on = v;
    b.classList.toggle('held', v);
    fn(v);
    if (v) { const [x, y] = center(b); burst(x, y, parseFloat(b.style.getPropertyValue('--h')), 8, .6, ['cross', 'tri']); }
  };
  fxSetters[b.dataset.fx] = set;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
  ['pointerup', 'pointercancel'].forEach(t => b.addEventListener(t, () => set(false)));
  b.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); } });
  b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') set(false); });
});

/* ─── Tallennus ─── */

const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function toggleRec() {
  if (!audio()) return;
  if (!rec.on) {
    try {
      await recStart();
    } catch (e) {
      toast('Tallennus ei ole tuettu tässä selaimessa');
      return;
    }
    recBtn.classList.add('on');
    toast('● Tallennus käynnissä');
    return;
  }
  recBtn.classList.remove('on');
  recTime.textContent = 'REC';
  const r = await recStop();
  if (!r || r.duration < .3) return;
  const d = new Date();
  const name = `${genre.name} ${d.getDate()}.${d.getMonth() + 1}. ${d.getHours()}.${String(d.getMinutes()).padStart(2, '0')}`;
  const item = { id: Date.now(), name, genre: genre.id, bpm: tempo, duration: r.duration, ext: r.ext, blob: r.blob };
  try {
    await recsSave(item);
  } catch (e) {
    memRecs.unshift(item);                 // jos laitteen muisti ei ole käytössä, pidetään istunnon ajan
  }
  toast(`💾 Tallennettu: ${name} (${fmtTime(r.duration)})`);
  refreshRecCount();
  if (view === 'recs') renderRecs();
}
recBtn.addEventListener('click', toggleRec);

const memRecs = [];
async function allRecs() {
  let list = [];
  try { list = await recsAll(); } catch (e) { /* ei IndexedDB:tä */ }
  return [...memRecs, ...list];
}

async function refreshRecCount() {
  const n = (await allRecs()).length;
  recCount.hidden = !n;
  recCount.textContent = n;
}

const urls = new Map();
function recUrl(r) {
  if (!urls.has(r.id)) urls.set(r.id, URL.createObjectURL(r.blob));
  return urls.get(r.id);
}

async function renderRecs() {
  const list = await allRecs();
  if (!list.length) {
    recList.innerHTML = '<li class="empty">Ei vielä tallenteita.</li>';
    return;
  }
  recList.innerHTML = list.map(r => {
    const g = GENRE[r.genre] || genre;
    const size = r.blob.size > 1e6 ? (r.blob.size / 1e6).toFixed(1) + ' MB' : Math.round(r.blob.size / 1e3) + ' kB';
    return `<li class="rec" data-id="${r.id}" style="--h:${g.hues[0]}">
      <button class="play" aria-label="Toista">▶</button>
      <div class="meta"><b>${r.name}</b><small>${fmtTime(r.duration)} · ${r.bpm} BPM · ${r.ext.toUpperCase()} · ${size}</small>
        <div class="prog"><i></i></div></div>
      <a class="dl" href="${recUrl(r)}" download="biittipad-${r.genre}-${r.id}.${r.ext}" aria-label="Lataa">⬇</a>
      ${navigator.canShare ? '<button class="share" aria-label="Jaa">↗</button>' : ''}
      <button class="del" aria-label="Poista">🗑</button>
    </li>`;
  }).join('');
}

let player = null, playingId = null;
recList.addEventListener('click', async e => {
  const li = e.target.closest('.rec');
  if (!li) return;
  const id = +li.dataset.id;
  const r = (await allRecs()).find(x => x.id === id);
  if (!r) return;
  if (e.target.closest('.play')) {
    if (player && playingId === id) { player.pause(); player = null; playingId = null; renderPlayState(); return; }
    if (player) player.pause();
    player = new Audio(recUrl(r));
    playingId = id;
    player.onended = () => { player = null; playingId = null; renderPlayState(); };
    player.ontimeupdate = () => {
      const bar = recList.querySelector(`.rec[data-id="${id}"] .prog i`);
      if (bar && player) bar.style.width = (player.currentTime / (player.duration || r.duration)) * 100 + '%';
    };
    player.play();
    renderPlayState();
  } else if (e.target.closest('.share')) {
    const file = new File([r.blob], `biittipad-${r.genre}-${r.id}.${r.ext}`, { type: r.blob.type });
    if (navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: r.name }).catch(() => {});
    else toast('Jakaminen ei onnistu tällä laitteella – käytä latausta ⬇');
  } else if (e.target.closest('.del')) {
    if (!confirm(`Poistetaanko "${r.name}"?`)) return;
    if (playingId === id && player) { player.pause(); player = null; playingId = null; }
    const i = memRecs.findIndex(x => x.id === id);
    if (i >= 0) memRecs.splice(i, 1); else await recsDelete(id);
    URL.revokeObjectURL(urls.get(id));
    urls.delete(id);
    renderRecs();
    refreshRecCount();
  }
});

function renderPlayState() {
  recList.querySelectorAll('.rec').forEach(li => {
    const on = +li.dataset.id === playingId;
    li.classList.toggle('playing', on);
    li.querySelector('.play').textContent = on ? '❚❚' : '▶';
  });
}

/* ─── MIDI-ohjaimet: nuotit 36–59 = silmukat, 60–65 = one-shotit, CC1/CC74 = suodin ─── */

const midiHeld = new Map();
function midiNote(note, vel) {
  if (!audio()) return;
  if (note >= 36 && note < 60) {
    if (!vel) return;
    const i = note - 36, col = COLS[i % 6].id, row = Math.floor(i / 6);
    pressKey(gridEl.querySelector(`.key[data-col="${col}"][data-k="${row}"]`));
  } else if (note >= 60 && note < 66) {
    const el = shotsEl.children[note - 60];
    if (vel) { midiHeld.set(note, pressKey(el, .4 + vel / 127 * .6)); el.classList.add('held'); }
    else { const h = midiHeld.get(note); if (h) h.release(); midiHeld.delete(note); el.classList.remove('held'); }
  }
}
function initMidi() {
  if (!navigator.requestMIDIAccess || initMidi.done) return;
  initMidi.done = true;
  navigator.requestMIDIAccess().then(access => {
    const bind = () => {
      let n = 0;
      access.inputs.forEach(inp => {
        n++;
        inp.onmidimessage = ({ data: [st, a, b] }) => {
          const type = st & 0xf0;
          if (type === 0x90) midiNote(a, b);
          else if (type === 0x80) midiNote(a, 0);
          else if (type === 0xb0 && (a === 1 || a === 74)) xyAt(b / 127, .15);
        };
      });
      $('#midiTag').hidden = !n;
    };
    bind();
    access.onstatechange = bind;
  }).catch(() => {});
}

/* ─── Muut napit ─── */

genresEl.addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  audio();
  setGenre(c.dataset.genre);
  const [x, y] = center(c);
  burst(x, y, genre.hues[0], 16, .9);
  sunBoost += 150;
  if (!reduceMotion && view === 'pads') [...gridEl.querySelectorAll('.key'), ...shotsEl.children].forEach((k, i) => k.animate([
    { transform: 'scale(0)', opacity: 0 }, { transform: 'none', opacity: 1 },
  ], { duration: 300, delay: i * 7, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
});
stopBtn.addEventListener('click', () => stopAllLoops());
jamBtn.addEventListener('click', () => {
  jam();
  const [x, y] = center(jamBtn);
  burst(x, y, genre.hues[1], 18, 1, ['star', 'diamond']);
  sunBoost += 200;
});

// Näppäimistö: Q–Y, A–H, Z–N ja 7–' silmukat riveittäin, 1–6 one-shotit, R = tallennus,
// välilyönti = JAM, Esc = stop, G/E/B = efektit (pidä pohjassa)
const ROW_KEYS = ['qwerty', 'asdfgh', 'zxcvbn', "7890+'"];
const FX_KEYS = { i: 'gate', o: 'echo', p: 'break' };
document.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input, .fxbtn')) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { stopAllLoops(); return; }
  if (k === 'enter') { toggleRec(); return; }
  if (k === ' ' && document.activeElement === document.body) { e.preventDefault(); jam(); return; }
  if (FX_KEYS[k]) { audio(); fxSetters[FX_KEYS[k]](true); return; }
  if (/^[1-6]$/.test(k)) { audio(); const h = pressKey(shotsEl.children[+k - 1]); if (h) setTimeout(() => h.release(), 150); return; }
  const row = ROW_KEYS.findIndex(r => r.includes(k));
  if (row >= 0) { audio(); pressKey(gridEl.querySelector(`.key[data-col="${COLS[ROW_KEYS[row].indexOf(k)].id}"][data-k="${row}"]`)); }
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (FX_KEYS[k]) fxSetters[FX_KEYS[k]](false);
});

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  // Tallennuksen aikana jatketaan taustalla; muuten pysäytetään
  if (document.hidden && ctx && !rec.on) {
    for (const pid of [...active.keys()]) endKey(pid);
    stopAllLoops();
    ctx.suspend();
  }
});

startEl.addEventListener('click', () => {
  audio();
  setEchoTime();
  initMidi();
  startEl.hidden = true;
  const [x, y] = center(recBtn);
  burst(x, y, genre.hues[0], 20, 1);
});

/* ─── Spektrinäyttö ja mittarit ─── */

let vizData = null;
function drawFrame() {
  updateMeters(view === 'studio');
  if (rec.on) recTime.textContent = fmtTime(recElapsed());
  if (view === 'pads') drawViz();
  requestAnimationFrame(drawFrame);
}

function drawViz() {
  const r = vizCanvas.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (vizCanvas.width !== Math.round(r.width * dpr) || vizCanvas.height !== Math.round(r.height * dpr)) {
    vizCanvas.width = Math.round(r.width * dpr);
    vizCanvas.height = Math.round(r.height * dpr);
  }
  const w = vizCanvas.width, h = vizCanvas.height;
  vctx.clearRect(0, 0, w, h);
  if (!FX || !FX.analyser || r.height <= 0) return;
  if (!vizData) vizData = new Uint8Array(FX.analyser.frequencyBinCount);
  FX.analyser.getByteFrequencyData(vizData);
  const n = 48, bw = w / n;
  vctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.pow(i / n, 1.8) * vizData.length * .8);
    const v = vizData[idx] / 255;
    const bh = Math.max(2 * dpr, v * v * h * .95);
    const hue = genre.hues[0] + (genre.hues[1] - genre.hues[0]) * (i / n);
    vctx.fillStyle = `hsla(${hue}, 100%, ${45 + v * 25}%, ${.3 + v * .6})`;
    vctx.fillRect(i * bw + 1, h / 2 - bh / 2, bw - 2, bh);
  }
  vctx.globalCompositeOperation = 'source-over';
}

/* ─── Käynnistys ─── */

startVisuals();
buildGenres();
buildMixer();
const fromHash = GENRE[location.hash.slice(1)];
if (fromHash) { genre = fromHash; tempo = genre.bpm; swing = genre.swing; }
applyGenre();
showView('pads');
refreshRecCount();
requestAnimationFrame(drawFrame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
