/* The prehistoric valley behind everything: sky, volcano, hills, palms, ferns, flying pterosaurs,
   and footprints wherever you tap the ground. */
(function () {
  if (document.body.classList.contains("webgl")) return; // the 3D valley is running
  const cv = document.getElementById("scene");
  const g = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, DPR = 1, px = 0, py = 0, tx = 0, ty = 0, t0 = performance.now();
  const smoke = [], prints = [], flyers = [];
  let shake = 0;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function ridge(seed, base, amp, freq) {
    return x => base + Math.sin(x * freq + seed) * amp + Math.sin(x * freq * 2.3 + seed * 1.7) * amp * .45 + Math.sin(x * freq * 5.1 + seed * .3) * amp * .12;
  }

  function hill(fn, color, shift) {
    g.fillStyle = color;
    g.beginPath(); g.moveTo(-20, H + 20);
    for (let x = -20; x <= W + 20; x += 8) g.lineTo(x + shift, fn(x / W) * H);
    g.lineTo(W + 20, H + 20); g.closePath(); g.fill();
  }

  function palm(x, y, s, color, sway) {
    g.strokeStyle = color; g.fillStyle = color; g.lineCap = "round";
    g.lineWidth = 7 * s;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 18 * s, y - 60 * s, x + 8 * s + sway, y - 120 * s); g.stroke();
    const tx_ = x + 8 * s + sway, ty_ = y - 120 * s;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + i * (Math.PI / 5) + Math.sin(performance.now() / 1400 + i) * .05;
      const len = 62 * s;
      g.beginPath(); g.moveTo(tx_, ty_);
      const ex = tx_ + Math.cos(a) * len, ey = ty_ + Math.sin(a) * len * .55 + 26 * s;
      g.quadraticCurveTo(tx_ + Math.cos(a) * len * .5, ty_ + Math.sin(a) * len * .7 - 10 * s, ex, ey);
      g.lineWidth = 9 * s; g.stroke();
    }
  }

  function fern(x, y, s, color, flip) {
    g.strokeStyle = color; g.lineWidth = 3 * s; g.lineCap = "round";
    for (let k = -2; k <= 2; k++) {
      const a = -Math.PI / 2 + k * .38 * (flip ? -1 : 1);
      const L = (70 - Math.abs(k) * 12) * s;
      const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * .4, y + Math.sin(a) * L * .7, ex, ey); g.stroke();
      for (let i = 1; i < 8; i++) {
        const f = i / 8, lx = x + (ex - x) * f, ly = y + (ey - y) * f, ll = (1 - f) * 16 * s + 3;
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx - ll * .9, ly - ll * .5); g.moveTo(lx, ly); g.lineTo(lx + ll * .9, ly - ll * .5); g.stroke();
      }
    }
  }

  function footprint(x, y, s, a, alpha) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
    g.globalAlpha = alpha; g.fillStyle = "#1c4a2a";
    g.beginPath(); g.ellipse(0, 6, 9, 11, 0, 0, Math.PI * 2); g.fill();
    [[-10, -12, -.5], [0, -17, 0], [10, -12, .5]].forEach(([dx, dy, r]) => {
      g.save(); g.translate(dx, dy); g.rotate(r);
      g.beginPath(); g.moveTo(-4, 6); g.quadraticCurveTo(0, -14, 4, 6); g.closePath(); g.fill(); g.restore();
    });
    g.restore(); g.globalAlpha = 1;
  }

  function flyer(f, now) {
    const flap = Math.sin(now / 140 + f.ph) * 10 * f.s;
    g.strokeStyle = "rgba(48,40,70,.55)"; g.lineWidth = 3.2 * f.s; g.lineJoin = "round";
    g.beginPath();
    g.moveTo(f.x - 26 * f.s, f.y - flap); g.quadraticCurveTo(f.x - 12 * f.s, f.y - 6 * f.s, f.x, f.y);
    g.quadraticCurveTo(f.x + 12 * f.s, f.y - 6 * f.s, f.x + 26 * f.s, f.y - flap); g.stroke();
    g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x + 9 * f.s * f.dir, f.y - 3 * f.s); g.stroke();
  }

  const far = ridge(1.3, .62, .05, 4.2), mid = ridge(4.1, .72, .045, 6), near = ridge(8.2, .84, .03, 5);

  function draw(now) {
    px += (tx - px) * .05; py += (ty - py) * .05;
    const sx = shake > 0 ? (Math.random() - .5) * shake : 0, sy = shake > 0 ? (Math.random() - .5) * shake : 0;
    shake *= .86; if (shake < .3) shake = 0;
    g.save(); g.translate(sx, sy);

    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#3fb4bd"); sky.addColorStop(.5, "#a6e0c4"); sky.addColorStop(1, "#ffe0a0");
    g.fillStyle = sky; g.fillRect(-20, -20, W + 40, H + 40);

    // sun
    const sunX = W * .8 - px * 6, sunY = H * .2 - py * 4, r = Math.min(W, H) * .09;
    const glow = g.createRadialGradient(sunX, sunY, r * .4, sunX, sunY, r * 3.2);
    glow.addColorStop(0, "rgba(255,248,214,.9)"); glow.addColorStop(1, "rgba(255,248,214,0)");
    g.fillStyle = glow; g.fillRect(sunX - r * 4, sunY - r * 4, r * 8, r * 8);
    g.fillStyle = "#fff6d6"; g.beginPath(); g.arc(sunX, sunY, r, 0, Math.PI * 2); g.fill();

    // volcano
    const vx = W * .24 - px * 10, vb = H * .66, vt = H * .3, vw = Math.max(260, W * .3);
    g.fillStyle = "#7a6a86";
    g.beginPath(); g.moveTo(vx - vw, vb); g.lineTo(vx - vw * .14, vt); g.lineTo(vx + vw * .14, vt); g.lineTo(vx + vw, vb); g.closePath(); g.fill();
    g.fillStyle = "#ff7b39";
    g.beginPath(); g.moveTo(vx - vw * .14, vt); g.lineTo(vx + vw * .14, vt); g.lineTo(vx + vw * .1, vt + 18); g.quadraticCurveTo(vx + vw * .04, vt + 40, vx, vt + 22); g.quadraticCurveTo(vx - vw * .06, vt + 46, vx - vw * .1, vt + 20); g.closePath(); g.fill();
    if (!reduce && Math.random() < .09) smoke.push({ x: vx + (Math.random() - .5) * 20, y: vt - 4, r: 10 + Math.random() * 10, a: .55, vx: .25 + Math.random() * .3, vy: -.5 - Math.random() * .4 });
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i]; s.x += s.vx; s.y += s.vy; s.r += .22; s.a -= .0032;
      if (s.a <= 0) { smoke.splice(i, 1); continue; }
      g.fillStyle = `rgba(236,232,240,${s.a})`; g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
    }

    // flyers
    if (!reduce && flyers.length < 2 && Math.random() < .004) {
      const dir = Math.random() < .5 ? 1 : -1;
      flyers.push({ x: dir > 0 ? -40 : W + 40, y: H * (.14 + Math.random() * .2), s: .7 + Math.random() * .6, dir, ph: Math.random() * 9 });
    }
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]; f.x += 1.1 * f.dir * f.s; f.y += Math.sin(now / 900 + f.ph) * .2;
      if (f.x < -60 || f.x > W + 60) { flyers.splice(i, 1); continue; }
      flyer(f, now);
    }

    hill(far, "#86c19a", -px * 18);
    hill(mid, "#4f9e66", -px * 30);
    const sway = Math.sin(now / 1600) * 3;
    [.08, .16, .58, .7, .93].forEach((f, i) => {
      const x = f * W - px * 30;
      palm(x, mid(f) * H + 14, .7 + (i % 2) * .25, "#2c7349", sway);
    });
    hill(near, "#2f7d45", -px * 46);

    for (let i = prints.length - 1; i >= 0; i--) {
      const p = prints[i]; p.life -= .0025;
      if (p.life <= 0) { prints.splice(i, 1); continue; }
      footprint(p.x - px * 46, p.y, p.s, p.a, Math.min(.45, p.life));
    }

    const fy = H + 8;
    [.03, .2, .45, .78, .97].forEach((f, i) => fern(f * W - px * 60, fy, 1 + (i % 3) * .25, "#1d5a33", i % 2));

    g.restore();
    if (!reduce) requestAnimationFrame(draw);
  }

  function walk(x, y) {
    const n = 4, dir = x > W / 2 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        prints.push({ x: x + i * 46 * dir + px * 46, y: y + (i % 2 ? 14 : -14), s: 1.1, a: dir * Math.PI / 2, life: 1 });
        shake = Math.max(shake, 7);
        window.Sound && Sound.stomp();
      }, i * 260);
    }
  }

  addEventListener("resize", resize);
  addEventListener("pointermove", e => { tx = e.clientX / W - .5; ty = e.clientY / H - .5; });
  window.Scene = {
    stomp(x, y) { walk(x, y); },
    shake(v) { shake = Math.max(shake, v || 10); if (reduce) draw(performance.now()); },
    groundY(f) { return near(f) * H; }
  };
  resize();
  requestAnimationFrame(draw);
  if (reduce) setInterval(() => draw(performance.now()), 1000);
})();
