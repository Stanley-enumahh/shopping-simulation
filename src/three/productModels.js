import * as THREE from 'three';
import { labelTexture } from './textures';

// Every product model sits on its base at the origin with its label facing +Z.
const metal = new THREE.MeshStandardMaterial({ color: 0xd6dbde, metalness: 0.75, roughness: 0.3 });
const std = (color, rough = 0.55) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

export function partsFor(p) {
  if (p._parts) return p._parts;
  const P = [], d = p.dims, s = p.shape;
  const cyl = (rt, rb, h, seg = 28) => new THREE.CylinderGeometry(rt, rb, h, seg, 1);
  if (s === 'box' || s === 'bag') {
    let geo;
    if (s === 'box') geo = new THREE.BoxGeometry(d.w, d.h, d.d);
    else {
      geo = new THREE.BoxGeometry(d.w, d.h, d.d, 12, 14, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const nx = pos.getX(i) / (d.w / 2), ny = pos.getY(i) / (d.h / 2), z = pos.getZ(i);
        const f = Math.sqrt(Math.max(0, 1 - nx * nx * 0.85)) * (1 - Math.pow(Math.abs(ny), 5));
        pos.setZ(i, Math.sign(z) * (d.d / 2) * (0.16 + 0.84 * f));
      }
      geo.computeVertexNormals();
    }
    geo.translate(0, d.h / 2, 0);
    P.push({ geo, role: 'labelBox' });
    p._aspect = d.w / d.h; p._wrap = false;
  } else if (s === 'can') {
    const geo = cyl(d.r, d.r, d.h); geo.rotateY(Math.PI); geo.translate(0, d.h / 2, 0);
    P.push({ geo, role: 'labelCyl' });
    const rim = cyl(d.r * 0.97, d.r, d.h * 0.06); rim.translate(0, d.h * 1.03, 0);
    P.push({ geo: rim, role: 'metal' });
    p._aspect = (2 * Math.PI * d.r) / d.h; p._wrap = true;
  } else if (s === 'jar') {
    const bh = d.h * 0.8;
    const geo = cyl(d.r, d.r, bh); geo.rotateY(Math.PI); geo.translate(0, bh / 2, 0);
    P.push({ geo, role: 'labelCyl' });
    const lid = cyl(d.r * 0.96, d.r * 0.96, d.h * 0.2); lid.translate(0, bh + d.h * 0.1, 0);
    P.push({ geo: lid, role: 'cap' });
    p._aspect = (2 * Math.PI * d.r) / bh; p._wrap = true;
  } else if (s === 'bottle') {
    const bh = d.h * 0.58, sh = d.h * 0.17, nh = d.h * 0.13;
    const geo = cyl(d.r, d.r, bh, 26); geo.rotateY(Math.PI); geo.translate(0, bh / 2, 0);
    P.push({ geo, role: 'labelCyl' });
    const sg = cyl(d.r * 0.38, d.r, sh, 26); sg.translate(0, bh + sh / 2, 0);
    P.push({ geo: sg, role: 'body' });
    const ng = cyl(d.r * 0.34, d.r * 0.38, nh, 18); ng.translate(0, bh + sh + nh / 2, 0);
    P.push({ geo: ng, role: 'body' });
    let cg;
    if (p.spray) { cg = new THREE.BoxGeometry(d.r * 1.1, d.h * 0.11, d.r * 2.2); cg.translate(0, d.h * 0.93, d.r * 0.5); }
    else { cg = cyl(d.r * 0.42, d.r * 0.42, d.h * 0.1, 18); cg.translate(0, bh + sh + nh + d.h * 0.05, 0); }
    P.push({ geo: cg, role: 'cap' });
    p._aspect = (2 * Math.PI * d.r) / bh; p._wrap = true;
  } else if (s === 'carton') {
    const bh = d.h * 0.8, gh = d.h * 0.17;
    const geo = new THREE.BoxGeometry(d.w, bh, d.d); geo.translate(0, bh / 2, 0);
    P.push({ geo, role: 'labelBox' });
    const tri = new THREE.Shape();
    tri.moveTo(-d.d / 2, 0); tri.lineTo(d.d / 2, 0); tri.lineTo(0, gh); tri.closePath();
    const gg = new THREE.ExtrudeGeometry(tri, { depth: d.w, bevelEnabled: false });
    gg.rotateY(Math.PI / 2); gg.translate(-d.w / 2, bh, 0);
    P.push({ geo: gg, role: 'top' });
    const fin = new THREE.BoxGeometry(d.w, d.h * 0.04, 0.006); fin.translate(0, bh + gh + d.h * 0.015, 0);
    P.push({ geo: fin, role: 'top' });
    p._aspect = d.w / bh; p._wrap = false;
  } else if (s === 'tub') {
    const bh = d.h * 0.84;
    const geo = cyl(d.r, d.r * 0.84, bh); geo.rotateY(Math.PI); geo.translate(0, bh / 2, 0);
    P.push({ geo, role: 'labelCyl' });
    const lid = cyl(d.r * 1.04, d.r * 1.04, d.h * 0.16); lid.translate(0, bh + d.h * 0.08, 0);
    P.push({ geo: lid, role: 'cap' });
    p._aspect = (2 * Math.PI * d.r * 0.92) / bh; p._wrap = true;
  } else if (s === 'jug') {
    const bh = d.h * 0.78;
    const geo = new THREE.BoxGeometry(d.w, bh, d.d); geo.translate(0, bh / 2, 0);
    P.push({ geo, role: 'labelBox' });
    const sg = new THREE.BoxGeometry(d.w * 0.72, d.h * 0.1, d.d * 0.82); sg.translate(-d.w * 0.08, bh + d.h * 0.05, 0);
    P.push({ geo: sg, role: 'body' });
    const hg = new THREE.BoxGeometry(d.w * 0.14, d.h * 0.2, d.d * 0.34); hg.translate(d.w * 0.33, bh + d.h * 0.07, 0);
    P.push({ geo: hg, role: 'body' });
    const cg = cyl(d.w * 0.16, d.w * 0.16, d.h * 0.12, 18); cg.translate(-d.w * 0.18, bh + d.h * 0.16, 0);
    P.push({ geo: cg, role: 'cap' });
    p._aspect = d.w / bh; p._wrap = false;
  }
  return (p._parts = P);
}

export function matFor(p, role, res) {
  p._m = p._m || {};
  const isLabel = role === 'labelBox' || role === 'labelCyl';
  const key = isLabel ? role + res : role;
  if (p._m[key]) return p._m[key];
  const plain = (k) => p._m[k] || (p._m[k] = k === 'side' ? std(shade(p.c1, 0.9)) : std(shade(p.c1, 0.82)));
  let m;
  if (isLabel) {
    const can = p.shape === 'can';
    const lm = new THREE.MeshStandardMaterial({ map: labelTexture(p, p._aspect, p._wrap, res), roughness: can ? 0.32 : 0.6, metalness: can ? 0.25 : 0 });
    if (role === 'labelBox') { const sd = plain('side'), tp = plain('lid'); m = [sd, sd, tp, tp, lm, lm]; }
    else { const tp = can ? metal : plain('lid'); m = [lm, tp, tp]; }
  } else if (role === 'metal') m = metal;
  else if (role === 'cap') m = std(p.cap, 0.4);
  else if (role === 'body') m = std(p.body || p.c1, 0.35);
  else m = std(shade(p.c1, 0.94));
  return (p._m[key] = m);
}

/** A standalone copy of a product: high resolution for holding up close, 'lo' for things seen from afar. */
export function buildProductMesh(p, res = 'hi') {
  const g = new THREE.Group();
  for (const pt of partsFor(p)) g.add(new THREE.Mesh(pt.geo, matFor(p, pt.role, res)));
  return g;
}

/** A product that sits centred on its own middle (for baskets), instead of on its base. */
export function centredProduct(p, res = 'lo') {
  const outer = new THREE.Group(), inner = buildProductMesh(p, res);
  inner.position.y = -p.H / 2; outer.add(inner);
  return outer;
}
