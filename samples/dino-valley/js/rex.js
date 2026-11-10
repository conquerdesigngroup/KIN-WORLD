/* Rex, Logan's T-Rex guide. Pure SVG so it stays crisp and can be recolored. */
(function () {
  const INK = "#1b3418";

  function rexSVG(opts) {
    opts = opts || {};
    const c = Object.assign({ skin: "#62c454", shade: "#3f9a3a", belly: "#f6e7b0", blush: "#ff8a7a", spot: "#4aa843" }, opts.colors || {});
    const id = "r" + Math.random().toString(36).slice(2, 7);
    const mix = (h, w, k) => { const a = parseInt(h.slice(1), 16), b = parseInt(w.slice(1), 16); const ch = sh => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k); return "#" + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1); };
    const hi = c.skin.length === 7 ? mix(c.skin, "#ffffff", .38) : c.skin;
    const lo = c.shade.length === 7 ? mix(c.shade, "#000000", .12) : c.shade;
    const S = `url(#${id}-skin)`, B = `url(#${id}-belly)`, D = `url(#${id}-shade)`;
    const teeth = [236, 252, 268, 284].map(x => `<path d="M${x} ${(100 + (302 - x) * 0.19).toFixed(1)} l5 8 l5 -9 z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join("");
    const lowTeeth = [236, 254, 272].map(x => `<path d="M${x} ${(112 - (x - 194) * 0.077).toFixed(1)} l5 -8 l5 8 z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join("");
    return `
<svg class="rex ${opts.cls || ""}" viewBox="0 0 320 280" role="img" aria-label="${opts.label || "Rex the T-Rex"}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="${id}-eye"><circle cx="255" cy="58" r="13"/></clipPath>
    <radialGradient id="${id}-skin" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${c.skin}"/><stop offset="1" stop-color="${lo}"/></radialGradient>
    <radialGradient id="${id}-shade" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="${c.shade}"/><stop offset="1" stop-color="${lo}"/></radialGradient>
    <radialGradient id="${id}-belly" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="${c.belly}"/><stop offset="1" stop-color="${c.belly}" stop-opacity=".85"/></radialGradient>
  </defs>
  <g class="rex-all" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <ellipse class="rex-shadow" cx="150" cy="268" rx="110" ry="9" fill="rgba(0,0,0,.18)" stroke="none"/>
    <g class="rex-tail">
      <path d="M118 150 C 80 140, 40 148, 6 112 C 26 168, 78 196, 132 190 Z" fill="${S}"/>
      <path d="M58 150 q8 -6 16 0 M86 160 q8 -6 16 0" fill="none" stroke="${c.shade}" stroke-width="5"/>
    </g>
    <g class="rex-leg-back">
      <ellipse cx="112" cy="198" rx="26" ry="36" fill="${D}"/>
      <path d="M92 228 h44 v18 c0 8 -6 12 -14 12 h-36 c-8 0 -10 -6 -8 -12 z" fill="${c.shade}"/>
    </g>
    <g class="rex-body">
      <path d="M94 172 C 88 110, 150 84, 200 104 C 236 120, 236 182, 200 206 C 160 232, 100 226, 94 172 Z" fill="${S}"/>
      <ellipse cx="140" cy="128" rx="34" ry="16" fill="#fff" opacity=".22" stroke="none" transform="rotate(-20 140 128)"/>
      <path d="M190 122 C 214 142, 214 186, 186 206 C 168 190, 174 146, 190 122 Z" fill="${B}" stroke-width="3"/>
      <ellipse cx="150" cy="118" rx="9" ry="6" fill="${c.spot}" stroke="none"/>
      <ellipse cx="172" cy="108" rx="7" ry="5" fill="${c.spot}" stroke="none"/>
      <ellipse cx="126" cy="138" rx="8" ry="6" fill="${c.spot}" stroke="none"/>
      <ellipse cx="140" cy="160" rx="6" ry="4" fill="${c.spot}" stroke="none"/>
      <g class="rex-arm">
        <path d="M204 146 C 224 144, 236 152, 233 164 L 226 166 C 223 158, 216 156, 208 158 Z" fill="${c.skin}" stroke-width="3"/>
        <path d="M232 162 l6 3 M228 166 l4 5" stroke-width="3"/>
      </g>
    </g>
    <g class="rex-leg-front">
      <ellipse cx="152" cy="200" rx="33" ry="40" fill="${S}"/>
      <path d="M140 226 h34 v20 c10 0 18 4 18 10 c0 6 -4 8 -10 8 h-50 c-8 0 -10 -6 -6 -12 z" fill="${c.skin}"/>
      <path d="M182 258 l8 3 M170 262 l6 4 M158 262 l5 4" stroke="#fff" stroke-width="3"/>
    </g>
    <g class="rex-head">
      <path class="rex-mouth" d="M200 106 L298 96 L292 128 L212 132 Z" fill="#7a1f2b"/>
      <path d="M212 120 q30 10 60 0" fill="none" stroke="#e85d75" stroke-width="7"/>
      <g class="rex-jaw">
        ${lowTeeth}
        <path d="M194 110 C 230 112, 270 108, 298 102 C 302 120, 282 136, 246 137 C 220 138, 198 130, 194 110 Z" fill="${S}"/>
        <path d="M214 128 q30 6 62 -2" fill="none" stroke="${c.belly}" stroke-width="6"/>
      </g>
      <path d="M186 96 C 180 50, 220 24, 266 29 C 302 33, 314 60, 306 86 L 302 100 C 262 108, 222 112, 196 120 Z" fill="${S}"/>
      <ellipse cx="236" cy="44" rx="26" ry="9" fill="#fff" opacity=".28" stroke="none" transform="rotate(-12 236 44)"/>
      <path d="M200 70 q10 -10 22 -6 M214 50 q8 -8 18 -4" fill="none" stroke="${c.shade}" stroke-width="5"/>
      ${teeth}
      <ellipse cx="292" cy="61" rx="4" ry="3" fill="${INK}" stroke="none"/>
      <ellipse cx="272" cy="88" rx="11" ry="6" fill="${c.blush}" opacity=".55" stroke="none"/>
      <path d="M246 98 q24 4 50 -4" fill="none" stroke-width="3.5"/>
      <g class="rex-eye">
        <circle cx="255" cy="58" r="13" fill="#fff" stroke-width="3.5"/>
        <g class="rex-pupil"><circle cx="259" cy="59" r="7" fill="${INK}" stroke="none"/><circle cx="262" cy="55" r="2.6" fill="#fff" stroke="none"/></g>
        <g clip-path="url(#${id}-eye)"><rect class="rex-lid" x="240" y="13" width="30" height="30" fill="${c.skin}" stroke="none"/></g>
        <circle cx="255" cy="58" r="13" fill="none" stroke-width="3.5"/>
      </g>
      <path d="M240 38 q14 -8 28 -2" fill="none" stroke-width="4"/>
    </g>
  </g>
</svg>`;
  }

  const BABY_COLORS = [
    { skin: "#62c454", shade: "#3f9a3a", spot: "#4aa843" },
    { skin: "#ff9a4d", shade: "#d9692a", spot: "#f07f35", belly: "#ffe9c2" },
    { skin: "#7ab8ff", shade: "#4b86d6", spot: "#5d9cf0" },
    { skin: "#c48bff", shade: "#9257d6", spot: "#a96df0" },
    { skin: "#ffd447", shade: "#d6a51e", spot: "#ecbd2c" },
    { skin: "#ff7fae", shade: "#d9507f", spot: "#f0689a", belly: "#ffe3ee" }
  ];

  window.Rex = { svg: rexSVG, BABY_COLORS };
})();
