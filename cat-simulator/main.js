import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

/* ------------------------------------------------------------------ *
 *  Personalize
 *  Put your email between the quotes to let her reply reach you by mail.
 *  Leave it empty ('') to just show her note on screen.
 * ------------------------------------------------------------------ */
const RECIPIENT_EMAIL = '';

/* ------------------------------------------------------------------ *
 *  Gallery layout
 * ------------------------------------------------------------------ */
const WALL_HALF = 3.2;
const WALL_H = 4.7;
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

// movement bounds
const X_LIM = WALL_HALF - 0.7;
const Z_FRONT = 2.6;
const Z_BACK = END_WALL_Z + 1.4;
const MOVE_SPEED = 3.4, BACK_SPEED = 2.2, TURN_SPEED = 2.0;
const CAM_DIST = 4.7, CAM_HEIGHT = 2.5;

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

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 200);
camera.position.set(3.4, 2.4, 5.6);

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

const rim = new THREE.DirectionalLight(0xff9ec4, 1.4);
rim.position.set(-5, 3, -4);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffe4c4, 0x4a3a63, 0.95));
scene.add(new THREE.AmbientLight(0xffffff, 0.32));

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
startRug.position.set(0, 0.17, 0.6); startRug.receiveShadow = true; hall.add(startRug);

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
  const tex = texLoader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; });
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
cat.position.set(0, 0.17, 0.8);
cat.rotation.y = Math.PI;   // face into the hall (-Z)
scene.add(cat);
let heading = Math.PI;
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
const tailSegs = []; let prevSeg = tail;
for (let i = 0; i < 6; i++) {
  const seg = new THREE.Group(); const r = 0.2 - i * 0.02;
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(i % 2 ? FUR_D : FUR)); m.castShadow = true; seg.add(m);
  seg.position.y = i === 0 ? 0 : 0.28; prevSeg.add(seg); prevSeg = seg; tailSegs.push(seg);
}

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
 *  State + input
 * ------------------------------------------------------------------ */
let phase = 'intro';           // intro -> roam
let modalOpen = false;
let happy = 0, happyTarget = 0;
let blinkT = 2 + Math.random() * 3, eyeSquint = 0, walkAmp = 0;
let hintFade = 7;

const input = { fwd: false, back: false, left: false, right: false };
const camLook = new THREE.Vector3(0, 1.1, 0);
const forward = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const petTargets = [skull, muzzle, body];
function petHit(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(petTargets, false)[0];
}
canvas.addEventListener('pointerdown', (e) => {
  if (phase !== 'roam' || modalOpen) return;
  const hit = petHit(e);
  if (hit) { happyTarget = 1; eyeSquint = 1; for (let i = 0; i < 4; i++) spawnHeart(hit.point.clone().add(new THREE.Vector3(0, 0.35, 0)), { scale: 0.5 }); purr(); pop(600); }
});
addEventListener('pointerup', () => { eyeSquint = 0; });

// keyboard
const KEYMAP = { ArrowUp: 'fwd', KeyW: 'fwd', ArrowDown: 'back', KeyS: 'back', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', (e) => {
  if (modalOpen || e.target.tagName === 'TEXTAREA') return;
  const k = KEYMAP[e.code]; if (k) { input[k] = true; e.preventDefault(); firstMove(); }
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) input[k] = false; });

// on-screen pad (press & hold)
document.querySelectorAll('.pad__btn').forEach(btn => {
  const dir = btn.dataset.dir;
  const on = (e) => { e.preventDefault(); input[dir] = true; firstMove(); };
  const off = (e) => { e.preventDefault(); input[dir] = false; };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('pointercancel', off);
});

const hintEl = document.getElementById('hint');
let moved = false;
function firstMove() { if (!moved) { moved = true; hintFade = 2.2; } }

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
 *  Opening + reply modal
 * ------------------------------------------------------------------ */
const openingEl = document.getElementById('opening');
const hudEl = document.getElementById('hud');
document.getElementById('startBtn').addEventListener('click', () => {
  initAudio();
  openingEl.hidden = true;
  hudEl.hidden = false;
  phase = 'roam';
});

const replyEl = document.getElementById('reply');
const replyBox = document.getElementById('replyBox');
const replyInput = document.getElementById('replyInput');
const replyDone = document.getElementById('replyDone');
const replyEcho = document.getElementById('replyEcho');
const mailReplyBtn = document.getElementById('mailReplyBtn');
function openReply() { modalOpen = true; for (const k in input) input[k] = false; replyEl.hidden = false; setTimeout(() => replyInput.focus(), 60); }
function closeReply() { modalOpen = false; replyEl.hidden = true; }
document.getElementById('openReplyBtn').addEventListener('click', openReply);
document.getElementById('closeReplyBtn').addEventListener('click', closeReply);
document.getElementById('backToGalleryBtn').addEventListener('click', closeReply);
document.getElementById('replyAgainBtn').addEventListener('click', () => {
  replyInput.value = ''; replyDone.hidden = true; replyBox.hidden = false; mailReplyBtn.hidden = true; replyInput.focus();
});
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
  replyBox.hidden = true; replyDone.hidden = false;
  happyTarget = 1;
  for (let i = 0; i < 10; i++) spawnHeart(new THREE.Vector3(cat.position.x + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, cat.position.z + (Math.random() - 0.5) * 2), { scale: 0.7, ttl: 2.4 });
  pop(560);
}
document.getElementById('sendReplyBtn').addEventListener('click', sendReply);
replyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } });

/* ------------------------------------------------------------------ *
 *  Loop
 * ------------------------------------------------------------------ */
const clock = new THREE.Clock();

function updateMoveAndCamera(dt, t) {
  forward.set(Math.sin(heading), 0, Math.cos(heading));

  if (phase === 'roam' && !modalOpen) {
    if (input.left) heading += TURN_SPEED * dt;
    if (input.right) heading -= TURN_SPEED * dt;
    forward.set(Math.sin(heading), 0, Math.cos(heading));
    let step = 0;
    if (input.fwd) step += MOVE_SPEED * dt;
    if (input.back) step -= BACK_SPEED * dt;
    cat.position.x = clamp(cat.position.x + forward.x * step, -X_LIM, X_LIM);
    cat.position.z = clamp(cat.position.z + forward.z * step, Z_BACK, Z_FRONT);
    cat.rotation.y = heading;
    const active = input.fwd || input.back, turningNow = input.left || input.right;
    walkAmp = damp(walkAmp, active ? 1 : (turningNow ? 0.5 : 0), 6, dt);
  } else {
    walkAmp = damp(walkAmp, 0, 6, dt);
  }

  if (phase === 'intro') {
    const desired = new THREE.Vector3(3.2 + Math.sin(t * 0.3) * 0.3, 2.4, 5.6);
    camera.position.lerp(desired, 1 - Math.exp(-3 * dt));
    camLook.lerp(new THREE.Vector3(cat.position.x, 1.15, cat.position.z), 1 - Math.exp(-3 * dt));
  } else {
    const desired = new THREE.Vector3(
      cat.position.x - forward.x * CAM_DIST,
      CAM_HEIGHT,
      cat.position.z - forward.z * CAM_DIST
    );
    desired.x = clamp(desired.x, -WALL_HALF + 0.3, WALL_HALF - 0.3);
    desired.z = clamp(desired.z, Z_BACK - 1.2, Z_FRONT + 4);
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
    camLook.lerp(new THREE.Vector3(cat.position.x + forward.x * 1.6, 1.28, cat.position.z + forward.z * 1.6), 1 - Math.exp(-8 * dt));
  }
  camera.lookAt(camLook);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  happy = damp(happy, happyTarget, 3, dt);
  happyTarget = damp(happyTarget, 0.12, 0.6, dt);
  eyeSquint = damp(eyeSquint, 0, 4, dt);
  petalOpacity = damp(petalOpacity, petalTarget, 0.8, dt);

  // hint fade
  if (hintEl && hintFade > 0) { hintFade -= dt; if (hintFade <= 0) hintEl.style.opacity = 0; }

  const breathe = REDUCED ? 0 : Math.sin(t * 1.6) * 0.02;
  parts.body.scale.y = 0.82 + breathe;
  const walkBob = walkAmp * Math.abs(Math.sin(t * 6)) * 0.06;
  cat.position.y = 0.17 + (REDUCED ? 0 : Math.sin(t * 1.3) * 0.02) + walkBob;

  const sq = happy * 0.12;
  parts.body.scale.x = 1 + sq; parts.body.scale.z = (1 + sq) * 0.92;

  parts.head.rotation.x = lerp(parts.head.rotation.x, (REDUCED ? 0 : Math.sin(t * 0.8) * 0.05) + walkAmp * Math.sin(t * 6) * 0.04, 0.15);
  parts.head.rotation.z = lerp(parts.head.rotation.z, Math.sin(t * 0.5) * 0.04, 0.1);
  parts.head.position.y = 1.62 + happy * 0.03;

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

  updateMoveAndCamera(dt, t);
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
  loader.classList.add('hide');
  petalTarget = 0.6;
  setTimeout(() => (loader.style.display = 'none'), 900);
}

let warmup = 0;
(function prime() {
  composer.render();
  if (++warmup > 3) { tick(); setTimeout(boot, 400); }
  else requestAnimationFrame(prime);
})();
