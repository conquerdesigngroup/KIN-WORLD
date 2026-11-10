/* Dino games: Hatch the eggs, and Fossil dig. Big targets, no timers, no losing. */
(function () {
  const $ = s => document.querySelector(s);
  let stopCurrent = null;

  function openGame(name) {
    $("#game-pick").hidden = true; $("#game-view").hidden = false;
    const area = $("#game-area"); area.innerHTML = "";
    if (stopCurrent) stopCurrent();
    stopCurrent = name === "hatch" ? hatch(area) : dig(area);
  }
  function closeGame() {
    if (stopCurrent) { stopCurrent(); stopCurrent = null; }
    $("#game-area").innerHTML = "";
    $("#game-view").hidden = true; $("#game-pick").hidden = false;
  }
  $("#game-pick").addEventListener("click", e => { const c = e.target.closest("[data-game]"); if (c) { Sound.pop(); openGame(c.dataset.game); } });
  $("#game-back").addEventListener("click", closeGame);
  document.addEventListener("page:games", () => {});
  addEventListener("hashchange", () => { if (location.hash !== "#games" && stopCurrent) closeGame(); });

  /* ---------------- Hatch the eggs ---------------- */
  function hatch(area) {
    $("#game-title").textContent = "Hatch the eggs";
    let count = 0; const timers = [];
    const score = () => $("#game-score").textContent = `Babies hatched: ${count}`;
    score();
    const field = document.createElement("div"); field.className = "hatch-field"; area.appendChild(field);
    const spots = area.clientWidth < 520 ? [[27, 50], [73, 50], [27, 82], [73, 82]] : [[16, 70], [38, 80], [62, 72], [84, 80], [50, 55]];
    const shells = [["#fff6dc", "#ffcf8a"], ["#e6f7c8", "#9fd36a"], ["#dff1ff", "#8ec5f2"], ["#ffe6f0", "#ff9fc0"], ["#f3e6ff", "#c39bf2"]];

    function egg(nest) {
      const [base, dot] = shells[Math.floor(Math.random() * shells.length)];
      nest.dataset.hits = "0"; nest.dataset.base = base;
      nest.innerHTML = `<span class="egg-shape" style="background:radial-gradient(circle at 30% 34%, ${dot} 0 6px, transparent 7px), radial-gradient(circle at 66% 56%, ${dot} 0 8px, transparent 9px), radial-gradient(circle at 40% 76%, ${dot} 0 5px, transparent 6px), radial-gradient(circle at 34% 24%, #fff 0 5px, transparent 6px), ${base}">
        <svg class="crack crack-1" viewBox="0 0 70 88"><path d="M8 40 l12 6 l8 -8 l10 9 l9 -7"/></svg>
        <svg class="crack crack-2" viewBox="0 0 70 88"><path d="M47 40 l8 6 l9 -6 M30 47 l-2 12 l7 6"/></svg></span>`;
      nest.disabled = false;
      nest.setAttribute("aria-label", "Egg. Tap three times to hatch it.");
    }
    spots.forEach(([x, y]) => {
      const n = document.createElement("button"); n.type = "button"; n.className = "nest";
      n.style.left = x + "%"; n.style.top = y + "%";
      field.appendChild(n); egg(n);
    });

    field.addEventListener("click", e => {
      const n = e.target.closest(".nest"); if (!n || n.disabled) return;
      const hits = +n.dataset.hits + 1; n.dataset.hits = hits;
      n.classList.remove("wobble"); void n.offsetWidth; n.classList.add("wobble");
      Sound.crack();
      if (hits < 3) return;
      n.disabled = true;
      const r = n.getBoundingClientRect(), fr = field.getBoundingClientRect();
      const cx = r.left - fr.left + r.width / 2, cy = r.top - fr.top + r.height - 20;
      for (let i = 0; i < 8; i++) {
        const b = document.createElement("span"); b.className = "shell-bit";
        const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 60;
        b.style.cssText = `left:${cx}px;top:${cy - 40}px;--c:${n.dataset.base};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--rot:${Math.random() * 360}deg`;
        field.appendChild(b); timers.push(setTimeout(() => b.remove(), 900));
      }
      n.innerHTML = "";
      const baby = document.createElement("div"); baby.className = "baby";
      baby.style.left = cx + "px"; baby.style.top = cy + "px";
      const col = Rex.BABY_COLORS[Math.floor(Math.random() * Rex.BABY_COLORS.length)];
      baby.innerHTML = Rex.svg({ colors: col, label: "A baby dinosaur" });
      field.appendChild(baby);
      const svg = baby.querySelector("svg");
      timers.push(setTimeout(() => svg.classList.add("roaring"), 250));
      timers.push(setTimeout(() => svg.classList.remove("roaring"), 900));
      Sound.pop(700); setTimeout(() => Sound.roar(.45), 220);
      count++; score();
      if (count % 5 === 0) App.toast(`${count} babies! Rex is one proud dino.`);
      timers.push(setTimeout(() => baby.classList.add("leave"), 1700));
      timers.push(setTimeout(() => baby.remove(), 2900));
      timers.push(setTimeout(() => egg(n), 2400));
    });
    return () => timers.forEach(clearTimeout);
  }

  /* ---------------- Fossil dig ---------------- */
  const BONE = "#f1e6c8", BONE_LINE = "#6b5532";
  const FINDS = [
    { name: "An ammonite", fact: "A sea creature with a curly shell. Ammonites swam in the oceans while dinosaurs walked on land.", draw: ammonite },
    { name: "A T-Rex tooth", fact: "The biggest T-Rex teeth, root and all, were about 12 inches long. That's as long as a banana!", draw: tooth },
    { name: "A dinosaur footprint", fact: "Three big toes pointing forward. Whoever made this walked on two legs, just like Rex.", draw: print },
    { name: "A fossil egg", fact: "Some dinosaur eggs were as big as a football, and some were as small as a potato.", draw: eggFossil },
    { name: "A whole T-Rex skeleton!", fact: "Rex's great-great-great (keep going for 66 million years) grandpa.", draw: skeleton }
  ];

  function dig(area) {
    $("#game-title").textContent = "Fossil dig";
    let found = Prefs.get("fossils", 0), idx = found % FINDS.length, alive = true;
    const score = () => $("#game-score").textContent = `Fossils found: ${found}`;
    score();
    const under = document.createElement("canvas"), over = document.createElement("canvas");
    under.className = over.className = "dig-canvas";
    area.append(under, over);
    const gu = under.getContext("2d"), go = over.getContext("2d");
    let W, H, DPR, box, brushing = false, last = null, strokes = 0, done = false;

    function setup() {
      DPR = Math.min(2, devicePixelRatio || 1);
      W = area.clientWidth; H = area.clientHeight;
      [under, over].forEach(c => { c.width = W * DPR; c.height = H * DPR; c.getContext("2d").setTransform(DPR, 0, 0, DPR, 0, 0); });
      // rock bed
      gu.fillStyle = "#cdb48a"; gu.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) { gu.fillStyle = `rgba(110,80,40,${Math.random() * .18})`; gu.beginPath(); gu.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 0, 7); gu.fill(); }
      const s = Math.min(W, H) / 300;
      box = { x: W / 2 - 130 * s, y: H / 2 - 110 * s, w: 260 * s, h: 220 * s };
      FINDS[idx].draw(gu, W / 2, H / 2, s);
      // dirt
      go.globalCompositeOperation = "source-over";
      const bands = ["#8a5f34", "#9c6d3c", "#7a5230", "#a87a46", "#8f6236", "#b0844e"];
      let y = 0, k = 0;
      while (y < H) { const h = 24 + Math.random() * 40; go.fillStyle = bands[k++ % bands.length]; go.fillRect(0, y, W, h + 2); y += h; }
      for (let i = 0; i < 500; i++) { go.fillStyle = `rgba(${Math.random() < .5 ? "60,40,20" : "220,190,140"},${Math.random() * .3})`; go.beginPath(); go.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 2.5, 0, 7); go.fill(); }
      for (let i = 0; i < 16; i++) { go.fillStyle = "#6e6a62"; go.beginPath(); go.ellipse(Math.random() * W, Math.random() * H, 5 + Math.random() * 9, 4 + Math.random() * 6, Math.random() * 3, 0, 7); go.fill(); }
      go.fillStyle = "rgba(255,255,255,.85)"; go.font = `800 ${Math.max(15, 18 * s)}px Nunito, system-ui, sans-serif`; go.textAlign = "center";
      go.fillText("Brush here to dig", W / 2, H / 2);
    }

    function brushAt(x, y) {
      go.globalCompositeOperation = "destination-out";
      const r = Math.max(20, Math.min(W, H) * .07);
      go.lineCap = "round"; go.lineWidth = r * 2;
      go.beginPath();
      if (last) { go.moveTo(last.x, last.y); go.lineTo(x, y); } else { go.arc(x, y, r, 0, 7); go.fill(); }
      go.stroke(); last = { x, y };
      if (++strokes % 6 === 0) { Sound.brush(); check(); }
    }
    function check() {
      if (done) return;
      const sx = Math.floor(box.x * DPR), sy = Math.floor(box.y * DPR), sw = Math.floor(box.w * DPR), sh = Math.floor(box.h * DPR);
      const data = go.getImageData(sx, sy, sw, sh).data;
      let clear = 0, total = 0;
      for (let i = 3; i < data.length; i += 4 * 16) { total++; if (data[i] < 40) clear++; }
      if (clear / total > .62) reveal();
    }
    function reveal() {
      done = true; found++; Prefs.set("fossils", found); score();
      over.style.transition = "opacity .8s"; over.style.opacity = "0";
      Sound.chime();
      const f = FINDS[idx];
      const card = document.createElement("div"); card.className = "dig-found";
      card.innerHTML = `<b>${f.name}</b>${f.fact}<br><button class="btn" type="button">Dig again</button>`;
      area.appendChild(card);
      card.querySelector("button").onclick = () => { card.remove(); idx = (idx + 1) % FINDS.length; over.style.transition = ""; over.style.opacity = "1"; done = false; strokes = 0; setup(); };
    }
    const pos = e => { const r = over.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    over.addEventListener("pointerdown", e => { if (done) return; brushing = true; last = null; over.setPointerCapture(e.pointerId); const p = pos(e); brushAt(p.x, p.y); });
    over.addEventListener("pointermove", e => { if (!brushing || done) return; const p = pos(e); brushAt(p.x, p.y); });
    over.addEventListener("pointerup", () => { brushing = false; last = null; check(); });
    over.addEventListener("pointercancel", () => { brushing = false; last = null; });
    const ro = new ResizeObserver(() => { if (alive && !done) setup(); });
    setup(); ro.observe(area);
    return () => { alive = false; ro.disconnect(); };
  }

  function boneStyle(g, s) { g.fillStyle = BONE; g.strokeStyle = BONE_LINE; g.lineWidth = 4 * s; g.lineJoin = "round"; g.lineCap = "round"; }

  function ammonite(g, cx, cy, s) {
    boneStyle(g, s);
    g.beginPath(); g.arc(cx, cy, 95 * s, 0, 7); g.fill(); g.stroke();
    g.beginPath();
    for (let a = 0; a < Math.PI * 8; a += .05) { const r = 95 * s * Math.pow(.82, a / 1.6); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; a === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
    g.lineWidth = 2.5 * s;
    for (let a = 0; a < Math.PI * 4; a += .32) { const r1 = 95 * s * Math.pow(.82, a / 1.6), r2 = 95 * s * Math.pow(.82, (a + Math.PI * 2) / 1.6); g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke(); }
  }
  function tooth(g, cx, cy, s) {
    boneStyle(g, s);
    g.beginPath();
    g.moveTo(cx - 50 * s, cy - 90 * s); g.quadraticCurveTo(cx - 10 * s, cy - 100 * s, cx + 40 * s, cy - 88 * s);
    g.quadraticCurveTo(cx + 50 * s, cy + 10 * s, cx + 10 * s, cy + 100 * s);
    g.quadraticCurveTo(cx - 40 * s, cy + 20 * s, cx - 50 * s, cy - 90 * s); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 2 * s;
    for (let i = 0; i < 10; i++) { const t = i / 10, x = cx + 40 * s + (-30 * s) * t + 8 * s * Math.sin(t * 3), y = cy - 80 * s + 170 * s * t; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7 * s, y + 3 * s); g.stroke(); }
    g.beginPath(); g.moveTo(cx - 44 * s, cy - 50 * s); g.quadraticCurveTo(cx, cy - 58 * s, cx + 42 * s, cy - 50 * s); g.stroke();
  }
  function print(g, cx, cy, s) {
    g.fillStyle = "#a88a5c"; g.strokeStyle = BONE_LINE; g.lineWidth = 4 * s; g.lineJoin = "round";
    g.beginPath(); g.ellipse(cx, cy + 40 * s, 46 * s, 54 * s, 0, 0, 7); g.fill(); g.stroke();
    [[-58, -50, -.5], [0, -78, 0], [58, -50, .5]].forEach(([dx, dy, r]) => {
      g.save(); g.translate(cx + dx * s, cy + dy * s); g.rotate(r);
      g.beginPath(); g.moveTo(-20 * s, 40 * s); g.quadraticCurveTo(-14 * s, -50 * s, 0, -62 * s); g.quadraticCurveTo(14 * s, -50 * s, 20 * s, 40 * s); g.closePath(); g.fill(); g.stroke();
      g.restore();
    });
  }
  function eggFossil(g, cx, cy, s) {
    boneStyle(g, s);
    g.beginPath(); g.ellipse(cx, cy, 70 * s, 92 * s, -.25, 0, 7); g.fill(); g.stroke();
    g.lineWidth = 3 * s;
    g.beginPath(); g.moveTo(cx - 60 * s, cy); g.lineTo(cx - 30 * s, cy + 12 * s); g.lineTo(cx - 10 * s, cy - 8 * s); g.lineTo(cx + 18 * s, cy + 14 * s); g.lineTo(cx + 40 * s, cy - 4 * s); g.stroke();
    g.fillStyle = "rgba(107,85,50,.25)";
    [[-20, -40, 8], [24, -20, 10], [-8, 40, 7], [30, 50, 6]].forEach(([x, y, r]) => { g.beginPath(); g.arc(cx + x * s, cy + y * s, r * s, 0, 7); g.fill(); });
  }
  let skelImg = null;
  function skeleton(g, cx, cy, s) {
    const drawIt = () => { const w = 290 * s, h = w * 280 / 320; g.drawImage(skelImg, cx - w / 2, cy - h / 2, w, h); };
    if (skelImg && skelImg.complete) return drawIt();
    const svg = Rex.svg({ colors: { skin: BONE, shade: "#ddcfa6", belly: "#f6eed6", spot: "#e3d4aa", blush: "rgba(0,0,0,0)" } }).replace('<svg ', '<svg width="640" height="560" ').replace(/#1b3418/g, BONE_LINE);
    skelImg = new Image();
    skelImg.onload = drawIt;
    skelImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
})();
