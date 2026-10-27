import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';
import { HOTSPOTS, TITLE, QUOTE_CREDIT } from './content.js';
import { buildStandInStele } from './stele.js';
import { InfoPanel, Toolbar, HintPanel, makeMarkerTexture } from './panels.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const UP = new THREE.Vector3(0, 1, 0);

// ── renderer / scene ─────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const BG = new THREE.Color(0x1b1814);
const FOG = new THREE.Fog(0x1b1814, 6, 14);
scene.background = BG; scene.fog = FOG;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.02, 60);
const DESK_CAM = new THREE.Vector3(0.8, 1.5, 3.0);
camera.position.copy(DESK_CAM);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.15, 0);
controls.enableDamping = true;
controls.minDistance = 0.9; controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI * 0.55;
controls.update();

scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a342c, 1.15));

// gallery (VR + computer view only; hidden in passthrough)
const gallery = new THREE.Group();
scene.add(gallery);
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28, 56, 56).rotateX(-Math.PI / 2),   // subdivided: avoids giant triangles
    new THREE.MeshStandardMaterial({ color: 0x2e2a25, roughness: 1 }));
  gallery.add(floor);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,226,170,0.38)'); grd.addColorStop(1, 'rgba(255,226,170,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pool.position.y = 0.003; pool.name = 'pool';
  gallery.add(pool);
}

// stele root: position / turn / size all happen here
const steleRoot = new THREE.Group();
scene.add(steleRoot);
{
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(-1.4, 3.2, 2.6);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 1.0); fill.position.set(1.6, 2.4, -2.6);
  const tgt = new THREE.Object3D(); tgt.position.set(0, 1.1, 0);
  key.target = tgt; fill.target = tgt;
  steleRoot.add(key, fill, tgt);
}
let steleMesh = null, usingStandIn = true;
const pool = gallery.getObjectByName('pool');
function syncPool() { pool.position.set(steleRoot.position.x, 0.003, steleRoot.position.z); }

// ── UI objects in 3D ─────────────────────────────────────────
const panel = new InfoPanel(); scene.add(panel.mesh);
const toolbar = new Toolbar(); toolbar.mesh.visible = false; scene.add(toolbar.mesh);
const hint = new HintPanel(); scene.add(hint.mesh);
const reticle = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.15, 48).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xd4af6a, transparent: true, opacity: 0.9, depthTest: false }));
reticle.renderOrder = 20; reticle.visible = false; scene.add(reticle);

const markers = HOTSPOTS.map((hs, i) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40),
    new THREE.MeshBasicMaterial({ map: makeMarkerTexture(i + 1), transparent: true }));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.72, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.5, depthWrite: false }));
  m.add(halo);
  m.userData = { index: i, halo, hover: false };
  m.renderOrder = 5;
  scene.add(m);
  return m;
});

// ── state ────────────────────────────────────────────────────
let mode = 'desktop';          // 'desktop' | 'ar' | 'vr'
let placing = false;
let labelsOn = true;
let needsLayout = false;
let xrFrames = 0;
let activeCtrl = null;
const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

function sizeScale() { return toolbar.small ? CONFIG.tableScale : 1; }

// ── stele loading ────────────────────────────────────────────
async function loadRealModel(url) {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  let obj;
  if (ext === 'stl') {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
    const geo = await new STLLoader().loadAsync(url);
    geo.computeVertexNormals();   // some scans ship with blank normals
    obj = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: CONFIG.stlColor, roughness: 0.75 }));
  } else {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    obj = (await new GLTFLoader().loadAsync(url)).scene;
  }
  const pivot = new THREE.Group();
  if ((params.get('up') || CONFIG.modelUpAxis) === 'z') obj.rotation.x = -Math.PI / 2;
  pivot.add(obj);
  pivot.rotation.y = THREE.MathUtils.degToRad(+(params.get('rot') ?? CONFIG.modelRotationDeg) || 0);
  const outer = new THREE.Group(); outer.add(pivot);
  outer.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(outer);
  const s = CONFIG.realHeightMeters / Math.max(1e-6, box.max.y - box.min.y);
  pivot.scale.setScalar(s);
  outer.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(outer);
  const c = box.getCenter(new THREE.Vector3());
  pivot.position.set(-c.x, -box.min.y, -c.z);
  return outer;
}

async function loadStele() {
  const custom = params.get('model') || CONFIG.modelUrl;
  if (custom) {
    try { steleMesh = await loadRealModel(custom); usingStandIn = false; }
    catch (e) { console.warn('Could not load model, using stand-in:', e); }
  }
  if (!steleMesh) steleMesh = await buildStandInStele({ quality: params.get('quality') === 'low' ? 'low' : 'high' });
  steleRoot.add(steleMesh);
  computeAnchors();
}

// Find each hotspot's spot on the surface by shooting a ray at the stone
function computeAnchors() {
  steleRoot.position.set(0, 0, 0); steleRoot.rotation.set(0, 0, 0); steleRoot.scale.setScalar(1);
  steleRoot.updateMatrixWorld(true);
  const Hm = CONFIG.realHeightMeters;
  for (const hs of HOTSPOTS) {
    const a = THREE.MathUtils.degToRad(hs.angle), y = hs.h * Hm;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    raycaster.set(dir.clone().multiplyScalar(3).setY(y), dir.clone().negate());
    raycaster.far = 4;
    const hit = raycaster.intersectObject(steleMesh, true)[0];
    if (hit) {
      hs.local = hit.point.clone();
      hs.normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : dir.clone();
      if (hs.normal.dot(dir) < 0.2) hs.normal.copy(dir);
    } else {
      hs.local = dir.clone().multiplyScalar(0.3).setY(y);
      hs.normal = dir.clone();
    }
  }
}

// ── markers ──────────────────────────────────────────────────
function updateMarkers(t) {
  const show = labelsOn && !placing && steleRoot.visible;
  const k = sizeScale();
  const base = mode === 'desktop' ? 0.085 : (k < 1 ? 0.035 : 0.07);
  markers.forEach((m, i) => {
    const hs = HOTSPOTS[i];
    m.visible = show;
    if (!show || !hs.local) return;
    tmpV.copy(hs.local).applyMatrix4(steleRoot.matrixWorld);
    tmpV2.copy(hs.normal).transformDirection(steleRoot.matrixWorld);
    m.position.copy(tmpV).addScaledVector(tmpV2, 0.05 * k + 0.012);
    m.quaternion.copy(camera.quaternion);
    const s = base * (m.userData.hover ? 1.25 : 1);
    m.scale.setScalar(s);
    m.userData.halo.material.opacity = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.004 + i));
  });
}

// ── info: desktop card (HTML) or XR panel (3D) ───────────────
let openIndex = -1;
function openInfo(i) {
  const n = HOTSPOTS.length;
  i = ((i % n) + n) % n;
  openIndex = i;
  const hs = HOTSPOTS[i];
  if (mode === 'desktop') { showCard(hs, i); return; }
  panel.show(hs, i, n, { showNote: usingStandIn, credit: QUOTE_CREDIT });
  // place beside the marker, turned toward the student
  const P = markers[i].position.clone();
  const C = camera.position.clone();
  const toUser = C.clone().sub(P).setY(0).normalize();
  const right = new THREE.Vector3().crossVectors(toUser.clone().negate(), UP).normalize();
  // bring the panel to a comfortable reading distance (about 1 m), a bit to the right
  const dist = C.clone().sub(P).setY(0).length();
  const along = THREE.MathUtils.clamp(dist - 1.0, 0.15, Math.max(0.15, dist - 0.5));
  const pos = P.clone().addScaledVector(toUser, along).addScaledVector(right, 0.36);
  pos.y = THREE.MathUtils.clamp(P.y, C.y - 0.5, C.y - 0.08);
  panel.mesh.position.copy(pos);
  panel.mesh.lookAt(C);
}
function closeInfo() { openIndex = -1; panel.hide(); $('card').hidden = true; }

function showCard(hs, i) {
  $('card-num').textContent = i + 1;
  $('card-title').textContent = hs.title;
  $('card-body').textContent = hs.body;
  const q = $('card-quote');
  if (hs.quote) { q.hidden = false; $('card-quote-text').textContent = '“' + hs.quote.text + '”'; $('card-quote-src').textContent = `— ${hs.quote.source}, ${QUOTE_CREDIT}`; }
  else q.hidden = true;
  $('card-note').hidden = !(hs.note && usingStandIn);
  $('card-note').textContent = hs.note || '';
  $('card-think').textContent = hs.think || '';
  $('card').hidden = false;
}
$('card-close').onclick = closeInfo;
$('card-prev').onclick = () => openInfo(openIndex - 1);
$('card-next').onclick = () => openInfo(openIndex + 1);

// ── placement & layout in XR ─────────────────────────────────
function faceUser() {
  const C = camera.position;
  steleRoot.rotation.set(0, Math.atan2(C.x - steleRoot.position.x, C.z - steleRoot.position.z), 0);
}
function layoutToolbar() {
  const C = camera.position.clone();
  const S = steleRoot.position.clone();
  let toUser = C.clone().sub(S).setY(0);
  if (toUser.lengthSq() < 0.01 || placing) {
    // nothing placed yet: put it in front of the student, a little low and left
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    const left = new THREE.Vector3().crossVectors(UP, fwd).normalize();
    toolbar.mesh.position.copy(C).addScaledVector(fwd, 0.8).addScaledVector(left, 0.0).setY(C.y - 0.55);
  } else {
    toUser.normalize();
    const dist = C.clone().sub(S).setY(0).length();
    const left = new THREE.Vector3().crossVectors(UP, toUser.clone().negate()).normalize();
    const k = sizeScale();
    const out = Math.min(dist * 0.6, k < 1 ? 0.45 : 1.0);
    toolbar.mesh.position.copy(S).addScaledVector(toUser, out).addScaledVector(left, k < 1 ? 0.0 : 0.62);
    toolbar.mesh.position.y = k < 1 ? Math.max(S.y + 0.12, 0.55) : 0.95;
  }
  toolbar.mesh.lookAt(C);
}

function startPlacing() {
  placing = true;
  closeInfo();
  hint.setText(toolbar.small
    ? 'Point at a table or the floor, then pull the trigger (or pinch) to set it down.'
    : 'Point at the floor, then pull the trigger (or pinch) to set the stele down.');
  hint.mesh.visible = true;
}
function finishPlacing(target) {
  placing = false;
  reticle.visible = false; hint.mesh.visible = false;
  steleRoot.position.copy(target);
  faceUser();
  steleRoot.visible = true;
  syncPool();
  layoutToolbar();
}

// ── controllers & hands ──────────────────────────────────────
const controllers = [];
const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  const line = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
  line.scale.z = 3;
  c.add(line);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8 }));
  dot.visible = false; scene.add(dot);
  c.userData = { line, dot, src: null, hitSrc: null, target: null };
  c.addEventListener('connected', (e) => onConnected(c, e.data));
  c.addEventListener('disconnected', () => {
    c.userData.hitSrc?.cancel?.(); c.userData.hitSrc = null; c.userData.src = null;
    if (activeCtrl === c) activeCtrl = null;
  });
  c.addEventListener('selectstart', () => { activeCtrl = c; });
  c.addEventListener('select', () => onSelect(c));
  scene.add(c);
  controllers.push(c);
}

function onConnected(c, src) {
  c.userData.src = src;
  c.userData.line.visible = src.targetRayMode === 'tracked-pointer';
  if (!activeCtrl || src.handedness === 'right') activeCtrl = c;
  const session = renderer.xr.getSession();
  if (mode === 'ar' && session?.requestHitTestSource) {
    session.requestHitTestSource({ space: src.targetRaySpace })
      .then((h) => { c.userData.hitSrc = h; })
      .catch(() => { /* hit-test not available: we fall back to the floor */ });
  }
}

function setRayFrom(c) {
  tmpM.identity().extractRotation(c.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
  raycaster.far = 10;
}

function uiTargets() {
  const t = [];
  if (toolbar.mesh.visible) t.push(toolbar.mesh);
  if (panel.mesh.visible) t.push(panel.mesh);
  for (const m of markers) if (m.visible) t.push(m);
  return t;
}

function uiHit(c) {
  setRayFrom(c);
  return raycaster.intersectObjects(uiTargets(), false)[0] || null;
}

function onSelect(c) {
  if (!renderer.xr.isPresenting) return;
  const hit = uiHit(c);
  if (hit) {
    const obj = hit.object;
    if (obj === toolbar.mesh) return onToolbar(toolbar.buttonAt(hit.uv));
    if (obj === panel.mesh) {
      const id = panel.buttonAt(hit.uv);
      if (id === 'close') closeInfo();
      else if (id === 'next') openInfo(openIndex + 1);
      else if (id === 'prev') openInfo(openIndex - 1);
      return;
    }
    if (obj.userData.index !== undefined) return openInfo(obj.userData.index);
  }
  if (placing && c.userData.target) finishPlacing(c.userData.target.clone());
}

function onToolbar(id) {
  if (!id) return;
  if (id === 'left') steleRoot.rotation.y += Math.PI / 8;
  if (id === 'right') steleRoot.rotation.y -= Math.PI / 8;
  if (id === 'size') {
    toolbar.small = !toolbar.small; toolbar.draw();
    steleRoot.scale.setScalar(sizeScale());
    startPlacing();
  }
  if (id === 'move') startPlacing();
  if (id === 'labels') { labelsOn = !labelsOn; toolbar.labels = labelsOn; toolbar.draw(); if (!labelsOn) closeInfo(); }
  if (id === 'exit') renderer.xr.getSession()?.end();
}

function findTarget(c, frame) {
  const refSpace = renderer.xr.getReferenceSpace();
  if (frame && c.userData.hitSrc && refSpace) {
    for (const r of frame.getHitTestResults(c.userData.hitSrc)) {
      const pose = r.getPose(refSpace);
      if (!pose) continue;
      tmpM.fromArray(pose.transform.matrix);
      const n = new THREE.Vector3(0, 1, 0).transformDirection(tmpM);
      if (n.y > 0.85) return new THREE.Vector3().setFromMatrixPosition(tmpM);   // flat surface
    }
  }
  // fallback: where the ray meets the floor (y = 0)
  setRayFrom(c);
  const { origin, direction } = raycaster.ray;
  if (direction.y < -0.05) {
    const d = -origin.y / direction.y;
    if (d > 0 && d < 8) return origin.clone().addScaledVector(direction, d);
  }
  return null;
}

let lastT = 0;
function xrUpdate(frame, dt) {
  xrFrames++;
  if (needsLayout && xrFrames > 3) {   // wait until the headset pose is real
    needsLayout = false;
    if (mode === 'vr') {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
      steleRoot.position.copy(camera.position).setY(0).addScaledVector(fwd, 2.0);
      faceUser();
      syncPool();
    }
    layoutToolbar();
  }

  // hover + ray length for each controller / hand
  for (const c of controllers) {
    const u = c.userData;
    if (!u.src) { u.dot.visible = false; continue; }
    const hit = uiHit(c);
    u.line.scale.z = hit ? hit.distance : 3;
    u.dot.visible = !!hit;
    if (hit) u.dot.position.copy(hit.point);
    c.userData.uiHit = hit;
  }
  const hovered = new Set(controllers.map((c) => c.userData.uiHit?.object).filter(Boolean));
  for (const m of markers) m.userData.hover = hovered.has(m);
  const hb = (pnl) => {
    const h = controllers.map((c) => c.userData.uiHit).find((h) => h && h.object === pnl.mesh);
    pnl.setHover(h ? pnl.buttonAt(h.uv) : null);
  };
  hb(toolbar); if (panel.mesh.visible) hb(panel);

  if (placing) {
    const c = (activeCtrl && activeCtrl.userData.src) ? activeCtrl : controllers.find((x) => x.userData.src);
    for (const x of controllers) x.userData.target = x.userData.src ? findTarget(x, frame) : null;
    const target = c?.userData.target;
    if (target) {
      reticle.visible = true;
      reticle.position.copy(target).y += 0.004;
      reticle.scale.setScalar(sizeScale() < 1 ? 0.5 : 1);
      steleRoot.visible = true;
      steleRoot.position.copy(target);
      faceUser();
    } else {
      reticle.visible = false;
    }
    // keep the hint floating in front of the student
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    hint.mesh.position.copy(camera.position).addScaledVector(fwd, 1.1).setY(camera.position.y + 0.12);
    hint.mesh.lookAt(camera.position);
  } else {
    // thumbstick turns the stele
    for (const c of controllers) {
      const gp = c.userData.src?.gamepad;
      const x = gp && gp.axes.length >= 4 ? gp.axes[2] : 0;
      if (Math.abs(x) > 0.25) steleRoot.rotation.y -= x * dt * 1.4;
    }
  }
}

// ── desktop mouse ────────────────────────────────────────────
const pointer = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (mode !== 'desktop' || !downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;
  const m = pickMarker(e);
  if (m) openInfo(m.userData.index);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (mode !== 'desktop') return;
  const m = pickMarker(e);
  markers.forEach((x) => (x.userData.hover = x === m));
  renderer.domElement.style.cursor = m ? 'pointer' : 'grab';
});
function pickMarker(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(markers.filter((m) => m.visible), false)[0];
  return hit ? hit.object : null;
}

// ── sessions ─────────────────────────────────────────────────
async function enterXR(type) {
  if (renderer.xr.isPresenting) return;
  const init = type === 'ar'
    ? { requiredFeatures: ['local-floor'], optionalFeatures: ['hit-test', 'hand-tracking'] }
    : { requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking'] };
  try {
    const session = await navigator.xr.requestSession(type === 'ar' ? 'immersive-ar' : 'immersive-vr', init);
    mode = type;
    session.addEventListener('end', onSessionEnd);
    await renderer.xr.setSession(session);
    onSessionStart();
  } catch (e) {
    console.error(e);
    mode = 'desktop';
    setStatus(`Couldn't start ${type === 'ar' ? 'passthrough' : 'VR'}: ${e.message || e}`);
  }
}

function onSessionStart() {
  $('overlay').hidden = true; $('card').hidden = true; $('help').hidden = true;
  controls.enabled = false;
  closeInfo();
  toolbar.small = false; toolbar.draw();
  steleRoot.scale.setScalar(1);
  toolbar.mesh.visible = true;
  if (mode === 'ar') {
    scene.background = null; scene.fog = null; gallery.visible = false;
    renderer.setClearColor(0x000000, 0);
    steleRoot.visible = false;
    startPlacing();
  } else {
    scene.background = BG; scene.fog = FOG; gallery.visible = true;
    placing = false; hint.mesh.visible = false;
    steleRoot.visible = true;
  }
  needsLayout = true;
  xrFrames = 0;
}

function onSessionEnd() {
  mode = 'desktop';
  placing = false;
  scene.background = BG; scene.fog = FOG; gallery.visible = true;
  steleRoot.position.set(0, 0, 0); steleRoot.rotation.set(0, 0, 0); steleRoot.scale.setScalar(1);
  steleRoot.visible = true; syncPool();
  toolbar.mesh.visible = false; hint.mesh.visible = false; reticle.visible = false;
  closeInfo();
  controls.enabled = true;
  camera.position.copy(DESK_CAM); camera.quaternion.identity();
  controls.target.set(0, 1.15, 0); controls.update();
  onResize();
  $('overlay').hidden = false; $('help').hidden = false;
}

function setStatus(t) { $('status').textContent = t; }

// ── boot ─────────────────────────────────────────────────────
function onResize() {
  if (renderer.xr.isPresenting) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

renderer.setAnimationLoop((t, frame) => {
  const dt = Math.min(0.1, (t - lastT) / 1000 || 0); lastT = t;
  if (renderer.xr.isPresenting) xrUpdate(frame, dt);
  else controls.update();
  updateMarkers(t);
  renderer.render(scene, camera);
});

(async function boot() {
  document.title = TITLE;
  $('title').textContent = TITLE;
  setStatus('Carving the stone…');
  await new Promise((r) => setTimeout(r, 30));   // let the page paint first
  await loadStele();
  window.__steleReady = true;
  // handy hooks for automated testing (harmless in normal use)
  window.__dbg = {
    THREE, camera, controls, openInfo, steleRoot, markers, toolbar, panel,
    state: () => ({ mode, placing, labelsOn, small: toolbar.small, panel: panel.mesh.visible, openIndex,
      stele: steleRoot.position.toArray().map((v) => +v.toFixed(2)), rotY: +steleRoot.rotation.y.toFixed(2),
      hitTest: controllers.map((c) => !!c.userData.hitSrc), inputs: controllers.map((c) => c.userData.src?.handedness || null) }),
  };

  const btnAR = $('btn-ar'), btnVR = $('btn-vr');
  btnAR.onclick = () => enterXR('ar');
  btnVR.onclick = () => enterXR('vr');
  if (!window.isSecureContext) { setStatus('This page needs to be opened over https:// to use the headset.'); return; }
  if (!('xr' in navigator)) { setStatus('Explore it here with your mouse. To walk around it, open this page in a VR headset.'); return; }
  const [ar, vr] = await Promise.all([
    navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
    navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
  ]);
  btnAR.disabled = !ar; btnVR.disabled = !vr;
  if (ar) setStatus('Ready. Passthrough puts the stele in your real room.');
  else if (vr) setStatus('Passthrough isn\'t available in this browser, but VR is.');
  else setStatus('Explore it here with your mouse. To walk around it, open this page in a VR headset.');
})();
