import * as THREE from 'three';
import { PRODUCTS, AISLES, GONDOLAS, TILL, FRIDGE, placeName } from '../data/products';
import { getState, setState } from '../store';
import { sfx } from './audio';
import { buildProductMesh, centredProduct } from '../three/productModels';
import { packBasket } from './basket';
import { inTillZone, startCheckout } from './checkout';

// Mutable game state shared by the render loop. React reads the parts it shows through the store.
const clamp = THREE.MathUtils.clamp;
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeBack = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export const world = {
  gl: null, scene: null, camera: null, overlay: null, viewRoot: null,
  types: [], occluders: [],
  pos: new THREE.Vector3(-2, 0, 9.4), vel: new THREE.Vector3(),
  yaw: 0, pitch: -0.06, stepPhase: 0, lastStep: 0, moveAmt: 0, bobX: 0, bobY: 0, time: 0,
  lookVel: new THREE.Vector2(), // smoothed yaw / pitch speed, drives hand sway
  keys: {}, joy: { x: 0, y: 0 }, mouse: { x: 0, y: 0, inside: false },
  held: null, hover: null, hoverAmt: 0,
  // What the hand should be doing; Hand.jsx turns this into motion every frame.
  hand: { mode: 'rest', fingers: 'relaxed', reach: new THREE.Vector3(), anchor: null, squeeze: 0 },
  // The basket on the left arm; BasketArm.jsx fills in `basket` and reads `basketMode`.
  basket: null, basketMode: 'rest',
  hoverTagEl: null, cartBtnEl: null,
  npcs: [], // { x, z, r } circles you bump into (shoppers, guard)
  till: null, // set by Checkout.jsx
  third: false, // third-person camera active this frame
  paid: false,
  onFrame: [],
  debugDt: 0,
  reduceMotion,
};
// Solid things you cannot walk through: shelf gondolas, the till counter and the cashier's pen.
const blockers = [
  ...GONDOLAS.map((g) => ({ x0: g - 0.53, x1: g + 0.53, z0: -7.22, z1: 7.22 })),
  { x0: TILL.cx - TILL.w / 2 - 0.03, x1: TILL.cx + TILL.w / 2 + 0.03, z0: TILL.cz - TILL.d / 2 - 0.03, z1: TILL.cz + TILL.d / 2 + 0.03 },
  { x0: TILL.cx - TILL.w / 2 - 0.08, x1: TILL.cx - TILL.w / 2 + 0.02, z0: TILL.cz + TILL.d / 2, z1: 10.6 },
  { x0: TILL.cx + TILL.w / 2, x1: 8, z0: TILL.cz + TILL.d / 2 - 0.05, z1: TILL.cz + TILL.d / 2 + 0.01 },
];
const BACK_LIMIT = FRIDGE.front + 0.6; // stay in front of the fridge doors
let phase = 'loading';
let wasLocked = false;
const tweens = [];
export function tween(dur, fn, done) { const t = { t: 0, dur, fn, done }; tweens.push(t); fn(0); return t; }
export function setPhase(p) { phase = p; setState({ phase: p }); }
export const getPhase = () => phase;

/* ---------- registration (called by the scene components) ---------- */
export function registerType(t) { world.types[t.i] = t; }
export function setInstance(t, idx, m) { for (const im of t.meshes) { im.setMatrixAt(idx, m); im.instanceMatrix.needsUpdate = true; } }
const hideM = new THREE.Matrix4(), hideS = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4);
const hideInstance = (t, idx) => setInstance(t, idx, hideM.copy(t.slots[idx]).multiply(hideS));

/* ---------- raycasting ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpV = new THREE.Vector3(), hits = [];
ray.far = 3.2;
export function rayHit(cx, cy) {
  const { camera } = world;
  if (!camera || !(camera.aspect > 0) || !isFinite(camera.aspect)) return null;
  const r = world.gl.domElement.getBoundingClientRect();
  if (cx == null) ndc.set(0, 0);
  else { if (!r.width || !r.height) return null; ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); }
  ray.setFromCamera(ndc, camera);
  hits.length = 0; ray.intersectObjects(world.occluders, false, hits);
  const wall = hits.length ? hits[0].distance : Infinity;
  let best = null;
  for (const t of world.types) {
    if (!t || !ray.ray.intersectBox(t.box, tmpV) || tmpV.distanceTo(ray.ray.origin) > ray.far) continue;
    hits.length = 0; ray.intersectObjects(t.meshes, false, hits);
    for (const h of hits) {
      if (h.instanceId == null || t.taken[h.instanceId] || h.distance > wall) continue;
      if (!best || h.distance < best.distance) best = { distance: h.distance, ti: t.i, idx: h.instanceId };
    }
  }
  return best;
}

/* ---------- hover ---------- */
const hm = new THREE.Matrix4(), hm2 = new THREE.Matrix4();
function setHover(h) {
  const cur = world.hover;
  if (h && cur && h.ti === cur.ti && h.idx === cur.idx) return;
  if (cur) { const t = world.types[cur.ti]; if (!t.taken[cur.idx]) setInstance(t, cur.idx, t.slots[cur.idx]); }
  world.hover = h ? { ti: h.ti, idx: h.idx } : null;
  world.hoverAmt = 0;
  setState({ hover: h ? h.ti : null });
  world.gl.domElement.style.cursor = h && !getState().locked ? 'pointer' : '';
}
function updateHover(dt) {
  const s = getState();
  if (phase !== 'walk' || s.receipt) { if (world.hover) setHover(null); return; }
  let h = null;
  if (s.locked) h = rayHit(null, null);
  else if (world.mouse.inside && !s.touchUI && !dragLook) h = rayHit(world.mouse.x, world.mouse.y);
  setHover(h);
  if (world.hover) {
    world.hoverAmt += (1 - world.hoverAmt) * Math.min(1, dt * 14);
    const t = world.types[world.hover.ti], a = world.hoverAmt;
    hm.copy(t.slots[world.hover.idx]).multiply(hm2.makeTranslation(0, a * 0.006, a * 0.03)).multiply(hm2.makeScale(1 + a * 0.035, 1 + a * 0.035, 1 + a * 0.035));
    setInstance(t, world.hover.idx, hm);
    const el = world.hoverTagEl;
    if (el) {
      if (s.locked) { el.style.left = '50%'; el.style.top = 'calc(50% + 22px)'; }
      else { el.style.left = world.mouse.x + 'px'; el.style.top = world.mouse.y + 24 + 'px'; }
    }
  }
}

/* ---------- poses in camera space ---------- */
const invRoot = new THREE.Matrix4(), pm = new THREE.Matrix4(), pm2 = new THREE.Matrix4(), pS = new THREE.Vector3();
function slotLocal(t, idx, out) {
  world.viewRoot.updateMatrixWorld(true);
  invRoot.copy(world.viewRoot.matrixWorld).invert();
  pm.copy(t.slots[idx]).multiply(pm2.makeTranslation(0, t.p.H / 2, 0)).premultiply(invRoot);
  pm.decompose(out.pos, out.quat, pS);
  return out;
}
function inspectPose(p) {
  const d = 0.24 + p.maxDim * 1.15, up = world.camera.aspect < 1 ? 0.2 : 0.11;
  return { pos: new THREE.Vector3(0.015, d * up, -d), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.14, -0.42, 0.02)) };
}
const anchorV = new THREE.Vector3();
function anchorLocal(out) {
  const a = world.hand.anchor;
  if (!a) return out.set(0.15, -0.15, -0.45);
  a.getWorldPosition(anchorV);
  return out.copy(world.viewRoot.worldToLocal(anchorV));
}
function reachPoint(target, out, maxLen = 0.56) {
  const len = target.length();
  return out.copy(target).multiplyScalar(Math.min(1, maxLen / Math.max(0.001, len)));
}
// Lowest point of the held item, so the palm can sit under it however it is turned.
const e3 = new THREE.Matrix4();
function supportPoint(held, out) {
  const p = held.p, el = e3.makeRotationFromQuaternion(held.grp.quaternion).elements, s = held.grp.scale.x;
  const ext = (Math.abs(el[1]) * p.W / 2 + Math.abs(el[5]) * p.H / 2 + Math.abs(el[9]) * p.D / 2) * s;
  return out.copy(held.grp.position).add(tmpV.set(0, -ext, 0));
}

/* ---------- actions ---------- */
export function exitLock() { if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* not locked */ } } }
let everLocked = false;
export function lock() {
  const s = getState(), c = world.gl && world.gl.domElement;
  if (!c || s.touchUI || s.lockRefused || s.locked || !c.requestPointerLock) return;
  const refuse = () => { if (!everLocked) setState({ lockRefused: true }); };
  try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(refuse); } catch (e) { refuse(); }
}

export function pick(ti, idx) {
  if (phase !== 'walk') return;
  const t = world.types[ti], p = t.p;
  setHover(null);
  wasLocked = getState().locked; exitLock();
  setPhase('picking');
  t.taken[idx] = 1;
  const grp = new THREE.Group(), inner = buildProductMesh(p);
  inner.position.y = -p.H / 2; grp.add(inner); world.viewRoot.add(grp);
  const start = slotLocal(t, idx, { pos: new THREE.Vector3(), quat: new THREE.Quaternion() });
  hideInstance(t, idx);
  const target = inspectPose(p);
  const held = world.held = { t, idx, p, grp, q: target.quat.clone(), base: target.pos.clone(), zoom: 1, vx: 0, vy: 0, support: new THREE.Vector3() };
  grp.position.copy(start.pos); grp.quaternion.copy(start.quat);
  const H = world.hand;
  reachPoint(start.pos, H.reach); H.mode = 'reach'; H.fingers = 'open';
  sfx.reach();
  const grabPos = new THREE.Vector3(), grabQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -0.2, 0)), a = new THREE.Vector3(), q0 = start.quat.clone();
  let gripped = false, carried = false;
  tween(0.9, (k) => {
    const tt = k * 0.9;
    if (tt < 0.42) {
      const f = easeInOut(seg(tt, 0.14, 0.42));
      anchorLocal(a);
      grp.position.lerpVectors(start.pos, a, f);
      grp.quaternion.copy(q0).slerp(grabQ, f);
    } else {
      if (!carried) { carried = true; grabPos.copy(grp.position); H.mode = 'carry'; }
      const f = easeInOut(seg(tt, 0.42, 0.9));
      grp.position.lerpVectors(grabPos, held.base, f);
      grp.quaternion.copy(grabQ).slerp(held.q, f);
    }
    if (!gripped && tt >= 0.36) { gripped = true; H.fingers = 'grip'; H.squeeze = 1; sfx.grab(p.shape); }
    supportPoint(held, held.support);
  }, () => { H.fingers = 'cradle'; setPhase('inspect'); });
  setState({ inspecting: p.id, cartOpen: false });
}

function finish() {
  world.held = null;
  world.hand.mode = 'rest'; world.hand.fingers = 'relaxed';
  setState({ inspecting: null });
  setPhase('walk');
}

export function putBack() {
  if (phase !== 'inspect') return;
  const h = world.held;
  setPhase('returning'); setState({ inspecting: null });
  if (wasLocked) lock();
  const H = world.hand, sp = h.grp.position.clone(), sq = h.grp.quaternion.clone();
  const end = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, rel = new THREE.Vector3(), relPos = new THREE.Vector3();
  let released = false, phaseB = false;
  sfx.reach();
  tween(0.62, (k) => {
    const tt = k * 0.62;
    slotLocal(h.t, h.idx, end);
    if (tt < 0.3) {
      reachPoint(end.pos, rel, 0.5);
      const f = easeInOut(seg(tt, 0, 0.3));
      h.grp.position.lerpVectors(sp, rel, f);
      h.grp.quaternion.copy(sq).slerp(end.quat, f * 0.7);
      supportPoint(h, h.support);
    } else {
      if (!phaseB) { phaseB = true; relPos.copy(h.grp.position); H.mode = 'reach'; reachPoint(end.pos, H.reach, 0.5); }
      const f = easeInOut(seg(tt, 0.3, 0.6));
      h.grp.position.lerpVectors(relPos, end.pos, f);
      h.grp.quaternion.copy(sq).slerp(end.quat, 0.7 + 0.3 * f);
    }
    if (!released && tt > 0.28) { released = true; H.fingers = 'open'; }
  }, () => {
    world.viewRoot.remove(h.grp);
    h.t.taken[h.idx] = 0; setInstance(h.t, h.idx, h.t.slots[h.idx]);
    sfx.place(h.p.shape); finish();
  });
}

/** A pose inside the basket, expressed in camera (viewRoot) space. */
const vM = new THREE.Matrix4(), ONE = new THREE.Vector3(1, 1, 1);
function basketToView(pose, out) {
  world.viewRoot.updateMatrixWorld(true);
  invRoot.copy(world.viewRoot.matrixWorld).invert();
  vM.compose(pose.pos, pose.quat, ONE).premultiply(world.basket.items.matrixWorld).premultiply(invRoot);
  vM.decompose(out.pos, out.quat, pS);
  return out;
}
let basketToken = 0;
function lowerBasketSoon(delay) {
  const token = ++basketToken;
  tween(delay, () => {}, () => { if (token === basketToken) world.basketMode = 'rest'; });
}

/** Carry the item across to the basket on the left arm and set it down inside. */
export function addToCart() {
  if (phase !== 'inspect' || !world.basket) return;
  const h = world.held, H = world.hand;
  setPhase('returning'); setState({ inspecting: null });
  if (wasLocked) lock();
  const entry = { ti: h.t.i, idx: h.idx, mesh: h.grp, twist: (Math.random() - 0.5) * 0.6 };
  const poses = packBasket([...getState().cart, entry]);
  const slot = poses[poses.length - 1];
  basketToken++;
  world.basketMode = 'receive';
  H.fingers = 'grip';
  sfx.reach();
  const sp = h.grp.position.clone(), sq = h.grp.quaternion.clone();
  const tgt = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, above = new THREE.Vector3();
  let released = false;
  tween(0.95, (k) => {
    const tt = k * 0.95;
    basketToView(slot, tgt);
    above.copy(tgt.pos); above.y += 0.1;
    if (tt < 0.6) {
      const f = easeInOut(seg(tt, 0.05, 0.6));
      h.grp.position.lerpVectors(sp, above, f);
      h.grp.position.y += Math.sin(f * Math.PI) * 0.035;
      h.grp.quaternion.copy(sq).slerp(tgt.quat, f);
    } else {
      const f = seg(tt, 0.6, 0.8);
      h.grp.position.lerpVectors(above, tgt.pos, f * f); // lowered, then let go
      h.grp.quaternion.copy(tgt.quat);
    }
    if (!released) supportPoint(h, h.support);
    if (!released && tt > 0.68) { released = true; H.mode = 'rest'; H.fingers = 'relaxed'; }
  }, () => {
    world.basket.items.attach(h.grp);
    h.grp.position.copy(slot.pos); h.grp.quaternion.copy(slot.quat);
    world.basket.kick = 1.4;
    sfx.drop(h.p.shape);
    setState((s) => ({ cart: [...s.cart, entry], cartBump: s.cartBump + 1 }));
    finish();
    lowerBasketSoon(0.35);
  });
}

/** Take an item out of the basket (it shrinks away; restock puts it back on the shelf). */
function liftOut(e, delay = 0) {
  const m = e.mesh;
  if (!m) return;
  const y0 = m.position.y;
  tween(delay + 0.28, (k) => {
    const f = easeInOut(seg(k * (delay + 0.28), delay, delay + 0.28));
    m.position.y = y0 + f * 0.08;
    m.scale.setScalar(Math.max(0.001, 1 - f));
  }, () => { if (m.parent) m.parent.remove(m); });
}
/** Let the remaining items settle into their new places. */
function settleBasket(cart) {
  const poses = packBasket(cart);
  cart.forEach((e, i) => {
    const m = e.mesh;
    if (!m) return;
    const p0 = m.position.clone(), q0 = m.quaternion.clone();
    tween(0.32, (k) => { const f = easeInOut(k); m.position.lerpVectors(p0, poses[i].pos, f); m.quaternion.copy(q0).slerp(poses[i].quat, f); });
  });
}

const popM = new THREE.Matrix4(), popS = new THREE.Matrix4();
function restock(ti, idx, delay = 0) {
  const t = world.types[ti];
  const go = () => tween(0.42, (k) => {
    const s = Math.max(0.001, easeBack(k));
    setInstance(t, idx, popM.copy(t.slots[idx]).multiply(popS.makeScale(s, s, s)));
  }, () => { t.taken[idx] = 0; setInstance(t, idx, t.slots[idx]); });
  if (delay) tween(delay, () => {}, go); else go();
}
let toastTimer = 0;
export function toast(msg) {
  setState({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setState({ toast: null }), 2300);
}
export function removeOne(ti) {
  const cart = getState().cart.slice();
  let removed = null;
  for (let i = cart.length - 1; i >= 0; i--) if (cart[i].ti === ti) { removed = cart.splice(i, 1)[0]; break; }
  if (!removed) return;
  liftOut(removed); restock(removed.ti, removed.idx, 0.2); settleBasket(cart);
  if (world.basket) world.basket.kick = -0.8;
  setState({ cart }); sfx.remove(PRODUCTS[ti].shape);
  toast(PRODUCTS[ti].line + ' went back to ' + placeName(PRODUCTS[ti]));
}
export function emptyCart() {
  const cart = getState().cart;
  if (!cart.length) return;
  cart.forEach((e, i) => { liftOut(e, i * 0.03); restock(e.ti, e.idx, 0.2 + i * 0.04); });
  if (world.basket) world.basket.kick = -1;
  setState({ cart: [] }); sfx.remove('box'); toast('Everything went back on the shelves');
}
/** The cart panel's pay button: start paying if you are at the till, otherwise point the way. */
export function goPay() {
  if (!getState().cart.length) return;
  if (inTillZone()) startCheckout();
  else { setState({ cartOpen: false }); toast('Pay at the till by the entrance. Walk up to it and press E.'); }
}
/** After paying: the bought items leave your basket and the shelves are restocked behind you. */
export function finishPurchase() {
  const cart = getState().cart;
  cart.forEach((e, i) => { liftOut(e, i * 0.02); restock(e.ti, e.idx, 1.5 + i * 0.05); });
  setState({ receipt: null, cart: [] });
  world.basketMode = 'rest';
  world.paid = true;
  setPhase('walk');
  sfx.click(); toast('Paid! Your bags are packed. The guard will see you out.');
}
export function toggleCart(open) {
  const s = getState();
  if (phase === 'loading' || phase === 'intro' || phase === 'checkout') return;
  const next = open == null ? !s.cartOpen : open;
  if (next) exitLock();
  setState({ cartOpen: next });
}
export function toggleMute() { sfx.init(); sfx.setMuted(!sfx.muted); setState({ muted: sfx.muted }); }
export function enableTouch() { if (getState().touchUI) return; exitLock(); setState({ touchUI: true }); }
export function startGame() {
  sfx.init(); sfx.click();
  const st = getState().settings;
  sfx.setVolumes(st.sfx, st.music);
  setPhase('walk');
  if (coarsePointer) enableTouch(); else lock();
  world.gl.domElement.focus({ preventScroll: true });
}

/* ---------- your basket is remembered between visits ---------- */
const CART_KEY = 'ekofresh.cart.v1';
let savedCart = null;
function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart.map(({ ti, idx, twist }) => ({ ti, idx, twist })))); } catch (e) { /* optional */ }
}
/** Put last visit's items back in the basket (and take them off the shelves). */
function restoreCart() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { list = []; }
  const cart = [];
  for (const e of list) {
    const t = world.types[e.ti];
    if (!t || e.idx == null || e.idx >= t.slots.length || t.taken[e.idx]) continue;
    t.taken[e.idx] = 1; hideInstance(t, e.idx);
    const mesh = centredProduct(PRODUCTS[e.ti], 'hi');
    world.basket.items.add(mesh);
    cart.push({ ti: e.ti, idx: e.idx, twist: e.twist || 0, mesh });
  }
  packBasket(cart).forEach((pose, i) => { cart[i].mesh.position.copy(pose.pos); cart[i].mesh.quaternion.copy(pose.quat); });
  savedCart = cart;
  setState({ cart });
  if (cart.length) toast(`Welcome back! Your basket still has ${cart.length} item${cart.length > 1 ? 's' : ''}.`);
}
export function setJoy(x, y) { world.joy.x = x; world.joy.y = y; }

/* ---------- input ---------- */
const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
const ptrs = new Map();
let dragLook = false;
function look(dx, dy) {
  const k = getState().settings.sensitivity;
  world.yaw -= dx * k; world.pitch = clamp(world.pitch - dy * k, -1.25, 1.2);
}
const qTmp = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
function rotateHeld(dx, dy) {
  const h = world.held;
  qTmp.setFromAxisAngle(AY, dx * 0.011); h.q.premultiply(qTmp);
  qTmp.setFromAxisAngle(AX, dy * 0.011); h.q.premultiply(qTmp);
}

export function attachInput(canvas) {
  const onKeyDown = (e) => {
    if (phase === 'loading' || phase === 'intro') return;
    const k = KEYMAP[e.code];
    if (k) { world.keys[k] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); }
    if (e.repeat) return;
    if (phase === 'inspect') {
      if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); addToCart(); }
      else if (e.code === 'KeyQ' || e.code === 'Backspace' || e.code === 'Escape') { e.preventDefault(); putBack(); }
    } else if (e.code === 'Escape' && getState().cartOpen) toggleCart(false);
    else if (phase === 'walk' && (e.code === 'KeyE' || e.code === 'Enter') && inTillZone() && getState().cart.length) { e.preventDefault(); startCheckout(); }
    if (e.code === 'KeyC' && !getState().receipt) { sfx.init(); sfx.click(); toggleCart(); }
    if (e.code === 'KeyM') toggleMute();
  };
  const onKeyUp = (e) => { const k = KEYMAP[e.code]; if (k) world.keys[k] = false; };
  const onBlur = () => { for (const k in world.keys) world.keys[k] = false; };
  const onLockChange = () => {
    const locked = document.pointerLockElement === canvas;
    if (locked) everLocked = true;
    setState({ locked });
    if (!locked && world.hover) setHover(null);
  };
  const onLockError = () => { if (!everLocked) setState({ lockRefused: true }); };
  const onMouseMove = (e) => {
    if (!getState().locked) return;
    if (phase === 'walk' || phase === 'returning') look(e.movementX * 0.0022, e.movementY * 0.0022);
  };
  const onDown = (e) => {
    const s = getState();
    if (phase === 'loading' || phase === 'intro' || s.receipt) return;
    if (e.pointerType === 'touch') enableTouch();
    if (s.cartOpen) { toggleCart(false); return; }
    if (s.locked) { if (e.button === 0 && phase === 'walk') { const h = rayHit(null, null); if (h) pick(h.ti, h.idx); } return; }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 });
    if (phase === 'inspect' && world.held) { world.held.vx = world.held.vy = 0; canvas.style.cursor = 'grabbing'; }
  };
  const onMove = (e) => {
    if (e.pointerType === 'mouse') { world.mouse.x = e.clientX; world.mouse.y = e.clientY; world.mouse.inside = true; }
    const p = ptrs.get(e.pointerId);
    if (!p || getState().locked) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY; p.moved += Math.abs(dx) + Math.abs(dy);
    if (phase === 'inspect' && world.held) { rotateHeld(dx, dy); world.held.vx = dx; world.held.vy = dy; }
    else if ((phase === 'walk' || phase === 'returning') && p.moved > 4) {
      dragLook = true;
      const s = e.pointerType === 'touch' ? 0.0058 : 0.0042;
      look(dx * s, dy * s);
    }
  };
  const onUp = (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    ptrs.delete(e.pointerId);
    if (!ptrs.size) dragLook = false;
    if (phase === 'inspect') { canvas.style.cursor = ''; return; }
    if (e.type === 'pointercancel' || phase !== 'walk') return;
    if (p.moved < 9 && performance.now() - p.t < 450) {
      const h = rayHit(e.clientX, e.clientY);
      if (h) pick(h.ti, h.idx);
      else if (e.pointerType === 'mouse') lock();
    }
  };
  const onLeave = (e) => { if (e.pointerType === 'mouse') world.mouse.inside = false; };
  const onWheel = (e) => { if (phase === 'inspect' && world.held) { e.preventDefault(); world.held.zoom = clamp(world.held.zoom * (e.deltaY > 0 ? 1.08 : 0.92), 0.6, 1.5); } };
  const onCtx = (e) => e.preventDefault();

  addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp); addEventListener('blur', onBlur);
  document.addEventListener('pointerlockchange', onLockChange); document.addEventListener('pointerlockerror', onLockError);
  document.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave); canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onCtx);
  canvas.style.touchAction = 'none';
  return () => {
    removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('blur', onBlur);
    document.removeEventListener('pointerlockchange', onLockChange); document.removeEventListener('pointerlockerror', onLockError);
    document.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onCtx);
  };
}

/* ---------- per-frame update ---------- */
function collide(p) {
  const R = 0.32;
  p.x = clamp(p.x, -7.6, 7.6); p.z = clamp(p.z, Math.abs(p.x) < 3.4 ? BACK_LIMIT : -10.55, 10.55);
  for (const b of blockers) {
    const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * R; p.z = cz + (dz / d) * R; }
    else p.x = p.x - b.x0 < b.x1 - p.x ? b.x0 - R : b.x1 + R;
  }
  for (const n of world.npcs) { // other people: a soft push apart
    if (!n.r) continue;
    const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz), min = R + n.r;
    if (d < min && d > 1e-6) { p.x = n.x + (dx / d) * min; p.z = n.z + (dz / d) * min; }
  }
}
/** Is this point inside something solid (for the third-person camera)? */
function solidAt(x, y, z) {
  if (x < -7.85 || x > 7.85 || z < -10.85 || z > 10.85 || y < 0.15 || y > 3.45) return true;
  return blockers.slice(0, 3).some((b) => y < 2.05 && x > b.x0 - 0.1 && x < b.x1 + 0.1 && z > b.z0 - 0.1 && z < b.z1 + 0.1);
}
function whereAmI() {
  const p = world.pos;
  if (p.z < -7.3) return Math.abs(p.x) < 3.6 ? 'Back of store · Chilled drinks' : 'Back of store';
  if (p.z > 7.3) return p.x > 3 ? 'Front of store · Till' : 'Front of store';
  const n = p.x < -4 ? 1 : p.x < 0 ? 2 : p.x < 4 ? 3 : 4;
  return 'Aisle ' + n + ' · ' + AISLES[n];
}
const wish = new THREE.Vector3(), target = new THREE.Vector3();
let aisleTimer = 0, prevYaw = 0, prevPitch = 0;
function update(dt) {
  const W = world, k = W.keys, s = getState();
  let f = 0, r = 0;
  if (phase === 'walk' && !s.receipt) {
    f = (k.f ? 1 : 0) - (k.b ? 1 : 0) - W.joy.y;
    r = (k.r ? 1 : 0) - (k.l ? 1 : 0) + W.joy.x;
  }
  let len = Math.hypot(f, r);
  if (len > 1) { f /= len; r /= len; len = 1; }
  // A relaxed shopping pace (about 1.4 m/s), with Shift for a brisk walk.
  const speed = k.run ? 2.4 : 1.4, sy = Math.sin(W.yaw), cy = Math.cos(W.yaw);
  wish.set((-sy * f + cy * r) * speed, 0, (-cy * f - sy * r) * speed);
  W.vel.lerp(wish, 1 - Math.exp(-dt * (len > 0.01 ? 5 : 7)));
  W.pos.addScaledVector(W.vel, dt); collide(W.pos);
  const sp = Math.hypot(W.vel.x, W.vel.z);
  W.moveAmt += (Math.min(1, sp / 1.4) - W.moveAmt) * Math.min(1, dt * 6);
  W.stepPhase += sp * dt * (Math.PI / 0.66);
  const stepN = Math.floor(W.stepPhase / Math.PI);
  if (stepN !== W.lastStep) { W.lastStep = stepN; if (sp > 0.3) sfx.step(stepN, sp / 1.4); }
  const bobK = reduceMotion ? 0 : 1;
  W.bobY = Math.sin(W.stepPhase * 2) * 0.012 * W.moveAmt * bobK;
  W.bobX = Math.sin(W.stepPhase) * 0.008 * W.moveAmt * bobK;
  const cam = W.camera;
  W.third = s.settings.view === 'third' && phase !== 'checkout';
  if (cam.fov !== s.settings.fov) { cam.fov = s.settings.fov; cam.updateProjectionMatrix(); }
  cam.position.set(W.pos.x + cy * W.bobX, 1.62 + W.bobY, W.pos.z - sy * W.bobX);
  cam.rotation.set(W.pitch, W.yaw, Math.sin(W.stepPhase) * 0.004 * W.moveAmt * bobK, 'YXZ');
  if (W.third) {
    // Over-the-shoulder camera that pulls in when a shelf or wall is behind you.
    const cp = Math.cos(W.pitch), fx = -sy * cp, fy = Math.sin(W.pitch), fz = -cy * cp;
    const ex = W.pos.x + cy * 0.35, ey = 1.75, ez = W.pos.z - sy * 0.35;
    let dist = 0.3;
    while (dist < 2.4 && !solidAt(ex - fx * (dist + 0.15), ey - fy * (dist + 0.15) + 0.2, ez - fz * (dist + 0.15))) dist += 0.05;
    // snap in instantly when something is in the way, ease back out when it clears
    W.camDist = W.camDist == null || dist < W.camDist ? dist : W.camDist + (dist - W.camDist) * Math.min(1, dt * 4);
    const d = W.camDist;
    cam.position.set(ex - fx * d, ey - fy * d + 0.2, ez - fz * d);
    cam.rotation.set(W.pitch, W.yaw, 0, 'YXZ');
  }
  ray.far = 3.2 + (W.third ? W.camDist || 0 : 0);
  cam.updateMatrixWorld();
  sfx.setListener(W.pos.x, W.pos.z, W.yaw);
  W.viewRoot.position.copy(cam.position); W.viewRoot.quaternion.copy(cam.quaternion);
  W.viewRoot.updateMatrixWorld(true);
  // how fast the view is turning, smoothed; the hand lags behind it
  const lk = 1 - Math.exp(-dt * 10);
  W.lookVel.x += ((W.yaw - prevYaw) / Math.max(dt, 1e-3) - W.lookVel.x) * lk;
  W.lookVel.y += ((W.pitch - prevPitch) / Math.max(dt, 1e-3) - W.lookVel.y) * lk;
  prevYaw = W.yaw; prevPitch = W.pitch;

  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    t.t += dt;
    const kk = Math.min(1, t.t / t.dur);
    t.fn(kk);
    if (kk >= 1) { tweens.splice(i, 1); if (t.done) t.done(); }
  }

  updateHover(dt);
  if (phase === 'walk') {
    W.hand.mode = W.hover ? 'hover' : 'rest';
    W.hand.fingers = W.hover ? 'ready' : 'relaxed';
  }

  const h = W.held;
  if (h && phase === 'inspect') {
    if (!ptrs.size && (Math.abs(h.vx) > 0.05 || Math.abs(h.vy) > 0.05)) {
      rotateHeld(h.vx, h.vy);
      h.vx *= Math.pow(0.04, dt); h.vy *= Math.pow(0.04, dt);
    }
    target.copy(h.base).multiplyScalar(h.zoom);
    target.y = h.base.y + (reduceMotion ? 0 : Math.sin(W.time * 1.7) * 0.004);
    h.grp.position.lerp(target, Math.min(1, dt * 10));
    h.grp.quaternion.slerp(h.q, Math.min(1, dt * 18));
    supportPoint(h, h.support);
  }

  aisleTimer -= dt;
  if (aisleTimer <= 0) {
    aisleTimer = 0.25;
    const atTill = phase === 'walk' && inTillZone();
    const prompt = atTill ? (s.cart.length ? (s.touchUI ? 'tap-pay' : 'Press E to pay at the till') : 'Your basket is empty. Pick something first.') : null;
    setState({ aisle: whereAmI(), prompt });
    if (savedCart !== s.cart && W.basket && phase !== 'loading') { savedCart = s.cart; saveCart(s.cart); }
  }
}

let restored = false;
export function frame(dt) {
  if (world.debugDt) dt = world.debugDt;
  dt = Math.min(0.05, dt);
  world.time += dt;
  if (!restored && world.basket && world.types.length && phase !== 'loading') { restored = true; restoreCart(); }
  update(dt);
  for (const fn of world.onFrame) fn(dt);
  const { gl, scene, overlay, camera } = world;
  gl.autoClear = false;
  gl.clear();
  gl.render(scene, camera);
  gl.clearDepth();
  gl.render(overlay, camera);
}
