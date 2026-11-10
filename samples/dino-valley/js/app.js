/* App shell: entrance, family code, welcome, routing between places, Rex, and small UI helpers. */
(function () {
  const $ = s => document.querySelector(s);
  const K = KIN, kid = () => (Prefs.get("kidFirst", null) || K.kid.first);
  const PAGES = ["messages", "games", "about"];
  let role = Prefs.get("role", null);   // "guest" | "owner" | null
  let pendingRoute = null;

  /* ---------- names everywhere ---------- */
  function applyNames() {
    document.querySelectorAll(".kid-name").forEach(el => el.textContent = kid());
    $("#intro-sub").textContent = K.kid.full || kid();
    $("#tile-about-label").textContent = kid();
    $("#lock").textContent = `Lock ${kid()}'s world`;
    $(".logo").setAttribute("aria-label", K.site);
    const name = $(".logo-name"); name.textContent = kid() + "'s";
  }

  /* ---------- helpers ---------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function openModal(el) {
    el.hidden = false;
    el._prevFocus = document.activeElement;
    const f = el.querySelector("input, textarea, select, button.btn, [data-close]");
    setTimeout(() => f && f.focus(), 30);
  }
  function closeModal(el) {
    el.hidden = true;
    if (el._prevFocus && el._prevFocus.focus) el._prevFocus.focus();
    el.dispatchEvent(new Event("closed"));
  }
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-close]");
    if (c) closeModal(c.closest(".modal"));
    else if (e.target.classList.contains("modal")) closeModal(e.target);
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const open = [...document.querySelectorAll(".modal:not([hidden])")].pop();
    if (open) closeModal(open);
    else if (!$("#keypad").hidden) hideKeypad();
  });

  // In-page confirm / prompt (browser dialogs are not reliable everywhere).
  function ask({ title, text, yes = "OK", input = null, value = "", type = "text" }) {
    return new Promise(resolve => {
      const m = $("#confirm");
      $("#cf-title").textContent = title; $("#cf-text").textContent = text || "";
      $("#cf-yes").textContent = yes;
      const field = $("#cf-field"), inp = $("#cf-input");
      field.hidden = !input; if (input) { $("#cf-label").textContent = input; inp.type = type; inp.value = value; }
      const done = v => { $("#cf-yes").onclick = $("#cf-no").onclick = null; m.removeEventListener("closed", onClose); if (!m.hidden) closeModal(m); resolve(v); };
      const onClose = () => done(null);
      $("#cf-yes").onclick = () => done(input ? inp.value : true);
      $("#cf-no").onclick = () => done(null);
      m.addEventListener("closed", onClose);
      openModal(m);
      if (input) setTimeout(() => inp.focus(), 40);
    });
  }

  /* ---------- Rex ---------- */
  const rexBtn = $("#rex");
  rexBtn.innerHTML = Rex.svg({ label: `${K.mascot.name} the ${K.mascot.kind}` });
  const rexSvg = rexBtn.querySelector("svg");
  const lines = () => [
    `ROAR! That means hi in dinosaur.`,
    `Hi ${kid()}! I'm ${K.mascot.name}. I guard this whole world.`,
    `Did you know my teeth were as long as a banana?`,
    `My arms are tiny, but my hugs are huge.`,
    `I lived 66 million years ago. That's a LOT of birthdays.`,
    `Tap anywhere on the ground and I'll stomp over there.`,
    `Someone left you a message, ${kid()}. Want to look?`,
    `Big roar, little roar, medium roar. Which one was that?`
  ];
  let lineI = 0, bubbleT;
  function say(text, ms) {
    const b = $("#bubble"); b.textContent = text; b.classList.add("show");
    clearTimeout(bubbleT); bubbleT = setTimeout(() => b.classList.remove("show"), ms || 3400);
  }
  function roar(text) {
    if (window.World3D) World3D.roar();
    else { rexSvg.classList.add("roaring"); Scene.shake(12); setTimeout(() => rexSvg.classList.remove("roaring"), 900); }
    Sound.roar(1);
    say(text || lines()[lineI++ % lines().length]);
  }
  rexBtn.addEventListener("click", () => roar());
  addEventListener("pointermove", e => {
    const p = rexSvg.querySelector(".rex-pupil"); if (!p) return;
    const r = rexSvg.getBoundingClientRect();
    const ex = r.left + r.width * (255 / 320), ey = r.top + r.height * (58 / 280);
    const dx = e.clientX - ex, dy = e.clientY - ey, d = Math.hypot(dx, dy) || 1;
    p.setAttribute("transform", `translate(${(dx / d * 3.5).toFixed(2)} ${(dy / d * 3.5).toFixed(2)})`);
  });

  // Tap the valley floor for footprints.
  $("#scene").addEventListener("pointerdown", e => {
    const f = e.clientX / innerWidth;
    if (e.clientY > Scene.groundY(f) - 20) Scene.stomp(e.clientX, e.clientY);
  });

  /* ---------- sound ---------- */
  function paintSound() {
    const on = Sound.isOn();
    $("#sound-btn").setAttribute("aria-pressed", on);
    $("#sound-label").textContent = on ? "Sound on" : "Sound off";
  }
  $("#sound-btn").addEventListener("click", () => { Sound.setOn(!Sound.isOn()); paintSound(); if (Sound.isOn()) Sound.pop(660); });
  paintSound();

  /* ---------- keypad ---------- */
  let entry = "";
  const grid = $("#kp-grid");
  ["1","2","3","4","5","6","7","8","9","","0","del"].forEach(k => {
    const b = document.createElement("button"); b.type = "button";
    if (k === "") { b.className = "kp-blank"; b.tabIndex = -1; b.setAttribute("aria-hidden", "true"); }
    else if (k === "del") { b.className = "kp-del"; b.textContent = "Delete"; b.onclick = () => { entry = entry.slice(0, -1); dots(); }; }
    else { b.textContent = k; b.setAttribute("aria-label", k); b.onclick = () => press(k); }
    grid.appendChild(b);
  });
  $("#kp-demo").hidden = !K.showDemoCodes;
  function dots(bad) {
    const d = $("#kp-dots");
    d.querySelectorAll("i").forEach((el, i) => el.classList.toggle("on", i < entry.length));
    d.classList.toggle("bad", !!bad);
  }
  async function hash(s) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { return null; }
  }
  async function press(k) {
    if (entry.length >= 4) return;
    entry += k; dots(); Sound.pop(440 + entry.length * 80);
    if (entry.length < 4) return;
    const h = await hash(K.codeSalt + entry);
    const r = h === K.codes.owner ? "owner" : h === K.codes.guest ? "guest" : null;
    if (!r) { dots(true); Sound.stomp(); setTimeout(() => { entry = ""; dots(); }, 600); return; }
    role = r; Prefs.set("role", r);
    hideKeypad();
    Sound.chime();
    go(pendingRoute || "home");
    setTimeout(() => roar(r === "owner" ? `Welcome back, grown-up. You can edit things now.` : `ROAR! Welcome to ${kid()}'s world!`), 450);
  }
  addEventListener("keydown", e => {
    if ($("#keypad").hidden) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") { entry = entry.slice(0, -1); dots(); }
  });
  function showKeypad(target) {
    pendingRoute = target; entry = ""; dots();
    $("#kp-sub").textContent = `Enter the 4-digit family code to step into ${kid()}'s world.`;
    $("#keypad").hidden = false;
    setTimeout(() => grid.querySelector("button").focus(), 40);
  }
  function hideKeypad() { $("#keypad").hidden = true; }
  $("#kp-cancel").onclick = hideKeypad;

  /* ---------- views ---------- */
  function setView(v) {
    document.body.classList.remove("v-intro", "v-welcome", "v-page");
    document.body.classList.add(v);
  }
  function go(route) {
    if (location.hash.slice(1) !== route) { history.replaceState(null, "", route === "intro" ? location.pathname + location.search : "#" + route); }
    render();
  }
  function render() {
    const h = location.hash.slice(1) || (role ? "home" : "intro");
    const needs = h === "home" || PAGES.includes(h);
    if (needs && !role) { show("intro"); showKeypad(h); return; }
    show(h);
  }
  function show(h) {
    $("#welcome").hidden = h !== "home";
    PAGES.forEach(p => $("#page-" + p).hidden = p !== h);
    $("#intro").setAttribute("aria-hidden", h === "intro" ? "false" : "true");
    if (h === "intro") setView("v-intro");
    else if (h === "home") { setView("v-welcome"); paintWelcome(); }
    else if (PAGES.includes(h)) { setView("v-page"); document.dispatchEvent(new CustomEvent("page:" + h)); }
    else { setView("v-intro"); }
  }
  function paintWelcome() {
    $("#w-sub").textContent = role === "owner"
      ? `You're in as a parent. You can leave messages, remove them, and edit ${kid()}'s page.`
      : `This is ${kid()}'s world. Leave a message, play a game, or learn all about ${kid()}.`;
  }
  addEventListener("hashchange", render);

  $("#enter").addEventListener("click", () => {
    Sound.stomp();
    if (role) go("home"); else showKeypad("home");
  });
  $("#lock").addEventListener("click", () => {
    role = null; Prefs.set("role", null);
    go("intro");
    toast(`${kid()}'s world is locked.`);
  });

  window.App = { toast, openModal, closeModal, ask, roar, say, kid, role: () => role, applyNames };
  applyNames();
  render();
  setTimeout(() => { if (document.body.classList.contains("v-intro")) say(`Hi! I'm ${K.mascot.name}. Tap me!`, 4200); }, 1400);
})();
