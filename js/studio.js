'use strict';
/* ════════════════════ Studio: mikseri, tempo, sävellaji, swing, drive ja reverb ════════════════════ */

const mixerEl = $('#mixer');
const tempoOut = $('#tempoOut'), keyOut = $('#keyOut'), swingIn = $('#swing'), swingOut = $('#swingOut');
const driveIn = $('#drive'), driveOut = $('#driveOut'), revSeg = $('#revSeg');

const fmtDb = db => db <= -40 ? '−∞' : (db > 0 ? '+' : '') + db.toFixed(1);

function buildMixer() {
  mixerEl.innerHTML = CHANNELS.map(c => {
    const m = MIX.ch[c.id];
    return `<div class="strip" data-ch="${c.id}" style="--h:${c.h}">
      <div class="sname">${c.name}</div>
      <div class="fadewrap">
        <div class="vu"><i></i></div>
        ${faderHTML(-40, 6, m.vol, c.vol, c.name + ' voimakkuus')}
      </div>
      <output class="db">${fmtDb(m.vol)}</output>
      <label class="knob"><span>PAN</span><input type="range" class="pan" min="-1" max="1" step=".05" value="${m.pan}"></label>
      <label class="knob"><span>REV</span><input type="range" class="rev" min="0" max=".8" step=".01" value="${m.rev}"></label>
      <label class="knob"><span>DLY</span><input type="range" class="dly" min="0" max=".6" step=".01" value="${m.dly}"></label>
      <div class="ms">
        <button class="m${m.mute ? ' on' : ''}" aria-label="${c.name} mute">M</button>
        <button class="s${m.solo ? ' on' : ''}" aria-label="${c.name} solo">S</button>
      </div>
    </div>`;
  }).join('') + `<div class="strip master" data-ch="master" style="--h:320">
      <div class="sname">MASTER</div>
      <div class="fadewrap">
        <div class="vu st"><i></i><i></i></div>
        ${faderHTML(-24, 6, MIX.master, 0, 'Master voimakkuus')}
      </div>
      <output class="db">${fmtDb(MIX.master)}</output>
      <div class="clipled" id="clipLed">CLIP</div>
    </div>`;
  mixerEl.querySelectorAll('.vfader').forEach(paintFader);
  revSeg.innerHTML = Object.entries(REVERBS).map(([k, r]) =>
    `<button data-rev="${k}" class="${MIX.reverb === k ? 'on' : ''}">${r.name}</button>`).join('');
}

// Mikseripöydän häivytin: ura, täyttö, asteikko ja nuppi
function faderHTML(min, max, val, def, label) {
  const marks = [6, 0, -6, -12, -24, -40].filter(d => d >= min && d <= max)
    .map(d => `<span style="bottom:${(d - min) / (max - min) * 100}%">${d > 0 ? '+' + d : d}</span>`).join('');
  return `<div class="vfader" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}"
    data-min="${min}" data-max="${max}" data-def="${def}" data-val="${val}">
    <div class="vscale">${marks}</div><div class="vtrack"><div class="vfill"></div></div><div class="vcap"></div></div>`;
}

function paintFader(f) {
  const min = +f.dataset.min, max = +f.dataset.max, v = +f.dataset.val;
  const pct = (v - min) / (max - min) * 100;
  f.querySelector('.vcap').style.bottom = `calc(11px + (100% - 22px) * ${pct / 100})`;
  f.querySelector('.vfill').style.height = pct + '%';
  f.setAttribute('aria-valuenow', v);
}

function setFader(f, v) {
  const min = +f.dataset.min, max = +f.dataset.max;
  v = Math.round(Math.max(min, Math.min(max, v)) * 2) / 2;
  f.dataset.val = v;
  paintFader(f);
  const strip = f.closest('.strip'), id = strip.dataset.ch;
  if (id === 'master') MIX.master = v; else MIX.ch[id].vol = v;
  strip.querySelector('.db').textContent = fmtDb(v);
  audio();
  applyMix();
}

let dragF = null;
mixerEl.addEventListener('pointerdown', e => {
  const f = e.target.closest('.vfader');
  if (!f) return;
  e.preventDefault();
  f.setPointerCapture(e.pointerId);
  dragF = { f, y: e.clientY, v: +f.dataset.val, h: f.querySelector('.vtrack').getBoundingClientRect().height, id: e.pointerId };
  f.classList.add('drag');
});
mixerEl.addEventListener('pointermove', e => {
  if (!dragF || e.pointerId !== dragF.id) return;
  const { f, y, v, h } = dragF;
  const range = +f.dataset.max - +f.dataset.min;
  setFader(f, v + (y - e.clientY) / h * range);       // suhteellinen veto: nuppi ei hyppää
});
['pointerup', 'pointercancel'].forEach(t => mixerEl.addEventListener(t, () => {
  if (dragF) dragF.f.classList.remove('drag');
  dragF = null;
}));
mixerEl.addEventListener('keydown', e => {
  const f = e.target.closest('.vfader');
  if (!f) return;
  const d = { ArrowUp: .5, ArrowRight: .5, ArrowDown: -.5, ArrowLeft: -.5, PageUp: 3, PageDown: -3 }[e.key];
  if (d) { e.preventDefault(); setFader(f, +f.dataset.val + d); }
});

function syncStudio() {
  tempoOut.textContent = tempo;
  keyOut.textContent = (transpose > 0 ? '+' : '') + transpose;
  swingIn.value = Math.round(swing * 100);
  swingOut.textContent = Math.round(swing * 100) + '%';
  driveIn.value = Math.round(MIX.drive * 100);
  driveOut.textContent = Math.round(MIX.drive * 100) + '%';
}

mixerEl.addEventListener('input', e => {
  const strip = e.target.closest('.strip');
  if (!strip || strip.dataset.ch === 'master') return;
  MIX.ch[strip.dataset.ch][e.target.className] = parseFloat(e.target.value);
  audio();
  applyMix();
});

// Tuplanapautus palauttaa oletusarvon
mixerEl.addEventListener('dblclick', e => {
  const f = e.target.closest('.vfader');
  if (f) { setFader(f, +f.dataset.def); return; }
  const input = e.target.closest('input');
  const strip = e.target.closest('.strip');
  if (!input || !strip) return;
  const c = CHANNELS.find(c => c.id === strip.dataset.ch);
  input.value = c[input.className];
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

mixerEl.addEventListener('click', e => {
  const b = e.target.closest('.ms button');
  if (!b) return;
  const m = MIX.ch[b.closest('.strip').dataset.ch];
  const key = b.classList.contains('m') ? 'mute' : 'solo';
  m[key] = !m[key];
  b.classList.toggle('on', m[key]);
  audio();
  applyMix();
});

document.querySelectorAll('[data-step]').forEach(b => {
  let rep = 0;
  const act = () => {
    const d = +b.dataset.d;
    if (b.dataset.step === 'tempo') setTempo(tempo + d);
    else setTranspose(transpose + d);
    syncStudio();
  };
  // Pitkä painallus toistaa
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    act();
    rep = setTimeout(function again() { act(); rep = setTimeout(again, 70); }, 400);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => clearTimeout(rep)));
});

// Tap tempo: keskiarvo viimeisistä napautuksista
const taps = [];
$('#tapBtn').addEventListener('click', () => {
  const now = performance.now();
  if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
  taps.push(now);
  if (taps.length > 5) taps.shift();
  if (taps.length >= 2) {
    const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
    setTempo(60000 / avg);
    syncStudio();
  }
});

swingIn.addEventListener('input', () => { setSwing(swingIn.value / 100); syncStudio(); });
driveIn.addEventListener('input', () => { audio(); setDrive(driveIn.value / 100); syncStudio(); });
revSeg.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  audio();
  setReverb(b.dataset.rev);
  revSeg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
});

/* ─── Tasomittarit ─── */

const meterBuf = new Float32Array(1024);
const meterHold = {};
let clipUntil = 0;

function peakDb(an) {
  const n = an.fftSize;
  an.getFloatTimeDomainData(meterBuf.subarray(0, n));
  let p = 0;
  for (let i = 0; i < n; i++) p = Math.max(p, Math.abs(meterBuf[i]));
  return p > 0 ? 20 * Math.log10(p) : -90;
}

// −48 dB … +3 dB → 0 … 100 %
const dbPct = db => Math.max(0, Math.min(100, (db + 48) / 51 * 100));

function smooth(key, db) {
  const prev = meterHold[key] ?? -90;
  const v = db > prev ? db : prev - 1.2;
  meterHold[key] = v;
  return v;
}

function setBar(el, db) {
  el.style.height = dbPct(db) + '%';
  el.classList.toggle('hot', db > -3);
}

function updateMeters(studioVisible) {
  if (!FX) return;
  const l = smooth('L', peakDb(FX.meterL)), r = smooth('R', peakDb(FX.meterR));
  const top = $('#masterMeter').children;
  top[0].style.width = dbPct(l) + '%';
  top[1].style.width = dbPct(r) + '%';
  if (Math.max(l, r) > -.3) clipUntil = performance.now() + 900;
  if (!studioVisible) return;
  for (const c of CHANNELS) {
    const bar = mixerEl.querySelector(`.strip[data-ch="${c.id}"] .vu i`);
    if (bar) setBar(bar, smooth(c.id, peakDb(FX.strips[c.id].meter)));
  }
  const mv = mixerEl.querySelectorAll('.strip.master .vu i');
  if (mv.length) { setBar(mv[0], l); setBar(mv[1], r); }
  const led = $('#clipLed');
  if (led) led.classList.toggle('on', performance.now() < clipUntil);
}
