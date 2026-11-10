/* Sound design, all synthesized live (no audio files to host or license).
   Every sound runs through a small "valley" reverb so it feels like it happens outdoors.
   Rex's roar layers four voices the way creature sounds are built for film:
   a rattling growl through mouth formants, throat breath, a trumpeting upper voice and a chest-thump sub. */
(function () {
  let ctx = null, master = null, verbIn = null, white = null, brown = null, amb = null, on = false;
  try { on = localStorage.getItem(KIN.storageKey + ":sound") === "on"; } catch (e) {}

  /* ---------- setup ---------- */
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
      master = ctx.createGain(); master.gain.value = .9;
      master.connect(comp); comp.connect(ctx.destination);
      const verb = ctx.createConvolver(); verb.buffer = impulse(2.6, 3);
      verbIn = ctx.createGain(); verbIn.gain.value = .4;
      verbIn.connect(verb); verb.connect(master);
      white = noiseBuf("white", 4); brown = noiseBuf("brown", 4);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function noiseBuf(kind, sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  function impulse(sec, decay) {
    const len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // a couple of early reflections off the valley walls, then a soft tail
        const early = (i > ctx.sampleRate * .045 && i < ctx.sampleRate * .05) || (i > ctx.sampleRate * .11 && i < ctx.sampleRate * .114) ? .5 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, decay) + early * (Math.random() - .5)) * .6;
      }
    }
    return b;
  }
  function shaperCurve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return c;
  }
  function out(node, wet) {
    node.connect(master);
    if (wet) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(verbIn); }
  }
  function env(param, t0, pts) {
    param.cancelScheduledValues(t0);
    param.setValueAtTime(pts[0][1], t0);
    for (let i = 1; i < pts.length; i++) param.linearRampToValueAtTime(pts[i][1], t0 + pts[i][0]);
  }
  function src(buf, t, dur, offset) {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    s.start(t, offset == null ? Math.random() * 2 : offset); s.stop(t + dur + .05); return s;
  }
  function osc(type, t, dur) { const o = ctx.createOscillator(); o.type = type; o.start(t); o.stop(t + dur + .05); return o; }
  function filt(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  const ready = () => on && ensure();
  const r = (a, b) => a + Math.random() * (b - a);

  /* ---------- Rex's roar ---------- */
  function roar(size) {
    if (!ready()) return;
    size = size || 1;
    const t = ctx.currentTime + .02;
    const pf = size >= 1 ? 1 / Math.sqrt(size) : 1 / Math.pow(size, .85);   // pitch factor: babies squeak higher
    const D = size < .7 ? r(.6, .8) : r(1.7, 2.1) * Math.min(1.25, size);
    const jitter = r(.92, 1.08);
    const bus = gain(0); out(bus, size < .7 ? .25 : .55);
    env(bus.gain, t, [[0, 0], [.1 * D, 1], [.55 * D, .9], [.8 * D, .6], [D, 0]]);

    // 1. rattling growl through mouth formants
    const f0 = 78 * pf * jitter;
    const o1 = osc("sawtooth", t, D), o2 = osc("square", t, D);
    o2.detune.value = r(10, 22);
    [o1, o2].forEach(o => env(o.frequency, t, [[0, f0 * .8], [.22 * D, f0 * 1.4], [.6 * D, f0 * 1.1], [D, f0 * .65]]));
    const am = gain(.55), lfo = osc("sine", t, D), lfoAmt = gain(.45);
    env(lfo.frequency, t, [[0, 22 * Math.sqrt(pf)], [.3 * D, 34 * Math.sqrt(pf)], [D, 18 * Math.sqrt(pf)]]);
    lfo.connect(lfoAmt); lfoAmt.connect(am.gain);
    const pre = gain(2.2), sh = ctx.createWaveShaper(); sh.curve = shaperCurve(6); sh.oversample = "4x";
    o1.connect(am); o2.connect(am); am.connect(pre); pre.connect(sh);
    [[380, 720, 430, 5, 1], [1000, 1550, 900, 6, .65], [2300, 2700, 2000, 7, .16]].forEach(([a, b, c, q, g]) => {
      const bp = filt("bandpass", a * pf, q); env(bp.frequency, t, [[0, a * pf], [.3 * D, b * pf], [D, c * pf]]);
      const gg = gain(g); sh.connect(bp); bp.connect(gg); gg.connect(bus);
    });

    // 2. throat breath
    const n = src(white, t, D), nb = filt("bandpass", 600 * pf, 1.1);
    env(nb.frequency, t, [[0, 500 * pf], [.25 * D, 1500 * pf], [D, 450 * pf]]);
    const nsh = ctx.createWaveShaper(); nsh.curve = shaperCurve(3);
    const ng = gain(0); env(ng.gain, t, [[0, 0], [.08 * D, .34], [.7 * D, .24], [D, 0]]);
    n.connect(nb); nb.connect(nsh); nsh.connect(ng); ng.connect(bus);

    // 3. trumpeting upper voice (the "screech" on top of a big roar)
    if (size >= .7) {
      const tr = osc("sawtooth", t + .15 * D, D * .8), vib = osc("sine", t, D), vg = gain(14 * pf);
      vib.frequency.value = 6.5; vib.connect(vg); vg.connect(tr.frequency);
      env(tr.frequency, t + .15 * D, [[0, 360 * pf * jitter], [.25 * D, 640 * pf * jitter], [.75 * D, 330 * pf * jitter]]);
      const tb = filt("bandpass", 1300 * pf, 2.2), tg = gain(0);
      env(tg.gain, t + .15 * D, [[0, 0], [.15 * D, .22], [.5 * D, .16], [.8 * D, 0]]);
      tr.connect(tb); tb.connect(tg); tg.connect(bus);
    }

    // 4. chest thump (dry, so it stays punchy)
    const sub = osc("sine", t, D), sg = gain(0);
    env(sub.frequency, t, [[0, 46 * pf], [.3 * D, 58 * pf], [D, 36 * pf]]);
    env(sg.gain, t, [[0, 0], [.12 * D, size < .7 ? .25 : .7], [.7 * D, .4], [D, 0]]);
    sub.connect(sg); out(sg, 0);
  }

  /* ---------- footsteps & impacts ---------- */
  function stomp(power) {
    if (!ready()) return;
    const t = ctx.currentTime + .01, p = power || 1;
    const o = osc("sine", t, .5), g = gain(0);
    env(o.frequency, t, [[0, 72], [.05, 48], [.4, 28]]);
    env(g.gain, t, [[0, 0], [.008, .75 * p], [.45, 0]]);
    o.connect(g); out(g, .15);
    const n = src(brown, t, .5), lp = filt("lowpass", 220, .7), ng = gain(0);
    env(ng.gain, t, [[0, 0], [.01, .9 * p], [.4, 0]]);
    n.connect(lp); lp.connect(ng); out(ng, .3);
    const gr = src(white, t + .015, .12), hp = filt("bandpass", 2800, .9), gg = gain(0);
    env(gg.gain, t + .015, [[0, .06 * p], [.1, 0]]);
    gr.connect(hp); hp.connect(gg); out(gg, .2);
  }
  function thunk() {
    if (!ready()) return;
    const t = ctx.currentTime + .01;
    const o = osc("sine", t, .25), g = gain(0);
    env(o.frequency, t, [[0, 210], [.12, 110]]); env(g.gain, t, [[0, .55], [.2, 0]]);
    o.connect(g); out(g, .25);
    const n = src(white, t, .06), bp = filt("bandpass", 700, 2), ng = gain(0);
    env(ng.gain, t, [[0, .25], [.05, 0]]); n.connect(bp); bp.connect(ng); out(ng, .2);
  }
  function rumble() {
    if (!ready()) return;
    const t = ctx.currentTime + .02, D = 3.4;
    const n = src(brown, t, D), lp = filt("lowpass", 110, .8), g = gain(0);
    env(g.gain, t, [[0, 0], [.35, 1.2], [1.2, .9], [D, 0]]);
    n.connect(lp); lp.connect(g); out(g, .5);
    const sub = osc("sine", t, D), sg = gain(0); sub.frequency.value = 34;
    env(sg.gain, t, [[0, 0], [.3, .6], [D, 0]]); sub.connect(sg); out(sg, 0);
    for (let i = 0; i < 14; i++) { // crackling rocks
      const at = t + .2 + Math.random() * 2.2, c = src(white, at, .08), bp = filt("bandpass", r(500, 1600), 1.5), cg = gain(0);
      env(cg.gain, at, [[0, r(.1, .3)], [.07, 0]]); c.connect(bp); bp.connect(cg); out(cg, .5);
    }
  }

  /* ---------- small creatures & taps ---------- */
  function pop(pitch) {
    if (!ready()) return;
    const t = ctx.currentTime + .005, f = pitch || 520;
    const o = osc("sine", t, .16), g = gain(0);
    env(o.frequency, t, [[0, f * .7], [.06, f * 1.6]]); env(g.gain, t, [[0, 0], [.006, .32], [.14, 0]]);
    const lp = filt("lowpass", 3000); o.connect(lp); lp.connect(g); out(g, .2);
  }
  function crack() {
    if (!ready()) return;
    const t = ctx.currentTime + .005;
    for (let i = 0; i < 4; i++) {
      const at = t + i * r(.015, .04), n = src(white, at, .03), bp = filt("bandpass", r(2500, 5200), 3), g = gain(0);
      env(g.gain, at, [[0, r(.25, .45)], [.018, 0]]); n.connect(bp); bp.connect(g); out(g, .1);
    }
  }
  function chime() {
    if (!ready()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const t = ctx.currentTime + .02 + i * .085;
      [[1, .22], [4, .05]].forEach(([m, v]) => {
        const o = osc("sine", t, .9), g = gain(0); o.frequency.value = f * m;
        env(g.gain, t, [[0, 0], [.004, v], [m > 1 ? .15 : .8, 0]]); o.connect(g); out(g, .35);
      });
    });
  }
  function brush() {
    if (!ready()) return;
    const t = ctx.currentTime + .005, n = src(white, t, .09), bp = filt("bandpass", r(1400, 2600), .8), g = gain(0);
    env(g.gain, t, [[0, 0], [.02, .05], [.08, 0]]); n.connect(bp); bp.connect(g); out(g, 0);
  }
  function ribbit() {
    if (!ready()) return;
    [0, .17].forEach(d => {
      const t = ctx.currentTime + .01 + d, o = osc("square", t, .13), am = gain(0), lfo = osc("square", t, .13), la = gain(.5);
      o.frequency.value = r(240, 280); lfo.frequency.value = 55; lfo.connect(la); la.connect(am.gain);
      const bp = filt("bandpass", 950, 3), g = gain(0); env(g.gain, t, [[0, 0], [.015, 1], [.11, .6], [.13, 0]]);
      o.connect(am); am.connect(bp); bp.connect(g); out(g, .3);
    });
  }
  function bloop() {
    if (!ready()) return;
    const t = ctx.currentTime + .005, o = osc("sine", t, .2), g = gain(0);
    env(o.frequency, t, [[0, 180], [.1, r(600, 800)]]); env(g.gain, t, [[0, 0], [.01, .35], [.16, 0]]);
    o.connect(g); out(g, .35);
  }
  function hoot() { // gentle long-neck call
    if (!ready()) return;
    const t = ctx.currentTime + .02, D = 1.8;
    const o = osc("triangle", t, D), o2 = osc("sine", t, D), vib = osc("sine", t, D), vg = gain(3);
    vib.frequency.value = 5; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    [o, o2].forEach((x, i) => env(x.frequency, t, [[0, 95 * (i + 1)], [.4 * D, 135 * (i + 1)], [D, 88 * (i + 1)]]));
    const lp = filt("lowpass", 700, 1), g = gain(0); env(g.gain, t, [[0, 0], [.3 * D, .5], [.8 * D, .35], [D, 0]]);
    o.connect(lp); o2.connect(lp); lp.connect(g); out(g, .7);
    const n = src(white, t, D), nl = filt("lowpass", 450), ng = gain(0); env(ng.gain, t, [[0, 0], [.3 * D, .08], [D, 0]]);
    n.connect(nl); nl.connect(ng); out(ng, .6);
  }
  function grunt() { // triceratops snort-honk
    if (!ready()) return;
    [0, .32].forEach((d, k) => {
      const t = ctx.currentTime + .01 + d, D = .3, o = osc("sawtooth", t, D), am = gain(.6), lfo = osc("sine", t, D), la = gain(.4);
      env(o.frequency, t, [[0, 150 - k * 15], [D, 105 - k * 15]]); lfo.frequency.value = 24; lfo.connect(la); la.connect(am.gain);
      const bp = filt("bandpass", 520, 2.5), g = gain(0); env(g.gain, t, [[0, 0], [.03, 1.1], [D, 0]]);
      o.connect(am); am.connect(bp); bp.connect(g); out(g, .35);
      const n = src(white, t, .15), nb = filt("bandpass", 1200, 1), ng = gain(0); env(ng.gain, t, [[0, .15], [.12, 0]]); n.connect(nb); nb.connect(ng); out(ng, .2);
    });
  }

  /* ---------- valley ambience: wind, birds, insects ---------- */
  function startAmbience() {
    if (amb || !ensure()) return;
    const t = ctx.currentTime;
    amb = { g: gain(0), timers: [] };
    amb.g.connect(master); env(amb.g.gain, t, [[0, 0], [2, 1]]);
    const wind = ctx.createBufferSource(); wind.buffer = brown; wind.loop = true; wind.start();
    const wl = filt("lowpass", 380, .5), wg = gain(.12), wlfo = osc("sine", t, 1e5), wla = gain(.07);
    wlfo.frequency.value = .07; wlfo.connect(wla); wla.connect(wg.gain);
    wind.connect(wl); wl.connect(wg); wg.connect(amb.g);
    const ins = ctx.createBufferSource(); ins.buffer = white; ins.loop = true; ins.start();
    const ib = filt("bandpass", 6200, 6), ig = gain(.006), ilfo = osc("square", t, 1e5), ila = gain(.005);
    ilfo.frequency.value = 31; ilfo.connect(ila); ila.connect(ig.gain);
    ins.connect(ib); ib.connect(ig); ig.connect(amb.g);
    amb.nodes = [wind, ins, wlfo, ilfo];
    const bird = () => {
      if (!amb) return;
      const base = r(2200, 3600), notes = Math.floor(r(2, 6)), t0 = ctx.currentTime + .05;
      for (let i = 0; i < notes; i++) {
        const at = t0 + i * r(.09, .16), o = osc("sine", at, .12), g = gain(0);
        env(o.frequency, at, [[0, base * r(.9, 1.1)], [.05, base * r(1.15, 1.4)], [.1, base * r(.8, 1)]]);
        env(g.gain, at, [[0, 0], [.01, .03], [.1, 0]]);
        o.connect(g); g.connect(amb.g);
        const w = gain(.5); g.connect(w); w.connect(verbIn);
      }
      amb.timers.push(setTimeout(bird, r(2500, 7000)));
    };
    amb.timers.push(setTimeout(bird, 1200));
  }
  function stopAmbience() {
    if (!amb) return;
    const a = amb; amb = null;
    a.timers.forEach(clearTimeout);
    env(a.g.gain, ctx.currentTime, [[0, a.g.gain.value], [.5, 0]]);
    setTimeout(() => a.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 700);
  }

  function setOn(v) {
    on = v;
    try { localStorage.setItem(KIN.storageKey + ":sound", v ? "on" : "off"); } catch (e) {}
    if (v) { ensure(); startAmbience(); } else stopAmbience();
  }
  // Browsers only allow audio after a tap; start the ambience on the first one if sound is on.
  addEventListener("pointerdown", function first() { if (on) { ensure(); startAmbience(); } removeEventListener("pointerdown", first); }, { once: true });

  window.Sound = { roar, stomp, thunk, rumble, pop, crack, chime, brush, ribbit, bloop, hoot, grunt, setOn, isOn: () => on };
})();
