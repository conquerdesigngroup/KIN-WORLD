/* Roar-mail: the lifelong message timeline. Messages sit along a trail of footprints, oldest first,
   with an egg marking each new year of Logan's life. */
(function () {
  const $ = s => document.querySelector(s);
  const K = KIN;
  const DAY = 864e5;
  const COLORS = { Mom: "#ffb3c7", Dad: "#9fd3ff", Grandma: "#ffd08a", Grandpa: "#c9ef8a", Aunt: "#e3c2ff", Uncle: "#ffe07a", Friend: "#b5f0e0" };
  let posts = [], urls = [], current = null;

  const birthday = () => Prefs.get("birthday", null) || K.kid.birthday || "";
  const when = p => p.date ? new Date(p.date + "T12:00:00").getTime() : p.createdAt;
  const fmt = ms => new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  function ageAt(ms) {
    const b = birthday(); if (!b) return null;
    const bd = new Date(b + "T00:00:00"), d = new Date(ms);
    if (d < bd) return null;
    let a = d.getFullYear() - bd.getFullYear();
    if (d.getMonth() < bd.getMonth() || (d.getMonth() === bd.getMonth() && d.getDate() < bd.getDate())) a--;
    return a;
  }
  function ageText(ms) {
    const a = ageAt(ms); if (a == null) return "";
    if (a === 0) {
      const months = Math.floor((ms - new Date(birthday() + "T00:00:00")) / (DAY * 30.44));
      return months < 1 ? `${App.kid()} was brand new` : `${App.kid()} was ${months} month${months === 1 ? "" : "s"}`;
    }
    return `${App.kid()} was ${a}`;
  }
  const initial = n => (n || "?").trim().charAt(0).toUpperCase() || "?";
  const color = r => COLORS[r] || "#d6f0a8";
  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function url(blob) { const u = URL.createObjectURL(blob); urls.push(u); return u; }

  async function seedIfNeeded() {
    if (Prefs.get("seeded", false)) return;
    const now = Date.now();
    for (const s of K.samples) {
      const d = new Date(now - s.daysAgo * DAY);
      await Store.add({ name: s.name, relation: s.relation, text: s.text, date: d.toISOString().slice(0, 10), createdAt: d.getTime(), example: true });
    }
    Prefs.set("seeded", true);
  }

  async function load() {
    await seedIfNeeded();
    posts = (await Store.list()).sort((a, b) => when(a) - when(b));
    paint();
  }

  function paint() {
    urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
    const track = $("#tl-track"); track.innerHTML = "";
    const years = [];
    let lastYear = null, n = 0;
    posts.forEach(p => {
      const ms = when(p), y = new Date(ms).getFullYear();
      if (y !== lastYear) {
        lastYear = y; years.push(y);
        const li = document.createElement("li"); li.className = "tl-year"; li.id = "year-" + y;
        const age = ageAt(new Date(y, 11, 31).getTime());
        li.innerHTML = `<div class="egg"><div><b>${y}</b>${age != null ? `<small>${esc(App.kid())} turns ${age}</small>` : ""}</div></div>`;
        track.appendChild(li);
      }
      const li = document.createElement("li"); li.className = "tl-item";
      const media = p.media ? (p.mediaType || "").split("/")[0] : "";
      const thumb = media === "image" ? `<span class="card-thumb" style="background-image:url('${url(p.media)}')"></span>`
        : media === "video" ? `<span class="card-thumb"><video src="${url(p.media)}#t=0.5" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></video></span>` : "";
      const badges = [p.example ? `<span class="badge">Example</span>` : "", p.audio || media === "audio" ? `<span class="badge voice">Voice</span>` : "", media === "video" ? `<span class="badge video">Video</span>` : ""].join("");
      const age = ageText(ms);
      li.innerHTML = `<button class="card${thumb ? " has-media" : ""}" type="button" data-id="${p.id}">
        <span class="badges">${badges}</span>
        <span class="card-top"><span class="avatar" style="background:${color(p.relation)}">${esc(initial(p.name))}</span>
        <span class="card-who"><span class="card-name">${esc(p.name)}${p.relation && p.relation !== p.name ? ` <small style="font-weight:700;color:var(--muted)">· ${esc(p.relation)}</small>` : ""}</span>
        <span class="card-when">${fmt(ms)}${age ? " · " + esc(age) : ""}</span></span></span>
        ${p.text ? `<span class="card-text">${esc(p.text)}</span>` : ""}
        ${thumb}
      </button>`;
      track.appendChild(li); n++;
    });
    const end = document.createElement("li"); end.className = "tl-end";
    end.innerHTML = `<button class="btn" type="button" data-new>Add today's message</button>`;
    track.appendChild(end);

    const examples = posts.filter(p => p.example).length;
    $("#tl-meta").textContent = n
      ? `${n} message${n === 1 ? "" : "s"} for ${App.kid()}${examples ? `, ${examples} of them examples` : ""}. Saved on ${Store.kind}.`
      : `No messages yet. Be the first to leave one for ${App.kid()}.`;
    $("#tl-years").innerHTML = years.length > 1 ? years.map(y => `<button type="button" data-year="${y}">${y}</button>`).join("") : "";
    const owner = App.role() === "owner";
    $("#tl-owner").hidden = !owner;
    $("#tl-clear-examples").hidden = !examples;
    $("#tl-birthday-btn").textContent = birthday() ? `Change ${App.kid()}'s birthday` : `Set ${App.kid()}'s birthday`;
  }

  function scrollToEnd() {
    const s = $("#tl-scroller");
    requestAnimationFrame(() => { s.style.scrollBehavior = "auto"; s.scrollLeft = s.scrollWidth; s.style.scrollBehavior = ""; });
  }

  $("#tl-track").addEventListener("click", e => {
    if (e.target.closest("[data-new]")) return openCompose();
    const c = e.target.closest(".card"); if (c) openViewer(c.dataset.id);
  });
  $("#tl-years").addEventListener("click", e => {
    const b = e.target.closest("[data-year]"); if (!b) return;
    const el = document.getElementById("year-" + b.dataset.year);
    el && el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  });
  // Wheel scrolls sideways through time on desktop.
  $("#tl-scroller").addEventListener("wheel", e => {
    const s = e.currentTarget; if (s.scrollWidth <= s.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { s.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
  $("#tl-scroller").addEventListener("keydown", e => {
    const s = e.currentTarget;
    if (e.key === "ArrowRight") s.scrollLeft += 300; else if (e.key === "ArrowLeft") s.scrollLeft -= 300;
    else if (e.key === "Home") s.scrollLeft = 0; else if (e.key === "End") s.scrollLeft = s.scrollWidth;
  });

  /* ---------- viewer ---------- */
  function openViewer(id) {
    const p = posts.find(x => x.id === id); if (!p) return;
    current = p;
    const ms = when(p);
    $("#v-avatar").textContent = initial(p.name); $("#v-avatar").style.background = color(p.relation);
    $("#v-name").textContent = p.name + (p.relation && p.relation !== p.name ? `, ${p.relation}` : "");
    const age = ageText(ms);
    $("#v-when").textContent = fmt(ms) + (age ? ` · ${age}` : "") + (p.example ? " · Example message" : "");
    const m = $("#v-media"); m.innerHTML = "";
    if (p.media) {
      const kind = (p.mediaType || "").split("/")[0];
      const el = document.createElement(kind === "image" ? "img" : kind === "video" ? "video" : "audio");
      el.src = url(p.media);
      if (kind === "image") el.alt = `Photo from ${p.name}`; else { el.controls = true; el.playsInline = true; }
      m.appendChild(el);
    }
    if (p.audio) { const a = document.createElement("audio"); a.controls = true; a.src = url(p.audio); m.appendChild(a); }
    $("#v-text").textContent = p.text || "";
    $("#v-del").hidden = App.role() !== "owner";
    App.openModal($("#viewer"));
  }
  $("#viewer").addEventListener("closed", () => $("#v-media").querySelectorAll("video,audio").forEach(x => x.pause()));
  $("#v-del").addEventListener("click", async () => {
    if (!current) return;
    const ok = await App.ask({ title: "Delete this message?", text: `${current.name}'s message will be removed from ${App.kid()}'s timeline for good.`, yes: "Delete" });
    if (!ok) return;
    await Store.remove(current.id);
    App.closeModal($("#viewer"));
    App.toast("Message deleted.");
    load();
  });

  /* ---------- compose ---------- */
  const rel = $("#c-rel");
  rel.innerHTML = K.relations.map(r => `<option>${esc(r)}</option>`).join("");
  let file = null, voice = null, rec = null, recT = null, recStart = 0;
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  if (!canRecord) $("#c-rec").hidden = true;

  function openCompose() {
    const f = $("#compose-form"); f.reset();
    $("#c-name").value = Prefs.get("lastName", "");
    rel.value = Prefs.get("lastRel", K.relations[0]);
    file = null; voice = null; paintPreview(); $("#c-err").textContent = "";
    App.openModal($("#compose"));
  }
  $("#new-msg").addEventListener("click", openCompose);

  function paintPreview() {
    const box = $("#c-preview"); box.innerHTML = "";
    const add = (blob, label) => {
      const kind = (blob.type || "").split("/")[0];
      const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0";
      const el = document.createElement(kind === "image" ? "img" : kind === "video" ? "video" : "audio");
      el.src = url(blob); if (kind !== "image") el.controls = true; else el.alt = "";
      const x = document.createElement("button"); x.type = "button"; x.className = "link-btn danger"; x.textContent = "Remove " + label;
      x.onclick = () => { if (label === "voice note") voice = null; else { file = null; $("#c-file").value = ""; } paintPreview(); };
      wrap.append(el, x); box.appendChild(wrap);
    };
    if (file) add(file, (file.type || "").startsWith("audio") ? "audio" : (file.type || "").startsWith("video") ? "video" : "photo");
    if (voice) add(voice, "voice note");
    box.hidden = !file && !voice;
  }
  $("#c-file").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 80 * 1024 * 1024) { $("#c-err").textContent = "That file is over 80 MB. Try a shorter video or a smaller photo."; e.target.value = ""; return; }
    file = f; $("#c-err").textContent = ""; paintPreview();
  });

  $("#c-rec").addEventListener("click", async () => {
    const btn = $("#c-rec");
    if (rec && rec.state === "recording") { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recT); $("#c-rec-time").hidden = true;
        btn.classList.remove("recording"); btn.textContent = "Record again";
        voice = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        paintPreview();
      };
      rec.start(); recStart = Date.now();
      btn.classList.add("recording"); btn.textContent = "Stop recording";
      $("#c-rec-time").hidden = false;
      recT = setInterval(() => {
        const s = Math.floor((Date.now() - recStart) / 1000);
        $("#c-rec-time").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
        if (s >= 180) rec.stop();
      }, 250);
    } catch (err) {
      $("#c-err").textContent = "The microphone isn't available here. You can attach a voice memo file with Add a photo or video instead.";
    }
  });
  $("#compose").addEventListener("closed", () => { if (rec && rec.state === "recording") rec.stop(); });

  $("#compose-form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#c-name").value.trim(), text = $("#c-text").value.trim();
    if (!name) { $("#c-err").textContent = "Add your name so Logan knows who it's from.".replace("Logan", App.kid()); $("#c-name").focus(); return; }
    if (!text && !file && !voice) { $("#c-err").textContent = "Write a message, add a photo or video, or record a voice note."; $("#c-text").focus(); return; }
    const send = $("#c-send"); send.disabled = true;
    try {
      const d = $("#c-date").value;
      await Store.add({ name, relation: rel.value, text, date: d || null, media: file || null, mediaType: file ? file.type : null, audio: voice || null });
      Prefs.set("lastName", name); Prefs.set("lastRel", rel.value);
      App.closeModal($("#compose"));
      await load(); scrollToEnd();
      App.toast(`Sent! ${App.kid()} will love this.`);
      Sound.chime();
    } catch (err) {
      $("#c-err").textContent = "That didn't save. This browser may be out of space; try a smaller file.";
    } finally { send.disabled = false; }
  });

  /* ---------- parent tools ---------- */
  $("#tl-birthday-btn").addEventListener("click", async () => {
    const v = await App.ask({ title: `${App.kid()}'s birthday`, text: "Used to show how old " + App.kid() + " was when each message was left.", input: "Birthday", type: "date", value: birthday(), yes: "Save" });
    if (v == null) return;
    Prefs.set("birthday", v || null); paint(); App.toast("Birthday saved.");
    document.dispatchEvent(new Event("birthday"));
  });
  $("#tl-clear-examples").addEventListener("click", async () => {
    const ok = await App.ask({ title: "Remove the example messages?", text: "Only the examples go. Real messages from family stay.", yes: "Remove examples" });
    if (!ok) return;
    for (const p of posts.filter(p => p.example)) await Store.remove(p.id);
    load(); App.toast("Examples removed.");
  });

  let first = true;
  document.addEventListener("page:messages", async () => { await load(); if (first) { scrollToEnd(); first = false; } });
  window.Timeline = { birthday, ageAt };
})();
