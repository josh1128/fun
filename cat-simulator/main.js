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
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const easeInOut = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

/* ------------------------------------------------------------------ *
 *  Personalize
 *  Put your email between the quotes to let her reply reach you by mail.
 *  Leave it empty ('') to just show her note on screen.
 * ------------------------------------------------------------------ */
const RECIPIENT_EMAIL = '';

/* ------------------------------------------------------------------ *
 *  Gallery layout — your photos on the walls
 * ------------------------------------------------------------------ */
const WALL_HALF = 3.2;
const WALL_H = 4.7;
const END_Z = -26.5;
const END_WALL_Z = -30.2;

const MEMORIES = [
  { src: 'photos/memory1.jpg', aspect: 1050 / 1400 },
  { src: 'photos/memory2.jpg', aspect: 1050 / 1400 },
  { src: 'photos/memory3.jpg', aspect: 1050 / 1400 },
  { src: 'photos/memory5.jpg', aspect: 1050 / 1400 },
  { src: 'photos/memory7.jpg', aspect: 1051 / 1400 },
  { src: 'photos/memory6.jpg', aspect: 1050 / 1400 },
  { src: 'photos/memory4.jpg', aspect: 499 / 551 },
  { src: 'photos/memory9.jpg', aspect: 1400 / 1050 },
].map((m, i) => ({ ...m, side: i % 2 === 0 ? -1 : 1, z: -5 - i * 2.7 }));
const END_MEMORY = { src: 'photos/memory8.jpg', aspect: 1400 / 933 };

/* ------------------------------------------------------------------ *
 *  Renderer, scene, camera, lights
 * ------------------------------------------------------------------ */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const texLoader = new THREE.TextureLoader();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x4a3560, 0.009);

const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.1, 7.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 4.2;
controls.maxDistance = 10;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.6;
controls.target.set(0, 1.15, 0);
controls.autoRotate = !REDUCED;
controls.autoRotateSpeed = 0.45;

const skyUniforms = {
  top:    { value: new THREE.Color(0x2f2447) },
  mid:    { value: new THREE.Color(0x7b4d78) },
  bottom: { value: new THREE.Color(0xf0a58a) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(70, 32, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      void main(){ float h=clamp(normalize(vP).y*0.5+0.5,0.0,1.0);
        vec3 c=mix(bottom,mid,smoothstep(0.0,0.5,h)); c=mix(c,top,smoothstep(0.45,1.0,h));
        gl_FragColor=vec4(c,1.0);} `,
  })
);
scene.add(sky);

const key = new THREE.DirectionalLight(0xffe7c4, 2.4);
key.position.set(4, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 1; key.shadow.camera.far = 60;
key.shadow.camera.left = -8; key.shadow.camera.right = 8;
key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
key.shadow.bias = -0.0004; key.shadow.radius = 6;
scene.add(key);

const rim = new THREE.DirectionalLight(0xff9ec4, 1.3);
rim.position.set(-5, 3, -4);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffe4c4, 0x4a3a63, 0.95));
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

/* ------------------------------------------------------------------ *
 *  The gallery hall
 * ------------------------------------------------------------------ */
const hall = new THREE.Group();
scene.add(hall);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(WALL_HALF * 2, 40),
  new THREE.MeshStandardMaterial({ color: 0xece0d3, roughness: 0.92 })
);
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.15, -13);
floor.receiveShadow = true; hall.add(floor);

const runner = new THREE.Mesh(
  new THREE.PlaneGeometry(2.1, 38),
  new THREE.MeshStandardMaterial({ color: 0xc98b6b, roughness: 0.95 })
);
runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.16, -13);
runner.receiveShadow = true; hall.add(runner);

const startRug = new THREE.Mesh(
  new THREE.CylinderGeometry(2.2, 2.2, 0.04, 48),
  new THREE.MeshStandardMaterial({ color: 0xf7e2d2, roughness: 0.9 })
);
startRug.position.set(0, 0.17, 0); startRug.receiveShadow = true; hall.add(startRug);

const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3ece2, roughness: 0.97 });
[-1, 1].forEach(side => {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(40, WALL_H), wallMat);
  w.position.set(side * WALL_HALF, WALL_H / 2 + 0.15, -13);
  w.rotation.y = -side * Math.PI / 2; w.receiveShadow = true; hall.add(w);
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 40), new THREE.MeshStandardMaterial({ color: 0xe8dccf, roughness: 0.9 }));
  c.position.set(side * (WALL_HALF - 0.05), WALL_H + 0.12, -13); hall.add(c);
});
const endWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_HALF * 2, WALL_H), wallMat);
endWall.position.set(0, WALL_H / 2 + 0.15, END_WALL_Z - 0.05); endWall.receiveShadow = true; hall.add(endWall);

let loaded = 0;
function markLoaded() { loaded++; }
function addMemory({ src, aspect, side, z, height, y }) {
  const h = height || 1.7;
  const w = h * aspect;
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xba8f4d, metalness: 0.35, roughness: 0.5 })
  );
  frame.castShadow = true;
  const mount = new THREE.Mesh(
    new THREE.PlaneGeometry(w + 0.04, h + 0.04),
    new THREE.MeshStandardMaterial({ color: 0xfbf6ee, roughness: 0.9 })
  );
  mount.position.z = 0.051;
  const tex = texLoader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; markLoaded(); });
  tex.colorSpace = THREE.SRGBColorSpace;
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 })
  );
  photo.position.z = 0.06;
  const plight = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.82, 0.05, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xffe9c0, emissive: 0xffd79a, emissiveIntensity: 2.2, roughness: 0.4 })
  );
  plight.position.set(0, h / 2 + 0.24, 0.3);
  g.add(frame, mount, photo, plight);
  if (side === 0) { g.position.set(0, y || 2.3, z); }
  else { g.position.set(side * (WALL_HALF - 0.06), y || 1.95, z); g.rotation.y = -side * Math.PI / 2; }
  hall.add(g);
  return g;
}
MEMORIES.forEach(addMemory);
addMemory({ ...END_MEMORY, side: 0, z: END_WALL_Z, height: 2.5, y: 2.35 });

const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, 'rgba(40,20,50,.5)'); grd.addColorStop(1, 'rgba(40,20,50,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 3),
  new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
);
contactShadow.rotation.x = -Math.PI / 2; contactShadow.position.y = 0.18;
scene.add(contactShadow);

/* ------------------------------------------------------------------ *
 *  The cat
 * ------------------------------------------------------------------ */
const FUR = 0xffb27a, FUR_D = 0xf59457, PINK = 0xff9bb0, DARK = 0x2a1c2e, CREAM = 0xfff2e4;
const mat = (c, r = 0.72) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const glow = (c, i = 1.4) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });

const cat = new THREE.Group();
cat.position.set(0, 0.17, 0);
scene.add(cat);
const parts = {};

const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 40, 32), mat(FUR));
body.scale.set(1, 0.82, 0.92); body.position.y = 0.78; body.castShadow = true;
cat.add(body); parts.body = body;

const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 24), mat(CREAM));
belly.scale.set(0.7, 0.78, 0.55); belly.position.set(0, 0.62, 0.55); cat.add(belly);

const head = new THREE.Group(); head.position.set(0, 1.62, 0.12); cat.add(head); parts.head = head;
const skull = new THREE.Mesh(new THREE.SphereGeometry(0.72, 40, 32), mat(FUR));
skull.scale.set(1, 0.92, 0.9); skull.castShadow = true; head.add(skull);
const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 20), mat(CREAM));
muzzle.scale.set(1, 0.72, 0.7); muzzle.position.set(0, -0.18, 0.5); head.add(muzzle);

function ear(side) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.52, 20), mat(FUR)); outer.castShadow = true;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 18), mat(PINK)); inner.position.set(0, -0.02, 0.06);
  g.add(outer, inner); g.position.set(0.42 * side, 0.52, 0); g.rotation.z = -0.32 * side; g.rotation.x = -0.18;
  head.add(g); return g;
}
parts.earL = ear(-1); parts.earR = ear(1);

function eye(side) {
  const g = new THREE.Group();
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 20), mat(0xfff8f2, 0.5));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 18), glow(0x6ad0c8, 0.5)); iris.position.z = 0.07; iris.scale.set(1, 1, 0.6);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), mat(DARK, 0.3)); pupil.position.z = 0.13; pupil.scale.set(0.7, 1, 0.5);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), glow(0xffffff, 2.2)); shine.position.set(0.04, 0.05, 0.17);
  g.add(white, iris, pupil, shine); g.position.set(0.26 * side, 0.02, 0.52); head.add(g); return g;
}
parts.eyeL = eye(-1); parts.eyeR = eye(1);

const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), mat(0xff7d97, 0.4));
nose.scale.set(1.3, 0.85, 0.8); nose.position.set(0, -0.12, 0.86); head.add(nose);

[-1, 1].forEach(side => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), new THREE.MeshBasicMaterial({ color: 0xff9db4, transparent: true, opacity: 0.55 }));
  m.position.set(0.38 * side, -0.14, 0.62); m.lookAt(m.position.clone().add(new THREE.Vector3(0, 0, 1))); head.add(m);
});
const wMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
[-1, 1].forEach(side => { for (let i = 0; i < 3; i++) { const y = -0.05 - i * 0.09;
  const pts = [new THREE.Vector3(0.28 * side, y, 0.72), new THREE.Vector3(0.85 * side, y + 0.04, 0.5)];
  head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wMat)); } });

const legs = [];
function makeLeg(x, z) {
  const hip = new THREE.Group(); hip.position.set(x, 0.5, z);
  const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.24, 6, 14), mat(FUR)); shin.position.y = -0.24; shin.castShadow = true;
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), mat(CREAM)); paw.position.set(0, -0.4, 0.05); paw.scale.set(1, 0.7, 1.1);
  hip.add(shin, paw); cat.add(hip);
  hip.userData.phase = ((x < 0) === (z > 0)) ? 0 : Math.PI; legs.push(hip);
}
makeLeg(-0.45, 0.42); makeLeg(0.45, 0.42); makeLeg(-0.45, -0.35); makeLeg(0.45, -0.35);

const tail = new THREE.Group(); tail.position.set(0, 0.55, -0.75); cat.add(tail);
const tailSegs = []; let prev = tail;
for (let i = 0; i < 6; i++) {
  const seg = new THREE.Group(); const r = 0.2 - i * 0.02;
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(i % 2 ? FUR_D : FUR)); m.castShadow = true; seg.add(m);
  seg.position.y = i === 0 ? 0 : 0.28; prev.add(seg); prev = seg; tailSegs.push(seg);
}

const heldHeart = makeHeartMesh(0xff6f91, 1.7);
heldHeart.scale.setScalar(0); heldHeart.position.set(0, 1.05, 0.95); cat.add(heldHeart);

/* ------------------------------------------------------------------ *
 *  Hearts + petals
 * ------------------------------------------------------------------ */
function heartTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); const x = 64, y = 46, w = 46, h = 42;
  g.moveTo(x, y + h * 0.3);
  g.bezierCurveTo(x, y, x - w, y, x - w, y + h * 0.35);
  g.bezierCurveTo(x - w, y + h * 0.75, x, y + h * 1.1, x, y + h * 1.35);
  g.bezierCurveTo(x, y + h * 1.1, x + w, y + h * 0.75, x + w, y + h * 0.35);
  g.bezierCurveTo(x + w, y, x, y, x, y + h * 0.3);
  g.fill(); return new THREE.CanvasTexture(c);
}
const HEART_TEX = heartTexture();

function makeHeartMesh(color, emissive = 1.4) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.25);
  s.bezierCurveTo(0, 0, -0.5, 0, -0.5, 0.35);
  s.bezierCurveTo(-0.5, 0.7, 0, 0.9, 0, 1.1);
  s.bezierCurveTo(0, 0.9, 0.5, 0.7, 0.5, 0.35);
  s.bezierCurveTo(0.5, 0, 0, 0, 0, 0.25);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
  geo.center();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.35 }));
  m.rotation.z = Math.PI; return m;
}

const hearts = [], heartPool = [];
function spawnHeart(pos, opts = {}) {
  if (REDUCED && hearts.length > 6) return;
  let s = heartPool.pop();
  if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: HEART_TEX, transparent: true, depthWrite: false })); scene.add(s); }
  s.visible = true;
  s.material.color.set(opts.color || (Math.random() < 0.5 ? 0xff8fb0 : 0xffcf7a));
  s.material.opacity = 1;
  s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5));
  const scl = (opts.scale || 0.5) * (0.7 + Math.random() * 0.6);
  s.userData = { life: 0, ttl: opts.ttl || 1.8, scl, vy: 1.2 + Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.8, spin: (Math.random() - 0.5) * 2 };
  hearts.push(s);
}
function updateHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const s = hearts[i], u = s.userData; u.life += dt; const t = u.life / u.ttl;
    s.position.y += u.vy * dt; s.position.x += u.vx * dt; u.vy *= 0.98;
    const pop = Math.sin(clamp(t * 3, 0, 1) * Math.PI * 0.5);
    s.scale.setScalar(u.scl * pop * (1 - t * 0.3));
    s.material.opacity = 1 - t * t; s.material.rotation += u.spin * dt;
    if (t >= 1) { s.visible = false; hearts.splice(i, 1); heartPool.push(s); }
  }
}

const petals = [];
for (let i = 0; i < (REDUCED ? 8 : 24); i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: HEART_TEX, color: 0xffd9c0, transparent: true, opacity: 0, depthWrite: false }));
  s.position.set((Math.random() - 0.5) * 8, Math.random() * 6, -Math.random() * 30);
  s.userData = { sp: 0.2 + Math.random() * 0.3, sway: Math.random() * 6, base: Math.random() * 0.3 + 0.1 };
  scene.add(s); petals.push(s);
}
let petalOpacity = 0, petalTarget = 0.55;
function updatePetals(dt, t) {
  for (const s of petals) { const u = s.userData;
    s.position.y -= u.sp * dt; s.position.x += Math.sin(t + u.sway) * 0.15 * dt;
    if (s.position.y < -0.5) { s.position.y = 6; s.position.x = (Math.random() - 0.5) * 8; }
    s.material.opacity = u.base * petalOpacity; s.scale.setScalar(0.26);
  }
}

/* ------------------------------------------------------------------ *
 *  Bloom
 * ------------------------------------------------------------------ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ *
 *  State
 * ------------------------------------------------------------------ */
let phase = 'bond';
let phaseT = 0;
let affection = 0, happy = 0, happyTarget = 0;
let blinkT = 2 + Math.random() * 3, eyeSquint = 0, walkAmp = 0;
let warm = 0, warmTarget = 0;
let accepted = false;
const anim = { feed: 0, play: 0, hop: 0, headDip: 0 };

const WALK_DUR = REDUCED ? 6 : 16;
let bondCamPos = null, camPosFrom = null, camLookFrom = null;
const camLook = new THREE.Vector3(0, 1.15, 0);

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
function catTop() { return new THREE.Vector3(0, 1.95, 0.3).add(cat.position); }
function react(a, hard = false) {
  happyTarget = 1; bumpAffection(a);
  for (let i = 0; i < (hard ? 5 : 2); i++) spawnHeart(catTop(), { scale: 0.55 });
  purr();
}
function petAt(hit) {
  petStreak++; happyTarget = 1; eyeSquint = 1;
  if (petStreak % 3 === 0) { bumpAffection(2); spawnHeart(hit.point.clone().add(new THREE.Vector3(0, 0.3, 0)), { scale: 0.45 }); purr(0.5); }
}

const meterFill = document.getElementById('meterFill');
const meterLabel = document.getElementById('meterLabel');
const meterHeart = document.querySelector('.meter__heart');
const whisper = document.getElementById('whisper');
const meterEl = document.querySelector('.meter');
const dockEl = document.querySelector('.dock');

const STAGES = [
  { at: 0,  label: 'new friends', line: 'Meet <b>Mochi</b>. Drag to look around — then give this cat some love.' },
  { at: 25, label: 'warming up',  line: 'Mochi is starting to trust you… keep going. 🐾' },
  { at: 55, label: 'purring',     line: 'A soft rumble. Mochi leans into every pet.' },
  { at: 80, label: 'smitten',     line: 'Mochi has somewhere it wants to take you…' },
];
let stageIdx = 0;
function bumpAffection(a) {
  if (phase !== 'bond') return;
  affection = clamp(affection + a, 0, 100);
  meterFill.style.width = affection + '%';
  meterEl.setAttribute('aria-valuenow', Math.round(affection));
  meterHeart.classList.add('pop'); setTimeout(() => meterHeart.classList.remove('pop'), 300);
  let ni = stageIdx;
  for (let i = STAGES.length - 1; i >= 0; i--) { if (affection >= STAGES[i].at) { ni = i; break; } }
  if (ni !== stageIdx) { stageIdx = ni; meterLabel.textContent = STAGES[ni].label;
    whisper.style.opacity = 0; setTimeout(() => { whisper.innerHTML = STAGES[ni].line; whisper.style.opacity = 0.92; }, 300); }
  if (affection >= 100) startJourney();
}

/* ------------------------------------------------------------------ *
 *  Audio
 * ------------------------------------------------------------------ */
let AC = null, soundOn = false;
function initAudio() { if (AC) return; AC = new (window.AudioContext || window.webkitAudioContext)(); }
function purr(dur = 0.35) {
  if (!soundOn || !AC) return; const t = AC.currentTime;
  const o = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain();
  o.type = 'sawtooth'; o.frequency.value = 55; lfo.type = 'sine'; lfo.frequency.value = 26; lg.gain.value = 26;
  lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}
function pop(freq = 520) {
  if (!soundOn || !AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.8, t + 0.12);
  g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.2);
}
const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
  initAudio(); if (AC.state === 'suspended') AC.resume();
  soundOn = !soundOn; soundBtn.setAttribute('aria-pressed', String(soundOn));
  soundBtn.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on'); if (soundOn) pop(660);
});

/* ------------------------------------------------------------------ *
 *  Interaction wiring
 * ------------------------------------------------------------------ */
canvas.addEventListener('pointerdown', (e) => {
  if (phase !== 'bond') return; const hit = pointerToCat(e);
  if (hit) { dragging = true; controls.autoRotate = false; petStreak = 0; petAt(hit); pop(600); }
});
canvas.addEventListener('pointermove', (e) => { if (dragging && phase === 'bond') { const hit = pointerToCat(e); if (hit) petAt(hit); } });
addEventListener('pointerup', () => { dragging = false; });
document.getElementById('petBtn').addEventListener('click', () => { react(9, true); anim.headDip = 1; pop(560); });
document.getElementById('feedBtn').addEventListener('click', () => { anim.feed = 1; react(11, true); pop(480); });
document.getElementById('playBtn').addEventListener('click', () => { anim.play = 1; anim.hop = 1; react(11, true); pop(700); });

/* ------------------------------------------------------------------ *
 *  Journey + proposal
 * ------------------------------------------------------------------ */
const proposalEl = document.getElementById('proposal');
const skyWarm = { top: new THREE.Color(0x4a2f5e), mid: new THREE.Color(0xff8f6b), bottom: new THREE.Color(0xffd28a) };

function setPhase(p) { phase = p; phaseT = 0; }
function startJourney() {
  if (phase !== 'bond') return;
  controls.autoRotate = false; controls.enabled = false; dragging = false;
  bondCamPos = camera.position.clone(); camLookFrom = camLook.clone();
  meterEl.style.opacity = 0; dockEl.style.opacity = 0; dockEl.style.pointerEvents = 'none';
  whisper.style.opacity = 0;
  setTimeout(() => { whisper.classList.add('journey'); whisper.innerHTML = 'Follow Mochi down memory lane…'; whisper.style.opacity = 0.9; }, 500);
  warmTarget = 0.55;
  setPhase('turn');
}
function revealProposal() {
  whisper.style.opacity = 0;
  proposalEl.hidden = false;
  requestAnimationFrame(() => proposalEl.classList.add('show'));
  document.getElementById('yesBtn').focus();
  warmTarget = 1;
}

const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const NO_LINES = ['No', 'are you sure?', 'really?', 'think again 🥺', 'Mochi is sad…', 'catch me!', 'nope nope nope'];
let noDodges = 0;
function dodge() {
  noDodges++; noBtn.classList.add('loose');
  const pad = 20, bw = noBtn.offsetWidth, bh = noBtn.offsetHeight;
  noBtn.style.left = (pad + Math.random() * (innerWidth - bw - pad * 2)) + 'px';
  noBtn.style.top = (pad + Math.random() * (innerHeight - bh - pad * 2)) + 'px';
  noBtn.style.transform = `scale(${Math.max(0.45, 1 - noDodges * 0.12)})`;
  noBtn.textContent = NO_LINES[Math.min(noDodges, NO_LINES.length - 1)];
  yesBtn.style.transform = `scale(${Math.min(1.5, 1 + noDodges * 0.09)})`;
  spawnHeart(catTop(), { color: 0xff8fb0, scale: 0.5 }); pop(360);
}
noBtn.addEventListener('mouseenter', dodge);
noBtn.addEventListener('click', (e) => { e.preventDefault(); dodge(); });
noBtn.addEventListener('focus', dodge);
yesBtn.addEventListener('click', accept);

const finaleEl = document.getElementById('finale');
function accept() {
  if (accepted) return; accepted = true;
  proposalEl.classList.remove('show'); setTimeout(() => (proposalEl.hidden = true), 800);
  happyTarget = 1; anim.hop = 1; warmTarget = 1;
  let burst = 0;
  const iv = setInterval(() => {
    for (let i = 0; i < 6; i++) spawnHeart(new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, cat.position.z + (Math.random() - 0.5) * 2), { scale: 0.7, ttl: 2.4 });
    pop(500 + Math.random() * 300); if (++burst > 10) clearInterval(iv);
  }, 130);
  finaleEl.hidden = false; requestAnimationFrame(() => finaleEl.classList.add('show'));
}
document.getElementById('replayBtn').addEventListener('click', () => location.reload());

// ---- her reply ----
const replyBox = document.getElementById('replyBox');
const replyInput = document.getElementById('replyInput');
const replyDone = document.getElementById('replyDone');
const replyEcho = document.getElementById('replyEcho');
const mailReplyBtn = document.getElementById('mailReplyBtn');
function sendReply() {
  const msg = replyInput.value.trim();
  if (!msg) { replyInput.focus(); return; }
  replyEcho.textContent = '\u201C' + msg + '\u201D';
  if (RECIPIENT_EMAIL) {
    mailReplyBtn.href = 'mailto:' + encodeURIComponent(RECIPIENT_EMAIL)
      + '?subject=' + encodeURIComponent('A message back to Mochi \uD83D\uDC9B')
      + '&body=' + encodeURIComponent(msg);
    mailReplyBtn.hidden = false;
  }
  replyBox.hidden = true;
  replyDone.hidden = false;
  happyTarget = 1; anim.hop = 1;
  for (let i = 0; i < 10; i++) spawnHeart(new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, cat.position.z + (Math.random() - 0.5) * 2), { scale: 0.7, ttl: 2.4 });
  pop(560);
}
document.getElementById('sendReplyBtn').addEventListener('click', sendReply);
replyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } });

/* ------------------------------------------------------------------ *
 *  Loop
 * ------------------------------------------------------------------ */
const clock = new THREE.Clock();

function updateCamera(dt) {
  if (phase === 'bond') { controls.update(); camLook.copy(controls.target); return; }

  if (phase === 'turn') {
    const e = smooth(phaseT / 1.6);
    cat.rotation.y = lerp(0, Math.PI, e);
    const behind = new THREE.Vector3(0, 2.5, cat.position.z + 5.4);
    camera.position.lerpVectors(bondCamPos, behind, e);
    camLook.lerpVectors(camLookFrom, new THREE.Vector3(0, 1.25, cat.position.z - 2), e);
    if (phaseT >= 1.6) setPhase('walk');
  } else if (phase === 'walk') {
    const p = phaseT / WALK_DUR, e = easeInOut(p);
    cat.position.z = lerp(0, END_Z, e);
    walkAmp = damp(walkAmp, (p > 0.02 && p < 0.98) ? 1 : 0, 5, dt);
    camera.position.set(Math.sin(clock.elapsedTime * 1.4) * 0.14, 2.5 + Math.sin(clock.elapsedTime * 1.1) * 0.05, cat.position.z + 5.4);
    camLook.set(0, 1.25, cat.position.z - 2);
    if (Math.random() < 0.04) spawnHeart(catTop(), { scale: 0.4 });
    if (p >= 1) { camPosFrom = camera.position.clone(); camLookFrom = camLook.clone(); setPhase('arrive'); }
  } else if (phase === 'arrive') {
    const e = smooth(phaseT / 1.8);
    cat.rotation.y = lerp(Math.PI, Math.PI * 2, e);
    walkAmp = damp(walkAmp, 0, 5, dt);
    camera.position.lerpVectors(camPosFrom, new THREE.Vector3(0, 1.95, END_Z + 4.3), e);
    camLook.lerpVectors(camLookFrom, new THREE.Vector3(0, 1.35, END_Z), e);
    if (phaseT >= 1.8) { setPhase('ask'); revealProposal(); }
  } else {
    camera.position.set(Math.sin(clock.elapsedTime * 0.4) * 0.12, 1.95 + Math.sin(clock.elapsedTime * 0.7) * 0.03, END_Z + 4.3);
    camLook.set(0, 1.35, END_Z);
  }
  camera.lookAt(camLook);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  phaseT += dt;

  happy = damp(happy, happyTarget, 3, dt);
  happyTarget = damp(happyTarget, 0.15, 0.6, dt);
  eyeSquint = damp(eyeSquint, dragging ? 1 : 0, 6, dt);
  warm = damp(warm, warmTarget, 1.2, dt);
  petalOpacity = damp(petalOpacity, petalTarget, 0.8, dt);
  bloom.strength = damp(bloom.strength, (phase === 'ask' || phase === 'done') ? (accepted ? 1.1 : 0.85) : 0.5, 1.5, dt);

  skyUniforms.top.value.lerpColors(new THREE.Color(0x2f2447), skyWarm.top, warm);
  skyUniforms.mid.value.lerpColors(new THREE.Color(0x7b4d78), skyWarm.mid, warm);
  skyUniforms.bottom.value.lerpColors(new THREE.Color(0xf0a58a), skyWarm.bottom, warm);
  scene.fog.color.copy(skyUniforms.mid.value).multiplyScalar(0.6);
  rim.intensity = lerp(1.3, 2.2, warm);

  const breathe = REDUCED ? 0 : Math.sin(t * 1.6) * 0.02;
  parts.body.scale.y = 0.82 + breathe;
  const walkBob = walkAmp * Math.abs(Math.sin(t * 6)) * 0.06;
  cat.position.y = 0.17 + (REDUCED ? 0 : Math.sin(t * 1.3) * 0.02) + walkBob + anim.hop * Math.sin(clamp(1 - anim.hop, 0, 1) * Math.PI) * 0.6;

  const sq = happy * 0.12;
  parts.body.scale.x = 1 + sq; parts.body.scale.z = (1 + sq) * 0.92;

  const dip = Math.max(anim.headDip, anim.feed) * 0.5;
  parts.head.rotation.x = lerp(parts.head.rotation.x, (REDUCED ? 0 : Math.sin(t * 0.8) * 0.05) + dip * 0.4 + walkAmp * Math.sin(t * 6) * 0.04, 0.15);
  parts.head.rotation.z = lerp(parts.head.rotation.z, Math.sin(t * 0.5) * 0.04, 0.1);
  parts.head.position.y = 1.62 - dip * 0.35 + happy * 0.03;

  const twitch = Math.sin(t * 12) > 0.985 ? 0.2 : 0;
  parts.earL.rotation.z = 0.32 + happy * 0.15 + twitch;
  parts.earR.rotation.z = -0.32 - happy * 0.15 - twitch;

  blinkT -= dt; let blink = 1;
  if (blinkT < 0.16) blink = Math.abs(blinkT / 0.08 - 1);
  if (blinkT < 0) blinkT = 2.5 + Math.random() * 3.5;
  const openness = clamp(blink - eyeSquint * 0.55 - happy * 0.25, 0.08, 1);
  parts.eyeL.scale.y = openness; parts.eyeR.scale.y = openness;

  const stride = t * 9;
  legs.forEach(l => { l.rotation.x = walkAmp * Math.sin(stride + l.userData.phase) * 0.5; });

  const wag = (0.5 + happy * 1.2 + walkAmp * 0.6) * (REDUCED ? 0.4 : 1);
  tailSegs.forEach((s, i) => { s.rotation.z = Math.sin(t * (2 + wag * 2) - i * 0.5) * (0.18 + i * 0.04) * (1 + happy); s.rotation.x = Math.sin(t * 1.3 - i * 0.3) * 0.06; });

  const heartTarget = (phase === 'arrive' || phase === 'ask' || phase === 'done') ? 0.55 : 0;
  heldHeart.scale.setScalar(damp(heldHeart.scale.x, heartTarget, 3, dt));
  heldHeart.rotation.y = t * 1.2; heldHeart.position.y = 1.05 + Math.sin(t * 2) * 0.05;

  anim.feed = Math.max(0, anim.feed - dt * 1.2);
  anim.play = Math.max(0, anim.play - dt * 1.2);
  anim.headDip = Math.max(0, anim.headDip - dt * 1.6);
  anim.hop = Math.max(0, anim.hop - dt * 1.8);

  updateCamera(dt);
  updateHearts(dt);
  updatePetals(dt, t);
  contactShadow.position.set(cat.position.x, 0.18, cat.position.z);
  contactShadow.scale.setScalar(1 + happy * 0.05);

  composer.render();
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ *
 *  Resize + boot
 * ------------------------------------------------------------------ */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); bloom.setSize(innerWidth, innerHeight);
});

function boot() {
  const loader = document.getElementById('loader');
  loader.classList.add('hide'); document.getElementById('hud').hidden = false;
  petalTarget = 0.65; setTimeout(() => (loader.style.display = 'none'), 900);
}

let warmup = 0;
(function prime() {
  composer.render();
  if (++warmup > 3) { tick(); setTimeout(boot, 400); }
  else requestAnimationFrame(prime);
})();
