/* All about Logan: favorites, a growth chart measured against a T-Rex, and the dino facts Logan knows. */
(function () {
  const $ = s => document.querySelector(s);
  const K = KIN;
  const REX_HIP_IN = 144; // a grown T-Rex stood about 12 feet tall at the hip
  let editing = false;
  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const favs = () => Prefs.get("favorites", null) || K.about.favorites;
  const heights = () => (Prefs.get("heights", null) || K.about.heights).slice().sort((a, b) => a.date.localeCompare(b.date));

  function ageLine() {
    const b = Timeline.birthday(); if (!b) return "";
    const a = Timeline.ageAt(Date.now());
    const d = new Date(b + "T12:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    return a == null ? "" : ` I was born on ${d}, so I'm ${a === 0 ? "a brand new dino" : a + " years old"}.`;
  }

  function paint() {
    const kid = App.kid(), owner = App.role() === "owner";
    $("#about-edit").hidden = !owner;
    $("#about-edit").textContent = editing ? "Save" : "Edit";
    const hs = heights();
    const example = !hs.length;
    const shown = example ? [{ date: "", inches: 38 }] : hs.slice(-4);
    const latest = shown[shown.length - 1].inches;
    const max = 150;
    const ticks = [0, 36, 72, 108, 144].map(v => `<span style="bottom:${v / max * 100}%">${v / 12} ft</span>`).join("");
    const bars = shown.map(h => {
      const label = h.date ? new Date(h.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Example";
      return `<div class="bar" style="height:${h.inches / max * 100}%"><span>${h.inches} in<br>${esc(label)}</span></div>`;
    }).join("");
    const times = (REX_HIP_IN / latest).toFixed(1);

    $("#about-body").innerHTML = `
      <div class="about-hero">
        <button class="rex-btn rex-mini" type="button" id="about-rex" aria-label="Rex. Tap to roar.">${Rex.svg({ colors: { skin: "#ff9a4d", shade: "#d9692a", spot: "#f07f35", belly: "#ffe9c2" }, label: "Rex, in Logan's favorite color" })}</button>
        <div class="about-hero-text">
          <h3>Hi, I'm ${esc(kid)}!</h3>
          <p>I love dinosaurs, and my best friend is a T-Rex named ${esc(K.mascot.name)}.${esc(ageLine())}</p>
        </div>
      </div>
      <section class="panel">
        <h4>My favorite things</h4>
        <dl class="favs">${favs().map((f, i) => `<div class="fav"><dt>${esc(f.label)}</dt><dd data-i="${i}" ${editing ? 'contenteditable="true"' : ""}>${esc(f.value)}</dd></div>`).join("")}</dl>
      </section>
      <section class="panel">
        <h4>How big am I?</h4>
        <div class="ruler" role="img" aria-label="${esc(kid)} is ${latest} inches tall. A T-Rex stood about 144 inches tall at the hip.">
          <div class="ruler-scale" aria-hidden="true">${ticks}</div>
          ${bars}
          <div class="bar rex-leg" style="height:${REX_HIP_IN / max * 100}%"><span>T-Rex hip<br>12 ft</span></div>
        </div>
        <p class="measure-note">${example ? `Example height. ` : ""}${esc(kid)} is ${latest} inches tall. A T-Rex stood about 12 feet tall at the hip. That's ${times} ${esc(kid)}s stacked up!</p>
        ${owner ? `<form class="height-form" id="height-form">
          <label class="field"><span>Date</span><input type="date" id="h-date" required value="${new Date().toISOString().slice(0, 10)}"></label>
          <label class="field"><span>Height (inches)</span><input type="number" id="h-in" min="10" max="90" step="0.5" required></label>
          <button class="btn" type="submit">Add height</button>
        </form>` : ""}
      </section>
      <section class="panel about-wide">
        <h4>T-Rex facts I know</h4>
        <ul class="facts">
          <li><b>40 ft</b><span>How long a grown T-Rex was, nose to tail. About as long as a school bus.</span></li>
          <li><b>12 in</b><span>The biggest T-Rex teeth, root and all. As long as a banana.</span></li>
          <li><b>2</b><span>Fingers on each of a T-Rex's tiny arms.</span></li>
          <li><b>66 mya</b><span>T-Rex lived around 68 to 66 million years ago, at the very end of the age of dinosaurs.</span></li>
        </ul>
      </section>`;

    $("#about-rex").onclick = () => {
      const svg = $("#about-rex svg"); svg.classList.add("roaring"); Sound.roar(.8); Scene.shake(8);
      setTimeout(() => svg.classList.remove("roaring"), 800);
    };
    const hf = $("#height-form");
    if (hf) hf.onsubmit = e => {
      e.preventDefault();
      const inches = parseFloat($("#h-in").value), date = $("#h-date").value;
      if (!date || !(inches > 0)) return;
      const list = heights().filter(h => h.date !== date); list.push({ date, inches });
      Prefs.set("heights", list); paint(); App.toast("Height added.");
    };
  }

  $("#about-edit").addEventListener("click", () => {
    if (editing) {
      const list = favs().map((f, i) => {
        const dd = document.querySelector(`.fav dd[data-i="${i}"]`);
        return { label: f.label, value: dd ? dd.textContent.trim() || f.value : f.value };
      });
      Prefs.set("favorites", list); App.toast("Saved.");
    }
    editing = !editing; paint();
    if (editing) { const d = document.querySelector('.fav dd[contenteditable]'); d && d.focus(); }
  });
  document.addEventListener("page:about", () => { editing = false; paint(); });
  document.addEventListener("birthday", () => { if (!$("#page-about").hidden) paint(); });
})();
