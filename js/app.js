'use strict';
/* ════════════════════ Käyttöliittymä: tyylit, pädit, XY-suodin ja efektinapit ════════════════════ */

const gridEl = $('#grid'), shotsEl = $('#shots'), genresEl = $('#genres');
const gname = $('#gname'), bpmLabel = $('#bpmLabel'), beatsEl = $('#beats'), hintEl = $('#hint');
const stopBtn = $('#stopBtn'), muteBtn = $('#muteBtn'), jamBtn = $('#jamBtn');
const xyEl = $('#xy'), xyDot = $('#xydot'), startEl = $('#start');
const vizCanvas = $('#viz'), vctx = vizCanvas.getContext('2d');
const themeMeta = document.querySelector('meta[name=theme-color]');

function setHues(h1, h2) {
  document.documentElement.style.setProperty('--h1', h1);
  document.documentElement.style.setProperty('--h2', h2);
  themeMeta.content = `hsl(${h1} 80% 8%)`;
}

function flashKey(el, strength = 1) {
  if (!el || reduceMotion) return;
  el.animate([
    { filter: `brightness(${1 + 1.4 * strength})`, transform: `scale(${1 - .06 * strength})` },
    { filter: 'brightness(1)', transform: 'scale(1)' },
  ], { duration: 220, easing: 'ease-out' });
}

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
}

function applyGenre() {
  buildPads();
  setHues(genre.hues[0], genre.hues[1]);
  gname.textContent = genre.name;
  bpmLabel.textContent = genre.bpm + ' BPM';
  history.replaceState(null, '', '#' + genre.id);
  updateLive();
}

function updateLive() {
  const any = tracks.size > 0;
  stopBtn.hidden = !any;
  hintEl.hidden = any;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.genre === genre.id));
  document.querySelectorAll('.key[data-kind="loop"]').forEach(b => {
    const tr = tracks.get(b.dataset.col);
    const mine = tr && tr.loop === +b.dataset.k;
    b.classList.toggle('on', !!mine && !tr.queued);
    b.classList.toggle('queued', !!mine && tr.queued);
  });
  if (!transport.running) [...beatsEl.children].forEach(i => i.classList.remove('on'));
}

/* ─── Sekvensserin tapahtumat näkyviin ─── */

listeners.change.push(() => {
  if (gridEl.querySelector('.key')?.getAttribute('aria-label') !== `${COLS[0].name} ${genre.cols.drums[0].name}`) applyGenre();
  else updateLive();
});

listeners.beat.push(pos => {
  const beat = (pos / 4) % 4, bar = pos % 16 === 0;
  [...beatsEl.children].forEach((i, k) => i.classList.toggle('on', k === beat));
  sunBoost += bar ? 55 : 22;
  pulseTunnel(bar ? .7 : .35);
  if (!reduceMotion) document.querySelectorAll('.key.on').forEach(k =>
    k.animate([{ transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' }));
});

listeners.note.push((col, e) => {
  if (col === 'hats') return;
  const tr = tracks.get(col);
  if (!tr) return;
  const key = gridEl.querySelector(`.key[data-col="${col}"][data-k="${tr.loop}"]`);
  flashKey(key, e.v >= .8 ? .8 : .4);
  if (e.snd && e.snd.startsWith('kick')) {
    const [x, y] = center(key);
    burst(x, y, COLS[0].h, 4, .5, ['tri', 'diamond']);
  } else if (col === 'vox' && (e.chop || e.fx)) {
    const [x, y] = center(key);
    burst(x, y, COLS[5].h, 14, 1, ['star', 'cross']);
    sunBoost += 120;
  }
});

listeners.drop.push(() => {
  fireworks(6, 120);
  sunBoost += 600;
  const [x, y] = center($('#vizbox'));
  ripple(x, y, genre.hues[0], 2);
});

/* ─── Pädit: napautus, pitkä painallus ja sormen liu'utus ─── */

function pressKey(el) {
  const [x, y] = center(el);
  const hue = parseFloat(el.style.getPropertyValue('--h')) || 0;
  if (el.dataset.kind === 'loop') {
    toggleLoop(el.dataset.col, +el.dataset.k);
    burst(x, y, hue, 12, .8, ['tri', 'diamond', 'circle']);
    flashKey(el);
    return null;
  }
  const shot = genre.shots[+el.dataset.i];
  burst(x, y, hue, 16, 1, ['star', 'cross', 'tri']);
  sunBoost += 80;
  return holdRoll((t, i) => {
    playShot(shot, t, i ? .75 : 1);
    if (i) at(t, () => { flashKey(el); burst(x, y, hue, 5, .6); });
  }, shot[2] === 'fx' ? 4 : 2);
}

const active = new Map();       // osoitin → { el, h }
const downs = new Map();        // osoitin → painettu tyyppi

function startKey(el, pid) {
  const h = pressKey(el);
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
function xyMove(e) {
  const r = xyEl.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  xyDot.style.left = x * 100 + '%';
  xyDot.style.top = y * 100 + '%';
  setFilter(x, 1 - y);
  if (Math.random() < .3) burst(e.clientX, e.clientY, x < .5 ? genre.hues[0] : genre.hues[1], 2, .3, ['circle']);
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
  xyEl.classList.remove('active');
  xyDot.style.left = '50%';
  xyDot.style.top = '100%';
  setFilter(.5, 0);                          // suodin palaa auki
};
xyEl.addEventListener('pointerup', xyEnd);
xyEl.addEventListener('pointercancel', xyEnd);

/* ─── Efektinapit: toimivat niin kauan kuin nappia pidetään ─── */

const FX_ACTIONS = { gate: setGate, echo: setEcho, break: setBreak };
document.querySelectorAll('.fxbtn').forEach(b => {
  const fn = FX_ACTIONS[b.dataset.fx];
  let on = false;
  const set = v => {
    if (on === v) return;
    on = v;
    b.classList.toggle('held', v);
    fn(v);
    if (v) { const [x, y] = center(b); burst(x, y, parseFloat(b.style.getPropertyValue('--h')), 10, .7, ['cross', 'tri']); }
  };
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
  ['pointerup', 'pointercancel'].forEach(t => b.addEventListener(t, () => set(false)));
  b.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); } });
  b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') set(false); });
});

/* ─── Muut napit ─── */

genresEl.addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  audio();
  setGenre(c.dataset.genre);
  const [x, y] = center(c);
  burst(x, y, genre.hues[0], 20, 1);
  sunBoost += 250;
  if (!reduceMotion) [...gridEl.querySelectorAll('.key'), ...shotsEl.children].forEach((k, i) => k.animate([
    { transform: 'scale(0) rotate(-90deg)', opacity: 0 }, { transform: 'none', opacity: 1 },
  ], { duration: 360, delay: i * 8, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
});
stopBtn.addEventListener('click', () => {
  stopAllLoops();
  const [x, y] = center(stopBtn);
  burst(x, y, 340, 14, .8);
});
jamBtn.addEventListener('click', () => {
  jam();
  const [x, y] = center(jamBtn);
  burst(x, y, genre.hues[1], 24, 1.1, ['star', 'diamond']);
  sunBoost += 300;
});
muteBtn.addEventListener('click', () => {
  setMasterMuted(!muted);
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.classList.toggle('off', muted);
});

// Näppäimistö: Q–Y, A–H, Z–N ja 7–= silmukat riveittäin, 1–6 one-shotit, välilyönti = JAM, Esc = stop
const ROW_KEYS = ['qwerty', 'asdfgh', 'zxcvbn', "7890+'"];
document.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest('.fxbtn')) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { stopAllLoops(); return; }
  if (k === ' ' && document.activeElement === document.body) { e.preventDefault(); jam(); return; }
  if (/^[1-6]$/.test(k)) { audio(); const h = pressKey(shotsEl.children[+k - 1]); if (h) setTimeout(() => h.release(), 150); return; }
  const row = ROW_KEYS.findIndex(r => r.includes(k));
  if (row >= 0) { audio(); pressKey(gridEl.querySelector(`.key[data-col="${COLS[ROW_KEYS[row].indexOf(k)].id}"][data-k="${row}"]`)); }
});

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ctx) {
    for (const pid of [...active.keys()]) endKey(pid);
    stopAllLoops();
    ctx.suspend();
  }
});

startEl.addEventListener('click', () => {
  audio();
  setEchoTime();
  const [x, y] = center($('#start button'));
  burst(x, y, genre.hues[0], 30, 1.3);
  startEl.hidden = true;
});

/* ─── Spektrinäyttö ─── */

let vizData = null;
function drawViz() {
  const r = vizCanvas.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (vizCanvas.width !== Math.round(r.width * dpr) || vizCanvas.height !== Math.round(r.height * dpr)) {
    vizCanvas.width = Math.round(r.width * dpr);
    vizCanvas.height = Math.round(r.height * dpr);
  }
  const w = vizCanvas.width, h = vizCanvas.height;
  vctx.clearRect(0, 0, w, h);
  if (FX && FX.analyser && r.height > 0) {
    if (!vizData) vizData = new Uint8Array(FX.analyser.frequencyBinCount);
    FX.analyser.getByteFrequencyData(vizData);
    const n = 40, bw = w / n;
    vctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.pow(i / n, 1.7) * (vizData.length * .75));
      const v = vizData[idx] / 255;
      const bh = v * h * .92;
      const hue = genre.hues[0] + (genre.hues[1] - genre.hues[0]) * (i / n);
      vctx.fillStyle = `hsla(${hue}, 100%, ${45 + v * 25}%, ${.25 + v * .6})`;
      // peilattu taajuusnäyttö keskeltä ylös ja alas
      vctx.fillRect(i * bw + 1, h / 2 - bh / 2, bw - 2, bh);
    }
    vctx.globalCompositeOperation = 'source-over';
  }
  requestAnimationFrame(drawViz);
}

/* ─── Käynnistys ─── */

startVisuals();
buildGenres();
const fromHash = GENRE[location.hash.slice(1)];
if (fromHash) genre = fromHash;
applyGenre();
requestAnimationFrame(drawViz);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
