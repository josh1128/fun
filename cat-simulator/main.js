import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

/* ------------------------------------------------------------------ *
 *  Renderer, scene, camera, lights
 * ------------------------------------------------------------------ */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x4a3560, 0.012);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.1, 7.4);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 4.5;
controls.maxDistance = 11;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.62;
controls.target.set(0, 1.15, 0);
controls.autoRotate = !REDUCED;
controls.autoRotateSpeed = 0.5;

// Dusk gradient sky (uniforms are animated during the proposal)
const skyUniforms = {
  top:    { value: new THREE.Color(0x2f2447) },
  mid:    { value: new THREE.Color(0x7b4d78) },
  bottom: { value: new THREE.Color(0xf0a58a) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(60, 32, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      void main(){
        float h = clamp(normalize(vP).y*0.5+0.5, 0.0, 1.0);
        vec3 c = mix(bottom, mid, smoothstep(0.0,0.5,h));
        c = mix(c, top, smoothstep(0.45,1.0,h));
        gl_FragColor = vec4(c,1.0);
      }`,
  })
);
scene.add(sky);

const key = new THREE.DirectionalLight(0xffe7c4, 2.6);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 1; key.shadow.camera.far = 30;
key.shadow.camera.left = -6; key.shadow.camera.right = 6;
key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
key.shadow.bias = -0.0004;
key.shadow.radius = 6;
scene.add(key);

const rim = new THREE.DirectionalLight(0xff9ec4, 1.4);
rim.position.set(-5, 3, -4);
scene.add(rim);

scene.add(new THREE.HemisphereLight(0xffd9b0, 0x4a3a63, 0.9));
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

/* ------------------------------------------------------------------ *
 *  Ground: a soft cushion + contact shadow
 * ------------------------------------------------------------------ */
const cushion = new THREE.Mesh(
  new THREE.CylinderGeometry(3.1, 3.4, 0.7, 48),
  new THREE.MeshStandardMaterial({ color: 0xf6d9c9, roughness: 0.95 })
);
cushion.position.y = -0.35;
cushion.receiveShadow = true;
scene.add(cushion);

const cushionTop = new THREE.Mesh(
  new THREE.CylinderGeometry(2.95, 2.95, 0.18, 48),
  new THREE.MeshStandardMaterial({ color: 0xffe9dc, roughness: 0.9 })
);
cushionTop.position.y = 0.05;
cushionTop.receiveShadow = true;
scene.add(cushionTop);

// soft radial shadow blob under the cat
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, 'rgba(40,20,50,.5)'); grd.addColorStop(1, 'rgba(40,20,50,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(3.4, 3.4),
  new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = 0.151;
scene.add(contactShadow);

/* ------------------------------------------------------------------ *
 *  The cat — chibi, built from primitives
 * ------------------------------------------------------------------ */
const FUR = 0xffb27a, FUR_D = 0xf59457, PINK = 0xff9bb0, DARK = 0x2a1c2e, CREAM = 0xfff2e4;
const mat = (c, r = 0.72) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const glow = (c, i = 1.4) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });

const cat = new THREE.Group();
cat.position.y = 0.15;
scene.add(cat);

const parts = {};

// body
const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 40, 32), mat(FUR));
body.scale.set(1, 0.82, 0.92);
body.position.y = 0.78;
body.castShadow = true;
cat.add(body); parts.body = body;

// belly patch
const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 24), mat(CREAM));
belly.scale.set(0.7, 0.78, 0.55); belly.position.set(0, 0.62, 0.55);
cat.add(belly);

// head
const head = new THREE.Group(); head.position.set(0, 1.62, 0.12); cat.add(head); parts.head = head;
const skull = new THREE.Mesh(new THREE.SphereGeometry(0.72, 40, 32), mat(FUR));
skull.scale.set(1, 0.92, 0.9); skull.castShadow = true; head.add(skull);
const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 20), mat(CREAM));
muzzle.scale.set(1, 0.72, 0.7); muzzle.position.set(0, -0.18, 0.5); head.add(muzzle);

// ears
function ear(side) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.52, 20), mat(FUR));
  outer.castShadow = true;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 18), mat(PINK));
  inner.position.set(0, -0.02, 0.06);
  g.add(outer, inner);
  g.position.set(0.42 * side, 0.52, 0);
  g.rotation.z = -0.32 * side;
  g.rotation.x = -0.18;
  head.add(g);
  return g;
}
parts.earL = ear(-1); parts.earR = ear(1);

// eyes
function eye(side) {
  const g = new THREE.Group();
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 20), mat(0xfff8f2, 0.5));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 18), glow(0x6ad0c8, 0.5));
  iris.position.z = 0.07; iris.scale.set(1, 1, 0.6);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), mat(DARK, 0.3));
  pupil.position.z = 0.13; pupil.scale.set(0.7, 1, 0.5);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), glow(0xffffff, 2.2));
  shine.position.set(0.04, 0.05, 0.17);
  g.add(white, iris, pupil, shine);
  g.position.set(0.26 * side, 0.02, 0.52);
  head.add(g);
  return g;
}
parts.eyeL = eye(-1); parts.eyeR = eye(1);

// nose + mouth
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), mat(0xff7d97, 0.4));
nose.scale.set(1.3, 0.85, 0.8); nose.position.set(0, -0.12, 0.86); head.add(nose);

// cheeks (blush)
function cheek(side) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), new THREE.MeshBasicMaterial({ color: 0xff9db4, transparent: true, opacity: 0.55 }));
  m.position.set(0.38 * side, -0.14, 0.62); m.lookAt(m.position.clone().add(new THREE.Vector3(0, 0, 1)));
  head.add(m);
}
cheek(-1); cheek(1);

// whiskers
const wMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
[-1, 1].forEach(side => {
  for (let i = 0; i < 3; i++) {
    const y = -0.05 - i * 0.09;
    const pts = [new THREE.Vector3(0.28 * side, y, 0.72), new THREE.Vector3(0.85 * side, y + 0.04, 0.5)];
    head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wMat));
  }
});

// legs
function leg(x, z) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.24, 6, 14), mat(FUR));
  m.position.set(x, 0.22, z); m.castShadow = true; cat.add(m);
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), mat(CREAM));
  paw.position.set(x, 0.11, z + 0.05); paw.scale.set(1, 0.7, 1.1); cat.add(paw);
  return m;
}
leg(-0.45, 0.42); leg(0.45, 0.42); leg(-0.45, -0.35); leg(0.45, -0.35);

// tail (segmented, wags)
const tail = new THREE.Group(); tail.position.set(0, 0.55, -0.75); cat.add(tail); parts.tail = tail;
const tailSegs = [];
let prev = tail;
for (let i = 0; i < 6; i++) {
  const seg = new THREE.Group();
  const r = 0.2 - i * 0.02;
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(i % 2 ? FUR_D : FUR));
  m.castShadow = true; seg.add(m);
  seg.position.y = i === 0 ? 0 : 0.28;
  prev.add(seg); prev = seg; tailSegs.push(seg);
}

// a held heart (revealed at the proposal)
const heldHeart = makeHeartMesh(0xff6f91, 1.7);
heldHeart.scale.setScalar(0);
heldHeart.position.set(0, 1.05, 0.95);
cat.add(heldHeart);

/* ------------------------------------------------------------------ *
 *  Floating hearts + petals
 * ------------------------------------------------------------------ */
function heartTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  const x = 64, y = 46, w = 46, h = 42;
  g.moveTo(x, y + h * 0.3);
  g.bezierCurveTo(x, y, x - w, y, x - w, y + h * 0.35);
  g.bezierCurveTo(x - w, y + h * 0.75, x, y + h * 1.1, x, y + h * 1.35);
  g.bezierCurveTo(x, y + h * 1.1, x + w, y + h * 0.75, x + w, y + h * 0.35);
  g.bezierCurveTo(x + w, y, x, y, x, y + h * 0.3);
  g.fill();
  return new THREE.CanvasTexture(c);
}
const HEART_TEX = heartTexture();

function makeHeartMesh(color, emissive = 1.4) {
  const shape = new THREE.Shape();
  const x = 0, y = 0;
  shape.moveTo(x, y + 0.25);
  shape.bezierCurveTo(x, y, x - 0.5, y, x - 0.5, y + 0.35);
  shape.bezierCurveTo(x - 0.5, y + 0.7, x, y + 0.9, x, y + 1.1);
  shape.bezierCurveTo(x, y + 0.9, x + 0.5, y + 0.7, x + 0.5, y + 0.35);
  shape.bezierCurveTo(x + 0.5, y, x, y, x, y + 0.25);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
  geo.center();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.35 }));
  m.rotation.z = Math.PI;
  return m;
}

const hearts = [];
const heartPool = [];
function spawnHeart(pos, opts = {}) {
  if (REDUCED && hearts.length > 6) return;
  let s = heartPool.pop();
  if (!s) {
    s = new THREE.Sprite(new THREE.SpriteMaterial({ map: HEART_TEX, transparent: true, depthWrite: false }));
    scene.add(s);
  }
  s.visible = true;
  s.material.color.set(opts.color || (Math.random() < 0.5 ? 0xff8fb0 : 0xffcf7a));
  s.material.opacity = 1;
  s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5));
  const scl = (opts.scale || 0.5) * (0.7 + Math.random() * 0.6);
  s.userData = {
    life: 0, ttl: opts.ttl || 1.8, scl,
    vy: 1.2 + Math.random() * 0.8,
    vx: (Math.random() - 0.5) * 0.8,
    spin: (Math.random() - 0.5) * 2,
  };
  hearts.push(s);
}
function updateHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const s = hearts[i], u = s.userData;
    u.life += dt;
    const t = u.life / u.ttl;
    s.position.y += u.vy * dt;
    s.position.x += u.vx * dt;
    u.vy *= 0.98;
    const pop = Math.sin(clamp(t * 3, 0, 1) * Math.PI * 0.5);
    s.scale.setScalar(u.scl * pop * (1 - t * 0.3));
    s.material.opacity = 1 - t * t;
    s.material.rotation += u.spin * dt;
    if (t >= 1) { s.visible = false; hearts.splice(i, 1); heartPool.push(s); }
  }
}

// ambient drifting petals
const petals = [];
function initPetals(n) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: HEART_TEX, color: 0xffd9c0, transparent: true, opacity: 0, depthWrite: false }));
    s.position.set((Math.random() - 0.5) * 16, Math.random() * 8, (Math.random() - 0.5) * 16 - 2);
    s.userData = { sp: 0.2 + Math.random() * 0.3, sway: Math.random() * 6, base: Math.random() * 0.35 + 0.1 };
    scene.add(s); petals.push(s);
  }
}
initPetals(REDUCED ? 8 : 26);
let petalOpacity = 0; // eases up over time / during finale
function updatePetals(dt, t) {
  for (const s of petals) {
    const u = s.userData;
    s.position.y -= u.sp * dt;
    s.position.x += Math.sin(t + u.sway) * 0.15 * dt;
    if (s.position.y < -0.5) { s.position.y = 8; s.position.x = (Math.random() - 0.5) * 16; }
    s.material.opacity = u.base * petalOpacity;
    s.scale.setScalar(0.28);
  }
}

/* ------------------------------------------------------------------ *
 *  Post-processing (bloom)
 * ------------------------------------------------------------------ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ *
 *  Interaction state
 * ------------------------------------------------------------------ */
let affection = 0;              // 0..100
let happy = 0;                  // eased reaction 0..1
let happyTarget = 0;
let blinkT = 2 + Math.random() * 3;
let eyeSquint = 0;             // eased
const anim = { feed: 0, play: 0, hop: 0, headDip: 0 };
let proposalStarted = false;
let accepted = false;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let dragging = false, petStreak = 0;

const petTargets = [skull, muzzle, body];
function pointerToCat(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(petTargets, false)[0];
}

function react(amount, hard = false) {
  happyTarget = 1;
  bumpAffection(amount);
  const p = new THREE.Vector3(0, 1.9, 0.4).add(cat.position);
  for (let i = 0; i < (hard ? 5 : 2); i++) spawnHeart(p, { scale: 0.55 });
  purr();
}

function petAt(intersect) {
  petStreak += 1;
  happyTarget = 1;
  eyeSquint = 1;
  if (petStreak % 3 === 0) {
    bumpAffection(1.4);
    spawnHeart(intersect.point.clone().add(new THREE.Vector3(0, 0.3, 0)), { scale: 0.45 });
    purr(0.5);
  }
}

/* ---- affection + UI ---- */
const meterFill = document.getElementById('meterFill');
const meterLabel = document.getElementById('meterLabel');
const meterHeart = document.querySelector('.meter__heart');
const whisper = document.getElementById('whisper');
const meterEl = document.querySelector('.meter');

const STAGES = [
  { at: 0,  label: 'new friends',   line: 'Meet <b>Mochi</b>. Drag to look around — then give this cat some love.' },
  { at: 22, label: 'warming up',    line: 'Mochi is starting to trust you… keep going. 🐾' },
  { at: 48, label: 'purring',       line: 'A soft rumble. Mochi leans into every pet.' },
  { at: 74, label: 'smitten',       line: 'Mochi never wants you to leave your side.' },
  { at: 100, label: 'full heart',   line: 'Mochi has something to ask you…' },
];
let stageIdx = 0;

function bumpAffection(a) {
  if (proposalStarted) return;
  affection = clamp(affection + a, 0, 100);
  meterFill.style.width = affection + '%';
  meterEl.setAttribute('aria-valuenow', Math.round(affection));
  meterHeart.classList.add('pop');
  setTimeout(() => meterHeart.classList.remove('pop'), 300);
  // advance stage text
  let ni = stageIdx;
  for (let i = STAGES.length - 1; i >= 0; i--) { if (affection >= STAGES[i].at) { ni = i; break; } }
  if (ni !== stageIdx) {
    stageIdx = ni;
    meterLabel.textContent = STAGES[ni].label;
    whisper.style.opacity = 0;
    setTimeout(() => { whisper.innerHTML = STAGES[ni].line; whisper.style.opacity = 0.92; }, 300);
  }
  if (affection >= 100) startProposal();
}

/* ------------------------------------------------------------------ *
 *  Tiny WebAudio (opt-in): purr + pop
 * ------------------------------------------------------------------ */
let AC = null, soundOn = false, purrGain = null;
function initAudio() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  purrGain = AC.createGain(); purrGain.gain.value = 0; purrGain.connect(AC.destination);
}
function purr(dur = 0.35) {
  if (!soundOn || !AC) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain();
  o.type = 'sawtooth'; o.frequency.value = 55;
  lfo.type = 'sine'; lfo.frequency.value = 26; lg.gain.value = 26;
  lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}
function pop(freq = 520) {
  if (!soundOn || !AC) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.8, t + 0.12);
  g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.2);
}

const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
  initAudio(); if (AC.state === 'suspended') AC.resume();
  soundOn = !soundOn;
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  soundBtn.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
  if (soundOn) pop(660);
});

/* ------------------------------------------------------------------ *
 *  Pointer + button wiring
 * ------------------------------------------------------------------ */
canvas.addEventListener('pointerdown', (e) => {
  if (proposalStarted) return;
  const hit = pointerToCat(e);
  if (hit) { dragging = true; controls.autoRotate = false; petStreak = 0; petAt(hit); pop(600); }
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || proposalStarted) return;
  const hit = pointerToCat(e);
  if (hit) petAt(hit);
});
addEventListener('pointerup', () => { dragging = false; });

document.getElementById('petBtn').addEventListener('click', () => { react(6, true); anim.headDip = 1; pop(560); });
document.getElementById('feedBtn').addEventListener('click', () => { anim.feed = 1; react(8, true); pop(480); });
document.getElementById('playBtn').addEventListener('click', () => { anim.play = 1; anim.hop = 1; react(8, true); pop(700); });

/* ------------------------------------------------------------------ *
 *  Proposal sequence
 * ------------------------------------------------------------------ */
const proposalEl = document.getElementById('proposal');
const hud = document.getElementById('hud');
const skyWarm = { top: new THREE.Color(0x4a2f5e), mid: new THREE.Color(0xff8f6b), bottom: new THREE.Color(0xffd28a) };
let warm = 0, warmTarget = 0;

function startProposal() {
  if (proposalStarted) return;
  proposalStarted = true;
  controls.autoRotate = false;
  warmTarget = 1;
  bloom.strength = 0.85;
  happyTarget = 1;
  // fade HUD, reveal card, glide camera to a sweet framing
  whisper.style.opacity = 0;
  document.querySelector('.dock').style.opacity = 0;
  document.querySelector('.dock').style.pointerEvents = 'none';
  camMove = { active: true, t: 0, from: camera.position.clone(), to: new THREE.Vector3(0, 2.05, 6.2) };
  setTimeout(() => {
    proposalEl.hidden = false;
    requestAnimationFrame(() => proposalEl.classList.add('show'));
    document.getElementById('yesBtn').focus();
  }, 1400);
}

// playful "No" button
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const NO_LINES = ['No', 'are you sure?', 'really?', 'think again 🥺', 'Mochi is sad…', 'catch me!', 'nope nope nope'];
let noDodges = 0;
function dodge() {
  noDodges++;
  noBtn.classList.add('loose');
  const pad = 20, bw = noBtn.offsetWidth, bh = noBtn.offsetHeight;
  const x = pad + Math.random() * (innerWidth - bw - pad * 2);
  const y = pad + Math.random() * (innerHeight - bh - pad * 2);
  noBtn.style.left = x + 'px';
  noBtn.style.top = y + 'px';
  const shrink = Math.max(0.45, 1 - noDodges * 0.12);
  noBtn.style.transform = `scale(${shrink})`;
  noBtn.textContent = NO_LINES[Math.min(noDodges, NO_LINES.length - 1)];
  const grow = Math.min(1.5, 1 + noDodges * 0.09);
  yesBtn.style.transform = `scale(${grow})`;
  spawnHeart(new THREE.Vector3(0, 1.9, 0.4), { color: 0xff8fb0, scale: 0.5 });
  pop(360);
}
noBtn.addEventListener('mouseenter', dodge);
noBtn.addEventListener('click', (e) => { e.preventDefault(); dodge(); });
noBtn.addEventListener('focus', dodge);

yesBtn.addEventListener('click', accept);

/* ------------------------------------------------------------------ *
 *  Finale
 * ------------------------------------------------------------------ */
const finaleEl = document.getElementById('finale');
function accept() {
  if (accepted) return; accepted = true;
  proposalEl.classList.remove('show');
  setTimeout(() => (proposalEl.hidden = true), 800);
  happyTarget = 1; anim.hop = 1;
  bloom.strength = 1.15;
  warmTarget = 1;
  petalTarget = 1;
  // big burst
  let burst = 0;
  const iv = setInterval(() => {
    for (let i = 0; i < 6; i++) spawnHeart(new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2), { scale: 0.7, ttl: 2.4 });
    pop(500 + Math.random() * 300);
    if (++burst > 10) clearInterval(iv);
  }, 130);
  finaleEl.hidden = false;
  requestAnimationFrame(() => finaleEl.classList.add('show'));
}
document.getElementById('replayBtn').addEventListener('click', () => location.reload());

let petalTarget = 0.6; // ambient petals ease in after load

/* ------------------------------------------------------------------ *
 *  Animation loop
 * ------------------------------------------------------------------ */
let camMove = { active: false, t: 0, from: null, to: null };
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // eased state
  happy = damp(happy, happyTarget, 3, dt);
  happyTarget = damp(happyTarget, 0.15, 0.6, dt); // relaxes back to a gentle baseline
  eyeSquint = damp(eyeSquint, dragging ? 1 : 0, 6, dt);
  warm = damp(warm, warmTarget, 1.2, dt);
  petalOpacity = damp(petalOpacity, petalTarget, 0.8, dt);
  bloom.strength = damp(bloom.strength, proposalStarted ? (accepted ? 1.15 : 0.85) : 0.55, 1.5, dt);

  // warm the sky
  skyUniforms.top.value.lerpColors(new THREE.Color(0x2f2447), skyWarm.top, warm);
  skyUniforms.mid.value.lerpColors(new THREE.Color(0x7b4d78), skyWarm.mid, warm);
  skyUniforms.bottom.value.lerpColors(new THREE.Color(0xf0a58a), skyWarm.bottom, warm);
  scene.fog.color.copy(skyUniforms.mid.value).multiplyScalar(0.7);
  rim.intensity = lerp(1.4, 2.4, warm);

  // idle breathing + bob
  const breathe = REDUCED ? 0 : Math.sin(t * 1.6) * 0.02;
  parts.body.scale.y = 0.82 + breathe;
  cat.position.y = 0.15 + (REDUCED ? 0 : Math.sin(t * 1.3) * 0.03) + anim.hop * Math.sin(clamp(1 - anim.hop, 0, 1) * Math.PI) * 0.6;

  // squish on happiness (a pleased little squash)
  const sq = happy * 0.12;
  parts.body.scale.x = (1 + sq) * 1;
  parts.body.scale.z = (1 + sq) * 0.92;

  // head: gentle sway, dip when petted/fed, tilt toward camera a touch
  const dip = Math.max(anim.headDip, anim.feed) * 0.5;
  parts.head.rotation.x = lerp(parts.head.rotation.x, (REDUCED ? 0 : Math.sin(t * 0.8) * 0.05) + dip * 0.4, 0.15);
  parts.head.rotation.z = lerp(parts.head.rotation.z, Math.sin(t * 0.5) * 0.04, 0.1);
  parts.head.position.y = 1.62 - dip * 0.35 + happy * 0.03;

  // ears perk with happiness + occasional twitch
  const twitch = Math.sin(t * 12) > 0.985 ? 0.2 : 0;
  parts.earL.rotation.z = 0.32 + happy * 0.15 + twitch;
  parts.earR.rotation.z = -0.32 - happy * 0.15 - twitch;

  // eyes: blink + squint when happy/petted
  blinkT -= dt;
  let blink = 1;
  if (blinkT < 0.16) blink = Math.abs(blinkT / 0.08 - 1); // quick close/open
  if (blinkT < 0) blinkT = 2.5 + Math.random() * 3.5;
  const openness = clamp(blink - eyeSquint * 0.55 - happy * 0.25, 0.08, 1);
  parts.eyeL.scale.y = openness; parts.eyeR.scale.y = openness;

  // tail wag — faster when happy
  const wag = (0.5 + happy * 1.2) * (REDUCED ? 0.4 : 1);
  tailSegs.forEach((s, i) => {
    s.rotation.z = Math.sin(t * (2 + wag * 2) - i * 0.5) * (0.18 + i * 0.04) * (1 + happy);
    s.rotation.x = Math.sin(t * 1.3 - i * 0.3) * 0.06;
  });

  // held heart appears during proposal
  const heartTarget = proposalStarted ? 1 : 0;
  heldHeart.scale.setScalar(damp(heldHeart.scale.x, heartTarget * 0.55, 3, dt));
  heldHeart.rotation.y = t * 1.2;
  heldHeart.position.y = 1.05 + Math.sin(t * 2) * 0.05;

  // decay one-shot anims
  anim.feed = Math.max(0, anim.feed - dt * 1.2);
  anim.play = Math.max(0, anim.play - dt * 1.2);
  anim.headDip = Math.max(0, anim.headDip - dt * 1.6);
  anim.hop = Math.max(0, anim.hop - dt * 1.8);

  // camera glide during proposal
  if (camMove.active) {
    camMove.t = Math.min(1, camMove.t + dt * 0.5);
    const e = 1 - Math.pow(1 - camMove.t, 3);
    camera.position.lerpVectors(camMove.from, camMove.to, e);
    if (camMove.t >= 1) camMove.active = false;
  }

  updateHearts(dt);
  updatePetals(dt, t);
  contactShadow.scale.setScalar(1 + happy * 0.05);
  controls.update();
  composer.render();
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ *
 *  Resize + boot
 * ------------------------------------------------------------------ */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

function boot() {
  const loader = document.getElementById('loader');
  loader.classList.add('hide');
  hud.hidden = false;
  petalTarget = 0.7;
  setTimeout(() => (loader.style.display = 'none'), 900);
}

// warm-up a couple of frames, then reveal
let warmup = 0;
(function prime() {
  composer.render();
  if (++warmup > 3) { tick(); setTimeout(boot, 350); }
  else requestAnimationFrame(prime);
})();
