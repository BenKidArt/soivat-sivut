'use strict';
/* ════════════════════ Käyttöliittymä: kotisivu, soitinsivut, Eläinbileet ja arvauspeli ════════════════════ */

const home = $('#home'), book = $('#book'), lpEl = $('#lp'), quizEl = $('#quiz'), grid = $('#grid');
const nameEl = $('#name'), artEl = $('#art'), artWrap = $('#artwrap'), stageEl = $('#stage');
const stageWrap = $('#stagewrap'), sayEl = $('#say'), hintEl = $('#hint');
const padsEl = $('#pads'), dotsEl = $('#dots');
const lpLoops = $('#lpLoops'), lpAnimals = $('#lpAnimals'), vinyl = $('#vinyl'), vlabel = $('#vlabel');
const orbit = $('#orbit'), deckhint = $('#deckhint');
const qStage = $('#qstage'), qArt = $('#qart'), qArtWrap = $('#qartwrap'), qTitle = $('#qtitle');
const choicesEl = $('#choices'), scoreEl = $('#score'), fbEl = $('#fb'), levelsEl = $('#levels'), levelBtn = $('#levelBtn');
const startEl = $('#start');
const muteBtns = document.querySelectorAll('.mute'), speakBtns = document.querySelectorAll('.speak');
const stopBtns = document.querySelectorAll('.stopall');
const themeMeta = document.querySelector('meta[name=theme-color]');
let page = -1, mode = 'home';

const curIns = () => INSTRUMENTS[page];

function setHues(h1, h2) {
  document.documentElement.style.setProperty('--h1', h1);
  document.documentElement.style.setProperty('--h2', h2);
  themeMeta.content = `hsl(${h1} 80% 14%)`;
}

function show(screen) {
  stopTune();
  clearQuizTimers();
  releaseAll();
  for (const s of [home, book, lpEl, quizEl]) s.hidden = s !== screen;
  mode = { home: 'home', book: 'book', lp: 'lp', quiz: 'quiz' }[screen.id];
}

/* ─── Puhe (suomenkielinen ääni, jos laitteessa on) ─── */

let fiVoice = null, speakOn = true;
const canSpeak = 'speechSynthesis' in window;

function loadVoices() {
  if (!canSpeak) return;
  fiVoice = speechSynthesis.getVoices().find(v => /^fi/i.test(v.lang)) || null;
  speakBtns.forEach(b => { b.hidden = !fiVoice; });
}

function say(text) {
  if (!canSpeak || !fiVoice || !speakOn) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = fiVoice;
  u.lang = fiVoice.lang;
  u.rate = .9;
  u.pitch = 1.3;
  speechSynthesis.speak(u);
}

/* ─── Pienet animaatiot ─── */

function bounceArt(k, el = artWrap) {
  if (reduceMotion) return;
  el.animate([
    { transform: 'scale(1) rotate(0)' },
    { transform: `scale(${1 + .22 * k}, ${1 - .12 * k}) rotate(${rand(-12, 12) * k}deg)` },
    { transform: `scale(${1 - .06 * k}, ${1 + .12 * k})` },
    { transform: 'scale(1) rotate(0)' },
  ], { duration: 380, easing: 'ease-out' });
}

function flashKey(el) {
  if (!el) return;
  el.animate([
    { filter: 'brightness(2.4)', transform: 'scale(.93)' },
    { filter: 'brightness(1)', transform: 'scale(1)' },
  ], { duration: 260, easing: 'ease-out' });
}

function popLabel(el, html) {
  el.innerHTML = `<span>${html}</span>`;
  if (!reduceMotion) {
    el.firstChild.animate([
      { transform: 'scale(.2) rotate(-90deg)' }, { transform: 'scale(1.35) rotate(10deg)', offset: .6 }, { transform: 'none' },
    ], { duration: 420, easing: 'ease-out' });
  }
}

const hueOfNote = n => (n % 12) * 30 + 10;

/* ─── Kotisivu ─── */

function bubbleHTML(item, k, attr) {
  return `<button class="bubble" ${attr}="${k}" style="--h:${item.h};--d:${(-k * .37).toFixed(2)}s" aria-label="${item.name}">
      <span class="bw"><span class="ring"></span><span class="disc"><span class="art">${item.art}</span></span></span>
      <span class="label">${item.name}</span>
    </button>`;
}

function buildHome() {
  let i = 0;
  $('.logo').innerHTML = 'Soivat Sivut'.split(' ').map(w =>
    `<span class="word" aria-hidden="true">${[...w].map(ch => `<span class="ch" style="--i:${i++}">${ch}</span>`).join('')}</span>`
  ).join('');
  grid.innerHTML = INSTRUMENTS.map((ins, k) => bubbleHTML({ ...ins, h: ins.h1 }, k, 'data-k')).join('');
  dotsEl.innerHTML = INSTRUMENTS.map(() => '<i></i>').join('');
}

function showHome() {
  show(home);
  page = -1;
  setHues(300, 180);
  history.replaceState(null, '', location.pathname + location.search);
  updateLive();
}

/* ─── Soitinsivu ─── */

function openPage(i, dir = 0) {
  show(book);
  page = (i + INSTRUMENTS.length) % INSTRUMENTS.length;
  const ins = curIns();
  setHues(ins.h1, ins.h2);
  nameEl.textContent = ins.name;
  artEl.innerHTML = ins.art;
  sayEl.textContent = ins.word;
  sayEl.style.transform = 'scale(0)';
  [...dotsEl.children].forEach((d, k) => d.classList.toggle('on', k === page));

  const track = 'ins:' + ins.id;
  const labels = ins.drum ? ins.pads : SOLFA8;
  padsEl.innerHTML =
    LOOP_SYMBOLS.map((s, k) => `<button class="key" data-kind="loop" data-track="${track}" data-k="${k}"
      style="--h:${LOOP_HUES[k]}" aria-label="Silmukka ${k + 1}"><span class="sym">${s}</span><span class="pips">LOOP</span></button>`).join('') +
    labels.map((l, j) => `<button class="key" data-kind="note" data-j="${j}"
      style="--h:${PAD_HUES[j]}" aria-label="${l}">${l}</button>`).join('');

  if (!reduceMotion) {
    stageWrap.animate(dir ? [
      { transform: `translateX(${dir * 70}vw) rotate(${dir * 120}deg) scale(.3)`, opacity: 0 },
      { transform: 'none', opacity: 1 },
    ] : [
      { transform: 'scale(.2) rotate(-200deg)', opacity: 0 },
      { transform: 'none', opacity: 1 },
    ], { duration: 600, easing: 'cubic-bezier(.2,1.25,.4,1)' });
  }
  sunBoost += 160;
  history.replaceState(null, '', '#' + ins.id);
  say(ins.name);
  updateLive();
  warmUp(ins);
}

// Lasketaan pianon, kellopelin ja ksylofonin äänet valmiiksi taustalla, ettei ensimmäinen painallus viivästy
function warmUp(ins) {
  if (!ctx) return;
  const fn = { piano: pianoBuffer, bells: glockBuffer, xylo: xyloBuffer }[ins.id];
  if (!fn) return;
  const notes = [...padNotes(ins), ...ins.tune.flatMap(([n]) => n == null ? [] : [].concat(n))];
  let i = 0;
  const step = () => {
    if (i >= notes.length || mode !== 'book' || curIns() !== ins) return;
    fn(notes[i++]);
    setTimeout(step, 30);
  };
  setTimeout(step, 300);
}

function popWord() {
  sayEl.animate([
    { transform: 'scale(0) rotate(-20deg)' },
    { transform: 'scale(1.15) rotate(6deg)', offset: .35 },
    { transform: 'scale(1) rotate(-3deg)', offset: .6 },
    { transform: 'scale(1) rotate(-3deg)', offset: .9 },
    { transform: 'scale(0) rotate(10deg)' },
  ], { duration: 2400, easing: 'ease-out' });
}

function onTuneNote(ins, notes) {
  const n = notes[0];
  const [x, y] = center(stageEl);
  burst(x, y, ins.drum ? PAD_HUES[n] : hueOfNote(n), 14 + notes.length * 3, 1);
  const pn = padNotes(ins);
  notes.forEach(m => { const j = pn.indexOf(m); if (j >= 0) flashKey(padsEl.children[4 + j]); });
  bounceArt(1);
  sunBoost += 70;
}

function playPage() {
  const ins = curIns();
  if (!ins) return;
  playTune(ins, notes => onTuneNote(ins, notes));
  popWord();
  hintEl.classList.add('gone');
}

/* ─── Eläinbileet (launchpad) ─── */

let builtStyle = null;

function buildLaunchpad() {
  builtStyle = style;
  lpLoops.innerHTML =
    LP_COLUMNS.map(c => `<div class="colhead" style="--h:${c.h}"><span class="art">${c.art}</span>${c.name}</div>`).join('') +
    [0, 1, 2, 3].map(k => LP_COLUMNS.map(c => {
      const loop = c[style][k];
      return `<button class="key" data-kind="loop" data-track="lp:${c.id}" data-k="${k}" style="--h:${c.h}"
        aria-label="${c.name} ${k + 1}"><span class="art">${loop.art}</span><span class="pips">${'•'.repeat(k + 1)}</span></button>`;
    }).join('')).join('');
  lpAnimals.innerHTML = ANIMALS.map(a => `<button class="key" data-kind="animal" data-animal="${a.id}"
    style="--h:${a.h}" aria-label="${a.name}"><span class="art">${a.art}</span></button>`).join('');
}

function openLaunchpad() {
  show(lpEl);
  setHues(290, 185);
  if (builtStyle !== style) buildLaunchpad();
  history.replaceState(null, '', '#bileet');
  if (!reduceMotion) {
    [...lpLoops.children, ...lpAnimals.children].forEach((b, i) => b.animate([
      { transform: 'scale(0) rotate(-90deg)', opacity: 0 }, { transform: 'none', opacity: 1 },
    ], { duration: 420, delay: i * 14, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
  }
  requestAnimationFrame(updateLive);
}

/* ─── Silmukoiden tila näkyviin ─── */

function updateLive() {
  const any = tracks.size > 0;
  stopBtns.forEach(b => { b.hidden = !any; });
  [...grid.children].forEach((b, k) => b.classList.toggle('live', tracks.has('ins:' + INSTRUMENTS[k].id)));
  document.querySelectorAll('.key[data-kind="loop"]').forEach(b => {
    const tr = tracks.get(b.dataset.track);
    const mine = tr && tr.loop === +b.dataset.k;
    b.classList.toggle('on', !!mine && !tr.queued);
    b.classList.toggle('queued', !!mine && tr.queued);
  });
  document.querySelectorAll('.stylesw button').forEach(b => b.classList.toggle('on', b.dataset.style === style));
  if (mode === 'lp' && builtStyle !== style) { buildLaunchpad(); updateLive(); return; }
  vinyl.classList.toggle('spinning', transport.running);
  deckhint.hidden = any;
  renderOrbit();
}

function renderOrbit() {
  if (mode !== 'lp') return;
  const items = [...tracks.entries()].map(([id, tr]) => {
    const loop = resolveLoop(id, tr.loop);
    const col = LP_COLUMNS.find(c => 'lp:' + c.id === id);
    return { id, art: id.startsWith('ins:') ? BY_ID[id.slice(4)].art : loop.art, h: col ? col.h : BY_ID[id.slice(4)].h1 };
  });
  const deck = $('#deck').getBoundingClientRect(), v = vinyl.getBoundingClientRect();
  const cx = v.left - deck.left + v.width / 2, cy = v.top - deck.top + v.height / 2;
  const r = v.width / 2 + 24;
  orbit.innerHTML = items.map((it, i) => {
    const a = -Math.PI / 2 + i / Math.max(items.length, 1) * Math.PI * 2;
    return `<span class="orb" style="--h:${it.h};left:${cx + Math.cos(a) * r}px;top:${cy + Math.sin(a) * r}px">${it.art}</span>`;
  }).join('');
}

listeners.change.push(updateLive);

listeners.beat.push(pos => {
  const bar = pos % 16 === 0;
  sunBoost += bar ? 60 : 25;
  pulseTunnel(bar ? .75 : .4);
  if (reduceMotion) return;
  document.querySelectorAll('.key.on').forEach(k => k.animate(
    [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' }));
  if (mode === 'lp') {
    document.querySelectorAll('.orb').forEach(o => o.animate(
      [{ transform: 'translateY(-8px) scale(1.2)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' }));
    if (bar) { const [x, y] = center(vinyl); ripple(x, y, rand(0, 360), 1.3); }
  }
});

listeners.note.push((id, loop, e) => {
  if (mode === 'book' && curIns() && id === 'ins:' + curIns().id) {
    const pn = padNotes(curIns());
    e.n.forEach(m => { const j = pn.indexOf(m); if (j >= 0) flashKey(padsEl.children[4 + j]); });
    if (e.v >= .6) {
      const [x, y] = center(stageEl);
      burst(x, y, curIns().drum ? PAD_HUES[e.n[0]] : hueOfNote(e.n[0]), 5, .7);
      bounceArt(.3);
    }
  } else if (mode === 'lp' && e.animal) {
    const key = lpAnimals.querySelector(`[data-animal="${e.animal}"]`);
    flashKey(key);
    popLabel(vlabel, ANIMAL[e.animal].art);
    const [x, y] = center(key);
    burst(x, y, ANIMAL[e.animal].h, 6, .7);
  }
});

/* ─── Napit: napautus, pitkä painallus ja sormen liu'utus ─── */

function pressKey(el) {
  const kind = el.dataset.kind;
  const [x, y] = center(el);
  const hue = parseFloat(el.style.getPropertyValue('--h')) || 0;
  if (kind === 'loop') {
    toggleLoop(el.dataset.track, +el.dataset.k);
    burst(x, y, hue, 14, .9);
    flashKey(el);
    return null;
  }
  if (kind === 'animal') {
    const a = ANIMAL[el.dataset.animal];
    popLabel(vlabel, a.art);
    burst(x, y, a.h, 16, 1, ['heart', 'star', 'note']);
    sunBoost += 60;
    return holdRoll((t, i, interval) => {
      playAnimal(a.id, t, null, master, i ? .75 : 1, i ? interval * .9 : 0);
      if (i) at(t, () => { flashKey(el); burst(x, y, a.h, 5, .6); });
    });
  }
  // Soitinsivun nuottinappi
  const ins = curIns(), j = +el.dataset.j;
  burst(x, y - 16, PAD_HUES[j], 12, .9);
  bounceArt(.6);
  sunBoost += 45;
  if (ins.drum) {
    return holdRoll((t, i) => {
      VOICES.drums(j, t, .2, master, i ? .7 : 1);
      if (i) at(t, () => { flashKey(el); burst(x, y, PAD_HUES[j], 4, .5); });
    });
  }
  const h = holdNote(ins.id, padNotes(ins)[j]);
  // Pitkän äänen aikana napista nousee kipinöitä
  const sparkle = setInterval(() => burst(x, y - 10, PAD_HUES[j], 3, .5), 140);
  return { release() { clearInterval(sparkle); if (h) h.release(); } };
}

const active = new Map();       // osoitin → { el, h }
const downs = new Map();        // osoitin → painettu nappityyppi

function startKey(el, pid) {
  const h = pressKey(el);
  if (h) {
    active.set(pid, { el, h });
    el.classList.add('held');
  }
}

function endKey(pid) {
  const a = active.get(pid);
  if (!a) return;
  a.h.release();
  a.el.classList.remove('held');
  active.delete(pid);
}

function releaseAll() {
  for (const pid of [...active.keys()]) endKey(pid);
  downs.clear();
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
  const kind = downs.get(e.pointerId);
  if (!kind || kind === 'loop') return;
  const el = e.target.closest('.key');
  if (!el || el.dataset.kind !== kind) return;
  const a = active.get(e.pointerId);
  if (a && a.el === el) return;
  endKey(e.pointerId);
  startKey(el, e.pointerId);
});
['pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, e => {
  endKey(e.pointerId);
  downs.delete(e.pointerId);
}));
document.addEventListener('click', e => {
  const el = e.target.closest('.key');
  if (!el || e.detail !== 0) return;       // vain näppäimistöllä painettu
  audio();
  const h = pressKey(el);
  if (h) setTimeout(() => h.release(), 300);
});

/* ─── Arvauspeli ─── */

const ITEM_INS = INSTRUMENTS.map(i => ({ kind: 'ins', id: i.id, name: i.name, art: i.art, h: i.h1, ref: i }));
const ITEM_ANI = ANIMALS.map(a => ({ kind: 'animal', id: a.id, name: a.name, art: a.art, h: a.h, ref: a }));
const LEVELS = {
  easy: { pool: ITEM_ANI, n: 3, title: 'Kuka ääntelee?', icon: '🐣' },
  medium: { pool: ITEM_INS, n: 3, title: 'Mikä soitin soi?', icon: '🐥' },
  hard: { pool: [...ITEM_INS, ...ITEM_ANI], n: 6, title: 'Kuka soittaa?', icon: '🦉' },
};
const STARS_PER_TROPHY = 5;
const TRY_AGAIN = ['Melkein!', 'Hyvä yritys!', 'Ei haittaa!', 'Hienosti yritetty!'];
const quiz = { level: null, target: null, last: null, choices: [], stars: 0, locked: true, round: 0, timers: [] };

function clearQuizTimers() {
  quiz.timers.forEach(clearTimeout);
  quiz.timers = [];
}

function later(ms, fn) {
  quiz.timers.push(setTimeout(fn, ms));
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderScore(popIndex) {
  scoreEl.innerHTML = Array.from({ length: STARS_PER_TROPHY }, (_, i) =>
    `<i class="${i < quiz.stars ? 'on' : ''}">★</i>`).join('');
  scoreEl.setAttribute('aria-label', `Tähdet: ${quiz.stars} / ${STARS_PER_TROPHY}`);
  const star = scoreEl.children[popIndex];
  if (star && !reduceMotion) {
    star.animate([
      { transform: 'scale(0) rotate(-180deg)' },
      { transform: 'scale(1.8) rotate(20deg)', offset: .6 },
      { transform: 'scale(1) rotate(0)' },
    ], { duration: 700, easing: 'ease-out' });
  }
}

function showFeedback(cls, big, small, ms = 2200) {
  fbEl.className = 'fb ' + cls;
  fbEl.innerHTML = small ? `<small>${small}</small>${big}` : big;
  fbEl.animate([
    { transform: 'scale(0) rotate(-12deg)' },
    { transform: 'scale(1.12) rotate(4deg)', offset: .15 },
    { transform: 'scale(1) rotate(-2deg)', offset: .25 },
    { transform: 'scale(1) rotate(-2deg)', offset: .88 },
    { transform: 'scale(0) rotate(8deg)' },
  ], { duration: ms, easing: 'ease-out' });
}

function startQuiz() {
  stopAllLoops();
  show(quizEl);
  history.replaceState(null, '', '#peli');
  setHues(270, 50);
  qArt.innerHTML = '<span class="qmark">?</span>';
  choicesEl.innerHTML = '';
  quiz.locked = true;
  if (quiz.level) chooseLevel(quiz.level);
  else levelsEl.hidden = false;
}

function chooseLevel(level) {
  quiz.level = level;
  quiz.stars = 0;
  quiz.last = null;
  levelsEl.hidden = true;
  levelBtn.textContent = LEVELS[level].icon;
  qTitle.textContent = LEVELS[level].title;
  renderScore();
  newRound();
}

function newRound() {
  clearQuizTimers();
  quiz.round++;
  quiz.locked = false;
  const L = LEVELS[quiz.level];
  quiz.target = pick(L.pool.filter(i => i !== quiz.last));
  quiz.last = quiz.target;
  const others = shuffle(L.pool.filter(i => i !== quiz.target)).slice(0, L.n - 1);
  quiz.choices = shuffle([quiz.target, ...others]);
  setHues(270, 50);

  qArt.innerHTML = '<span class="qmark">?</span>';
  choicesEl.classList.toggle('six', L.n > 3);
  choicesEl.innerHTML = quiz.choices.map((it, k) => bubbleHTML(it, k, 'data-c')).join('');
  if (!reduceMotion) {
    [...choicesEl.children].forEach((b, k) => b.animate([
      { transform: 'translateY(120%) scale(.4)', opacity: 0 },
      { transform: 'none', opacity: 1 },
    ], { duration: 500, delay: k * 100, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
  }
  // Kun peli on vasta avattu linkistä, ääni alkaa vasta aloitusnapin jälkeen
  if (startEl.hidden) later(800, replayTarget);
}

function replayTarget() {
  const it = quiz.target;
  if (mode !== 'quiz' || !it || !audio()) return;
  if (it.kind === 'ins') {
    playTune(it.ref, notes => {
      const [x, y] = center(qStage);
      burst(x, y, it.ref.drum ? PAD_HUES[notes[0]] : hueOfNote(notes[0]), 14, 1);
      bounceArt(1, qArtWrap);
      sunBoost += 70;
    });
  } else {
    playAnimal(it.id, ctx.currentTime + .05, null, master, 1);
    const [x, y] = center(qStage);
    burst(x, y, it.h, 20, 1, ['note', 'heart', 'star']);
    bounceArt(1, qArtWrap);
    sunBoost += 90;
  }
}

function choose(k) {
  const it = quiz.choices[k];
  const btn = choicesEl.children[k];
  if (quiz.locked || !it || !btn || btn.disabled) return;
  audio();
  stopTune();
  clearQuizTimers();
  if (it === quiz.target) correct(it, btn);
  else wrong(it, btn);
}

function correct(it, btn) {
  quiz.locked = true;
  quiz.stars++;
  playCheer();
  setHues(it.h, (it.h + 150) % 360);
  say(`Hurraa! Oikein! ${it.name}!`);
  showFeedback('good', 'Hurraa! 🎉', `Oikein, ${it.name}!`, 2600);

  // Kysymysmerkin tilalle paljastuu oikea vastaus
  qArt.innerHTML = it.art;
  if (!reduceMotion) {
    qArtWrap.animate([
      { transform: 'scale(0) rotate(-540deg)' },
      { transform: 'scale(1.2) rotate(20deg)', offset: .7 },
      { transform: 'none' },
    ], { duration: 800, easing: 'ease-out' });
    btn.animate([
      { transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-6deg)' },
      { transform: 'scale(1.15) rotate(6deg)' }, { transform: 'scale(1)' },
    ], { duration: 900, easing: 'ease-in-out' });
  }
  [...choicesEl.children].forEach(b => { if (b !== btn) b.disabled = true; });

  const [x, y] = center(btn.querySelector('.bw'));
  burst(x, y, it.h, 36, 1.4, ['star', 'star', 'heart', 'note']);
  const [sx, sy] = center(qStage);
  burst(sx, sy, 50, 30, 1.3, ['star']);
  starRain(90);
  fireworks(4, 280);
  sunBoost += 500;
  renderScore(quiz.stars - 1);

  if (quiz.stars >= STARS_PER_TROPHY) later(2300, trophy);
  else later(3200, newRound);
}

// Viisi tähteä täynnä: iso juhla ja uusi kierros alusta
function trophy() {
  playParty();
  say('Mahtavaa! Sait viisi tähteä!');
  showFeedback('good', 'Mahtavaa! 🏆', 'Viisi tähteä!', 3800);
  qArt.innerHTML = '🏆';
  starRain(160);
  fireworks(12, 250);
  sunBoost += 900;
  later(4200, () => {
    quiz.stars = 0;
    renderScore();
    newRound();
  });
}

function wrong(it, btn) {
  const round = quiz.round;
  playEncourage();
  const cheer = pick(TRY_AGAIN);
  say(`${cheer} Kokeile vielä kerran!`);
  showFeedback('try', 'Kokeile vielä kerran! 💪', cheer, 2000);
  btn.disabled = true;
  if (!reduceMotion) {
    btn.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-14px) rotate(-6deg)' },
      { transform: 'translateX(12px) rotate(5deg)' }, { transform: 'translateX(-8px) rotate(-3deg)' },
      { transform: 'translateX(0)' },
    ], { duration: 450, easing: 'ease-in-out' });
  }
  const [x, y] = center(btn.querySelector('.bw'));
  burst(x, y, 330, 10, .7, ['heart']);
  // Arvoitus soi uudestaan, jotta lapsi saa kuunnella taas
  later(2100, () => { if (quiz.round === round && !quiz.locked) replayTarget(); });
}

/* ─── Tapahtumat ─── */

grid.addEventListener('click', e => {
  const b = e.target.closest('.bubble');
  if (!b) return;
  audio();
  const [x, y] = center(b.querySelector('.bw'));
  burst(x, y, INSTRUMENTS[+b.dataset.k].h1, 20, 1.1);
  openPage(+b.dataset.k);
});

document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', showHome));
$('#prev').addEventListener('click', () => { audio(); openPage(page - 1, -1); });
$('#next').addEventListener('click', () => { audio(); openPage(page + 1, 1); });
stopBtns.forEach(b => b.addEventListener('click', () => {
  stopAllLoops();
  const [x, y] = center(b);
  burst(x, y, 320, 16, .8);
}));
muteBtns.forEach(b => b.addEventListener('click', () => {
  setMasterMuted(!muted);
  muteBtns.forEach(m => { m.textContent = muted ? '🔇' : '🔊'; m.classList.toggle('off', muted); });
}));
speakBtns.forEach(b => b.addEventListener('click', () => {
  speakOn = !speakOn;
  speakBtns.forEach(s => s.classList.toggle('off', !speakOn));
  if (!speakOn) speechSynthesis.cancel();
}));
document.querySelectorAll('.stylesw button').forEach(b => b.addEventListener('click', () => {
  audio();
  setStyle(b.dataset.style);
  const [x, y] = center(b);
  burst(x, y, b.dataset.style === 'tekno' ? 190 : 320, 22, 1);
  sunBoost += 200;
}));

$('#lpBtn').addEventListener('click', () => {
  audio();
  const [x, y] = center($('#lpBtn'));
  burst(x, y, 300, 24, 1.1);
  openLaunchpad();
});
$('#gameBtn').addEventListener('click', () => {
  audio();
  const [x, y] = center($('#gameBtn'));
  burst(x, y, 40, 24, 1.1);
  startQuiz();
});
levelsEl.addEventListener('click', e => {
  const b = e.target.closest('.level');
  if (!b) return;
  audio();
  const [x, y] = center(b);
  burst(x, y, 50, 20, 1);
  chooseLevel(b.dataset.level);
});
levelBtn.addEventListener('click', () => {
  stopTune();
  clearQuizTimers();
  quiz.locked = true;
  levelsEl.hidden = false;
});
choicesEl.addEventListener('click', e => {
  const b = e.target.closest('.bubble');
  if (b) choose(+b.dataset.c);
});
qStage.addEventListener('click', () => {
  if (quiz.locked) return;
  audio();
  clearQuizTimers();
  replayTarget();
});

// Pyyhkäisy vaihtaa soitinsivua; napautus soittimeen soittaa kappaleen
let swipe = null, swiped = false;
$('#middle').addEventListener('pointerdown', e => {
  if (e.target.closest('.navbtn')) return;
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
});
window.addEventListener('pointerup', e => {
  if (!swipe || swipe.id !== e.pointerId) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    swiped = true;
    setTimeout(() => { swiped = false; }, 0);
    audio();
    openPage(page + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  }
});
window.addEventListener('pointercancel', () => { swipe = null; });
stageEl.addEventListener('click', () => { if (!swiped) playPage(); });

// Näppäimistö: soitinsivulla 1–8 nuotit ja Q W E R silmukat, peleissä 1–6 vastaukset
const KEYS_LOOP = ['q', 'w', 'e', 'r'];
document.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape' && mode !== 'home') { showHome(); return; }
  if (mode === 'quiz') {
    if (/^[1-6]$/.test(e.key)) choose(+e.key - 1);
    else if (e.key === ' ' && document.activeElement === document.body && !quiz.locked) {
      e.preventDefault();
      audio();
      replayTarget();
    }
    return;
  }
  if (mode === 'lp') {
    const i = '1234567890'.indexOf(e.key);
    if (i >= 0) { audio(); const h = pressKey(lpAnimals.children[i]); if (h) setTimeout(() => h.release(), 200); }
    return;
  }
  if (mode !== 'book') return;
  audio();
  if (e.key === 'ArrowRight') openPage(page + 1, 1);
  else if (e.key === 'ArrowLeft') openPage(page - 1, -1);
  else if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); playPage(); }
  else if (/^[1-8]$/.test(e.key)) { const h = pressKey(padsEl.children[3 + +e.key]); if (h) setTimeout(() => h.release(), 300); }
  else if (KEYS_LOOP.includes(e.key)) pressKey(padsEl.children[KEYS_LOOP.indexOf(e.key)]);
});

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ctx) {
    stopTune();
    releaseAll();
    stopAllLoops();
    ctx.suspend();
  }
});

// Aloitusnappi: selaimet sallivat äänen vasta ensimmäisen kosketuksen jälkeen
startEl.addEventListener('click', () => {
  audio();
  const [x, y] = center($('#start button'));
  burst(x, y, 300, 30, 1.3);
  startEl.hidden = true;
  if (mode === 'book') { say(curIns().name); warmUp(curIns()); }
  if (mode === 'quiz' && !quiz.locked) later(400, replayTarget);
});

/* ─── Käynnistys ─── */

startVisuals();
buildHome();
if (canSpeak) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }

const fromHash = INSTRUMENTS.findIndex(ins => '#' + ins.id === location.hash);
if (location.hash === '#peli') startQuiz();
else if (location.hash === '#bileet') openLaunchpad();
else if (fromHash >= 0) openPage(fromHash);
else showHome();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
