import * as THREE from 'three';
import { PRODUCTS, TILL, fmt } from '../data/products';
import { getState, setState } from '../store';
import { world, tween, setPhase, getPhase, exitLock, finishPurchase } from './world';
import { packBasket } from './basket';
import { centredProduct } from '../three/productModels';
import { sfx } from './audio';
import { say } from './voice';

// Paying at the till: your basket goes on the counter, the cashier scans each item,
// then you pay by card or bank transfer (which, realistically, takes a moment to come through).
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const lerp = (a, b, f) => a + (b - a) * f;
const BELT_TOP = TILL.h + 0.045;
const box = new THREE.Box3();

export function inTillZone() {
  const p = world.pos, z = TILL.zone;
  return p.x > z.x0 && p.x < z.x1 && p.z > z.z0 && p.z < z.z1;
}
const naira = (n) => Math.round(n).toLocaleString('en-US') + ' naira';

let counterItems = [], pileH = 0, run = 0;

export function startCheckout() {
  const s = getState(), T = world.till;
  if (getPhase() !== 'walk' || !s.cart.length || !T) return;
  const myRun = ++run;
  exitLock();
  setPhase('checkout');
  setState({ cartOpen: false, prompt: null, till: { stage: 'scanning', lines: [], total: 0 } });
  world.basketMode = 'away';

  // Step up to the till and look down at the belt.
  const p0 = world.pos.clone(), y0 = world.yaw, pt0 = world.pitch;
  let y1 = Math.PI; while (y1 - y0 > Math.PI) y1 -= Math.PI * 2; while (y0 - y1 > Math.PI) y1 += Math.PI * 2;
  world.vel.set(0, 0, 0);
  tween(0.8, (k) => {
    const f = ease(k);
    world.pos.x = lerp(p0.x, TILL.stand[0], f); world.pos.z = lerp(p0.z, TILL.stand[1], f);
    world.yaw = lerp(y0, y1, f); world.pitch = lerp(pt0, -0.62, f);
  });

  // A copy of your basket appears on the counter.
  const entries = s.cart.map((e) => ({ ti: e.ti, twist: e.twist }));
  const poses = packBasket(entries);
  T.basket.visible = true;
  counterItems = entries.map((e, i) => {
    const m = centredProduct(PRODUCTS[e.ti]);
    m.position.copy(poses[i].pos); m.quaternion.copy(poses[i].quat);
    T.items.add(m);
    return { m, p: PRODUCTS[e.ti] };
  });
  pileH = 0;
  T.display.draw('EKO MART', fmt(0));
  say('Cashier', 'Good day! Let me ring these up for you.', { delay: 0.7 });

  const gap = 0.95;
  counterItems.forEach((it, i) => tween(1.1 + i * gap, () => {}, () => { if (run === myRun) scanOne(it, myRun); }));
  tween(1.1 + counterItems.length * gap + 1.0, () => {}, () => {
    if (run !== myRun) return;
    const total = getState().till.total;
    T.display.draw('TOTAL', fmt(total));
    setState({ till: { ...getState().till, stage: 'pay' } });
    say('Cashier', `That will be ${naira(total)}. Card or transfer?`);
  });
}

function scanOne(it, myRun) {
  const T = world.till, m = it.m;
  world.scene.attach(m);
  box.setFromObject(m);
  const half = (box.max.y - box.min.y) / 2;
  const a = m.position.clone();
  const b = new THREE.Vector3(TILL.beltX0 + 0.25, BELT_TOP + half, TILL.cz + (Math.random() - 0.5) * 0.12);
  const c = new THREE.Vector3(TILL.beltX1 - 0.12, b.y, b.z);
  const d = new THREE.Vector3(TILL.scanX, b.y + 0.03, TILL.cz);
  const e = new THREE.Vector3(TILL.bagX + (Math.random() - 0.5) * 0.25, TILL.h - 0.05 + pileH + half, TILL.cz + (Math.random() - 0.5) * 0.3);
  pileH = Math.min(0.35, pileH + half * 0.6);
  sfx.grab(it.p.shape);
  tween(0.32, (k) => { m.position.lerpVectors(a, b, ease(k)); m.position.y += Math.sin(k * Math.PI) * 0.12; }, () => {
    T.beltMoving = true;
    tween(0.42, (k) => m.position.lerpVectors(b, c, k), () => {
      T.beltMoving = false; T.cashierReach = 0.55;
      tween(0.22, (k) => m.position.lerpVectors(c, d, ease(k)), () => {
        if (run !== myRun) return;
        sfx.scanItem(it.p.shape);
        const till = getState().till;
        const total = till.total + it.p.price;
        setState({ till: { ...till, lines: [...till.lines, it.p.id], total } });
        T.display.draw(it.p.line.slice(0, 18).toUpperCase(), fmt(it.p.price));
        tween(0.3, (k) => { m.position.lerpVectors(d, e, ease(k)); m.position.y += Math.sin(k * Math.PI) * 0.08; }, () => { T.cashierReach = 0; });
      });
    });
  });
}

export function payByCard() {
  const t = getState().till;
  if (!t || t.stage !== 'pay') return;
  sfx.click();
  setState({ till: { ...t, stage: 'card', method: 'Card' } });
  say('Cashier', 'Tap or insert your card on the machine.');
}
export function tapCard() {
  const t = getState().till, myRun = run;
  if (!t || t.stage !== 'card') return;
  setState({ till: { ...t, stage: 'processing' } });
  sfx.click();
  tween(2.0, () => {}, () => {
    if (run !== myRun) return;
    sfx.cardApproved();
    setState({ till: { ...getState().till, stage: 'approved' } });
    say('Cashier', 'Approved. Thank you!', { delay: 0.9 });
    tween(2.4, () => {}, () => { if (run === myRun) complete(); });
  });
}
export function payByTransfer() {
  const t = getState().till;
  if (!t || t.stage !== 'pay') return;
  sfx.click();
  setState({ till: { ...t, stage: 'transfer', method: 'Bank transfer' } });
  say('Cashier', 'Transfer to the account on the screen, then show me the alert.');
}
export function sentTransfer() {
  const t = getState().till, myRun = run;
  if (!t || t.stage !== 'transfer') return;
  setState({ till: { ...t, stage: 'pending' } });
  sfx.click();
  say('Cashier', 'Network is a bit slow today. Abeg, give it small time.', { delay: 1.2 });
  tween(4.5 + Math.random() * 2.5, () => {}, () => {
    if (run !== myRun) return;
    sfx.transferIn();
    setState({ till: { ...getState().till, stage: 'approved' } });
    say('Cashier', 'Alert don land. Thank you!', { delay: 0.4 });
    tween(2.4, () => {}, () => { if (run === myRun) complete(); });
  });
}

function complete() {
  const s = getState(), t = s.till;
  sfx.printer(); sfx.bagging();
  world.till.display.draw('THANK YOU', 'PAID');
  setState({ till: null, receipt: { cart: s.cart.slice(), date: new Date(), method: t.method, total: t.total, cashier: 'Bisi' } });
}

/** Clear the counter after paying, or put everything back if you cancel. */
function clearCounter() {
  const T = world.till;
  for (const it of counterItems) if (it.m.parent) it.m.parent.remove(it.m);
  counterItems = []; pileH = 0;
  T.basket.visible = false; T.beltMoving = false; T.cashierReach = 0;
  T.display.draw('EKO MART', 'WELCOME');
}
export function cancelCheckout() {
  run++;
  clearCounter();
  setState({ till: null });
  world.basketMode = 'rest';
  setPhase('walk');
  say('Cashier', 'No wahala. Take your time.');
}
/** Called when you close the receipt. */
export function leaveTill() {
  run++;
  clearCounter();
  finishPurchase();
}
