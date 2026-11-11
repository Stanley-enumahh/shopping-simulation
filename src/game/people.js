import * as THREE from 'three';
import { BASKET, buildBasket } from './basket';

// Simple stylised people: capsule limbs on pivots so they can walk, reach and wave.
// The model faces +Z and stands with its feet at y = 0.
const geo = {};
function g(key, make) { return geo[key] || (geo[key] = make()); }
function capsuleDown(r, len) { const c = new THREE.CapsuleGeometry(r, len, 4, 12); c.translate(0, -len / 2 - r * 0.2, 0); return c; }
const std = (color, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough });

export const SKIN = ['#5a3825', '#6b4430', '#7a4e33', '#8d5a3b', '#4a2e1f', '#a0694a'];

/**
 * opts: skin, shirt, pants, shoes, hair ('short' | 'puff' | 'wrap' | 'none'), hairColor,
 *       hat (color for a cap / beret), apron (color), basket (bool), height scale
 */
export function makePerson(opts = {}) {
  const o = { skin: SKIN[0], shirt: '#3b6ea5', pants: '#2b2f3a', shoes: '#1d1d1f', hair: 'short', hairColor: '#141414', scale: 1, ...opts };
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin = std(o.skin, 0.6), shirt = std(o.shirt, 0.85), pants = std(o.pants, 0.85), shoes = std(o.shoes, 0.5);

  const torso = new THREE.Mesh(g('torso', () => new THREE.CapsuleGeometry(0.17, 0.42, 6, 16)), shirt);
  torso.scale.set(1.12, 1, 0.75); torso.position.y = 1.17; body.add(torso);
  if (o.apron) {
    const apron = new THREE.Mesh(g('apron', () => new THREE.BoxGeometry(0.3, 0.55, 0.02)), std(o.apron, 0.9));
    apron.position.set(0, 1.02, 0.135); body.add(apron);
  }
  const hips = new THREE.Mesh(g('hips', () => new THREE.CapsuleGeometry(0.15, 0.08, 4, 14)), pants);
  hips.scale.set(1.15, 1, 0.8); hips.position.y = 0.9; body.add(hips);
  const neck = new THREE.Mesh(g('neck', () => new THREE.CylinderGeometry(0.045, 0.05, 0.1, 12)), skin);
  neck.position.y = 1.5; body.add(neck);

  const head = new THREE.Group(); head.position.y = 1.62; body.add(head);
  const skull = new THREE.Mesh(g('head', () => new THREE.SphereGeometry(0.105, 22, 16)), skin);
  skull.scale.set(0.95, 1.08, 1); head.add(skull);
  const eyeM = std('#151515', 0.3);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(g('eye', () => new THREE.SphereGeometry(0.012, 8, 6)), eyeM);
    eye.position.set(s * 0.035, 0.015, 0.095); head.add(eye);
  }
  const hairM = std(o.hairColor, 0.95);
  if (o.hair === 'short') {
    const h = new THREE.Mesh(g('hairShort', () => new THREE.SphereGeometry(0.11, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)), hairM);
    h.position.y = 0.012; h.scale.set(0.98, 1.05, 1.02); head.add(h);
  } else if (o.hair === 'puff') {
    const h = new THREE.Mesh(g('hairPuff', () => new THREE.SphereGeometry(0.15, 18, 14)), hairM);
    h.position.set(0, 0.07, -0.02); h.scale.set(1, 0.85, 1); head.add(h);
  } else if (o.hair === 'wrap') { // gele-style head wrap
    const h = new THREE.Mesh(g('wrap', () => new THREE.TorusKnotGeometry(0.08, 0.04, 40, 8, 2, 3)), std(o.hairColor, 0.8));
    h.position.set(0, 0.1, -0.01); h.scale.set(1.2, 0.8, 1.1); head.add(h);
  }
  if (o.hat) {
    const cap = new THREE.Mesh(g('cap', () => new THREE.CylinderGeometry(0.115, 0.115, 0.06, 18)), std(o.hat, 0.7));
    cap.position.y = 0.09; head.add(cap);
    const peak = new THREE.Mesh(g('peak', () => new THREE.BoxGeometry(0.16, 0.012, 0.08)), std(o.hat, 0.7));
    peak.position.set(0, 0.065, 0.11); head.add(peak);
  }

  const limb = (x, y, len, r, mat, key) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); body.add(pivot);
    const m = new THREE.Mesh(g(key, () => capsuleDown(r, len)), mat); pivot.add(m);
    return pivot;
  };
  const armL = limb(-0.22, 1.42, 0.5, 0.048, shirt, 'arm');
  const armR = limb(0.22, 1.42, 0.5, 0.048, shirt, 'arm');
  for (const a of [armL, armR]) {
    const hand = new THREE.Mesh(g('hand', () => new THREE.SphereGeometry(0.05, 12, 10)), skin);
    hand.position.y = -0.62; hand.scale.set(0.8, 1.1, 0.7); a.add(hand);
  }
  const legL = limb(-0.09, 0.88, 0.72, 0.07, pants, 'leg');
  const legR = limb(0.09, 0.88, 0.72, 0.07, pants, 'leg');
  for (const l of [legL, legR]) {
    const shoe = new THREE.Mesh(g('shoe', () => new THREE.BoxGeometry(0.1, 0.07, 0.24)), shoes);
    shoe.position.set(0, -0.84, 0.04); l.add(shoe);
  }

  let basket = null, basketItems = null;
  if (o.basket) {
    basket = new THREE.Group();
    const b = buildBasket(); b.position.y = -BASKET.handle; basket.add(b);
    basketItems = new THREE.Group(); basketItems.position.y = -BASKET.handle; basket.add(basketItems);
    basket.position.set(-0.11, -0.64, 0.02); // long side front to back, held clear of the leg
    armL.add(basket);
  }
  root.scale.setScalar(o.scale);
  return { root, body, head, armL, armR, legL, legR, basket, basketItems, phase: Math.random() * 6, reach: 0, wave: 0 };
}

/** Pose a person for this frame. moving: 0..1 walk amount, dt in seconds. */
export function animatePerson(p, dt, moving, t) {
  p.phase += dt * moving * 6.2;
  const s = Math.sin(p.phase), swing = 0.5 * moving;
  p.legL.rotation.x = s * swing; p.legR.rotation.x = -s * swing;
  p.body.position.y = Math.abs(Math.cos(p.phase)) * 0.025 * moving + Math.sin(t * 1.6) * 0.004;
  const carry = p.basket ? 0.12 : 1; // the basket arm hardly swings
  p.armL.rotation.x = -s * 0.4 * moving * carry + (p.basket ? -0.12 : 0);
  p.armL.rotation.z = p.basket ? -0.08 : 0;
  // Right arm: walking swing, reaching to a shelf, or waving hello.
  const reach = p.reach, wave = p.wave;
  p.armR.rotation.x = (s * 0.4 * moving) * (1 - reach) * (1 - wave) - reach * 2.2 - wave * 0.2;
  p.armR.rotation.z = wave * (2.6 + Math.sin(t * 9) * 0.35);
  p.head.rotation.y += ((p.lookYaw || 0) - p.head.rotation.y) * Math.min(1, dt * 5);
}
