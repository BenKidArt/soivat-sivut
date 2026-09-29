// Tallennin: kerää masterlähdön stereonäytteet ja lähettää ne pääsäikeelle isoina paloina
class RecTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.on = false;
    this.size = 8192;
    this.reset();
    this.port.onmessage = e => {
      if (e.data === 'start') { this.reset(); this.on = true; }
      if (e.data === 'stop') { this.on = false; this.flush(); this.port.postMessage('done'); }
    };
  }
  reset() {
    this.l = new Float32Array(this.size);
    this.r = new Float32Array(this.size);
    this.n = 0;
  }
  flush() {
    if (this.n) this.port.postMessage([this.l.slice(0, this.n), this.r.slice(0, this.n)]);
    this.reset();
  }
  process(inputs) {
    const inp = inputs[0];
    if (this.on && inp && inp.length) {
      const l = inp[0], r = inp[1] || inp[0];
      for (let i = 0; i < l.length; i++) {
        this.l[this.n] = l[i];
        this.r[this.n] = r[i];
        if (++this.n === this.size) this.flush();
      }
    }
    return true;
  }
}
registerProcessor('rec-tap', RecTap);
