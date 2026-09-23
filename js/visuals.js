'use strict';
/* ════════════════════ Visuaalit: pyörivä psykedeelinen tausta, tunnelirenkaat, kipinät ════════════════════ */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const sun = $('#sun'), sun2 = $('#sun2'), bg = $('#bg'), fx = $('#fx');
const bctx = bg.getContext('2d'), fctx = fx.getContext('2d');
let W = 0, H = 0;
let sunAngle = 0, sunBoost = 0, hueDrift = 0;
const floaters = [], particles = [], ripples = [], tunnel = [];
const SHAPES = ['note', 'note2', 'star', 'circle', 'ring', 'heart'];
const MAX_PARTICLES = 700;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth;
  H = innerHeight;
  for (const [c, x] of [[bg, bctx], [fx, fctx]]) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    c.style.width = W + 'px';
    c.style.height = H + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function makeFloater(anywhere) {
  return {
    x: rand(0, W), y: anywhere ? rand(0, H) : H + 40,
    s: rand(8, 24), rot: rand(0, 6.28), vr: rand(-1.2, 1.2),
    vy: rand(-45, -15), sway: rand(0, 6.28), shape: pick(SHAPES),
    h: rand(0, 360), a: rand(.25, .55),
  };
}

function drawShape(c, shape, s) {
  switch (shape) {
    case 'circle': c.beginPath(); c.arc(0, 0, s * .6, 0, 6.2832); c.fill(); break;
    case 'ring': c.lineWidth = s * .22; c.beginPath(); c.arc(0, 0, s * .55, 0, 6.2832); c.stroke(); break;
    case 'star': {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * .32 : s * .75, a = i * Math.PI / 5 - Math.PI / 2;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill(); break;
    }
    case 'heart': {
      const k = s * .045;
      c.beginPath();
      c.moveTo(0, 6 * k);
      c.bezierCurveTo(-14 * k, -4 * k, -6 * k, -14 * k, 0, -6 * k);
      c.bezierCurveTo(6 * k, -14 * k, 14 * k, -4 * k, 0, 6 * k);
      c.fill(); break;
    }
    default:
      c.font = `700 ${s * 1.6}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(shape === 'note' ? '♪' : '♫', 0, 0);
  }
}

function burst(x, y, hue, n = 16, power = 1, shapes = SHAPES) {
  if (reduceMotion) n = Math.ceil(n / 3);
  for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
    const a = rand(0, 6.2832), sp = rand(180, 520) * power;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120 * power,
      rot: rand(0, 6.28), vr: rand(-8, 8), s: rand(12, 28),
      shape: pick(shapes), color: `hsl(${hue + rand(-40, 40)} 100% ${rand(55, 70)}%)`,
      life: 0, max: rand(.8, 1.5),
    });
  }
  ripple(x, y, hue);
}

function ripple(x, y, hue, big = 1) {
  if (ripples.length < 40) ripples.push({ x, y, life: 0, max: .7, big, color: `hsl(${hue} 100% 62%)` });
}

// Kultainen tähtisade ylhäältä
function starRain(n) {
  if (reduceMotion) n = Math.ceil(n / 4);
  for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
    particles.push({
      x: rand(0, W), y: rand(-120, -10), vx: rand(-60, 60), vy: rand(0, 220),
      rot: rand(0, 6.28), vr: rand(-5, 5), s: rand(16, 36),
      shape: 'star', color: `hsl(${rand(38, 55)} 100% ${rand(55, 70)}%)`,
      life: 0, max: rand(2.4, 3.4),
    });
  }
}

function fireworks(count, spread) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => burst(rand(W * .1, W * .9), rand(H * .1, H * .5), rand(0, 360), 26, 1.2),
      i * spread + rand(0, 120));
  }
}

function pulseTunnel(strength) {
  tunnel.push({ r: 6, a: strength, h: hueDrift + rand(0, 90) });
}

function center(el) {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

let lastT = performance.now(), tunnelClock = 0;
function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000);
  lastT = now;
  hueDrift = (hueDrift + dt * 25) % 360;

  // Säteet pyörivät koko ajan ja jokainen sävel antaa vauhtia; kaleidoskooppikerros pyörii vastaan
  sunAngle = (sunAngle + ((reduceMotion ? 1.5 : 8) + sunBoost) * dt) % 360;
  sunBoost *= Math.exp(-dt * 2.2);
  sun.style.transform = `rotate(${sunAngle}deg)`;
  sun2.style.transform = `rotate(${-sunAngle * 1.7}deg) scale(${1 + Math.min(sunBoost, 300) / 2500})`;

  bctx.clearRect(0, 0, W, H);
  bctx.globalCompositeOperation = 'lighter';

  // Tunnelirenkaat laajenevat keskeltä ulospäin
  tunnelClock += dt;
  if (tunnelClock > (reduceMotion ? 2 : .55)) { tunnelClock = 0; pulseTunnel(.28); }
  const cx = W / 2, cy = H * .46, maxR = Math.hypot(W, H) * .6;
  for (let i = tunnel.length - 1; i >= 0; i--) {
    const r = tunnel[i];
    r.r += (35 + r.r * 1.05) * dt * (1 + sunBoost / 200);
    if (r.r > maxR) { tunnel.splice(i, 1); continue; }
    bctx.globalAlpha = r.a * (1 - r.r / maxR);
    bctx.strokeStyle = `hsl(${(r.h + r.r * .3) % 360} 100% 60%)`;
    bctx.lineWidth = 2 + r.r * .05;
    bctx.beginPath();
    bctx.arc(cx, cy, r.r, 0, 6.2832);
    bctx.stroke();
  }

  for (const f of floaters) {
    f.y += f.vy * dt * (1 + sunBoost / 60);
    f.rot += f.vr * dt;
    f.sway += dt;
    if (f.y < -50) Object.assign(f, makeFloater(false));
    bctx.save();
    bctx.globalAlpha = f.a;
    bctx.translate(f.x + Math.sin(f.sway) * 18, f.y);
    bctx.rotate(f.rot);
    bctx.fillStyle = bctx.strokeStyle = `hsl(${(f.h + hueDrift) % 360} 100% 62%)`;
    drawShape(bctx, f.shape, f.s);
    bctx.restore();
  }
  bctx.globalAlpha = 1;

  // Kipinät ja aallot hehkuvat päällekkäin ('lighter')
  fctx.clearRect(0, 0, W, H);
  fctx.globalCompositeOperation = 'lighter';
  for (let i = ripples.length - 1; i >= 0; i--) {
    const w = ripples[i];
    w.life += dt;
    if (w.life > w.max) { ripples.splice(i, 1); continue; }
    const k = w.life / w.max;
    fctx.globalAlpha = (1 - k) * .8;
    fctx.strokeStyle = w.color;
    fctx.lineWidth = 10 * (1 - k) + 2;
    fctx.beginPath();
    fctx.arc(w.x, w.y, 16 + k * Math.min(W, H) * .3 * w.big, 0, 6.2832);
    fctx.stroke();
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life > p.max) { particles.splice(i, 1); continue; }
    p.vy += 420 * dt;
    p.vx *= Math.exp(-dt * 1.2);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const k = p.life / p.max;
    fctx.save();
    fctx.globalAlpha = 1 - k * k;
    fctx.translate(p.x, p.y);
    fctx.rotate(p.rot);
    const pop = Math.min(1, p.life * 10);
    fctx.scale(pop, pop);
    fctx.fillStyle = fctx.strokeStyle = p.color;
    drawShape(fctx, p.shape, p.s);
    fctx.restore();
  }
  fctx.globalAlpha = 1;

  requestAnimationFrame(frame);
}

function startVisuals() {
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < (reduceMotion ? 8 : 22); i++) floaters.push(makeFloater(true));
  requestAnimationFrame(frame);
}
