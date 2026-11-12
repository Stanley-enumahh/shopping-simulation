import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BASKET, buildBasket } from './basket';
import { clothTexture } from '../three/fashion';
import { mkCanvas, toTexture, tint } from '../three/textures';
import { roundedBox } from '../three/geometry';

// Stylised people with jointed limbs (shoulder, elbow, hip, knee, ankle) so they can walk heel to toe,
// reach high and low shelves, check a phone or stand at ease. Faces blink and look around.
// The model faces +Z and stands with its feet at y = 0. Geometry is shared between people.
const geo = {};
function g(key, make) { return geo[key] || (geo[key] = make()); }
function capsuleDown(r, len) { const c = new THREE.CapsuleGeometry(r, len, 4, 12); c.translate(0, -len / 2 - r * 0.2, 0); return c; }
const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, Math.PI);
const HIP = 0.885, CHEST = 1.02;

export const SKIN = ['#5a3825', '#6b4430', '#7a4e33', '#8d5a3b', '#4a2e1f', '#a0694a'];

/* ---------- body shapes ---------- */
// Upper torso, in chest space (waist at y = 0, neck base near y = 0.48). [radius, y], bottom to top.
function torsoProfile(fig, build) {
  const base = fig === 'f'
    ? [[0, -0.04], [0.142, -0.04], [0.136, 0.04], [0.142, 0.14], [0.163, 0.24], [0.16, 0.31], [0.148, 0.39], [0.11, 0.44], [0.055, 0.47], [0, 0.48]]
    : [[0, -0.04], [0.15, -0.04], [0.152, 0.03], [0.16, 0.13], [0.173, 0.24], [0.177, 0.32], [0.166, 0.4], [0.12, 0.45], [0.06, 0.48], [0, 0.49]];
  const belly = build === 'heavy' ? 0.035 : build === 'slim' ? -0.008 : 0;
  return base.map(([r, y]) => [r && r + belly * Math.exp(-((y - 0.1) ** 2) / 0.02), y]);
}
// Hips and seat, in body space.
const hipsProfile = (fig) => (fig === 'f'
  ? [[0, 0.79], [0.13, 0.79], [0.165, 0.85], [0.18, 0.92], [0.165, 0.99], [0.145, 1.04], [0, 1.04]]
  : [[0, 0.79], [0.13, 0.79], [0.152, 0.85], [0.163, 0.92], [0.157, 0.99], [0.15, 1.04], [0, 1.04]]);
// Skirts, wrappers and the lower part of a kaftan: open at the hem, in body space.
const DRESS = {
  skirt: [[0.215, 0.5], [0.2, 0.62], [0.18, 0.8], [0.165, 0.95], [0.148, 1.05]],
  wrapper: [[0.19, 0.08], [0.185, 0.3], [0.18, 0.6], [0.175, 0.85], [0.165, 0.97], [0.148, 1.05]],
  robe: [[0.245, 0.36], [0.225, 0.55], [0.2, 0.75], [0.18, 0.92], [0.162, 1.05]],
};

/** A relaxed hand hanging down from the wrist: palm, four curled fingers and a thumb toward the front. */
function handGeo() {
  return g('hand', () => {
    const parts = [];
    const palm = roundedBox(0.072, 0.082, 0.028, 0.012, 2); palm.translate(0, -0.045, 0); parts.push(palm);
    for (let k = 0; k < 4; k++) {
      const f = new THREE.CapsuleGeometry(0.0085, 0.042 - Math.abs(k - 1.5) * 0.006, 3, 8); f.deleteAttribute('uv');
      f.translate(0, -0.026, 0); f.rotateX(0.35); f.translate(-0.026 + k * 0.0175, -0.088, 0.004); parts.push(f);
    }
    const th = new THREE.CapsuleGeometry(0.0095, 0.036, 3, 8); th.deleteAttribute('uv');
    th.translate(0, -0.02, 0); th.rotateZ(-0.5); th.translate(-0.034, -0.03, 0.008); parts.push(th);
    const m = mergeGeometries(parts); m.rotateY(Math.PI / 2); // palm faces the thigh, thumb forward
    return m;
  });
}
function shoeGeo() {
  return g('shoe', () => { const s = roundedBox(0.095, 0.07, 0.25, 0.03, 2); s.translate(0, 0, 0.04); return s; });
}

/* ---------- hair and headwear (head space; skull centre at 0) ---------- */
function hairGeo(kind) {
  return g('hair:' + kind, () => {
    const cap = (cover) => { const c = new THREE.SphereGeometry(0.104, 22, 12, 0, Math.PI * 2, 0, Math.PI * cover); c.scale(0.95, 1.1, 1.04); c.rotateX(-0.24); c.translate(0, 0.012, -0.006); c.deleteAttribute('uv'); return c; };
    if (kind === 'low') return cap(0.52);
    if (kind === 'fade') return cap(0.4);
    if (kind === 'afro') {
      const a = new THREE.IcosahedronGeometry(0.142, 3), p = a.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + Math.sin(v.x * 140) * Math.sin(v.y * 130) * Math.sin(v.z * 150) * 0.05); p.setXYZ(i, v.x, v.y, v.z); }
      a.scale(0.95, 0.85, 0.95); a.translate(0, 0.075, -0.045); a.deleteAttribute('uv'); a.computeVertexNormals();
      return a;
    }
    const parts = [cap(0.55)];
    if (kind === 'bun') { const b = new THREE.SphereGeometry(0.05, 14, 10); b.deleteAttribute('uv'); b.translate(0, 0.09, -0.075); parts.push(b); }
    if (kind === 'braids' || kind === 'locs') {
      const n = kind === 'braids' ? 14 : 10, r = kind === 'braids' ? 0.009 : 0.016, len = kind === 'braids' ? 0.24 : 0.15;
      for (let k = 0; k < n; k++) {
        const a = -1.7 + (k / (n - 1)) * 3.4, x = Math.sin(a) * 0.088, z = -Math.cos(a) * 0.085;
        const b = new THREE.CapsuleGeometry(r, len, 3, 6); b.deleteAttribute('uv');
        b.translate(0, -len / 2, 0); b.rotateZ(-Math.sin(a) * 0.25); b.rotateX(Math.cos(a) * 0.2); b.translate(x, 0.03, z);
        parts.push(b);
      }
    }
    return mergeGeometries(parts);
  });
}
/** A pleated fan for the back of a gele. */
function fanGeo() {
  return g('fan', () => {
    const N = 48, R = 0.17, pos = [0, 0, 0], uv = [0.5, 0], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = -1.25 + (i / N) * 2.5, rr = R * (0.92 + 0.08 * Math.cos(a * 6));
      pos.push(Math.sin(a) * rr, Math.cos(a) * rr, Math.sin(a * 16) * 0.012);
      uv.push(i / N, 1);
      if (i) idx.push(0, i, i + 1);
    }
    const f = new THREE.BufferGeometry();
    f.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); f.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    f.setIndex(idx); f.computeVertexNormals();
    return f;
  });
}
function headwear(head, hw) {
  const add = (geom, mat, pos = [0, 0, 0], rot = [0, 0, 0]) => { const m = new THREE.Mesh(geom, mat); m.position.set(...pos); m.rotation.set(...rot); head.add(m); return m; };
  if (hw.kind === 'gele') {
    const mat = std('#ffffff', 0.75, { map: clothTexture({ fabric: hw.fabric || 'asooke', c1: hw.c1, c2: hw.c2, c3: hw.c3 }, 3, 2), side: THREE.DoubleSide });
    add(g('geleBand', () => new THREE.CylinderGeometry(0.114, 0.106, 0.1, 26, 1, true)), mat, [0, 0.045, -0.004], [-0.18, 0, 0]);
    add(g('geleTop', () => { const s = new THREE.SphereGeometry(0.118, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2); s.scale(1, 0.75, 1.05); return s; }), mat, [0, 0.09, -0.012], [-0.18, 0, 0]);
    add(fanGeo(), mat, [0.01, 0.1, -0.05], [-0.55, 0.15, -0.12]);
    add(g('geleKnot', () => new THREE.TorusGeometry(0.03, 0.016, 8, 14)), mat, [0.1, 0.08, 0.03], [0, 1.2, 0.5]);
  } else if (hw.kind === 'fila') {
    const mat = std('#ffffff', 0.85, { map: clothTexture({ fabric: 'asooke', c1: hw.c1, c2: hw.c2 }, 3, 1) });
    add(g('filaBand', () => new THREE.CylinderGeometry(0.108, 0.112, 0.08, 26)), mat, [0, 0.07, -0.006], [-0.15, 0, 0]);
    add(g('filaTop', () => { const s = new THREE.SphereGeometry(0.112, 22, 10); s.scale(1, 0.32, 1); return s; }), mat, [0.03, 0.115, -0.01], [-0.1, 0, -0.35]);
  } else if (hw.kind === 'cap') {
    const mat = std(hw.color, 0.85);
    add(g('capCrown', () => { const s = new THREE.SphereGeometry(0.112, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2); s.scale(1, 0.78, 1.06); return s; }), mat, [0, 0.035, -0.006], [-0.12, 0, 0]);
    add(g('capBrim', () => { const c = new THREE.CircleGeometry(0.1, 20, Math.PI, Math.PI); c.rotateX(-Math.PI / 2); c.scale(0.9, 1, 0.8); return c; }), std(hw.color, 0.85, { side: THREE.DoubleSide }), [0, 0.045, 0.085], [0.12, 0, 0]);
  } else if (hw.kind === 'guard') {
    // peaked uniform cap with a badge
    const mat = std(hw.color, 0.7);
    add(g('gCrown', () => new THREE.CylinderGeometry(0.128, 0.108, 0.075, 26)), mat, [0, 0.085, 0]);
    add(g('gBand', () => new THREE.CylinderGeometry(0.11, 0.11, 0.025, 26)), std('#111111', 0.5), [0, 0.06, 0]);
    add(g('gVisor', () => { const c = new THREE.CircleGeometry(0.105, 20, Math.PI, Math.PI); c.rotateX(-Math.PI / 2); c.scale(0.95, 1, 0.65); return c; }), std('#0d0d0d', 0.25, { side: THREE.DoubleSide }), [0, 0.05, 0.075], [0.3, 0, 0]);
    add(g('gBadge', () => new THREE.CircleGeometry(0.018, 14)), std('#d1a33a', 0.3, { metalness: 0.8 }), [0, 0.09, 0.122], [-0.25, 0, 0]);
  }
}

/* ---------- small printed bits ---------- */
function printed(w, h, draw) {
  const c = mkCanvas(Math.round(256 * (w / h)), 256); draw(c.getContext('2d'), c.width, c.height);
  return new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 0.6 });
}
const logoMat = () => printed(1, 1, (x, W, H) => {
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(W / 2, H / 2, W * 0.46, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#1f7a55'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${H * 0.36}px Fredoka, sans-serif`; x.fillText('EKO', W / 2, H * 0.53);
});
const badgeMat = (name) => printed(2.4, 1, (x, W, H) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.fillStyle = '#1f7a55'; x.fillRect(0, 0, W, H * 0.3);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${H * 0.2}px Figtree, sans-serif`; x.fillText('EKO MART', W / 2, H * 0.16);
  x.fillStyle = '#1c2621'; x.font = `600 ${H * 0.42}px Fredoka, sans-serif`; x.fillText(name, W / 2, H * 0.66);
});

/** Material for a clothing spec { color, fabric?, c2?, c3? }; placed prints (jersey, kaftan) only on the torso. */
function clothMat(spec, where) {
  if (!spec.fabric || ((spec.fabric === 'jersey' || spec.fabric === 'kaftan') && where !== 'torso')) return std(spec.color, 0.85, { side: THREE.DoubleSide });
  const placed = spec.fabric === 'jersey' || spec.fabric === 'kaftan';
  return std('#ffffff', 0.85, { side: THREE.DoubleSide, map: clothTexture({ fabric: spec.fabric, c1: spec.color, c2: spec.c2, c3: spec.c3 }, placed ? 1 : 6, placed ? 1 : 4) });
}

/** Older looks used shirt / pants / hair 'short' | 'puff' | 'wrap' / hat. */
function normalise(o) {
  const r = { figure: 'm', build: 'avg', skin: SKIN[0], shoes: '#1d1d1f', hairColor: '#141414', scale: 1, ...o };
  r.top = o.top || { kind: 'tee', color: o.shirt || '#3b6ea5' };
  r.bottom = o.bottom || { kind: 'trousers', color: o.pants || '#2b2f3a' };
  let hair = o.hair || 'low', hw = o.headwear || null;
  if (hair === 'short') hair = 'low';
  if (hair === 'puff') hair = 'afro';
  if (hair === 'wrap') { hair = 'none'; hw = hw || { kind: 'gele', c1: o.hairColor || '#7b1fa2', c2: '#ffd54f' }; }
  if (o.hat && !hw) hw = { kind: 'cap', color: o.hat };
  r.hair = hair; r.headwear = hw;
  return r;
}

/**
 * opts: figure 'm' | 'f', build 'slim' | 'avg' | 'heavy', skin, scale,
 *       top { kind: 'tee' | 'shirt' | 'polo' | 'kaftan' | 'uniform', color, fabric?, c2?, c3?, sleeve: 'short' | 'long' },
 *       bottom { kind: 'trousers' | 'jeans' | 'skirt' | 'wrapper', color, fabric?, c2?, c3? },
 *       hair 'low' | 'fade' | 'afro' | 'braids' | 'locs' | 'bun' | 'none', hairColor,
 *       headwear { kind: 'gele' | 'fila' | 'cap' | 'guard', ... }, shoes, basket, phone, badge (name), guard
 */
export function makePerson(opts = {}) {
  const o = normalise(opts), f = o.figure, w = o.build === 'heavy' ? 1.12 : o.build === 'slim' ? 0.93 : 1;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = std(o.skin, 0.6), shoes = std(o.shoes, 0.45), sole = std(o.shoes === '#f2f2f2' ? '#d8d8d8' : '#f0eee8', 0.8);
  const top = o.top, bot = o.bottom, robe = top.kind === 'kaftan', dress = bot.kind === 'skirt' || bot.kind === 'wrapper';
  const topMat = clothMat(top, 'torso'), sleeveMat = clothMat(top, 'sleeve');
  const botMat = robe ? std(top.color, 0.85) : clothMat(bot, 'legs');
  const mesh = (geom, mat, parent, pos, scale) => { const m = new THREE.Mesh(geom, mat); if (pos) m.position.set(...pos); if (scale) m.scale.set(...scale); parent.add(m); return m; };

  // hips and legs (hip -> knee -> ankle)
  mesh(g('hips' + f, () => lathe(hipsProfile(f))), robe ? std(top.color, 0.85) : botMat, body, null, [1.12 * w, 1, 0.8 * w]);
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.088 * w, HIP, 0); body.add(hip);
    mesh(g('thigh', () => capsuleDown(0.074, 0.3)), botMat, hip, null, [w, 1, w]);
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    mesh(g('kneeCap', () => new THREE.SphereGeometry(0.062, 14, 10)), bot.kind === 'skirt' ? skin : botMat, knee, [0, 0.005, 0], [w, 1, w]);
    mesh(g('shin', () => capsuleDown(0.053, 0.31)), bot.kind === 'skirt' ? skin : botMat, knee, null, [w, 1, w]);
    const ankle = new THREE.Group(); ankle.position.y = -0.395; knee.add(ankle);
    mesh(shoeGeo(), shoes, ankle, [0, -0.035, 0]);
    mesh(g('sole', () => new THREE.BoxGeometry(0.1, 0.018, 0.26)), sole, ankle, [0, -0.064, 0.042]);
    return { hip, knee, ankle };
  });
  let skirt = null;
  if (robe || dress) {
    skirt = mesh(g('dress:' + (robe ? 'robe' : bot.kind), () => lathe(DRESS[robe ? 'robe' : bot.kind])), robe ? std(top.color, 0.85, { side: THREE.DoubleSide }) : botMat, body, null, [1.12 * w, 1, (robe ? 1.05 : 1.12) * w]);
  }

  // chest: upper torso, arms, neck and head lean and twist as one
  const chest = new THREE.Group(); chest.position.y = CHEST; body.add(chest);
  const tw = 1.1 * w, td = (o.build === 'heavy' ? 0.8 : 0.72) * w;
  mesh(g('torso' + f + o.build, () => lathe(torsoProfile(f, o.build), 32)), topMat, chest, null, [tw, 1, td]);
  if (f === 'f') for (const s of [-1, 1]) mesh(g('bust', () => new THREE.SphereGeometry(0.058, 14, 10)), topMat, chest, [s * 0.058 * w, 0.255, 0.075 * w], [1, 0.85, 0.7]);
  const frontZ = (y, x = 0) => { const pr = torsoProfile(f, o.build); let r = 0.15; for (let i = 1; i < pr.length; i++) if (y <= pr[i][1]) { const [r0, y0] = pr[i - 1], [r1, y1] = pr[i]; r = r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); break; } return r * td * Math.sqrt(Math.max(0, 1 - (x / (r * tw)) ** 2)); };
  // neckline details
  if (top.kind === 'shirt' || top.kind === 'polo' || top.kind === 'uniform') {
    mesh(g('collar', () => { const t = new THREE.TorusGeometry(0.058, 0.014, 6, 20); t.rotateX(Math.PI / 2); return t; }), sleeveMat, chest, [0, 0.47, 0.008], [1.05, 1, 1]);
    const placket = top.kind === 'polo' ? 0.1 : 0.36;
    mesh(g('placket' + placket, () => new THREE.BoxGeometry(0.018, placket, 0.006)), std(tint(top.color, -0.18), 0.8), chest, [0, 0.43 - placket / 2, frontZ(0.43 - placket / 2) + 0.002]);
  } else if (top.kind === 'tee' && !top.fabric) {
    mesh(g('crew', () => { const t = new THREE.TorusGeometry(0.06, 0.008, 6, 20); t.rotateX(Math.PI / 2); return t; }), std(tint(top.color, -0.15), 0.85), chest, [0, 0.465, 0.004]);
  }
  if (top.kind === 'uniform') {
    for (const s of [-1, 1]) {
      mesh(g('pocket', () => new THREE.BoxGeometry(0.07, 0.065, 0.014)), std(tint(top.color, -0.08), 0.8), chest, [s * 0.075 * w, 0.29, frontZ(0.29, 0.075 * w)]);
      mesh(g('epaulette', () => new THREE.BoxGeometry(0.11, 0.012, 0.05)), std('#111111', 0.6), chest, [s * 0.15 * w, 0.43, 0]);
    }
    const radio = new THREE.Group(); radio.position.set(-0.11 * w, 0.37, frontZ(0.37, 0.11 * w) + 0.012); radio.rotation.x = -0.2; chest.add(radio);
    mesh(g('radio', () => roundedBox(0.035, 0.075, 0.022, 0.006, 1)), std('#121212', 0.5), radio);
    mesh(g('antenna', () => new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6)), std('#121212', 0.5), radio, [0.01, 0.06, 0]);
    mesh(g('belt', () => { const t = new THREE.TorusGeometry(0.152, 0.016, 6, 30); t.rotateX(Math.PI / 2); return t; }), std('#111111', 0.4), body, [0, 1.0, 0], [1.12 * w, 1.4, 0.8 * w]);
    mesh(g('buckle', () => new THREE.BoxGeometry(0.05, 0.035, 0.01)), std('#c8ccd0', 0.25, { metalness: 0.9 }), body, [0, 1.0, 0.8 * 0.152 * w + 0.014]);
  }
  if (o.logo) mesh(g('logoPlane', () => new THREE.CircleGeometry(0.028, 18)), logoMat(), chest, [0.075 * w, 0.31, frontZ(0.31, 0.075 * w) + 0.003], null).rotation.y = 0.3;
  if (o.badge) mesh(g('badgePlane', () => new THREE.PlaneGeometry(0.072, 0.03)), badgeMat(o.badge), chest, [-0.075 * w, 0.3, frontZ(0.3, 0.075 * w) + 0.003], null).rotation.y = -0.3;

  // neck and head
  mesh(g('neck', () => new THREE.CylinderGeometry(0.044, 0.05, 0.12, 14)), skin, chest, [0, 0.52, 0]);
  const head = new THREE.Group(); head.position.y = 0.62; chest.add(head);
  mesh(g('skull', () => new THREE.SphereGeometry(0.1, 24, 18)), skin, head, null, [0.92, 1.1, 1]);
  mesh(g('jaw', () => new THREE.SphereGeometry(0.078, 18, 12)), skin, head, [0, -0.045, 0.014], [0.95, 0.78, 0.95]);
  for (const s of [-1, 1]) mesh(g('ear', () => new THREE.SphereGeometry(0.025, 10, 8)), skin, head, [s * 0.091, -0.002, -0.006], [0.42, 1, 0.72]);
  mesh(g('nose', () => new THREE.SphereGeometry(0.021, 12, 8)), std(tint(o.skin, -0.08), 0.55), head, [0, -0.012, 0.1], [0.85, 0.8, 0.8]);
  mesh(g('mouth', () => roundedBox(0.036, 0.009, 0.01, 0.004, 1)), std(tint(o.skin, -0.32), 0.5), head, [0, -0.052, 0.088]);
  const eyes = new THREE.Group(); eyes.position.y = 0.02; head.add(eyes);
  const white = std('#f4f1ea', 0.35), pupil = std('#1a120d', 0.25), brow = std(o.hair === 'none' ? '#1a1a1a' : o.hairColor, 0.9);
  for (const s of [-1, 1]) {
    mesh(g('eyeWhite', () => new THREE.SphereGeometry(0.017, 12, 8)), white, eyes, [s * 0.035, 0, 0.083], [1, 0.75, 0.5]);
    mesh(g('pupil', () => new THREE.SphereGeometry(0.0095, 10, 6)), pupil, eyes, [s * 0.035, 0, 0.0905], [1, 1, 0.5]);
    mesh(g('brow', () => roundedBox(0.032, 0.007, 0.008, 0.003, 1)), brow, head, [s * 0.036, 0.047, 0.088]).rotation.z = -s * 0.12;
  }
  if (o.hair !== 'none') {
    const hm = new THREE.Mesh(hairGeo(o.hair), std(o.hairColor, 0.95, { flatShading: o.hair === 'afro' }));
    head.add(hm);
  }
  if (o.headwear) headwear(head, o.headwear);

  // arms (shoulder -> elbow -> wrist)
  const longSleeve = top.sleeve === 'long' || top.kind === 'kaftan' || top.kind === 'uniform';
  const arms = [-1, 1].map((side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.2 * w, 0.4, 0); chest.add(sh);
    mesh(g('deltoid', () => new THREE.SphereGeometry(0.062, 14, 10)), sleeveMat, sh, [0, -0.01, 0], [w, 1, w]);
    mesh(g('upperArm', () => capsuleDown(0.045, 0.22)), skin, sh, null, [w, 1, w]);
    mesh(g(longSleeve ? 'sleeveL' : 'sleeveS', () => { const c = new THREE.CylinderGeometry(0.06, longSleeve ? 0.052 : 0.056, longSleeve ? 0.3 : 0.17, 14, 1, true); c.translate(0, longSleeve ? -0.13 : -0.07, 0); return c; }), sleeveMat, sh, null, [w, 1, w]);
    const el = new THREE.Group(); el.position.y = -0.28; sh.add(el);
    mesh(g('forearm', () => capsuleDown(0.04, 0.2)), skin, el, null, [w, 1, w]);
    if (longSleeve) mesh(g(top.kind === 'kaftan' ? 'cuffWide' : 'cuffL', () => { const wide = top.kind === 'kaftan'; const c = new THREE.CylinderGeometry(0.052, wide ? 0.068 : 0.047, 0.22, 14, 1, true); c.translate(0, -0.11, 0); return c; }), sleeveMat, el, null, [w, 1, w]);
    const wrist = new THREE.Group(); wrist.position.y = -0.25; el.add(wrist);
    const hand = mesh(handGeo(), skin, wrist); hand.scale.x = side; // mirror for the left hand
    return { sh, el, wrist };
  });

  let basket = null, basketItems = null, phone = null;
  if (o.basket) {
    basket = new THREE.Group();
    const b = buildBasket(); b.position.y = -BASKET.handle; basket.add(b);
    basketItems = new THREE.Group(); basketItems.position.y = -BASKET.handle; basket.add(basketItems);
    basket.position.set(-0.07, -0.04, 0.02); // held by the handle, clear of the leg
    arms[0].wrist.add(basket);
  }
  if (o.phone) {
    phone = new THREE.Group(); phone.position.set(-0.02, -0.07, 0.03); phone.rotation.set(-1.2, 0, 0.2); arms[1].wrist.add(phone);
    mesh(g('phone', () => roundedBox(0.042, 0.085, 0.009, 0.004, 1)), std('#151719', 0.3), phone);
    mesh(g('screen', () => new THREE.PlaneGeometry(0.036, 0.074)), new THREE.MeshBasicMaterial({ color: '#bcd8ff', toneMapped: false }), phone, [0, 0, 0.0047]);
    phone.visible = false;
  }
  root.scale.setScalar(o.scale);
  return {
    root, body, chest, head, eyes, skirt, basket, basketItems, phoneMesh: phone,
    armL: arms[0].sh, armR: arms[1].sh, elbowL: arms[0].el, elbowR: arms[1].el, wristL: arms[0].wrist, wristR: arms[1].wrist,
    legL: legs[0].hip, legR: legs[1].hip, kneeL: legs[0].knee, kneeR: legs[1].knee, ankleL: legs[0].ankle, ankleR: legs[1].ankle,
    long: bot.kind === 'wrapper' || robe, guard: !!o.guard,
    phase: Math.random() * 6, seed: Math.random() * 10, blink: 1 + Math.random() * 3, blinkT: 0,
    reach: 0, reachH: 0, wave: 0, inspect: 0, phone: 0, lookPitch: 0,
  };
}

const lerp = THREE.MathUtils.lerp;
/**
 * Pose a person for this frame. moving: 0..1 walk amount, dt in seconds.
 * Drives: reach (0..1) with reachH (-1 floor shelf .. 1 top shelf), inspect, phone, wave, lookYaw, lookPitch.
 */
export function animatePerson(p, dt, moving, t) {
  p.phase += dt * moving * 6.2;
  const s = Math.sin(p.phase), c = Math.cos(p.phase), stride = (p.long ? 0.26 : 0.44) * moving;
  const reach = p.reach, crouch = reach * Math.max(0, -p.reachH), high = Math.max(0, p.reachH);
  const busy = Math.max(p.inspect, p.phone);

  // legs: heel strike, knee bend on the swing, crouch for the bottom shelf
  p.legL.rotation.x = s * stride - crouch * 0.75;
  p.legR.rotation.x = -s * stride - crouch * 0.75;
  p.kneeL.rotation.x = Math.max(0, -c) * 0.75 * moving * (p.long ? 0.6 : 1) + crouch * 1.3 + 0.03;
  p.kneeR.rotation.x = Math.max(0, c) * 0.75 * moving * (p.long ? 0.6 : 1) + crouch * 1.3 + 0.03;
  p.ankleL.rotation.x = -(p.legL.rotation.x + p.kneeL.rotation.x) * 0.8;
  p.ankleR.rotation.x = -(p.legR.rotation.x + p.kneeR.rotation.x) * 0.8;

  // body: bob, hip sway, shoulders counter-twist, breathing, lean into a reach
  const breathe = Math.sin(t * 1.7 + p.seed);
  p.body.position.y = Math.abs(c) * 0.02 * moving - crouch * 0.165;
  p.body.rotation.y = s * 0.05 * moving;
  p.body.rotation.z = c * 0.02 * moving;
  p.chest.rotation.y = -s * 0.09 * moving;
  p.chest.rotation.x = crouch * 0.45 + reach * (high ? -0.04 : 0.06) + busy * 0.06 + breathe * 0.006;
  p.chest.position.y = CHEST + breathe * 0.003;
  if (p.skirt) p.skirt.rotation.x = s * 0.035 * moving - crouch * 0.2;

  // left arm: carries the basket (hanging straight down from the hand) or swings / stands at ease
  const ease = p.guard ? 1 - p.wave : 0;
  if (p.basket) {
    p.armL.rotation.set(-s * 0.08 * moving - 0.04, 0, -0.14);
    p.elbowL.rotation.set(-0.32, 0, 0);
    p.basket.rotation.x = -(p.armL.rotation.x + p.elbowL.rotation.x + p.chest.rotation.x);
    p.basket.rotation.z = -p.armL.rotation.z;
  } else {
    p.armL.rotation.set(lerp(-s * 0.38 * moving, 0.5, ease), 0, lerp(-0.06, 0.1, ease));
    p.elbowL.rotation.set(lerp(-0.12 - Math.max(0, s) * 0.35 * moving, 0.25, ease), 0, lerp(0, 1.25, ease));
  }

  // right arm: walking swing, blended into reaching, holding something up to look at, a phone, or a wave
  let ax = s * 0.38 * moving, az = 0.06, ex = -0.12 - Math.max(0, -s) * 0.35 * moving, ez = 0;
  ax = lerp(ax, 0.5, ease); az = lerp(az, -0.1, ease); ex = lerp(ex, 0.25, ease); ez = lerp(ez, -1.25, ease);
  const reachX = p.reachH > 0.2 ? -2.75 : p.reachH < -0.2 ? -1.05 : -1.65;
  ax = lerp(ax, reachX, reach); ex = lerp(ex, -0.08, reach); az = lerp(az, -0.08, reach); ez *= 1 - reach;
  ax = lerp(ax, -0.45, busy); ex = lerp(ex, -1.55, busy); az = lerp(az, -0.18, busy);
  const wv = p.wave;
  ax = lerp(ax, -0.25, wv); az = lerp(az, 2.5, wv); ex = lerp(ex, -0.5, wv); ez = lerp(ez, Math.sin(t * 8) * 0.45, wv);
  p.armR.rotation.set(ax, 0, az);
  p.elbowR.rotation.set(ex, 0, ez);
  if (p.phoneMesh) p.phoneMesh.visible = p.phone > 0.15;

  // head: turn toward lookYaw, tip down for low shelves / phones, up for top shelves; blink now and then
  const pitch = p.lookPitch + busy * 0.42 + reach * (high ? -0.32 : p.reachH < -0.2 ? 0.45 : 0.1);
  p.head.rotation.y += ((p.lookYaw || 0) - p.head.rotation.y) * Math.min(1, dt * 5);
  p.head.rotation.x += (pitch - p.head.rotation.x) * Math.min(1, dt * 5);
  p.blink -= dt;
  if (p.blink <= 0) { p.blinkT = 0.13; p.blink = 2 + Math.random() * 4; }
  p.blinkT = Math.max(0, p.blinkT - dt);
  p.eyes.scale.y = p.blinkT > 0 ? 0.12 : 1;
}
