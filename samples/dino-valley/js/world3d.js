/* Logan's World in 3D: a sunny prehistoric valley with Rex, a cartoon T-Rex who walks where you tap,
   leaves footprints, looks at you, blinks and roars. Built with three.js; falls back to the 2D scene. */
(function () {
  if (!window.THREE) return;
  const T = THREE;
  let renderer;
  try {
    const cv = document.createElement("canvas");
    cv.id = "world"; cv.setAttribute("aria-hidden", "true");
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
    document.body.prepend(cv);
  } catch (e) { return; }
  document.body.classList.add("webgl");

  T.ColorManagement.legacyMode = false;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new T.Scene();
  const HORIZON = new T.Color("#cfeedd");
  scene.fog = new T.Fog(HORIZON, 70, 280);
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 400);

  /* ---------- helpers ---------- */
  const mats = {};
  function mat(hex, o) {
    const k = hex + JSON.stringify(o || {});
    if (!mats[k]) mats[k] = new T.MeshStandardMaterial(Object.assign({ color: hex, roughness: .62, metalness: 0 }, o || {}));
    return mats[k];
  }
  const SPH = new T.SphereGeometry(1, 26, 18);
  const SPH_LO = new T.SphereGeometry(1, 14, 10);
  const SPH_TINY = new T.SphereGeometry(1, 8, 6);
  function blob(m, x, y, z, sx, sy, sz, parent, geo) {
    const big = Math.max(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    const me = new T.Mesh(geo || (big < .12 ? SPH_TINY : big < .35 ? SPH_LO : SPH), m);
    me.position.set(x, y, z); me.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    me.castShadow = true; me.receiveShadow = true;
    parent && parent.add(me);
    return me;
  }
  function cone(m, r, h, parent) {
    const me = new T.Mesh(new T.ConeGeometry(r, h, 14), m);
    me.castShadow = true; parent && parent.add(me); return me;
  }
  // value noise for terrain
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y) => noise(x, y) * .6 + noise(x * 2.1, y * 2.1) * .28 + noise(x * 4.3, y * 4.3) * .12;
  const POND = { x: 5.4, z: 4.4, r: 1.9 };
  function heightAt(x, z) {
    const d = Math.hypot(x, z + 4);
    const rise = Math.max(0, d - 16) / 14;
    const pd = Math.hypot(x - POND.x, z - POND.z) / (POND.r + .6);
    const dip = pd < 1 ? (1 - pd * pd) * .7 : 0;
    return fbm(x * .05 + 10, z * .05 + 3) * 2.4 * Math.min(1, rise * rise) * 6 + (fbm(x * .2, z * .2) - .5) * .25 - dip;
  }

  /* ---------- sky ---------- */
  const skyGeo = new T.SphereGeometry(300, 32, 16);
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new T.Color("#2fa8c4") }, mid: { value: new T.Color("#8fd6d0") }, bot: { value: HORIZON.clone() } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.7, h)) : mix(bot, mid, smoothstep(-0.02, 0.18, h)); gl_FragColor = vec4(c, 1.0); }"
  });
  scene.add(new T.Mesh(skyGeo, skyMat));

  /* ---------- light ---------- */
  scene.add(new T.HemisphereLight("#cfeeff", "#4e7a34", .75));
  const sun = new T.DirectionalLight("#fff0d2", 1.75);
  sun.position.set(14, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -10, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 4;
  scene.add(sun);
  const rim = new T.DirectionalLight("#bfe9ff", .7); rim.position.set(-12, 8, -10); scene.add(rim);
  const sunDisc = new T.Mesh(new T.CircleGeometry(9, 32), new T.MeshBasicMaterial({ color: "#fff7da", fog: false }));
  sunDisc.position.set(70, 70, -230); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);

  /* ---------- ground ---------- */
  const groundGeo = new T.PlaneGeometry(260, 260, 160, 160);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position, colors = [];
  const cA = new T.Color("#3f9a35"), cB = new T.Color("#62b444"), cDirt = new T.Color("#b8894f"), cHill = new T.Color("#2f7f3c"), tmp = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = heightAt(x, z);
    pos.setY(i, h);
    const n = fbm(x * .15, z * .15);
    tmp.copy(cA).lerp(cB, n);
    const path = Math.exp(-Math.pow((z - 1.6 - Math.sin(x * .18) * 1.2) / 1.3, 2)) * (Math.abs(x) < 26 ? 1 : 0);
    tmp.lerp(cDirt, path * .75);
    tmp.lerp(cHill, Math.min(1, h / 8));
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  groundGeo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new T.Mesh(groundGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: .95 }));
  ground.receiveShadow = true; scene.add(ground);

  /* ---------- volcano ---------- */
  const volcano = new T.Group(); volcano.position.set(-46, 0, -120); scene.add(volcano);
  const vGeo = new T.CylinderGeometry(5, 26, 30, 48, 12, true);
  const vp = vGeo.attributes.position;
  for (let i = 0; i < vp.count; i++) {
    const x = vp.getX(i), y = vp.getY(i), z = vp.getZ(i), a = Math.atan2(z, x);
    const k = 1 + (noise(a * 3 + 5, y * .15) - .5) * .18;
    vp.setX(i, x * k); vp.setZ(i, z * k);
  }
  vGeo.computeVertexNormals();
  const vMesh = new T.Mesh(vGeo, mat("#8a7290", { roughness: .9 })); vMesh.position.y = 15; vMesh.castShadow = true; volcano.add(vMesh);
  const lava = new T.Mesh(new T.CircleGeometry(5.2, 32), new T.MeshStandardMaterial({ color: "#ff7a2f", emissive: "#ff5a1a", emissiveIntensity: 1.4 }));
  lava.rotation.x = -Math.PI / 2; lava.position.y = 29.6; volcano.add(lava);
  [[.3, 1], [2.1, .8], [4, .9]].forEach(([a, s]) => {
    const st = new T.Mesh(new T.CylinderGeometry(.4 * s, 1.6 * s, 12, 8), new T.MeshStandardMaterial({ color: "#ff8a3d", emissive: "#ff5a1a", emissiveIntensity: 1 }));
    const r = 8.5; st.position.set(Math.cos(a) * r, 24, Math.sin(a) * r); st.lookAt(Math.cos(a) * 30, -10, Math.sin(a) * 30); st.rotateX(Math.PI / 2);
    volcano.add(st);
  });
  const puffs = [];
  const puffMat = new T.MeshStandardMaterial({ color: "#f3f0f6", roughness: 1, transparent: true, opacity: .9 });
  function addPuff() {
    const p = blob(puffMat.clone(), (Math.random() - .5) * 3, 31, (Math.random() - .5) * 3, 2 + Math.random() * 1.5, null, null, volcano, SPH_LO);
    p.castShadow = false; p.userData = { life: 1, vy: 2 + Math.random(), vx: 1 + Math.random() * .8 };
    puffs.push(p);
  }
  for (let i = 0; i < 10; i++) { addPuff(); const p = puffs[i]; p.userData.life = 1 - i / 10; p.position.y += i * 2.4; p.position.x += i * 1.2; }

  /* ---------- clouds ---------- */
  const clouds = [];
  const cloudMat = new T.MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#ffffff", emissiveIntensity: .18 });
  for (let i = 0; i < 7; i++) {
    const g = new T.Group();
    const n = 4 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) blob(cloudMat, (k - n / 2) * 2.2 + Math.random(), Math.random() * 1.2, Math.random() * 1.5, 1.8 + Math.random() * 1.4, null, null, g, SPH_LO).castShadow = false;
    g.position.set(-90 + i * 30 + Math.random() * 10, 34 + Math.random() * 16, -90 - Math.random() * 40);
    g.userData.v = .6 + Math.random() * .6;
    scene.add(g); clouds.push(g);
  }

  /* ---------- palms, bushes, rocks ---------- */
  const leafMat = mat("#3f9a3c", { roughness: .7 }), leafMat2 = mat("#57b04a", { roughness: .7 });
  const trunkA = mat("#9b6b3f", { roughness: .85 }), trunkB = mat("#7e5330", { roughness: .85 });
  const palms = [];
  function palm(x, z, s, lean) {
    const g = new T.Group(); g.position.set(x, heightAt(x, z), z); g.scale.setScalar(s);
    let px = 0, py = 0;
    for (let i = 0; i < 9; i++) {
      const seg = new T.Mesh(new T.CylinderGeometry(.26 - i * .012, .32 - i * .012, .62, 10), i % 2 ? trunkA : trunkB);
      px = Math.sin(i / 9 * 1.2) * lean; py = i * .58 + .3;
      seg.position.set(px, py, 0); seg.rotation.z = -lean * .12;
      seg.castShadow = true; g.add(seg);
    }
    const top = new T.Group(); top.position.set(px, py + .3, 0); g.add(top);
    for (let i = 0; i < 8; i++) {
      const arm = new T.Group(); arm.rotation.y = i / 8 * Math.PI * 2 + Math.random() * .3; top.add(arm);
      const droop = new T.Group(); droop.rotation.z = -.35 - Math.random() * .25; arm.add(droop);
      for (let k = 0; k < 4; k++) {
        const leaf = blob(k % 2 ? leafMat : leafMat2, .55 + k * .55, -k * k * .07, 0, .5, .07, .26 - k * .03, droop);
        leaf.rotation.z = -k * .16;
      }
    }
    for (let i = 0; i < 3; i++) blob(mat("#6b4a2a"), Math.cos(i * 2.1) * .28, -.15, Math.sin(i * 2.1) * .28, .2, null, null, top);
    g.userData.top = top; g.userData.ph = Math.random() * 6;
    scene.add(g); palms.push(g);
  }
  [[-11, -6, 1.15, 1.2], [-7.5, -11, .95, -.8], [9.5, -7, 1.2, -1.1], [13, -12, 1, .9], [-16, -14, 1.3, .6], [5, -16, 1.05, .5], [-3, -20, 1.1, -.6], [19, -4, 1.2, -1], [-19, -3, 1.1, 1]].forEach(a => palm(...a));

  function bush(x, z, s) {
    const g = new T.Group(); g.position.set(x, heightAt(x, z), z); g.scale.setScalar(s);
    blob(leafMat, 0, .55, 0, .8, .65, .8, g); blob(leafMat2, .6, .45, .2, .6, .5, .6, g); blob(leafMat2, -.55, .4, -.1, .55, .45, .55, g); blob(leafMat, .1, .9, -.2, .5, null, null, g);
    scene.add(g);
  }
  [[-6.5, -3, 1], [7, -3.5, .9], [-9, 1.5, .8], [10.5, 1, 1.1], [3, -8, .8], [-4, -9, .9], [14, -2, 1.2], [-14, -1, 1.1]].forEach(a => bush(...a));

  const rockMat = mat("#a9a49a", { roughness: .9, flatShading: true });
  function rock(x, z, s) {
    const r = new T.Mesh(new T.DodecahedronGeometry(1, 0), rockMat);
    r.position.set(x, heightAt(x, z) + s * .35, z); r.scale.set(s * 1.2, s * .7, s); r.rotation.set(Math.random(), Math.random() * 3, 0);
    r.castShadow = r.receiveShadow = true; scene.add(r);
  }
  [[5.5, 3.5, .5], [-7.5, 4, .7], [8.5, -1.5, .45], [-2.5, -6, .4], [11, 4, .8]].forEach(a => rock(...a));

  // a nest with eggs
  const nest = new T.Group(); nest.position.set(6.3, heightAt(6.3, .2), .2); scene.add(nest);
  const nestMesh = new T.Mesh(new T.TorusGeometry(.95, .38, 12, 28), mat("#a07a45", { roughness: 1 }));
  nestMesh.rotation.x = -Math.PI / 2; nestMesh.position.y = .25; nestMesh.castShadow = nestMesh.receiveShadow = true; nest.add(nestMesh);
  const eggs = [["#fff4da", -.32, .05], ["#d8f2b6", .3, -.15], ["#ffd9e6", .05, .38]].map(([c, x, z]) => {
    const e = blob(mat(c, { roughness: .45 }), x, .55, z, .34, .45, .34, nest); e.userData.egg = true; return e;
  });

  /* ---------- pterosaur ---------- */
  const ptero = new T.Group(); scene.add(ptero);
  const pMat = mat("#c46a3c"), wMat = new T.MeshStandardMaterial({ color: "#e79a5c", roughness: .7, side: T.DoubleSide });
  blob(pMat, 0, 0, 0, .9, .3, .3, ptero); blob(pMat, .9, .15, 0, .35, .25, .25, ptero);
  const beak = cone(mat("#f2c26b"), .12, .9, ptero); beak.rotation.z = -Math.PI / 2; beak.position.set(1.5, .12, 0);
  const crest = cone(pMat, .1, .7, ptero); crest.rotation.z = Math.PI / 2 + .4; crest.position.set(.55, .35, 0);
  const wingShape = new T.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(.6, 0); wingShape.lineTo(-.4, 3.2); wingShape.lineTo(-.8, 0); wingShape.lineTo(0, 0);
  const wingGeo = new T.ShapeGeometry(wingShape);
  const wL = new T.Mesh(wingGeo, wMat), wR = new T.Mesh(wingGeo, wMat);
  wL.rotation.x = -Math.PI / 2; wR.rotation.x = Math.PI / 2; ptero.add(wL, wR);
  ptero.scale.setScalar(1.2);

  /* ---------- Rex ---------- */
  const INK = "#1d2a1b";
  const white = mat("#ffffff", { roughness: .25 }), ink = mat(INK, { roughness: .3 }), claw = mat("#fff7e6", { roughness: .4 });
  const mouthM = mat("#7a1f2b", { roughness: .7 }), tongueM = mat("#ef6d86", { roughness: .5 }), blush = mat("#ff8c8c", { roughness: .8, transparent: true, opacity: .55 });
  const hit = [];                                               // meshes that count as "tapping Rex"
  function makeRex(C, hitArr) {
  const SKIN = C.skin, SHADE = C.shade, BELLY = C.belly || "#f3e3aa";
  const skin = mat(SKIN, { roughness: .5 }), shade = mat(SHADE, { roughness: .55 }), belly = mat(BELLY, { roughness: .55 });
  const rex = new T.Group();
  const rexBody = new T.Group(); rex.add(rexBody);             // bobs while walking
  const R = (m, x, y, z, sx, sy, sz, p) => { const me = blob(m, x, y, z, sx, sy, sz, p); hitArr && hitArr.push(me); return me; };

  const torso = R(skin, 0, 1.75, 0, 1.3, 1.02, .95, rexBody); torso.rotation.z = .38;
  R(belly, .55, 1.55, 0, .82, .86, .78, rexBody).rotation.z = .3;
  R(skin, .95, 2.45, 0, .62, .66, .58, rexBody);
  // back spots and ridge
  [[-.5, 2.45, .35, .22], [.05, 2.62, -.42, .2], [-.9, 2.1, -.5, .18], [.3, 2.55, .45, .16], [-.2, 2.3, .72, .14]].forEach(([x, y, z, s]) => blob(shade, x, y, z, s, s * .45, s, rexBody).lookAt(x * 2, y * 2, z * 3));
  for (let i = 0; i < 6; i++) { const c = cone(shade, .12, .32, rexBody); c.position.set(.55 - i * .42, 2.78 - Math.pow(i - 1.2, 2) * .07, 0); c.rotation.z = .25 + i * .05; }

  // tail: nested segments so a wave travels down it
  const tailRoot = new T.Group(); tailRoot.position.set(-1.05, 1.75, 0); rexBody.add(tailRoot);
  const tailSegs = []; let parent = tailRoot;
  for (let i = 0; i < 7; i++) {
    const seg = new T.Group(); seg.position.set(i === 0 ? 0 : -.5, i === 0 ? 0 : -.02 + i * .01, 0); parent.add(seg);
    const r = .62 - i * .075;
    R(skin, -.25, 0, 0, .46, r, r, seg);
    if (i % 2 === 0 && i < 6) blob(shade, -.25, r * .82, 0, r * .4, r * .18, r * .4, seg);
    tailSegs.push(seg); parent = seg;
  }

  // legs
  const legs = [];
  [-1, 1].forEach(side => {
    const hip = new T.Group(); hip.position.set(-.1, 1.4, .55 * side); rexBody.add(hip);
    R(skin, .05, -.05, .05 * side, .62, .78, .5, hip);
    const knee = new T.Group(); knee.position.set(.1, -.55, 0); hip.add(knee);
    R(skin, .05, -.32, 0, .3, .42, .3, knee);
    const foot = new T.Group(); foot.position.set(.12, -.72, 0); knee.add(foot);
    R(skin, .25, -.05, 0, .55, .22, .34, foot);
    [-.2, 0, .2].forEach(z => { const c = cone(claw, .07, .22, foot); c.rotation.z = -Math.PI / 2; c.position.set(.82, -.08, z); });
    legs.push({ hip, knee, foot, side });
  });
  // arms
  const arms = [];
  [-1, 1].forEach(side => {
    const sh = new T.Group(); sh.position.set(.95, 1.85, .58 * side); rexBody.add(sh);
    const a = R(skin, .2, -.12, 0, .3, .13, .13, sh); a.rotation.z = -.6;
    const b = R(skin, .38, -.35, 0, .2, .11, .11, sh); b.rotation.z = .4;
    [-.05, .05].forEach(z => { const c = cone(claw, .035, .12, sh); c.position.set(.55, -.38, z); c.rotation.z = -Math.PI / 2; });
    arms.push(sh);
  });

  // head
  const neck = new T.Group(); neck.position.set(1.1, 2.75, 0); rexBody.add(neck);
  const head = new T.Group(); neck.add(head);
  R(skin, .35, .15, 0, 1.0, .74, .76, head);
  R(skin, .98, .02, 0, .72, .52, .62, head);
  R(skin, 1.45, .02, 0, .3, .42, .5, head);
  // eyes
  const eyes = [];
  [-1, 1].forEach(side => {
    const eg = new T.Group(); eg.position.set(.62, .42, .5 * side); head.add(eg);
    blob(white, 0, 0, 0, .31, .34, .22, eg);
    const pupil = blob(ink, .12, 0, .13 * side, .17, .19, .1, eg);
    blob(white, .2, .08, .19 * side, .055, null, null, eg);
    const brow = blob(shade, -.02, .42, .02 * side, .26, .06, .11, eg); brow.rotation.z = .28;
    eyes.push({ g: eg, pupil, side });
    const ch = blob(blush, 1.0, -.08, .48 * side, .18, .1, .06, head); ch.castShadow = false;
    blob(ink, 1.68, .22, .14 * side, .045, .035, .045, head);
  });
  // teeth (upper)
  for (let i = 0; i < 5; i++) [-1, 1].forEach(side => {
    const t = cone(white, .055, .16, head); t.rotation.z = Math.PI;
    t.position.set(.72 + i * .19, -.4 + i * .02, (.5 - i * .05) * side);
  });
  // jaw
  const jaw = new T.Group(); jaw.position.set(.15, -.25, 0); head.add(jaw);
  blob(mouthM, .72, .02, 0, .72, .2, .44, jaw);
  blob(tongueM, .62, .08, 0, .45, .1, .26, jaw);
  R(skin, .7, -.13, 0, .8, .26, .54, jaw);
  blob(belly, .62, -.2, 0, .66, .15, .42, jaw);
  for (let i = 0; i < 4; i++) [-1, 1].forEach(side => {
    const t = cone(white, .045, .13, jaw); t.position.set(.6 + i * .21, .1, (.42 - i * .05) * side);
  });

  rex.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { rex, rexBody, tailSegs, legs, arms, neck, head, eyes, jaw };
  }
  const { rex, rexBody, tailSegs, legs, arms, neck, head, eyes, jaw } = makeRex({ skin: "#4fb03f", shade: "#2f8a2f" }, hit);
  scene.add(rex);

  /* ---------- footprints ---------- */
  const printMat = new T.MeshStandardMaterial({ color: "#5a4426", roughness: 1, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const prints = [];
  const toeShape = new T.Shape(); toeShape.moveTo(-.12, 0); toeShape.quadraticCurveTo(0, .75, .12, 0); toeShape.lineTo(-.12, 0);
  const toeGeo = new T.ShapeGeometry(toeShape), heelGeo = new T.CircleGeometry(.24, 16);
  function footprint(x, z, yaw) {
    const g = new T.Group(); g.position.set(x, heightAt(x, z) + .14, z); g.rotation.y = yaw;
    const m = printMat.clone();
    const heel = new T.Mesh(heelGeo, m); heel.rotation.x = -Math.PI / 2; g.add(heel);
    [-.55, 0, .55].forEach(a => { const t = new T.Mesh(toeGeo, m); t.rotation.x = -Math.PI / 2; t.rotation.z = -Math.PI / 2 + a; t.position.set(Math.cos(a) * .18, 0, -Math.sin(a) * .18); g.add(t); });
    g.userData = { life: 1, m };
    scene.add(g); prints.push(g);
  }

  /* ---------- neighbors & things to tap ---------- */
  const updaters = [], taps = [];
  const onTap = (objs, fn) => taps.push({ objs, fn });
  const sfx = (n, a) => { if (window.Sound && Sound[n]) Sound[n](a); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const seeded = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  function cuteEyes(parent, x, y, z, s, look) {
    const out = [];
    [-1, 1].forEach(side => {
      const g = new T.Group(); g.position.set(x, y, z * side); parent.add(g);
      blob(white, 0, 0, 0, s, s * 1.08, s * .8, g);
      blob(ink, s * .45, 0, s * .35 * side * (look || 1), s * .55, s * .6, s * .4, g);
      blob(white, s * .7, s * .25, s * .5 * side, s * .17, null, null, g);
      out.push(g);
    });
    return out;
  }
  function chain(parent, n, step, make) {
    const segs = []; let p = parent;
    for (let i = 0; i < n; i++) { const g = new T.Group(); if (i) g.position.set(...step(i)); p.add(g); make(g, i); segs.push(g); p = g; }
    return segs;
  }

  // Long-neck family (sauropods) munching on palm tops
  function longNeck(x, z, s, color, spot, ph, yaw) {
    const g = new T.Group(); g.position.set(x, heightAt(x, z), z); g.scale.setScalar(s); g.rotation.y = yaw; scene.add(g);
    const m = mat(color, { roughness: .55 }), ms = mat(spot, { roughness: .6 }), mb = mat("#f4e6c0", { roughness: .6 });
    const parts = [];
    const P = (...a) => { const me = blob(...a); parts.push(me); return me; };
    P(m, 0, 3.2, 0, 2.3, 1.4, 1.3, g);
    P(mb, .3, 2.6, 0, 1.8, .8, 1.05, g);
    [[-.6, 4.3, .6, .35], [.5, 4.45, -.5, .3], [-1.3, 3.9, -.7, .28], [1.1, 4.1, .55, .25], [0, 4.55, 0, .3]].forEach(([a, b, c, r]) => blob(ms, a, b, c, r, r * .35, r, g));
    const legs = [];
    [[1.25, .72], [1.25, -.72], [-1.15, .72], [-1.15, -.72]].forEach(([lx, lz]) => {
      const leg = new T.Group(); leg.position.set(lx, 2.6, lz); g.add(leg);
      const c = new T.Mesh(new T.CylinderGeometry(.42, .5, 2.6, 16), m); c.position.y = -1.3; c.castShadow = true; leg.add(c); parts.push(c);
      blob(mat("#fff7e6"), .35, -2.55, 0, .12, .1, .3, leg);
      legs.push(leg);
    });
    const neck = chain(g, 8, () => [.32, .62, 0], (sg, i) => { const r = .62 - i * .045; P(m, 0, 0, 0, r, r * 1.05, r, sg); if (i % 2) blob(ms, -r * .5, .15, 0, r * .3, r * .25, r * .3, sg); });
    neck[0].position.set(1.8, 3.9, 0);
    const head = new T.Group(); head.position.set(.3, .45, 0); neck[7].add(head);
    P(m, .25, 0, 0, .62, .42, .44, head);
    const eyesL = cuteEyes(head, .32, .22, .32, .14);
    blob(mat("#ff9aa6", { transparent: true, opacity: .6 }), .55, -.1, .36, .12, .07, .05, head);
    blob(mat("#ff9aa6", { transparent: true, opacity: .6 }), .55, -.1, -.36, .12, .07, .05, head);
    const tail = chain(g, 8, i => [-.42, -.08 + (i > 4 ? -.04 : 0), 0], (sg, i) => P(m, 0, 0, 0, .55 - i * .06, .5 - i * .055, .5 - i * .055, sg));
    tail[0].position.set(-2.1, 3.1, 0);
    let munch = 0, blink = rnd(2, 5);
    updaters.push((dt, t) => {
      const eat = (Math.sin(t * .35 + ph) + 1) / 2; // slowly reach down and up
      neck.forEach((n, i) => { n.rotation.z = (i === 0 ? -.05 : -.05 - eat * .06) + Math.sin(t * 1.1 + ph + i * .4) * .02 + (munch > 0 ? Math.sin(t * 20) * .02 : 0); n.rotation.y = Math.sin(t * .4 + ph) * .04; });
      head.rotation.z = -.2 - eat * .3;
      tail.forEach((n, i) => n.rotation.y = Math.sin(t * 1.4 + ph - i * .5) * .1);
      blink -= dt; const lid = blink < .12 ? .1 : 1; if (blink < 0) blink = rnd(2, 5);
      eyesL.forEach(e => e.scale.y = lid);
      munch = Math.max(0, munch - dt);
      g.position.y = heightAt(g.position.x, g.position.z) + (g.userData.hop || 0);
      if (g.userData.hop) { g.userData.vy -= 18 * dt; g.userData.hop = Math.max(0, g.userData.hop + g.userData.vy * dt); if (!g.userData.hop) g.userData.vy = 0; }
    });
    onTap(parts, () => { munch = 1.2; g.userData.vy = 4; g.userData.hop = .01; sfx("hoot"); });
  }
  longNeck(21, -30, 1.3, "#7d8fe6", "#5b6cc8", 0, .7);
  longNeck(15, -31, .75, "#97a6f0", "#6f7fd6", 2, .5);

  // A triceratops that wanders back and forth along the meadow
  (function trike() {
    const g = new T.Group(); scene.add(g);
    const m = mat("#f2a33a", { roughness: .55 }), md = mat("#d97a2a", { roughness: .6 }), mb = mat("#ffe2b0", { roughness: .6 }), horn = mat("#fff4dc", { roughness: .35 });
    const parts = [];
    const P = (...a) => { const me = blob(...a); parts.push(me); return me; };
    const body = new T.Group(); g.add(body);
    P(m, 0, 1.25, 0, 1.55, 1.0, 1.0, body);
    P(mb, .2, .9, 0, 1.2, .55, .78, body);
    [[-.4, 2.05, .3], [.4, 2.1, -.3], [-.9, 1.85, -.5], [.6, 1.9, .55]].forEach(([a, b, c]) => blob(md, a, b, c, .22, .09, .22, body));
    const tail = cone(m, .38, 1.4, body); tail.rotation.z = Math.PI / 2 + .25; tail.position.set(-1.9, 1.15, 0); parts.push(tail);
    const head = new T.Group(); head.position.set(1.45, 1.35, 0); body.add(head);
    P(m, .3, 0, 0, .72, .58, .62, head);
    const beak = cone(md, .26, .6, head); beak.rotation.z = -Math.PI / 2; beak.position.set(1.05, -.15, 0);
    const frill = new T.Mesh(new T.CylinderGeometry(1.05, 1.05, .14, 28), md); frill.rotation.z = Math.PI / 2 - .45; frill.position.set(-.2, .5, 0); frill.castShadow = true; head.add(frill); parts.push(frill);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; blob(m, Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05, .16, .12, .16, frill); }
    [[.45, .5, .26], [.45, .5, -.26]].forEach(([a, b, c]) => { const h = cone(horn, .1, .9, head); h.position.set(a + .3, b + .2, c); h.rotation.z = -Math.PI / 2 + .55; });
    const nh = cone(horn, .08, .35, head); nh.position.set(.95, .2, 0); nh.rotation.z = -.5;
    const eyes = cuteEyes(head, .55, .2, .38, .13);
    const legs = [];
    [[.85, .6], [.85, -.6], [-.85, .6], [-.85, -.6]].forEach(([lx, lz], i) => {
      const leg = new T.Group(); leg.position.set(lx, .9, lz); body.add(leg);
      const c = new T.Mesh(new T.CylinderGeometry(.3, .34, .95, 12), m); c.position.y = -.45; c.castShadow = true; leg.add(c); parts.push(c);
      legs.push({ leg, ph: i === 0 || i === 3 ? 0 : Math.PI });
    });
    const st = { x: -12, dir: 1, ph: 0, vy: 0, hop: 0, pause: 0, blink: 3 };
    g.position.set(st.x, 0, -4.5);
    updaters.push((dt, t) => {
      if (st.pause > 0) st.pause -= dt;
      else {
        st.x += st.dir * dt * 1.1; st.ph += dt * 6;
        if (st.x > -6.5 || st.x < -16) { st.dir *= -1; st.pause = 1.5; }
      }
      const z = -4.5 + Math.sin(st.x * .4) * .6;
      g.position.set(st.x, heightAt(st.x, z) + st.hop, z);
      const want = st.dir > 0 ? 0 : Math.PI;
      g.rotation.y += (want - g.rotation.y) * Math.min(1, dt * 3);
      const walking = st.pause <= 0;
      legs.forEach(l => l.leg.rotation.z = walking ? Math.sin(st.ph + l.ph) * .4 : 0);
      body.position.y = walking ? Math.abs(Math.sin(st.ph)) * .06 : Math.sin(t * 2) * .02;
      head.rotation.z = Math.sin(t * 1.3) * .06 + (st.pause > 0 ? -.15 : 0);
      if (st.hop || st.vy) { st.vy -= 20 * dt; st.hop = Math.max(0, st.hop + st.vy * dt); if (!st.hop) st.vy = 0; }
      st.blink -= dt; eyes.forEach(e => e.scale.y = st.blink < .12 ? .1 : 1); if (st.blink < 0) st.blink = rnd(2, 5);
    });
    onTap(parts, () => { st.vy = 6; st.hop = .01; sfx("grunt"); });
  })();

  // Pond with lily pads, a jumpy frog and ripples
  (function pond() {
    const water = new T.Mesh(new T.CircleGeometry(POND.r + .25, 48), new T.MeshStandardMaterial({ color: "#36b3d6", roughness: .08, metalness: .25, transparent: true, opacity: .9 }));
    water.rotation.x = -Math.PI / 2; water.position.set(POND.x, heightAt(POND.x, POND.z + POND.r + .3) - .1, POND.z); water.receiveShadow = true; scene.add(water);
    const wy = water.position.y;
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, r = POND.r + .45 + Math.random() * .15;
      const st = new T.Mesh(new T.DodecahedronGeometry(1, 0), rockMat);
      const s = .22 + Math.random() * .18;
      st.position.set(POND.x + Math.cos(a) * r, wy + s * .3, POND.z + Math.sin(a) * r); st.scale.set(s * 1.3, s * .8, s); st.rotation.y = a;
      st.castShadow = st.receiveShadow = true; scene.add(st);
    }
    const padMat = new T.MeshStandardMaterial({ color: "#4fb04a", roughness: .5, side: T.DoubleSide });
    const pads = [[-.9, -.4], [.7, .5], [.3, -.9], [-.4, .8]].map(([dx, dz]) => {
      const p = new T.Mesh(new T.CircleGeometry(.42, 24, .35, Math.PI * 2 - .7), padMat);
      p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 6; p.position.set(POND.x + dx, wy + .02, POND.z + dz); p.receiveShadow = true; scene.add(p);
      return p;
    });
    const flower = new T.Group(); flower.position.copy(pads[1].position); flower.position.y += .05; scene.add(flower);
    for (let i = 0; i < 6; i++) { const pt = blob(mat("#ffb3d1", { roughness: .4 }), Math.cos(i) * .1, .08, Math.sin(i) * .1, .1, .05, .06, flower); pt.rotation.y = -i; pt.rotation.z = .5; }
    blob(mat("#ffd23f"), 0, .12, 0, .06, null, null, flower);
    // ripples
    const ripples = [];
    function ripple(x, z) {
      const r = new T.Mesh(new T.TorusGeometry(.2, .025, 6, 32), new T.MeshBasicMaterial({ color: "#e8fbff", transparent: true, opacity: .8 }));
      r.rotation.x = -Math.PI / 2; r.position.set(x, wy + .03, z); scene.add(r); ripples.push(r);
    }
    // frog
    const frog = new T.Group(); scene.add(frog);
    const fm = mat("#8fd14f", { roughness: .45 }), fparts = [];
    fparts.push(blob(fm, 0, .22, 0, .34, .24, .3, frog), blob(mat("#e9f7c4"), .12, .16, 0, .24, .15, .24, frog));
    [-1, 1].forEach(sd => { fparts.push(blob(fm, .1, .44, .16 * sd, .12, null, null, frog)); blob(white, .17, .48, .17 * sd, .07, null, null, frog); blob(ink, .22, .49, .18 * sd, .04, null, null, frog); fparts.push(blob(fm, -.15, .1, .26 * sd, .2, .09, .12, frog)); });
    blob(mat("#3c7a2a"), .3, .25, 0, .04, .02, .16, frog);
    let at = 0, hop = null;
    const place = i => { const p = pads[i].position; frog.position.set(p.x, wy + .02, p.z); };
    place(0); frog.rotation.y = .6;
    onTap(fparts, () => {
      if (hop) return;
      const next = (at + 1 + Math.floor(Math.random() * (pads.length - 1))) % pads.length;
      hop = { from: frog.position.clone(), to: pads[next].position.clone(), t: 0, next };
      frog.rotation.y = Math.atan2(-(hop.to.z - hop.from.z), hop.to.x - hop.from.x);
      sfx("ribbit");
    });
    let rippleT = 2;
    updaters.push((dt, t) => {
      if (hop) {
        hop.t = Math.min(1, hop.t + dt * 1.8);
        frog.position.lerpVectors(hop.from, hop.to, hop.t); frog.position.y = wy + .02 + Math.sin(hop.t * Math.PI) * 1.1;
        frog.scale.set(1, 1 + Math.sin(hop.t * Math.PI) * .2, 1);
        if (hop.t >= 1) { at = hop.next; ripple(frog.position.x, frog.position.z); hop = null; }
      } else frog.scale.set(1, 1 + Math.sin(t * 5) * .04, 1);
      rippleT -= dt; if (rippleT < 0) { rippleT = rnd(1.5, 3.5); const a = Math.random() * 6, r = Math.random() * POND.r * .8; ripple(POND.x + Math.cos(a) * r, POND.z + Math.sin(a) * r); }
      for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.scale.multiplyScalar(1 + dt * 1.6); r.material.opacity -= dt * .45; if (r.material.opacity <= 0) { scene.remove(r); r.geometry.dispose(); r.material.dispose(); ripples.splice(i, 1); } }
      pads.forEach((p, i) => p.position.y = wy + .02 + Math.sin(t * 1.5 + i) * .01);
    });
    onTap([water], (h) => { ripple(h.point.x, h.point.z); sfx("bloop"); });
  })();

  // Grass tufts and flowers (instanced so there can be lots of them)
  (function meadow() {
    const spotOK = (x, z) => Math.hypot(x - POND.x, z - POND.z) > POND.r + .9 && Math.hypot(x - 6.3, z - .2) > 1.6;
    const N = 1100, grass = new T.InstancedMesh(new T.ConeGeometry(.06, .38, 4), new T.MeshStandardMaterial({ roughness: .8 }), N);
    const d = new T.Object3D(), c = new T.Color();
    let k = 0;
    while (k < N) {
      const a = seeded() * Math.PI * 2, r = 2 + Math.pow(seeded(), .7) * 24, x = Math.cos(a) * r, z = Math.sin(a) * r * .8 - 2;
      if (!spotOK(x, z)) continue;
      d.position.set(x, heightAt(x, z) + .2, z); d.rotation.set(rnd(-.25, .25), rnd(0, 6), rnd(-.25, .25)); d.scale.setScalar(rnd(.7, 1.4)); d.updateMatrix();
      grass.setMatrixAt(k, d.matrix); grass.setColorAt(k, c.setHSL(.27 + seeded() * .06, .55, .32 + seeded() * .14)); k++;
    }
    grass.receiveShadow = true; scene.add(grass);
    const F = 170, PET = 5;
    const petals = new T.InstancedMesh(new T.SphereGeometry(.09, 8, 6), new T.MeshStandardMaterial({ roughness: .5 }), F * PET);
    const centers = new T.InstancedMesh(new T.SphereGeometry(.06, 8, 6), mat("#ffd23f", { roughness: .5 }), F);
    const stems = new T.InstancedMesh(new T.CylinderGeometry(.015, .02, .4, 4), mat("#3c8a33"), F);
    const cols = ["#ff6fa3", "#ffd23f", "#ffffff", "#b58cff", "#ff8a3d", "#5fc8ff"];
    let f = 0;
    while (f < F) {
      const a = seeded() * Math.PI * 2, r = 2.5 + Math.pow(seeded(), .8) * 18, x = Math.cos(a) * r, z = Math.sin(a) * r * .8 - 1;
      if (!spotOK(x, z)) continue;
      const y = heightAt(x, z), h = rnd(.3, .5);
      d.rotation.set(0, 0, 0); d.scale.set(1, h / .4, 1); d.position.set(x, y + h / 2, z); d.updateMatrix(); stems.setMatrixAt(f, d.matrix);
      d.scale.setScalar(1); d.position.set(x, y + h + .02, z); d.updateMatrix(); centers.setMatrixAt(f, d.matrix);
      c.set(cols[Math.floor(seeded() * cols.length)]);
      for (let p = 0; p < PET; p++) {
        const pa = p / PET * Math.PI * 2;
        d.position.set(x + Math.cos(pa) * .1, y + h, z + Math.sin(pa) * .1); d.scale.set(1, .45, 1); d.updateMatrix();
        petals.setMatrixAt(f * PET + p, d.matrix); petals.setColorAt(f * PET + p, c);
      }
      f++;
    }
    [petals, centers, stems].forEach(m => { m.receiveShadow = true; scene.add(m); });
  })();

  // Toadstools
  [[-3.2, 4.8], [-2.6, 5.3], [8.4, 3.6], [-8.8, -1.8], [2.2, -5.5], [12, 2.5]].forEach(([x, z], i) => {
    const g = new T.Group(); g.position.set(x, heightAt(x, z), z); g.scale.setScalar(rnd(.6, 1)); scene.add(g);
    const stem = new T.Mesh(new T.CylinderGeometry(.13, .17, .45, 12), mat("#fff4e0", { roughness: .6 })); stem.position.y = .22; stem.castShadow = true; g.add(stem);
    const cap = new T.Mesh(new T.SphereGeometry(.38, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(i % 2 ? "#ff4b3e" : "#ff7a2f", { roughness: .4 })); cap.position.y = .4; cap.scale.y = .8; cap.castShadow = true; g.add(cap);
    for (let k = 0; k < 6; k++) { const a = k * 1.1, el = .5 + (k % 3) * .25; blob(white, Math.cos(a) * Math.cos(el) * .37, .4 + Math.sin(el) * .3, Math.sin(a) * Math.cos(el) * .37, .06, .03, .06, g); }
    onTap([cap, stem], () => { g.userData.squish = 1; sfx("pop", 700 + i * 60); });
    updaters.push(dt => { const s = g.userData.squish || 0; g.scale.y = g.scale.x * (1 - Math.sin(s * Math.PI * 3) * .25 * s); g.userData.squish = Math.max(0, s - dt * 1.5); });
  });

  // Butterflies
  const flutter = [];
  ["#ff7ab6", "#ffd23f", "#7ad3ff", "#b58cff", "#ff9d3c", "#ffffff"].forEach((col, i) => {
    const g = new T.Group(); scene.add(g);
    const wm = new T.MeshStandardMaterial({ color: col, roughness: .5, side: T.DoubleSide, emissive: col, emissiveIntensity: .15 });
    const wg = new T.CircleGeometry(.22, 16); wg.scale(1, .75, 1);
    const L = new T.Group(), Rw = new T.Group(); g.add(L, Rw);
    const wl = new T.Mesh(wg, wm); wl.position.z = .2; wl.rotation.x = -Math.PI / 2; L.add(wl);
    const wr = new T.Mesh(wg, wm); wr.position.z = -.2; wr.rotation.x = -Math.PI / 2; Rw.add(wr);
    blob(ink, 0, 0, 0, .14, .035, .035, g);
    const c = new T.Vector3(rnd(-10, 10), 0, rnd(-6, 6)), u = { c, ph: rnd(0, 6), sp: rnd(.4, .7), boost: 0 };
    flutter.push({ g, L, Rw, u });
    onTap([wl, wr], () => { u.boost = 2.5; sfx("pop", 1500); });
  });
  updaters.push((dt, t) => flutter.forEach(({ g, L, Rw, u }) => {
    u.boost = Math.max(0, u.boost - dt);
    const sp = u.sp * (1 + u.boost), a = t * sp + u.ph;
    const x = u.c.x + Math.sin(a) * 3, z = u.c.z + Math.sin(a * 1.7) * 2;
    const y = heightAt(x, z) + 1.4 + Math.sin(a * 3) * .4 + u.boost * .6;
    const prev = g.position.clone(); g.position.set(x, y, z);
    g.rotation.y = Math.atan2(-(z - prev.z), x - prev.x);
    const f = Math.sin(t * (18 + u.boost * 10) + u.ph) * .9;
    L.rotation.x = f; Rw.rotation.x = -f;
  }));

  // Wooden name sign
  (function sign() {
    const g = new T.Group(); const x = 7.4, z = -3.6; g.position.set(x, heightAt(x, z), z); g.rotation.y = -.45; scene.add(g);
    const wood = mat("#9a6a3a", { roughness: .85 }), dark = mat("#6e4826", { roughness: .9 });
    [-1.35, 1.35].forEach(px => { const p = new T.Mesh(new T.CylinderGeometry(.13, .15, 2.4, 10), dark); p.position.set(px, 1.2, 0); p.castShadow = true; g.add(p); });
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 360;
    const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    function paint() {
      const c = cv.getContext("2d");
      c.fillStyle = "#b07b45"; c.fillRect(0, 0, 1024, 360);
      for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? "rgba(90,55,25,.18)" : "rgba(255,230,190,.10)"; c.fillRect(0, i * 40, 1024, 22); }
      c.strokeStyle = "#5a3a1c"; c.lineWidth = 18; c.strokeRect(9, 9, 1006, 342);
      const name = ((window.KIN && KIN.kid.first) || "Logan").toUpperCase() + "'S WORLD";
      c.font = "130px 'Luckiest Guy', 'Arial Black', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      let size = 130; while (c.measureText(name).width > 900 && size > 60) { size -= 6; c.font = size + "px 'Luckiest Guy', 'Arial Black', sans-serif"; }
      c.lineWidth = 16; c.strokeStyle = "#3b2410"; c.strokeText(name, 512, 168);
      c.fillStyle = "#ff8a3d"; c.fillText(name, 512, 168);
      c.fillStyle = "rgba(59,36,16,.55)"; c.font = "bold 40px Nunito, sans-serif"; c.fillText("Dinosaurs welcome", 512, 290);
      tex.needsUpdate = true;
    }
    paint(); if (document.fonts) document.fonts.ready.then(paint);
    const board = new T.Mesh(new T.BoxGeometry(3.2, 1.12, .16), [wood, wood, wood, wood, new T.MeshStandardMaterial({ map: tex, roughness: .8 }), wood]);
    board.position.y = 1.85; board.castShadow = true; g.add(board);
    onTap([board], () => { g.userData.wob = 1; sfx("thunk"); });
    updaters.push((dt, t) => { const w = g.userData.wob || 0; board.rotation.z = Math.sin(t * 18) * .08 * w; g.userData.wob = Math.max(0, w - dt * 1.2); });
  })();

  // Volcano eruptions (now and then, or when tapped)
  const blobsLava = [];
  const lavaMat = new T.MeshStandardMaterial({ color: "#ff7a2f", emissive: "#ff4d0d", emissiveIntensity: 1.6, roughness: .4 });
  function erupt() {
    for (let i = 0; i < 18; i++) {
      const b = blob(lavaMat, rnd(-2, 2), 30, rnd(-2, 2), rnd(.6, 1.3), null, null, volcano, SPH_LO);
      b.castShadow = false; b.userData = { v: new T.Vector3(rnd(-6, 6), rnd(14, 24), rnd(-6, 6)) }; blobsLava.push(b);
    }
    for (let i = 0; i < 5; i++) addPuff();
    state.shake = Math.max(state.shake, .12); sfx("rumble");
  }
  let eruptT = 9;
  updaters.push(dt => {
    eruptT -= dt; if (eruptT < 0) { eruptT = rnd(16, 26); erupt(); }
    for (let i = blobsLava.length - 1; i >= 0; i--) {
      const b = blobsLava[i]; b.userData.v.y -= 22 * dt; b.position.addScaledVector(b.userData.v, dt);
      if (b.position.y < 8) { volcano.remove(b); blobsLava.splice(i, 1); }
    }
  });
  onTap([vMesh, lava], erupt);

  // Coconuts fall when you tap a palm
  const nuts = [];
  palms.forEach(p => {
    const meshes = []; p.traverse(o => o.isMesh && meshes.push(o));
    onTap(meshes, () => {
      const top = new T.Vector3(); p.userData.top.getWorldPosition(top);
      const n = blob(mat("#6b4a2a"), top.x + rnd(-.3, .3), top.y - .2, top.z + rnd(-.3, .3), .22 * p.scale.x, null, null, scene);
      n.userData = { vy: 0, vx: rnd(-1, 1), vz: rnd(-.5, 1.5), life: 7, b: 0 }; nuts.push(n);
      p.userData.shake = 1; sfx("pop", 250);
    });
    updaters.push((dt, t) => { const s = p.userData.shake || 0; if (s) { p.rotation.z = Math.sin(t * 30) * .03 * s; p.userData.shake = Math.max(0, s - dt * 2); } });
  });
  updaters.push(dt => {
    for (let i = nuts.length - 1; i >= 0; i--) {
      const n = nuts[i], u = n.userData; u.life -= dt;
      u.vy -= 20 * dt; n.position.x += u.vx * dt; n.position.z += u.vz * dt; n.position.y += u.vy * dt;
      const gy = heightAt(n.position.x, n.position.z) + n.scale.y;
      if (n.position.y < gy) { n.position.y = gy; if (Math.abs(u.vy) > 2) { u.vy *= -.45; u.b++; if (u.b < 3) sfx("thunk"); } else { u.vy = 0; u.vx *= .96; u.vz *= .96; } }
      n.rotation.x += u.vz * dt * 3; n.rotation.z -= u.vx * dt * 3;
      if (u.life < 0) { n.scale.multiplyScalar(.9); if (n.scale.x < .02) { scene.remove(n); nuts.splice(i, 1); } }
    }
  });

  // Nest eggs: tap three times and a baby dino hatches and plays
  const BABY = [{ skin: "#ff9a4d", shade: "#d9692a" }, { skin: "#7ab8ff", shade: "#4b86d6" }, { skin: "#c48bff", shade: "#9257d6" }, { skin: "#ffd447", shade: "#d6a51e" }, { skin: "#ff7fae", shade: "#d9507f" }];
  const babies = [];
  eggs.forEach(egg => {
    egg.userData.hits = 0; egg.userData.home = egg.position.clone();
    onTap([egg], () => {
      if (!egg.visible) return;
      egg.userData.wobble = 1; sfx("crack");
      if (++egg.userData.hits < 3) return;
      egg.visible = false; egg.userData.hits = 0;
      const wp = new T.Vector3(); egg.getWorldPosition(wp);
      for (let i = 0; i < 7; i++) {
        const sh = blob(egg.material, wp.x, wp.y, wp.z, .1, .06, .1, scene, SPH_LO);
        sh.userData = { vy: rnd(3, 5), vx: rnd(-2, 2), vz: rnd(-2, 2), life: 1.2, b: 3 }; nuts.push(sh);
      }
      const b = makeRex(BABY[Math.floor(Math.random() * BABY.length)]);
      b.rex.scale.setScalar(.01); b.rex.position.copy(wp); scene.add(b.rex);
      babies.push({ b, egg, t: 0, life: 14, target: wp.clone(), yaw: rnd(0, 6), hop: 0, vy: 5 });
      sfx("pop", 800); setTimeout(() => sfx("roar", .4), 250);
    });
  });
  updaters.push((dt, t) => {
    for (let i = babies.length - 1; i >= 0; i--) {
      const k = babies[i], r = k.b.rex; k.t += dt; k.life -= dt;
      const s = Math.min(.36, k.t * 1.2) * (k.life < .6 ? Math.max(0, k.life / .6) : 1);
      r.scale.setScalar(Math.max(.001, s));
      if (r.position.distanceTo(k.target) < .3 && k.hop === 0) k.target.set(nest.position.x + rnd(-2.5, 2.5), 0, nest.position.z + rnd(-1.5, 2.5));
      const dx = k.target.x - r.position.x, dz = k.target.z - r.position.z, d = Math.hypot(dx, dz) || 1;
      k.yaw += (Math.atan2(-dz, dx) - k.yaw) * Math.min(1, dt * 4); r.rotation.y = k.yaw;
      r.position.x += dx / d * Math.min(d, dt * 1.6); r.position.z += dz / d * Math.min(d, dt * 1.6);
      k.vy -= 22 * dt; k.hop = Math.max(0, k.hop + k.vy * dt); if (k.hop === 0) k.vy = 4.5;
      r.position.y = heightAt(r.position.x, r.position.z) + k.hop;
      k.b.jaw.rotation.z = -.05 - (k.hop > .3 ? .5 : 0);
      k.b.tailSegs.forEach((sg, j) => sg.rotation.y = Math.sin(t * 9 - j * .6) * .15);
      k.b.legs.forEach((l, j) => l.hip.rotation.z = (k.hop > 0 ? .4 : 0) * (j ? 1 : -1));
      if (k.life <= 0) { scene.remove(r); babies.splice(i, 1); k.egg.visible = true; k.egg.scale.set(.01, .01, .01); k.egg.userData.grow = 1; }
    }
    eggs.forEach(e => { if (e.userData.grow) { e.scale.lerp(new T.Vector3(.34, .45, .34), Math.min(1, dt * 4)); if (e.scale.y > .44) e.userData.grow = 0; } });
  });


  /* ---------- state & layout ---------- */
  const state = { view: "intro", target: new T.Vector3(), walking: false, yaw: 0, phase: 0, roarT: 0, blinkT: 3, lookX: 0, lookY: 0, shake: 0, stepSide: 0 };
  const cam = { pos: new T.Vector3(0, 3.6, 13), look: new T.Vector3(0, 2.4, 0), wantPos: new T.Vector3(), wantLook: new T.Vector3() };
  let W = 1, H = 1, narrow = false;

  function layout() {
    const v = state.view;
    const L = narrow
      ? { intro: { cam: [0, 4.2, 20], look: [0, 4.6, 0], home: [.3, 0, 0] },
          welcome: { cam: [0, 5.2, 23], look: [0, 6.2, 0], home: [-1.4, 0, 2] },
          page: { cam: [0, 5.2, 23], look: [0, 6.2, 0], home: [-1.4, 0, 2] } }
      : { intro: { cam: [0, 3.6, 16.5], look: [0, 2.9, 0], home: [-5.2, 0, 1.2] },
          welcome: { cam: [0, 4.6, 18], look: [0, 3.6, 0], home: [-6.2, 0, 2.6] },
          page: { cam: [0, 5.2, 17], look: [0, 4, 0], home: [-6.6, 0, 2.4] } };
    const c = L[v] || L.intro;
    cam.wantPos.set(...c.cam); cam.wantLook.set(...c.look);
    return new T.Vector3(...c.home);
  }

  function resize() {
    W = innerWidth; H = innerHeight; narrow = W / H < .85;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    walkTo(layout(), true);
  }

  function faceCamera() {
    const dx = camera.position.x - rex.position.x, dz = camera.position.z - rex.position.z;
    const toCam = Math.atan2(-dz, dx);
    return toCam + (rex.position.x < 0 ? .75 : -.75); // three-quarter view, head toward screen center
  }
  function walkTo(p, instant) {
    p.x = Math.max(-12, Math.min(12, p.x)); p.z = Math.max(-6, Math.min(8, p.z));
    state.target.copy(p);
    if (instant) { rex.position.set(p.x, heightAt(p.x, p.z), p.z); state.walking = false; state.yaw = faceCamera(); rex.rotation.y = state.yaw; return; }
    state.walking = rex.position.distanceTo(p) > .3;
  }

  /* ---------- interaction ---------- */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const hitSet = new Set(hit), tapOf = new Map();
  taps.forEach(tp => tp.objs.forEach(o => tapOf.set(o, tp.fn)));
  const tapList = hit.concat([...tapOf.keys()]);
  function pick(e) {
    ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const first = ray.intersectObjects(tapList, false)[0];
    const g = ray.intersectObject(ground, false)[0];
    if (first && (!g || first.distance <= g.distance + .01)) {
      if (hitSet.has(first.object)) return { rex: true };
      return { tap: tapOf.get(first.object), h: first };
    }
    return g ? { point: g.point } : {};
  }
  renderer.domElement.addEventListener("pointerdown", e => {
    if (state.view === "page") return;
    const p = pick(e);
    if (p.rex) { window.App ? App.roar() : roar(); return; }
    if (p.tap) { p.tap(p.h); return; }
    if (p.point) walkTo(p.point.clone());
  });
  addEventListener("pointermove", e => { state.lookX = e.clientX / W - .5; state.lookY = e.clientY / H - .5; });
  addEventListener("resize", resize);

  function roar() { state.roarT = 1.15; state.shake = Math.max(state.shake, .35); }

  new MutationObserver(() => {
    const b = document.body.classList;
    const v = b.contains("v-page") ? "page" : b.contains("v-welcome") ? "welcome" : "intro";
    if (v !== state.view) { state.view = v; walkTo(layout()); }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  /* ---------- loop ---------- */
  const stage = document.getElementById("rex-stage");
  const headPos = new T.Vector3();
  const clock = new T.Clock();
  let acc = 0;

  function tick() {
    requestAnimationFrame(tick);
    let dt = Math.min(clock.getDelta(), .05);
    // render less often while a page panel covers the valley
    if (state.view === "page") { acc += dt; if (acc < 1 / 15) return; dt = acc; acc = 0; }
    const t = clock.elapsedTime;

    // walking
    if (state.walking) {
      const dx = state.target.x - rex.position.x, dz = state.target.z - rex.position.z, d = Math.hypot(dx, dz);
      const want = Math.atan2(-dz, dx);
      let dy = want - state.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      state.yaw += dy * Math.min(1, dt * 6);
      if (Math.abs(dy) < .6) {
        const sp = Math.min(d, 3 * dt);
        rex.position.x += dx / d * sp; rex.position.z += dz / d * sp;
      }
      const prev = Math.sin(state.phase);
      state.phase += dt * 7.5;
      const now = Math.sin(state.phase);
      if (prev * now < 0) { // a foot lands
        const leg = legs[now > 0 ? 0 : 1];
        const fp = new T.Vector3(); leg.foot.getWorldPosition(fp);
        footprint(fp.x, fp.z, state.yaw + Math.PI / 2 * 0 - Math.PI / 2);
        state.shake = Math.max(state.shake, .08);
        window.Sound && Sound.stomp();
      }
      if (d < .08) { state.walking = false; }
    } else {
      let dy = faceCamera() - state.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      state.yaw += dy * Math.min(1, dt * 2.5);
      state.phase += (Math.round(state.phase / Math.PI) * Math.PI - state.phase) * Math.min(1, dt * 8);
    }
    // happy idle tricks: hop, spin, wave
    if (!state.walking && state.roarT <= 0 && state.view !== "page") state.idle = (state.idle || 0) + dt; else state.idle = 0;
    if (state.idle > 6 && !state.trick) { state.trick = { type: ["hop", "spin", "wave", "hop", "wiggle"][Math.floor(Math.random() * 5)], t: 0 }; state.idle = 0; }
    let trickY = 0, trickYaw = 0, wave = 0, wig = 0;
    if (state.trick) {
      const k = state.trick, dur = { hop: 1.3, spin: 1.1, wave: 1.8, wiggle: 1.4 }[k.type], u = Math.min(1, (k.t += dt) / dur);
      if (k.type === "hop") { trickY = Math.abs(Math.sin(u * Math.PI * 2)) * .75; if ((u > .49 && u < .52) || u > .98) { if (!k.landed || k.landed < Math.round(u * 2)) { k.landed = Math.round(u * 2); window.Sound && Sound.stomp(); state.shake = Math.max(state.shake, .06); } } }
      if (k.type === "spin") trickYaw = (1 - Math.cos(u * Math.PI)) * Math.PI;
      if (k.type === "wave") wave = Math.sin(u * Math.PI);
      if (k.type === "wiggle") wig = Math.sin(u * Math.PI);
      if (u >= 1) state.trick = null;
    }
    rex.rotation.y = state.yaw + trickYaw;
    rex.position.y = heightAt(rex.position.x, rex.position.z);
    const swing = state.walking ? Math.sin(state.phase) : 0;
    legs.forEach((l, i) => {
      const s = i === 0 ? swing : -swing;
      l.hip.rotation.z = s * .55;
      l.knee.rotation.z = Math.max(0, -s) * .5;
      l.foot.rotation.z = -s * .4;
    });
    const breathe = Math.sin(t * 2.2) * .025;
    rexBody.position.y = state.walking ? Math.abs(Math.cos(state.phase)) * .14 : breathe;
    rexBody.position.y += trickY;
    rexBody.rotation.z = state.walking ? -.06 : trickY * .15;
    rexBody.rotation.x = Math.sin(t * 14) * .08 * wig;
    rexBody.scale.set(1, 1 + breathe * .5, 1);
    arms.forEach((a, i) => a.rotation.z = Math.sin(t * (3 + wave * 9) + i * (1 + wave * 2)) * (.25 + wave * .5) - (state.roarT > 0 ? .5 : 0) - wave * .9);

    // tail wave
    const tailSpeed = state.roarT > 0 ? 9 : state.walking ? 6 : 2.2;
    tailSegs.forEach((s, i) => { s.rotation.y = Math.sin(t * tailSpeed - i * .55) * (.08 + i * .015); s.rotation.z = .06 + (i === 0 ? -.05 : 0); });

    // head: look toward the pointer, roar
    let jawOpen = .04, headPitch = 0;
    if (state.roarT > 0) {
      state.roarT -= dt;
      const k = Math.sin(Math.min(1, (1.15 - state.roarT) / 1.15) * Math.PI);
      jawOpen = .04 + k * .62; headPitch = k * .35;
      head.position.x = (Math.random() - .5) * .03 * k;
    }
    jaw.rotation.z += (-jawOpen - jaw.rotation.z) * Math.min(1, dt * 14);
    neck.rotation.z += (headPitch + -state.lookY * .25 - neck.rotation.z) * Math.min(1, dt * 6);
    neck.rotation.y += ((state.walking ? 0 : -state.lookX * .5) - neck.rotation.y) * Math.min(1, dt * 4);
    eyes.forEach(e => { e.pupil.position.y = -state.lookY * .06; e.pupil.position.x = .1 + Math.abs(state.lookX) * .02; });

    // blink
    state.blinkT -= dt;
    let lid = 1;
    if (state.blinkT < .14) lid = Math.abs(state.blinkT - .07) / .07;
    if (state.blinkT < 0) state.blinkT = 2.5 + Math.random() * 4;
    eyes.forEach(e => e.g.scale.y = Math.max(.08, lid));

    // eggs wobble
    eggs.forEach((e, i) => {
      const w = e.userData.wobble || 0;
      e.rotation.z = Math.sin(t * 22) * .3 * w + Math.sin(t * 1.3 + i) * .03;
      e.userData.wobble = Math.max(0, w - dt * 1.5);
    });

    updaters.forEach(u => u(dt, t));

    // footprints fade
    for (let i = prints.length - 1; i >= 0; i--) {
      const p = prints[i]; p.userData.life -= dt / 14;
      if (p.userData.life <= 0) { scene.remove(p); p.userData.m.dispose(); prints.splice(i, 1); continue; }
      p.userData.m.opacity = Math.min(.55, p.userData.life);
    }

    // world motion
    if (!reduce) {
      palms.forEach(p => { p.userData.top.rotation.z = Math.sin(t * .8 + p.userData.ph) * .05; p.userData.top.rotation.x = Math.cos(t * .6 + p.userData.ph) * .04; });
      clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 120) c.position.x = -120; });
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i], u = p.userData;
        u.life -= dt * .09; p.position.y += u.vy * dt; p.position.x += u.vx * dt; p.scale.multiplyScalar(1 + dt * .12);
        p.material.opacity = Math.max(0, u.life * .9);
        if (u.life <= 0) { volcano.remove(p); p.material.dispose(); puffs.splice(i, 1); addPuff(); }
      }
      const a = t * .12;
      ptero.position.set(Math.cos(a) * 34, 17 + Math.sin(t * .7) * 1.5, -30 + Math.sin(a) * 14);
      ptero.rotation.y = -a - Math.PI / 2 + Math.PI;
      ptero.rotation.y = Math.atan2(-(Math.cos(a) * 14), -Math.sin(a) * 34);
      const f = Math.sin(t * 6) * .6;
      wL.rotation.x = -Math.PI / 2 + f; wR.rotation.x = Math.PI / 2 - f;
      lava.material.emissiveIntensity = 1.2 + Math.sin(t * 3) * .25;
    }

    // camera
    cam.pos.lerp(cam.wantPos, Math.min(1, dt * 2));
    cam.look.lerp(cam.wantLook, Math.min(1, dt * 2));
    camera.position.copy(cam.pos);
    camera.position.x += state.lookX * .6; camera.position.y += -state.lookY * .3;
    if (state.shake > 0) {
      camera.position.x += (Math.random() - .5) * state.shake; camera.position.y += (Math.random() - .5) * state.shake;
      state.shake = Math.max(0, state.shake - dt * 1.2);
    }
    camera.lookAt(cam.look);

    renderer.render(scene, camera);

    // speech bubble follows Rex's head
    if (stage) {
      head.getWorldPosition(headPos); headPos.y += .9; headPos.project(camera);
      stage.style.left = ((headPos.x + 1) / 2 * W).toFixed(1) + "px";
      stage.style.top = ((1 - headPos.y) / 2 * H).toFixed(1) + "px";
    }
  }

  resize();
  cam.pos.copy(cam.wantPos); cam.look.copy(cam.wantLook);
  requestAnimationFrame(tick);

  window.World3D = { roar, walkTo: (x, z) => walkTo(new T.Vector3(x, 0, z)), info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, progs: renderer.info.programs.length, geos: renderer.info.memory.geometries }) };
  window.Scene = { stomp() {}, shake(v) { state.shake = Math.max(state.shake, (v || 10) / 40); }, groundY() { return Infinity; } };
})();
