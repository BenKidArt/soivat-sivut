'use strict';
/* ════════════════════ Tallennus: masterlähtö häviöttömäksi WAV-tiedostoksi, tallenteet laitteen muistiin ════════════════════ */

const REC_MAX_SEC = 15 * 60;
const rec = { node: null, ready: null, on: false, chunks: [], frames: 0, started: 0, fallback: null, timer: 0 };

// AudioWorklet kaappaa limitterin jälkeisen signaalin; varalla MediaRecorder
function recInit() {
  if (rec.ready) return rec.ready;
  rec.ready = (async () => {
    if (ctx.audioWorklet && window.AudioWorkletNode) {
      await ctx.audioWorklet.addModule('js/rec-worklet.js');
      const node = new AudioWorkletNode(ctx, 'rec-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
      FX.tap.connect(node);
      node.connect(gainNode(0, ctx.destination));    // pidetään solmu käynnissä
      node.port.onmessage = e => {
        if (e.data === 'done') { rec.onDone && rec.onDone(); return; }
        rec.chunks.push(e.data);
        rec.frames += e.data[0].length;
      };
      rec.node = node;
    } else if (window.MediaRecorder && ctx.createMediaStreamDestination) {
      const dest = ctx.createMediaStreamDestination();
      FX.tap.connect(dest);
      rec.fallback = dest;
    } else {
      throw new Error('Selain ei tue tallennusta');
    }
  })();
  return rec.ready;
}

async function recStart() {
  if (!audio() || rec.on) return;
  await recInit();
  rec.chunks = [];
  rec.frames = 0;
  rec.on = true;
  rec.started = ctx.currentTime;
  if (rec.node) {
    rec.node.port.postMessage('start');
  } else {
    const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
    const type = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    rec.mr = new MediaRecorder(rec.fallback.stream, type ? { mimeType: type } : undefined);
    rec.mr.ondataavailable = e => { if (e.data.size) rec.chunks.push(e.data); };
    rec.mr.start(1000);
  }
  rec.timer = setTimeout(() => { if (rec.on) recStop(); }, REC_MAX_SEC * 1000);
}

function recElapsed() {
  return rec.on ? ctx.currentTime - rec.started : 0;
}

// Pysäyttää tallennuksen ja palauttaa { blob, duration, ext }
function recStop() {
  if (!rec.on) return Promise.resolve(null);
  rec.on = false;
  clearTimeout(rec.timer);
  const duration = ctx.currentTime - rec.started;
  if (rec.node) {
    return new Promise(resolve => {
      rec.onDone = () => {
        rec.onDone = null;
        resolve({ blob: encodeWav(rec.chunks, rec.frames, ctx.sampleRate), duration, ext: 'wav' });
        rec.chunks = [];
      };
      rec.node.port.postMessage('stop');
    });
  }
  return new Promise(resolve => {
    rec.mr.onstop = () => {
      const type = rec.mr.mimeType || 'audio/webm';
      resolve({ blob: new Blob(rec.chunks, { type }), duration, ext: type.includes('mp4') ? 'm4a' : 'webm' });
    };
    rec.mr.stop();
  });
}

// 16-bittinen stereo-WAV (PCM), kevyellä ditheröinnillä
function encodeWav(chunks, frames, sr) {
  const buf = new ArrayBuffer(44 + frames * 4);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + frames * 4, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, frames * 4, true);
  let o = 44;
  for (const [l, r] of chunks) {
    for (let i = 0; i < l.length; i++) {
      for (const x of [l[i], r[i]]) {
        const d = (Math.random() - Math.random()) / 65536;
        const s = Math.max(-1, Math.min(1, x + d));
        v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true);
        o += 2;
      }
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/* ─── Tallenteet laitteen muistiin (IndexedDB) ─── */

let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open('biittipad', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('recs', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}
async function dbTx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('recs', mode);
    const out = fn(tx.objectStore('recs'));
    tx.oncomplete = () => resolve(out && out.result);
    tx.onerror = () => reject(tx.error);
  });
}
const recsSave = r => dbTx('readwrite', s => s.put(r));
const recsDelete = id => dbTx('readwrite', s => s.delete(id));
const recsAll = async () => ((await dbTx('readonly', s => s.getAll())) || []).sort((a, b) => b.id - a.id);
