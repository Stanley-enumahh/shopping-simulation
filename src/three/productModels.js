import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { backTexture, contentsTexture, labelTexture, tint } from './textures';
import { roundedBox } from './geometry';
import { fashionMat, fashionParts, foldedVersion } from './fashion';

const FASHION_SHAPES = new Set(['shoe', 'cap', 'glasses', 'folded', 'hanger']);

// Every pack sits on its base at the origin with its front label facing +Z.
// partsFor(p) returns [{ geo, role, order }]; matFor(p, role, res) gives the material for that role.
const metal = new THREE.MeshStandardMaterial({ color: 0xd6dbde, metalness: 0.8, roughness: 0.28 });
const gold = new THREE.MeshStandardMaterial({ color: 0xd4a537, metalness: 0.85, roughness: 0.3 });
const FINISH = {
  paper: { roughness: 0.72, metalness: 0 },
  gloss: { roughness: 0.32, metalness: 0, envMapIntensity: 1.1 },
  foil: { roughness: 0.26, metalness: 0.5, envMapIntensity: 1.3 },
  fabric: { roughness: 0.95, metalness: 0 },
};
const std = (color, rough = 0.55, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

const cyl = (rt, rb, h, seg = 28, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
/** Lathe from a side profile [[radius, y], ...] going up from the base. */
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
/** The radius of a profile at height y (for filling a bottle with liquid). */
function radiusAt(pts, y) {
  for (let i = 1; i < pts.length; i++) {
    const [r0, y0] = pts[i - 1], [r1, y1] = pts[i];
    if (y >= y0 && y <= y1) return y1 === y0 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return pts[pts.length - 1][0];
}
function liquidProfile(pts, fillY, k = 0.92) {
  const out = [[0, 0.004]];
  for (const [r, y] of pts) { if (y > 0 && y < fillY) out.push([r * k, Math.max(0.004, y)]); }
  out.push([radiusAt(pts, fillY) * k, fillY], [0, fillY]);
  return out;
}

function pillowGeo(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 14, 18, 1), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / (w / 2), ny = pos.getY(i) / (h / 2), z = pos.getZ(i);
    const seam = Math.abs(ny) > 0.85;
    const fy = seam ? 0 : 1 - Math.pow(Math.abs(ny) / 0.85, 4);
    const fx = Math.sqrt(Math.max(0, 1 - nx * nx * 0.92));
    pos.setZ(i, Math.sign(z) * (d / 2) * (0.08 + 0.92 * fx * fy));
  }
  geo.computeVertexNormals();
  return geo;
}
function sackGeo(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 12, 14, 4), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    const nx = x / (w / 2), ny = pos.getY(i) / (h / 2);
    z *= 0.6 + 0.4 * Math.sqrt(Math.max(0, 1 - nx * nx)) * (1 - Math.max(0, ny - 0.5) * 1.2);
    if (ny > 0.82) { const t = (ny - 0.82) / 0.18; x *= 1 - 0.1 * t; z *= 1 - 0.75 * t; } // gathered, stitched top
    if (ny < -0.7) x *= 1 + 0.04 * ((-0.7 - ny) / 0.3); // settles wider at the bottom
    pos.setX(i, x); pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}
/** Twenty water sachets lying in a stack, merged into one mesh. */
function sachetStack(w, h, d) {
  const parts = [], sw = w * 0.46, sd = d * 0.82, sh = h / 10;
  for (let layer = 0; layer < 10; layer++) for (let col = 0; col < 2; col++) {
    const b = new THREE.BoxGeometry(sw, sh * 0.92, sd, 3, 1, 3), pos = b.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i) / (sw / 2), nz = pos.getZ(i) / (sd / 2);
      pos.setY(i, pos.getY(i) * (0.35 + 0.65 * (1 - nx * nx) * (1 - nz * nz)));
    }
    b.computeVertexNormals();
    b.translate((col - 0.5) * sw * 1.04, sh * (layer + 0.5), 0);
    parts.push(b);
  }
  return mergeGeometries(parts);
}

export function partsFor(p) {
  if (p._parts) return p._parts;
  const P = [], d = p.dims, s = p.shape;
  if (FASHION_SHAPES.has(s)) return (p._parts = fashionParts(p));
  const add = (geo, role, order = 0) => P.push({ geo, role, order });
  const wrapAspect = (r, h) => (2 * Math.PI * r) / h;

  if (s === 'box' || s === 'carton') {
    const bh = s === 'carton' ? d.h * 0.8 : d.h;
    const geo = new THREE.BoxGeometry(d.w, bh, d.d); geo.translate(0, bh / 2, 0);
    add(geo, 'pack');
    if (s === 'carton') {
      const gh = d.h * 0.17, tri = new THREE.Shape();
      tri.moveTo(-d.d / 2, 0); tri.lineTo(d.d / 2, 0); tri.lineTo(0, gh); tri.closePath();
      const gg = new THREE.ExtrudeGeometry(tri, { depth: d.w, bevelEnabled: false }); gg.rotateY(Math.PI / 2); gg.translate(-d.w / 2, bh, 0);
      add(gg, 'top');
      const fin = new THREE.BoxGeometry(d.w, d.h * 0.04, 0.006); fin.translate(0, bh + gh + d.h * 0.015, 0); add(fin, 'top');
      const capG = cyl(d.w * 0.16, d.w * 0.16, d.h * 0.035, 16); capG.rotateX(-0.85); capG.translate(d.w * 0.2, bh + gh * 0.55, d.d * 0.22); add(capG, 'cap');
    }
    p._label = { aspect: d.w / bh, kind: 'face' };
  } else if (s === 'pillow') {
    const geo = pillowGeo(d.w, d.h, d.d); geo.translate(0, d.h / 2, 0);
    add(geo, 'pack');
    p._label = { aspect: d.w / d.h, kind: 'pillow' };
  } else if (s === 'sack') {
    const geo = sackGeo(d.w, d.h, d.d); geo.translate(0, d.h / 2, 0);
    add(geo, 'pack');
    p._label = { aspect: d.w / d.h, kind: 'sack' };
  } else if (s === 'keg') {
    const bh = d.h * 0.8, rr = Math.min(d.w, d.d) * 0.2, fill = (p.liquid && p.liquid.fill) || 0.85;
    const liq = roundedBox(d.w * 0.9, bh * fill, d.d * 0.86, rr * 0.9, 2); liq.translate(0, (bh * fill) / 2 + 0.006, 0); add(liq, 'liquid', 0);
    const body = roundedBox(d.w, bh, d.d, rr, 3); body.translate(0, bh / 2, 0); add(body, 'shell', 2);
    const neck = cyl(d.w * 0.12, d.w * 0.14, d.h * 0.08, 18); neck.translate(-d.w * 0.25, bh + d.h * 0.04, 0); add(neck, 'shell', 2);
    const capG = cyl(d.w * 0.15, d.w * 0.15, d.h * 0.06, 18); capG.translate(-d.w * 0.25, bh + d.h * 0.1, 0); add(capG, 'cap');
    const handle = new THREE.TorusGeometry(d.w * 0.16, Math.min(d.w, d.d) * 0.07, 8, 18, Math.PI); handle.translate(d.w * 0.18, bh - d.h * 0.02, 0); add(handle, 'shell', 2);
    const lw = d.w * 0.8, lh = bh * 0.5;
    const front = new THREE.PlaneGeometry(lw, lh); front.translate(0, bh * 0.42, d.d / 2 + 0.002); add(front, 'labelPlane');
    const back = new THREE.PlaneGeometry(lw, lh); back.rotateY(Math.PI); back.translate(0, bh * 0.42, -d.d / 2 - 0.002); add(back, 'backPlane');
    p._label = { aspect: lw / lh, kind: 'face' };
  } else if (s === 'bale') {
    add(sachetStack(d.w, d.h * 0.96, d.d), 'water', 0);
    const shell = new THREE.BoxGeometry(d.w, d.h, d.d); shell.translate(0, d.h / 2, 0); add(shell, 'shell', 2);
    const lw = d.w * 0.92, lh = d.h * 0.34;
    const front = new THREE.PlaneGeometry(lw, lh); front.translate(0, d.h * 0.62, d.d / 2 + 0.002); add(front, 'labelPlane');
    const back = new THREE.PlaneGeometry(lw, lh); back.rotateY(Math.PI); back.translate(0, d.h * 0.62, -d.d / 2 - 0.002); add(back, 'backPlane');
    p._label = { aspect: lw / lh, kind: 'face' };
  } else if (s === 'pet') {
    const r = d.r, h = d.h;
    const prof = [[0, 0], [r * 0.9, 0], [r, h * 0.03], [r, h * 0.58], [r * 0.97, h * 0.62], [r * 0.62, h * 0.74], [r * 0.36, h * 0.84], [r * 0.33, h * 0.93]];
    const fill = (p.liquid && p.liquid.fill) || 0.9;
    add(lathe(liquidProfile(prof, h * 0.93 * fill)), 'liquid', 0);
    add(lathe(prof), 'shell', 2);
    const bh = h * 0.34, band = cyl(r * 1.012, r * 1.012, bh, 32, true); band.rotateY(Math.PI); band.translate(0, h * 0.12 + bh / 2, 0); add(band, 'band');
    const capG = cyl(r * 0.38, r * 0.38, h * 0.06, 20); capG.translate(0, h * 0.96, 0); add(capG, 'cap');
    const ring = cyl(r * 0.4, r * 0.4, h * 0.012, 20); ring.translate(0, h * 0.925, 0); add(ring, 'cap');
    p._label = { aspect: wrapAspect(r, bh), kind: 'band' };
  } else if (s === 'glass') {
    const r = d.r, h = d.h;
    const prof = [[0, 0], [r * 0.9, 0], [r, h * 0.03], [r, h * 0.5], [r * 0.95, h * 0.56], [r * 0.56, h * 0.7], [r * 0.38, h * 0.78], [r * 0.36, h * 0.92], [r * 0.42, h * 0.94], [r * 0.36, h * 0.96]];
    add(lathe(prof), 'amber', 2);
    const bh = h * 0.3, band = cyl(r * 1.012, r * 1.012, bh, 32, true); band.rotateY(Math.PI); band.translate(0, h * 0.1 + bh / 2, 0); add(band, 'band');
    const neckBand = cyl(r * 0.4, r * 0.39, h * 0.07, 20, true); neckBand.translate(0, h * 0.85, 0); add(neckBand, 'gold');
    const crown = cyl(r * 0.43, r * 0.45, h * 0.03, 21); crown.translate(0, h * 0.975, 0); add(crown, 'gold');
    p._label = { aspect: wrapAspect(r, bh), kind: 'band' };
  } else if (s === 'can') {
    const r = d.r, h = d.h, bh = h * 0.86;
    const body = cyl(r, r, bh, 30); body.rotateY(Math.PI); body.translate(0, h * 0.05 + bh / 2, 0); add(body, 'labelCyl');
    const base = cyl(r, r * 0.9, h * 0.05, 30); base.translate(0, h * 0.025, 0); add(base, 'metal');
    const neck = cyl(r * 0.86, r, h * 0.08, 30); neck.translate(0, h * 0.91 + h * 0.04, 0); add(neck, 'metal');
    const rim = new THREE.TorusGeometry(r * 0.86, h * 0.012, 6, 30); rim.rotateX(Math.PI / 2); rim.translate(0, h * 0.99, 0); add(rim, 'metal');
    const pull = new THREE.TorusGeometry(r * 0.16, r * 0.035, 6, 14); pull.rotateX(Math.PI / 2); pull.translate(0, h * 0.995, r * 0.32); add(pull, 'metal');
    const tab = new THREE.BoxGeometry(r * 0.22, h * 0.01, r * 0.42); tab.translate(0, h * 0.993, r * 0.08); add(tab, 'metal');
    p._label = { aspect: wrapAspect(r, bh), kind: 'wrap' };
  } else if (s === 'tin' || s === 'tub') {
    const r = d.r, h = d.h, lid = p.lid || s === 'tub', bh = lid ? h * 0.86 : h;
    const body = s === 'tub' ? cyl(r, r * 0.86, bh, 30) : cyl(r, r, bh, 30);
    body.rotateY(Math.PI); body.translate(0, bh / 2, 0); add(body, 'labelCyl');
    if (s === 'tin') {
      for (const y of [h * 0.02, bh - h * 0.02]) { const rim = new THREE.TorusGeometry(r * 1.005, h * 0.03, 6, 30); rim.rotateX(Math.PI / 2); rim.translate(0, y, 0); add(rim, 'metal'); }
    }
    if (lid) { const capG = cyl(r * 1.04, r * 1.04, h * 0.14, 30); capG.translate(0, bh + h * 0.07, 0); add(capG, 'cap'); }
    p._label = { aspect: wrapAspect(s === 'tub' ? r * 0.93 : r, bh), kind: 'wrap' };
  } else if (s === 'jar') {
    const r = d.r, h = d.h, jh = h * 0.82;
    const inner = cyl(r * 0.92, r * 0.92, jh * 0.86, 24); inner.translate(0, (jh * 0.86) / 2 + 0.004, 0); add(inner, 'contents', 0);
    const shell = cyl(r, r, jh, 28); shell.translate(0, jh / 2, 0); add(shell, 'shell', 2);
    const bh = jh * 0.46, band = cyl(r * 1.012, r * 1.012, bh, 32, true); band.rotateY(Math.PI); band.translate(0, jh * 0.44, 0); add(band, 'band');
    const lidG = cyl(r * 1.03, r * 1.03, h * 0.18, 28); lidG.translate(0, jh + h * 0.09, 0); add(lidG, 'cap');
    p._label = { aspect: wrapAspect(r, bh), kind: 'band' };
  }
  return (p._parts = P);
}

export function matFor(p, role, res) {
  if (role.startsWith('f:')) return fashionMat(p, role, res);
  p._m = p._m || {};
  const labelled = role === 'pack' || role === 'labelCyl' || role === 'band' || role === 'labelPlane' || role === 'backPlane';
  const key = labelled ? role + res : role;
  if (p._m[key]) return p._m[key];
  const fin = FINISH[p.finish] || FINISH.paper;
  const plain = (k) => p._m[k] || (p._m[k] = k === 'side' ? std(tint(p.c1, -0.08), fin.roughness, { metalness: fin.metalness }) : std(tint(p.c1, -0.16), fin.roughness, { metalness: fin.metalness }));
  const label = () => new THREE.MeshStandardMaterial({ map: labelTexture(p, res), ...fin });
  const back = () => (res === 'hi' ? new THREE.MeshStandardMaterial({ map: backTexture(p), ...fin }) : plain('side'));
  let m;
  switch (role) {
    case 'pack': { const sd = plain('side'), tp = plain('lid'); m = [sd, sd, tp, tp, label(), back()]; break; }
    case 'labelCyl': {
      const metallic = p.shape === 'can' || p.shape === 'tin';
      const lm = new THREE.MeshStandardMaterial({ map: labelTexture(p, res), roughness: metallic ? 0.3 : 0.55, metalness: metallic ? 0.35 : 0 });
      const tp = metallic ? metal : plain('lid'); m = [lm, tp, tp]; break;
    }
    case 'band': m = new THREE.MeshStandardMaterial({ map: labelTexture(p, res), roughness: 0.4 }); break;
    case 'labelPlane': m = new THREE.MeshStandardMaterial({ map: labelTexture(p, res), roughness: 0.45 }); break;
    case 'backPlane': m = back(); break;
    case 'shell': {
      const keg = p.shape === 'keg';
      m = new THREE.MeshStandardMaterial({
        color: keg ? tint(p.c1, 0.7) : '#eef7fb', transparent: true, opacity: keg ? 0.5 : 0.24,
        roughness: 0.06, metalness: 0, depthWrite: false, envMapIntensity: 1.6,
      });
      break;
    }
    case 'liquid': {
      const L = p.liquid || { c: '#ffffff', op: 1 };
      m = new THREE.MeshStandardMaterial({ color: L.c, roughness: 0.12, transparent: L.op < 1, opacity: L.op, depthWrite: L.op >= 1 });
      break;
    }
    case 'amber': m = new THREE.MeshStandardMaterial({ color: '#4a2508', roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.92, envMapIntensity: 1.6 }); break;
    case 'contents': m = new THREE.MeshStandardMaterial({ map: contentsTexture(p), roughness: 0.8 }); break;
    case 'water': m = new THREE.MeshStandardMaterial({ color: '#dff3fd', roughness: 0.1, transparent: true, opacity: 0.6, envMapIntensity: 1.4 }); break;
    case 'metal': m = metal; break;
    case 'gold': m = gold; break;
    case 'cap': m = std(p.cap, 0.4); break;
    default: m = std(tint(p.c1, -0.06), fin.roughness);
  }
  return (p._m[key] = m);
}

/** A standalone copy of a product: high resolution for holding up close, 'lo' for things seen from afar. */
export function buildProductMesh(p, res = 'hi', parts = partsFor(p)) {
  const g = new THREE.Group();
  for (const pt of parts) { const m = new THREE.Mesh(pt.geo, matFor(p, pt.role, res)); m.renderOrder = pt.order; g.add(m); }
  return g;
}

/** A product that sits centred on its own middle (for baskets), instead of on its base. */
export function centredProduct(p, res = 'lo') {
  // clothes on hangers go in the basket folded
  const outer = new THREE.Group(), inner = buildProductMesh(p, res, p.fold ? foldedVersion(p) : partsFor(p));
  inner.position.y = -(p.fold ? p.fold.H : p.H) / 2; outer.add(inner);
  return outer;
}
