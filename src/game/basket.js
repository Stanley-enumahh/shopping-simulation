import * as THREE from 'three';
import { PRODUCTS } from '../data/products';

// Basket interior, measured from the centre of the rim (y up, long side along z).
export const BASKET = { w: 0.28, l: 0.4, depth: 0.2, handle: 0.14, floor: -0.195, halfX: 0.112, halfZ: 0.162 };
const CELLS = [[-0.056, -0.108], [0.056, -0.108], [-0.056, 0], [0.056, 0], [-0.056, 0.108], [0.056, 0.108]];
const Z_UP = new THREE.Vector3(0, 0, 1), X_AX = new THREE.Vector3(1, 0, 0), Y_AX = new THREE.Vector3(0, 1, 0);

/** How an item lies in the basket: on its flattest side, long edge along the basket. */
function lie(p) {
  let q = new THREE.Quaternion(), ex, ez, hv;
  if (p.round) {
    const d = p.W;
    if (p.H > d * 1.15) { q.setFromAxisAngle(Z_UP, Math.PI / 2); ex = p.H; hv = d; ez = d; }
    else { ex = d; hv = p.H; ez = d; }
  } else {
    const opts = [
      { q: new THREE.Quaternion(), x: p.W, y: p.H, z: p.D },
      { q: new THREE.Quaternion().setFromAxisAngle(X_AX, -Math.PI / 2), x: p.W, y: p.D, z: p.H },
      { q: new THREE.Quaternion().setFromAxisAngle(Z_UP, Math.PI / 2), x: p.H, y: p.W, z: p.D },
    ];
    const o = opts.reduce((a, b) => (b.y < a.y ? b : a));
    q = o.q; ex = o.x; hv = o.y; ez = o.z;
  }
  if (ex > ez) { q.premultiply(new THREE.Quaternion().setFromAxisAngle(Y_AX, Math.PI / 2)); [ex, ez] = [ez, ex]; }
  return { q, ex, ez, hv };
}

/** Where each cart entry sits in the basket, in order. Entries carry a small random twist. */
export function packBasket(entries) {
  const heights = CELLS.map(() => 0);
  return entries.map((e) => {
    const p = PRODUCTS[e.ti], L = lie(p);
    let best = 0;
    for (let c = 1; c < CELLS.length; c++) if (heights[c] < heights[best] - 0.005) best = c;
    const [cx, cz] = CELLS[best];
    const x = L.ex >= BASKET.halfX * 2 ? 0 : THREE.MathUtils.clamp(cx, -BASKET.halfX + L.ex / 2, BASKET.halfX - L.ex / 2);
    const z = L.ez >= BASKET.halfZ * 2 ? 0 : THREE.MathUtils.clamp(cz, -BASKET.halfZ + L.ez / 2, BASKET.halfZ - L.ez / 2);
    // The item rests on the tallest stack under its footprint.
    let base = 0;
    const under = [];
    CELLS.forEach(([ux, uz], c) => {
      if (Math.abs(ux - x) < L.ex / 2 + 0.02 && Math.abs(uz - z) < L.ez / 2 + 0.02) { under.push(c); base = Math.max(base, heights[c]); }
    });
    if (!under.length) { under.push(best); base = heights[best]; }
    under.forEach((c) => { heights[c] = base + L.hv; });
    const twist = new THREE.Quaternion().setFromAxisAngle(Y_AX, e.twist || 0);
    return {
      pos: new THREE.Vector3(x, BASKET.floor + base + L.hv / 2, z),
      quat: twist.multiply(L.q),
    };
  });
}

/** The basket model: slotted plastic sides, a solid floor, a thick rim and two folding handles. */
export function buildBasket() {
  const g = new THREE.Group();
  const { w, l, depth, handle } = BASKET;
  // Slotted wall texture: rounded slots punched out of the plastic.
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = '#000';
  for (let face = 0; face < 4; face++) {
    const x0 = face * 256;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
      const sx = x0 + 22 + col * 37, sy = 46 + row * 62;
      x.beginPath(); x.roundRect ? x.roundRect(sx, sy, 22, 44, 10) : x.rect(sx, sy, 22, 44); x.fill();
    }
  }
  const alpha = new THREE.CanvasTexture(c);
  const plastic = new THREE.MeshStandardMaterial({ color: '#1f7a55', roughness: 0.5, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide });
  const solid = new THREE.MeshStandardMaterial({ color: '#1b6b4b', roughness: 0.55 });
  const grip = new THREE.MeshStandardMaterial({ color: '#2b302d', roughness: 0.6, metalness: 0.2 });

  const walls = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * 0.86, depth, 4, 1, true);
  walls.rotateY(Math.PI / 4); walls.scale(w, 1, l); walls.translate(0, -depth / 2, 0);
  g.add(new THREE.Mesh(walls, plastic));
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.006, l * 0.86), solid);
  floor.position.y = -depth; g.add(floor);
  for (const [sx, sz, len, alongZ] of [[w / 2, 0, l, true], [-w / 2, 0, l, true], [0, l / 2, w, false], [0, -l / 2, w, false]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.016 : len + 0.016, 0.022, alongZ ? len + 0.016 : 0.016), solid);
    rim.position.set(sx, -0.005, sz); g.add(rim);
  }
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * w / 2, 0, -0.13), new THREE.Vector3(s * w * 0.3, handle * 0.66, -0.11),
      new THREE.Vector3(s * 0.011, handle, -0.06), new THREE.Vector3(s * 0.011, handle, 0.06),
      new THREE.Vector3(s * w * 0.3, handle * 0.66, 0.11), new THREE.Vector3(s * w / 2, 0, 0.13),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0065, 10), grip));
  }
  return g;
}
