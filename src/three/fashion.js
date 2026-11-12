import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { labelTexture, mkCanvas, rng, tint, toTexture } from './textures';
import { roundedBox } from './geometry';

// Fashion items: shoe pairs, caps and hats, glasses, folded clothes and clothes on hangers.
// Same contract as productModels: sitting on the origin, front facing +Z, parts as { geo, role, order }.
// Roles start with 'f:' and are resolved by fashionMat. Each item carries a swing tag ('f:tag').
const TAG = { w: 0.04, h: 0.064 };
const SHOE = {
  sneaker: { soleH: 0.03, up: 1, sole: '#f4f4f2', laces: true, trim: true },
  canvas: { soleH: 0.022, up: 0.92, sole: '#f7f5ee', laces: true, toe: true },
  loafer: { soleH: 0.016, up: 0.62, sole: null, bit: true, open: 1.5 },
  palm: { soleH: 0.022, straps: 'palm' },
  slide: { soleH: 0.03, straps: 'slide' },
  sandal: { soleH: 0.022, straps: 'sandal' },
};

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const chrome = new THREE.MeshStandardMaterial({ color: 0xd3d8db, metalness: 0.85, roughness: 0.22 });
const brass = new THREE.MeshStandardMaterial({ color: 0xd1a33a, metalness: 0.85, roughness: 0.3 });

/** Deletes uv/normal and welds, so pieces merge and shade smoothly. */
function weld(g) { g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g); g.computeVertexNormals(); return g; }
const bare = (g) => { g.deleteAttribute('uv'); return g.index ? g : mergeVertices(g); };
/** Planar UVs in metres along the face's main axis, so tiled fabric keeps one scale on every face. */
function worldUV(g, tile = 0.22) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
/** Collects geometry per role and merges each role into one mesh. */
function roles() {
  const m = new Map();
  return {
    put(role, geo, order = 0) { if (!m.has(role)) m.set(role, { list: [], order }); m.get(role).list.push(geo); },
    out(P) { for (const [role, { list, order }] of m) P.push({ geo: list.length > 1 ? mergeGeometries(list) : list[0], role, order }); },
  };
}
/** A swing tag on a loop of string, front facing +Z, hanging down from (x, y, z). */
function swingTag(R, x, y, z, tilt = 0.12) {
  const g = new THREE.PlaneGeometry(TAG.w, TAG.h); g.translate(0, -TAG.h / 2 - 0.012, 0);
  g.rotateZ(tilt); g.translate(x, y, z); R.put('f:tag', g, 1);
  const s = new THREE.CylinderGeometry(0.0007, 0.0007, 0.014, 4); s.translate(0, -0.007, -0.0005); s.rotateZ(tilt); s.translate(x, y, z);
  R.put('f:string', bare(s));
}

/* ---------- shoes ---------- */
function footprint(L, S, scale = 1) {
  const sh = new THREE.Shape(), N = 44;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, s = Math.sin(t);
    const x = Math.cos(t) * (S / 2) * (s > 0 ? 1 : 0.8) * scale, z = s * (L / 2) * scale;
    i ? sh.lineTo(x, -z) : sh.moveTo(x, -z); // shape y becomes -z once the extrusion is stood up
  }
  sh.closePath();
  return sh;
}
const extrudeUp = (shape, h, steps = 1) => { const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, steps }); g.rotateX(-Math.PI / 2); return g; };
/** Height of the upper along the foot: high at the heel collar, falling to the toe. */
const upperProfile = (nz) => (nz < -0.15 ? 1 - 0.05 * ((nz + 1) / 0.85) : 0.95 - 0.58 * Math.pow((nz + 0.15) / 1.15, 0.85));
/** One shoe (left or right) into R, centred on x = cx. */
function shoe(R, p, cx, side) {
  const st = SHOE[p.style] || SHOE.sneaker, d = p.dims, L = d.d * 0.96, S = d.w * 0.44, h = d.h;
  const parts = [];
  const put = (role, g) => { g.rotateY(side * 0.05); g.translate(cx, 0, 0); R.put(role, g); parts.push(g); };
  const sole = weld(extrudeUp(footprint(L, S, 1.035), st.soleH)); put('f:sole', sole);
  if (st.straps) {
    const top = st.soleH;
    const band = (len, z, rx, k, yaw = 0) => {
      const g = new THREE.CylinderGeometry(rx, rx, len, 22, 1, true, Math.PI / 2, Math.PI);
      g.rotateX(Math.PI / 2); g.scale(1, k, 1); g.rotateY(yaw); g.translate(0, top, z);
      put('f:upper', bare(g));
    };
    if (st.straps === 'slide') band(L * 0.36, L * 0.08, S * 0.56, 0.62);
    if (st.straps === 'palm') { band(L * 0.11, L * 0.12, S * 0.6, 0.5, 0.55); band(L * 0.11, L * 0.12, S * 0.6, 0.5, -0.55); }
    if (st.straps === 'sandal') {
      band(L * 0.08, L * 0.3, S * 0.5, 0.5); band(L * 0.1, L * 0.04, S * 0.55, 0.6); band(L * 0.06, -L * 0.3, S * 0.48, 1.3);
      const b = new THREE.BoxGeometry(0.004, 0.014, 0.016); b.translate(S * 0.5, top + 0.012, -L * 0.3); put('f:brass', bare(b));
    }
    // footbed: a slightly darker inner sole
    const bed = new THREE.ShapeGeometry(footprint(L, S, 0.94)); bed.rotateX(-Math.PI / 2); bed.translate(0, top + 0.0008, 0); put('f:dark', bare(bed));
    return;
  }
  // closed shoe: extruded footprint, raised along the profile and rounded towards the top
  const up = extrudeUp(footprint(L, S, 1), 1, 6), pos = up.attributes.position, hh = h * st.up - st.soleH;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = THREE.MathUtils.clamp(pos.getY(i), 0, 1), z = pos.getZ(i), nz = z / (L / 2), k = Math.pow(y, 2.2);
    pos.setXYZ(i, x * (1 - 0.34 * k), st.soleH + y * hh * upperProfile(nz), z * (1 - 0.1 * k));
  }
  put('f:upper', weld(up));
  // the opening at the heel
  const open = st.open || 1, col = new THREE.CircleGeometry(1, 24); col.rotateX(-Math.PI / 2);
  col.scale(S * 0.22 * open, 1, L * 0.14 * open); col.translate(0, st.soleH + hh * 0.985 + 0.001, -L * (0.26 - 0.04 * (open - 1)));
  put('f:dark', bare(col));
  if (st.trim) { const t = weld(extrudeUp(footprint(L, S, 1.045), 0.006)); t.translate(0, st.soleH - 0.003, 0); put('f:trim', t); }
  if (st.toe) { const t = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2); t.scale(S * 0.42, 0.024, L * 0.16); t.translate(0, st.soleH, L * 0.33); put('f:lace', bare(t)); }
  if (st.laces) {
    for (let k = 0; k < 4; k++) {
      const z = L * (-0.08 + k * 0.085), y = st.soleH + hh * upperProfile(z / (L / 2)) + 0.002;
      const l = new THREE.BoxGeometry(S * 0.36, 0.004, 0.006); l.rotateX(0.42); l.translate(0, y, z); put('f:lace', bare(l));
    }
  }
  if (st.bit) {
    const z = L * 0.1, y = st.soleH + hh * upperProfile(z / (L / 2)) + 0.002;
    const b = new THREE.TorusGeometry(S * 0.16, 0.002, 6, 16, Math.PI); b.rotateX(-Math.PI / 2 + 0.4); b.translate(0, y, z); put('f:brass', bare(b));
  }
}
function shoesParts(p, R) {
  const S = p.dims.w * 0.44;
  shoe(R, p, -S * 0.56, -1); shoe(R, p, S * 0.56, 1);
  swingTag(R, S * 0.56 + S * 0.4, p.dims.h * 0.9, p.dims.d * 0.12, 0.2);
}

/* ---------- caps and hats ---------- */
function capParts(p, R) {
  const d = p.dims, st = p.style;
  if (st === 'baseball') {
    const r = d.w / 2, z0 = -d.d / 2 + r * 1.06;
    const crown = new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); crown.scale(1, 0.84, 1.06); crown.translate(0, 0.004, z0);
    R.put('f:upper', bare(crown));
    const btn = new THREE.SphereGeometry(r * 0.08, 10, 6); btn.scale(1, 0.5, 1); btn.translate(0, r * 0.84 + 0.004, z0); R.put('f:upper', bare(btn));
    // the brim: a half disc in front of the crown, curved down at the sides
    const sh = new THREE.Shape(), N = 24, reach = d.d / 2 - z0;
    for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI, x = -Math.cos(t) * r * 0.86, z = z0 + r * 0.45 + Math.sin(t) * (reach - r * 0.45); i ? sh.lineTo(x, -z) : sh.moveTo(x, -z); }
    sh.lineTo(r * 0.86, -(z0 + r * 0.2)); sh.lineTo(-r * 0.86, -(z0 + r * 0.2)); sh.closePath();
    const brim = extrudeUp(sh, 0.004, 1), bp = brim.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i) / r, z = bp.getZ(i) - z0; bp.setY(i, bp.getY(i) + 0.022 - 0.022 * x * x - z * 0.04); }
    R.put('f:trim', weld(brim));
    const logo = new THREE.CircleGeometry(r * 0.3, 20), a = 0.55;
    logo.rotateX(-a * 0.8); logo.translate(0, 0.004 + r * 0.84 * Math.sin(a), z0 + r * 1.06 * Math.cos(a) + 0.003);
    R.put('f:logo', logo, 1);
    swingTag(R, r * 0.82, 0.02, z0 + r * 0.9, 0.1);
  } else if (st === 'fila') {
    const r = d.w / 2, h = d.h;
    const band = new THREE.CylinderGeometry(r * 0.94, r, h * 0.78, 30, 3); band.translate(0, h * 0.39, 0);
    const top = new THREE.SphereGeometry(r * 0.98, 28, 10); top.scale(1, 0.32, 1); top.rotateZ(-0.32); top.translate(r * 0.16, h * 0.8, 0);
    R.put('f:fabric', worldUV(mergeGeometries([bare(band), bare(top)].map((g) => { g.computeVertexNormals(); return g; })), 0.14));
    swingTag(R, r * 0.7, h * 0.55, r * 0.74, 0.08);
  } else {
    // bucket hat: crown, top and a sloping brim
    const r = d.w / 2, h = d.h;
    const crown = new THREE.CylinderGeometry(r * 0.56, r * 0.64, h * 0.72, 30, 2, true); crown.translate(0, h * 0.28 + h * 0.36, 0);
    const top = new THREE.CircleGeometry(r * 0.56, 30); top.rotateX(-Math.PI / 2); top.translate(0, h, 0);
    const brim = new THREE.CylinderGeometry(r * 0.64, r, h * 0.28, 36, 1, true); brim.translate(0, h * 0.14, 0);
    R.put('f:fabric', worldUV(mergeGeometries([crown, top, brim].map(bare)), 0.14));
    const rib = new THREE.CylinderGeometry(r * 0.636, r * 0.645, h * 0.14, 30, 1, true); rib.translate(0, h * 0.34, 0); R.put('f:trim', bare(rib));
    swingTag(R, r * 0.62, h * 0.3, r * 0.68, 0.1);
  }
}

/* ---------- glasses ---------- */
function lensShape(style, side) {
  const sh = new THREE.Shape(), N = 36, pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    let x, y;
    if (style === 'pilot') { x = 0.027 * c + side * 0.005 * Math.max(0, -s); y = 0.022 * s * (s < 0 ? 1.3 : 1); }
    else if (style === 'sun') { // squarish, wider at the top
      const e = 0.35, sc = Math.sign(c) * Math.pow(Math.abs(c), e), ss = Math.sign(s) * Math.pow(Math.abs(s), e);
      x = 0.026 * sc * (1 + 0.08 * ss); y = 0.02 * ss;
    } else { const e = 0.6; x = 0.024 * Math.sign(c) * Math.pow(Math.abs(c), e); y = 0.017 * Math.sign(s) * Math.pow(Math.abs(s), e); }
    pts.push(new THREE.Vector2(x, y));
  }
  pts.forEach((v, i) => (i ? sh.lineTo(v.x, v.y) : sh.moveTo(v.x, v.y))); sh.closePath();
  return { sh, pts };
}
function glassesParts(p, R) {
  const st = p.style, z = p.dims.d / 2 - 0.012, cy = 0.03, gap = 0.031, thick = st === 'sun' ? 0.0034 : st === 'pilot' ? 0.0013 : 0.0024;
  let hinge = 0, top = 0;
  for (const side of [-1, 1]) {
    const { sh, pts } = lensShape(st, side), cx = side * gap;
    const lens = new THREE.ShapeGeometry(sh); lens.translate(cx, cy, z); R.put('f:lens', bare(lens), 2);
    const curve = new THREE.CatmullRomCurve3(pts.map((v) => new THREE.Vector3(v.x + cx, v.y + cy, z)), true);
    R.put('f:frame', bare(new THREE.TubeGeometry(curve, 48, thick, 6, true)));
    hinge = Math.max(...pts.map((v) => v.x)) + gap; top = Math.max(...pts.map((v) => v.y));
  }
  const bridge = new THREE.CatmullRomCurve3([new THREE.Vector3(-gap + 0.016, cy + 0.006, z), new THREE.Vector3(0, cy + 0.01, z + 0.002), new THREE.Vector3(gap - 0.016, cy + 0.006, z)]);
  R.put('f:frame', bare(new THREE.TubeGeometry(bridge, 10, thick * 0.9, 6)));
  if (st === 'pilot') {
    const bar = new THREE.CatmullRomCurve3([new THREE.Vector3(-gap, cy + top + 0.001, z), new THREE.Vector3(0, cy + top - 0.002, z + 0.002), new THREE.Vector3(gap, cy + top + 0.001, z)]);
    R.put('f:frame', bare(new THREE.TubeGeometry(bar, 12, 0.0011, 5)));
  }
  // temples run back from the hinges and dip at the ear
  for (const side of [-1, 1]) {
    const x = side * (hinge + 0.002), y = cy + top * 0.55;
    const arm = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, y, z - 0.002), new THREE.Vector3(x * 1.02, y - 0.004, z - 0.06),
      new THREE.Vector3(x * 1.01, y - 0.012, z - 0.105), new THREE.Vector3(x, 0.004, -p.dims.d / 2 + 0.004),
    ]);
    R.put('f:frame', bare(new THREE.TubeGeometry(arm, 20, st === 'sun' ? 0.0026 : 0.0014, 5)));
  }
  swingTag(R, hinge + 0.004, cy + top * 0.5, z - 0.004, 0.05);
}

/* ---------- folded clothes ---------- */
function foldedGeo(w, h, d) {
  const g = roundedBox(w, h, d, Math.min(h * 0.45, 0.02), 3); g.translate(0, h / 2, 0);
  return worldUV(g, 0.22);
}
function foldedParts(p, R, dims = p.dims) {
  const { w, h, d } = dims;
  R.put('f:fabric', foldedGeo(w, h, d));
  // a fold line across the front and, on tees, the collar
  const fold = new THREE.BoxGeometry(w * 0.96, 0.0025, 0.003); fold.translate(0, h * 0.5, d / 2 + 0.0005); R.put('f:seam', bare(fold));
  if (p.fabric === 'tee' || p.fabric === 'jersey') {
    const c = new THREE.TorusGeometry(w * 0.13, 0.006, 6, 20, Math.PI); c.rotateX(-Math.PI / 2); c.scale(1, 1, 0.7); c.translate(0, h + 0.001, d * 0.18);
    R.put('f:seam', bare(c));
  }
  if (p.fabric === 'denim') {
    const patch = new THREE.PlaneGeometry(0.06, 0.035); patch.rotateX(-Math.PI / 2); patch.translate(w * 0.28, h + 0.001, -d * 0.28); R.put('f:trim', bare(patch));
  }
  if (p.fabric === 'ankara') {
    const band = new THREE.BoxGeometry(0.06, h + 0.006, d + 0.006); band.translate(0, h / 2, 0); R.put('f:band', bare(band));
  }
  // the tag lies on top, its end hanging over the front edge
  const tg = new THREE.PlaneGeometry(TAG.w, TAG.h); tg.rotateX(-Math.PI / 2 + 0.2); tg.translate(w * 0.3, h + 0.004, d / 2 - TAG.h * 0.42);
  R.put('f:tag', tg, 1);
}

/* ---------- clothes on hangers ---------- */
const HOOK = 0.13; // hook and shoulders above the garment top
function silhouette(style, W, G) {
  const k = W / 0.5;
  const half = style === 'kaftan'
    ? [[0.2, 0], [0.17, G * 0.62], [0.25, G * 0.4], [0.29, G * 0.45], [0.19, G * 0.95], [0.055, G], [0, G * 0.965]]
    : style === 'jersey'
      ? [[0.19, 0], [0.195, G * 0.6], [0.25, G * 0.67], [0.22, G * 0.88], [0.15, G * 0.97], [0.06, G], [0, G * 0.86]]
      : [[0.19, 0], [0.195, G * 0.6], [0.25, G * 0.67], [0.22, G * 0.88], [0.15, G * 0.97], [0.06, G], [0, G * 0.94]];
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  for (const [x, y] of half) sh.lineTo(x * k, y);
  for (let i = half.length - 2; i >= 0; i--) sh.lineTo(-half[i][0] * k, half[i][1]);
  sh.closePath();
  return sh;
}
function hangerParts(p, R) {
  const W = p.dims.w, H = p.dims.h, G = H - HOOK, th = 0.012;
  const g = new THREE.ExtrudeGeometry(silhouette(p.style, W, G), { depth: th, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -th / 2);
  // gentle drape: the middle bellies out a little
  const pos = g.attributes.position, uv = new Float32Array(pos.count * 2), placed = p.fabric === 'jersey' || p.fabric === 'kaftan';
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, pos.getZ(i) + 0.008 * Math.sin((Math.PI * y) / G) * Math.cos((Math.PI * x) / W));
    uv[i * 2] = placed ? (x + W / 2) / W : x / 0.22; uv[i * 2 + 1] = placed ? y / G : y / 0.22;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals();
  R.put('f:fabric', g);
  // the hanger bar behind the shoulders and the chrome hook on top
  const bar = new THREE.CatmullRomCurve3([new THREE.Vector3(-W * 0.4, G * 0.9, -0.012), new THREE.Vector3(0, G + 0.025, -0.012), new THREE.Vector3(W * 0.4, G * 0.9, -0.012)]);
  R.put('f:hanger', bare(new THREE.TubeGeometry(bar, 20, 0.008, 8)));
  const hook = [new THREE.Vector3(0, G + 0.025, -0.012), new THREE.Vector3(0, G + 0.08, -0.012)];
  for (let i = 0; i <= 10; i++) { const a = Math.PI - (i / 10) * (Math.PI * 1.25); hook.push(new THREE.Vector3(0.025 + Math.cos(a) * 0.025, G + 0.1 + Math.sin(a) * 0.025, -0.012)); }
  R.put('f:chrome', bare(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hook), 30, 0.0024, 6)));
  swingTag(R, W * 0.16, G * 0.9, th / 2 + 0.008, 0.08);
}
/** Where the arm bar sits relative to a hanger's origin (so the hook rests on it). */
export const hookPoint = (p) => ({ x: 0.025, y: p.dims.h - HOOK + 0.11, z: -0.012 });

/* ---------- entry points ---------- */
export function fashionParts(p) {
  const P = [], R = roles();
  if (p.shape === 'shoe') shoesParts(p, R);
  else if (p.shape === 'cap') capParts(p, R);
  else if (p.shape === 'glasses') glassesParts(p, R);
  else if (p.shape === 'folded') foldedParts(p, R);
  else hangerParts(p, R);
  R.out(P);
  p._label = { aspect: TAG.w / TAG.h, kind: 'swing' };
  return P;
}
/** A hanging garment folded flat, for baskets and the till. */
export function foldedVersion(p) {
  if (p._foldParts) return p._foldParts;
  const P = [], R = roles();
  foldedParts(p, R, { w: p.fold.W, h: p.fold.H, d: p.fold.D });
  R.out(P);
  return (p._foldParts = P);
}

/* ---------- fabrics ---------- */
function speckle(g, S, rnd, n, a) {
  for (let i = 0; i < n; i++) { g.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(rnd() * S, rnd() * S, 2, 2); }
}
function fabricCanvas(p) {
  const S = 512, c = mkCanvas(S, S), g = c.getContext('2d'), rnd = rng(p.id * 31 + 7);
  const f = p.fabric || (p.style === 'fila' ? 'asooke' : 'tee');
  g.fillStyle = p.c1; g.fillRect(0, 0, S, S);
  const wrapX = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  if (f === 'ankara') {
    // wax print: rings and petals on a staggered grid (tiles seamlessly)
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = (i + (j % 2) * 0.5) * (S / 4) + S / 8, y = j * (S / 4) + S / 8;
      wrapX((ox, oy) => {
        const X = x + ox, Y = y + oy;
        g.fillStyle = p.c2; g.beginPath(); g.arc(X, Y, 46, 0, Math.PI * 2); g.fill();
        g.fillStyle = p.c3; g.beginPath(); g.arc(X, Y, 32, 0, Math.PI * 2); g.fill();
        g.fillStyle = p.c1; g.beginPath(); g.arc(X, Y, 18, 0, Math.PI * 2); g.fill();
        g.fillStyle = p.c2; g.beginPath(); g.arc(X, Y, 7, 0, Math.PI * 2); g.fill();
        g.fillStyle = p.c3;
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.ellipse(X + Math.cos(a) * 56, Y + Math.sin(a) * 56, 6, 3, a, 0, Math.PI * 2); g.fill(); }
      });
    }
    g.globalAlpha = 0.12; speckle(g, S, rnd, 2500, 0.5); g.globalAlpha = 1;
  } else if (f === 'denim') {
    g.strokeStyle = tint(p.c1, 0.25); g.lineWidth = 2;
    for (let k = -S; k < S * 2; k += 6) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke(); }
    speckle(g, S, rnd, 4000, 0.12);
    g.setLineDash([10, 8]); g.strokeStyle = p.c2; g.lineWidth = 3;
    for (const y of [40, S - 40]) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    g.setLineDash([]);
  } else if (f === 'asooke') {
    for (let y = 0; y < S; y += 32) {
      g.fillStyle = p.c2; g.fillRect(0, y + 4, S, 6);
      g.fillStyle = tint(p.c1, -0.25); g.fillRect(0, y + 18, S, 3);
    }
    g.globalAlpha = 0.18; for (let x = 0; x < S; x += 4) { g.fillStyle = x % 8 ? '#fff' : '#000'; g.fillRect(x, 0, 1, S); } g.globalAlpha = 1;
  } else if (f === 'jersey') {
    // placed print: green sides, white centre panel, a number on the chest
    g.fillStyle = p.c2; g.fillRect(S * 0.34, 0, S * 0.32, S);
    g.globalAlpha = 0.1; for (let y = 0; y < S; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < S; x += 6) { g.fillStyle = '#000'; g.fillRect(x, y, 2, 2); } g.globalAlpha = 1;
    g.fillStyle = p.c1; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 120px Fredoka, sans-serif'; g.fillText('9', S * 0.5, S * 0.42);
    g.fillStyle = p.c2; g.beginPath(); g.arc(S * 0.24, S * 0.2, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = p.c1; g.fillRect(0, S * 0.08, S * 0.08, S * 0.04); g.fillRect(S * 0.92, S * 0.08, S * 0.08, S * 0.04);
  } else if (f === 'kaftan') {
    speckle(g, S, rnd, 6000, 0.05);
    g.strokeStyle = p.c2; g.fillStyle = p.c2; g.lineWidth = 3;
    // embroidered bib around the neck and down the placket
    for (let r = 0; r < 3; r++) { g.beginPath(); g.ellipse(S / 2, 0, 46 + r * 16, 80 + r * 22, 0, 0, Math.PI); g.stroke(); }
    for (let k = 0; k < 9; k++) { const a = (k / 8) * Math.PI; g.beginPath(); g.arc(S / 2 + Math.cos(a) * 92, Math.sin(a) * 140, 5, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(S / 2, 60); g.lineTo(S / 2, S * 0.52); g.stroke();
    for (let y = 70; y < S * 0.52; y += 22) { g.beginPath(); g.moveTo(S / 2 - 8, y); g.lineTo(S / 2, y + 8); g.lineTo(S / 2 + 8, y); g.stroke(); }  } else {
    // cotton jersey knit
    speckle(g, S, rnd, 5000, 0.06);
    g.globalAlpha = 0.06; for (let x = 0; x < S; x += 3) { g.fillStyle = '#000'; g.fillRect(x, 0, 1, S); } g.globalAlpha = 1;
  }
  return c;
}
function fabricTexture(p) {
  p._tex = p._tex || {};
  if (p._tex.fabric) return p._tex.fabric;
  const t = toTexture(fabricCanvas(p)); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (p._tex.fabric = t);
}
function logoTexture(p) {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = p.c2; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.fillStyle = p.c1; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.fill();
  const ini = p.brand.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
  g.fillStyle = p.c2; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${ini.length > 2 ? 40 : 52}px Fredoka, sans-serif`; g.fillText(ini, 64, 68);
  return toTexture(c);
}

const SOLE = { loafer: (p) => tint(p.c1, -0.55), palm: (p) => p.c2, slide: (p) => tint(p.c1, 0.12), sandal: (p) => p.c2 };
export function fashionMat(p, role, res) {
  p._m = p._m || {};
  const key = role === 'f:tag' ? role + res : role;
  if (p._m[key]) return p._m[key];
  const leather = p.style === 'loafer' || p.style === 'sandal' || p.style === 'palm';
  let m;
  switch (role) {
    case 'f:tag': m = new THREE.MeshStandardMaterial({ map: labelTexture(p, res), roughness: 0.7, side: THREE.DoubleSide }); break;
    case 'f:string': m = std('#e8e2d0', 0.9); break;
    case 'f:upper': m = std(p.c1, leather ? 0.42 : p.shape === 'cap' ? 0.88 : 0.66, { side: THREE.DoubleSide }); break;
    case 'f:sole': { const s = SHOE[p.style] || {}; m = std(s.sole || (SOLE[p.style] ? SOLE[p.style](p) : '#f2f2f2'), 0.8); break; }
    case 'f:trim': m = std(p.shape === 'folded' ? '#8a5a2b' : p.shape === 'cap' && p.style === 'baseball' ? tint(p.c1, -0.12) : p.c2, 0.7, { side: THREE.DoubleSide }); break;
    case 'f:lace': m = std('#fafafa', 0.8); break;
    case 'f:dark': m = std(p.shape === 'shoe' && !SHOE[p.style].straps ? '#2a2420' : tint(p.c1, -0.25), 0.85); break;
    case 'f:brass': m = brass; break;
    case 'f:chrome': m = chrome; break;
    case 'f:hanger': m = std('#1d1f20', 0.45); break;
    case 'f:frame': m = p.style === 'pilot' ? brass : std(p.c1, 0.3, { envMapIntensity: 1.2 }); break;
    case 'f:lens': {
      const dark = p.style !== 'clear';
      m = new THREE.MeshStandardMaterial({ color: p.c2, roughness: 0.05, metalness: dark ? 0.3 : 0, transparent: true, opacity: dark ? 0.86 : 0.18, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 });
      break;
    }
    case 'f:logo': m = new THREE.MeshStandardMaterial({ map: logoTexture(p), roughness: 0.8, transparent: true, alphaTest: 0.4 }); break;
    case 'f:fabric': m = std('#ffffff', 0.92, { map: fabricTexture(p), side: THREE.DoubleSide }); break;
    case 'f:seam': m = std(tint(p.c1, -0.2), 0.9); break;
    case 'f:band': m = std('#f4efe3', 0.75); break;
    default: m = std(p.c1);
  }
  return (p._m[key] = m);
}
