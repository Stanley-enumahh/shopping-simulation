import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ENDCAP, FACES, FASHION, FRIDGE, GONDOLAS, LEVELS, PRODUCTS, RACK } from '../data/products';
import { matFor, partsFor } from '../three/productModels';
import { hookPoint } from '../three/fashion';
import { promoTexture, rng, tagTexture } from '../three/textures';
import { registerType } from '../game/world';

const one = new THREE.Vector3(1, 1, 1);
/** Collects instance poses and the box used to cheaply skip raycasts. */
function collector(p) {
  const slots = [], box = new THREE.Box3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  return {
    slots, box,
    add(x, y, z, yaw) {
      q.setFromEuler(e.set(0, yaw, 0));
      slots.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, one));
      box.expandByPoint(new THREE.Vector3(x - p.maxDim / 2, y, z - p.maxDim / 2));
      box.expandByPoint(new THREE.Vector3(x + p.maxDim / 2, y + p.H * 1.05, z + p.maxDim / 2));
    },
  };
}
const smallStackable = (p) => p.shape === 'can' || p.shape === 'tin' || p.shape === 'tub' || ((p.shape === 'box' || p.shape === 'pillow') && p.H < 0.16);

/** Fills one glass-door section of the fridge with a product, front facing the store. */
function layoutFridge(p) {
  const cx = FRIDGE.x0 + FRIDGE.door * (p.fridge + 0.5), inner = FRIDGE.door - 0.1;
  const step = p.W + 0.012, n = Math.max(1, Math.floor(inner / step)), pad = (inner - n * step) / 2;
  const rows = Math.max(1, Math.min(3, Math.floor(0.6 / (p.D + 0.02))));
  const stack = p.shape === 'can' ? 2 : 1;
  const rnd = rng(p.id * 211 + 5), c = collector(p);
  for (const top of FRIDGE.levels) for (let s = 0; s < stack; s++) for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) {
    c.add(cx - inner / 2 + pad + (j + 0.5) * step + (rnd() - 0.5) * 0.006, top + s * (p.H + 0.003),
      FRIDGE.front - 0.05 - p.D / 2 - r * (p.D + 0.02), (rnd() - 0.5) * (p.round ? 0.5 : 0.06));
  }
  return { ...c, tag: { pos: [cx, FRIDGE.levels[1] - 0.008, FRIDGE.front - 0.04], ry: 0 } };
}

/** Promo end-cap at the front of a gondola: big sizes on a pallet and two shelves, facing the entrance. */
function layoutEndcap(p) {
  const [gi, li] = p.endcap, g = GONDOLAS[gi], top = ENDCAP.levels[li];
  const front = ENDCAP.z + ENDCAP.depth, inner = 0.94;
  const step = p.W + 0.014, n = Math.max(1, Math.floor(inner / step)), pad = (inner - n * step) / 2;
  const rows = Math.max(1, Math.min(2, Math.floor((ENDCAP.depth - 0.02) / (p.D + 0.02))));
  const room = (ENDCAP.levels[li + 1] || top + 0.5) - top - 0.04;
  const stack = p.shape === 'sack' || p.shape === 'keg' ? 1 : Math.max(1, Math.min(3, Math.floor(room / (p.H + 0.004))));
  const rnd = rng(p.id * 57 + 9), c = collector(p);
  for (let s = 0; s < stack; s++) for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) {
    c.add(g - inner / 2 + pad + (j + 0.5) * step + (rnd() - 0.5) * 0.01, top + s * (p.H + 0.003),
      front - 0.02 - p.D / 2 - r * (p.D + 0.02), (rnd() - 0.5) * (p.round ? 0.5 : 0.08));
  }
  return { ...c, tag: { pos: [g - 0.3, top - 0.008, front + 0.003], ry: 0 }, flag: { pos: [g + 0.4, top + 0.2, front + 0.02], ry: 0 } };
}

/** A clip strip of sachets hanging from a shelf edge, in front of the shelf below. */
function layoutStrip(p) {
  const [fi, li, z0] = p.strip, face = FACES[fi], hang = LEVELS[li + 1], side = face.side;
  const x = face.g + side * (0.505 + p.D / 2 + 0.004), c = collector(p);
  for (let k = 0; k < 3; k++) for (let col = 0; col < 2; col++) {
    c.add(x, hang - 0.07 - (k + 1) * (p.H + 0.012), z0 + (col - 0.5) * (p.W + 0.01), (side * Math.PI) / 2);
  }
  return {
    ...c,
    tag: { pos: [face.g + side * 0.512, hang - 0.035, z0], ry: (side * Math.PI) / 2, small: true },
    strip: { pos: [face.g + side * 0.503, hang - 0.21, z0], ry: (side * Math.PI) / 2 },
  };
}

/** Fashion corner on the left wall: items face +X into aisle 1; clothes hang on face-out arms. */
function layoutFashion(p) {
  const [sec, idx] = p.fashion, F = FASHION, yaw = Math.PI / 2, rnd = rng(p.id * 73 + 1), c = collector(p);
  if (sec === 'hang') {
    const z = F.hang.arms[idx], hk = hookPoint(p), n = 6;
    for (let k = 0; k < n; k++) {
      // local +X of the garment turns to world -Z, so shift by the hook offset to hang it on the bar
      c.add(F.wallX + 0.1 + k * ((F.hang.length - 0.16) / (n - 1)) - hk.z, F.hang.hook - hk.y, z + hk.x, yaw + (rnd() - 0.5) * 0.04);
    }
    return { ...c, tag: { pos: [F.wallX + F.hang.length + 0.012, F.hang.hook + 0.05, z], ry: yaw, small: true } };
  }
  const S = F[sec], per = S.runs.length, top = S.levels[Math.floor(idx / per)], [z0, z1] = S.runs[idx % per];
  const gap = sec === 'shoes' ? 0.08 : sec === 'folded' ? 0.04 : 0.05;
  const step = p.W + gap, n = Math.max(1, Math.floor((z1 - z0) / step)), pad = (z1 - z0 - n * step) / 2;
  const stack = sec === 'folded' ? 3 : 1, front = F.wallX + F.depth;
  for (let s = 0; s < stack; s++) for (let j = 0; j < n; j++) {
    c.add(front - 0.03 - p.D / 2 + (rnd() - 0.5) * 0.01, top + s * (p.H + 0.002), z0 + pad + (j + 0.5) * step + (rnd() - 0.5) * 0.008,
      yaw + (rnd() - 0.5) * (sec === 'folded' ? 0.05 : 0.12));
  }
  return { ...c, tag: { pos: [front + 0.0035, top - 0.008, (z0 + z1) / 2], ry: yaw } };
}

/** "Grab & go" stand by the till: small things facing the queue (-Z), two per shelf. */
function layoutRack(p) {
  const R = RACK, top = R.levels[Math.floor(p.rack / 2)], half = p.rack % 2, x0 = R.x - R.width / 2 + half * (R.width / 2) + 0.01, x1 = x0 + R.width / 2 - 0.02;
  const step = p.W + 0.008, n = Math.max(1, Math.floor((x1 - x0) / step)), pad = (x1 - x0 - n * step) / 2;
  const rows = Math.max(1, Math.min(3, Math.floor((R.depth - 0.02) / (p.D + 0.012))));
  const stack = p.H < 0.08 ? 2 : 1, rnd = rng(p.id * 19 + 4), c = collector(p);
  for (let s = 0; s < stack; s++) for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) {
    c.add(x0 + pad + (j + 0.5) * step, top + s * (p.H + 0.002), R.z0 + 0.015 + p.D / 2 + r * (p.D + 0.012), Math.PI + (rnd() - 0.5) * (p.round ? 0.5 : 0.06));
  }
  return { ...c, tag: { pos: [(x0 + x1) / 2, top - 0.008, R.z0 - 0.0035], ry: Math.PI, small: true } };
}

/** Lays out every facing of one product along its shelf run. */
function layoutRun(p) {
  if (p.fridge != null) return layoutFridge(p);
  if (p.endcap) return layoutEndcap(p);
  if (p.strip) return layoutStrip(p);
  if (p.fashion) return layoutFashion(p);
  if (p.rack != null) return layoutRack(p);
  const { face, level, half } = p, top = LEVELS[level];
  const z0 = half === 0 ? -6.9 : 0.1, z1 = half === 0 ? -0.1 : 6.9;
  const gap = 0.012, step = p.W + gap, n = Math.floor((z1 - z0) / step), pad = (z1 - z0 - n * step) / 2;
  const rows = p.D < 0.13 ? 2 : 1;
  const stack = smallStackable(p) ? Math.max(1, Math.min(level === 3 ? 3 : 2, Math.floor(0.39 / (p.H + 0.004)))) : 1;
  const rnd = rng(p.id * 101 + 3), c = collector(p);
  for (let s = 0; s < stack; s++) for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) {
    c.add(face.g + face.side * (0.47 - p.D / 2 - r * (p.D + 0.02)) + (rnd() - 0.5) * 0.008, top + s * (p.H + 0.003),
      z0 + pad + (j + 0.5) * step + (rnd() - 0.5) * 0.006, (face.side * Math.PI) / 2 + (rnd() - 0.5) * (p.round ? 0.5 : 0.06));
  }
  const tagZ = (z0 + z1) / 2;
  return {
    ...c,
    tag: { pos: [face.g + face.side * 0.4935, top - 0.008, tagZ], ry: (face.side * Math.PI) / 2 },
    // shelf-talker sticking out into the aisle so you see it walking down
    talker: p.promo ? { pos: [face.g + face.side * 0.6, top + 0.02, tagZ + 0.3] } : null,
  };
}

const stripMat = new THREE.MeshStandardMaterial({ color: '#cfd6da', metalness: 0.7, roughness: 0.3 });

function ProductRun({ p }) {
  const run = useMemo(() => layoutRun(p), [p]);
  const parts = useMemo(() => partsFor(p).map((pt) => ({ geo: pt.geo, mat: matFor(p, pt.role, 'lo'), order: pt.order })), [p]);
  const tag = useMemo(() => tagTexture(p), [p]);
  const meshes = useRef([]);
  useLayoutEffect(() => {
    meshes.current = meshes.current.slice(0, parts.length).filter(Boolean);
    for (const im of meshes.current) {
      run.slots.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
    registerType({ i: p.id, p, meshes: meshes.current, slots: run.slots, taken: new Uint8Array(run.slots.length), box: run.box });
  }, [p, run, parts]);
  const t = run.tag, tw = t.small ? 0.1 : 0.15;
  return (
    <>
      {parts.map((pt, k) => (
        <instancedMesh key={k} ref={(el) => { meshes.current[k] = el; }} args={[pt.geo, pt.mat, run.slots.length]} frustumCulled={false} renderOrder={pt.order} />
      ))}
      <mesh position={t.pos} rotation-y={t.ry}>
        <planeGeometry args={[tw, tw * 0.375]} />
        <meshBasicMaterial map={tag} toneMapped={false} />
      </mesh>
      {run.talker && (
        <mesh position={run.talker.pos}>
          <planeGeometry args={[0.15, 0.15]} />
          <meshBasicMaterial map={promoTexture()} transparent side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
      {run.flag && (
        <mesh position={run.flag.pos} rotation-z={-0.15}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial map={promoTexture()} transparent toneMapped={false} />
        </mesh>
      )}
      {run.strip && (
        <mesh position={run.strip.pos} rotation-y={run.strip.ry} material={stripMat}>
          <boxGeometry args={[0.03, 0.42, 0.004]} />
        </mesh>
      )}
    </>
  );
}

export function Shelves() {
  return PRODUCTS.map((p) => <ProductRun key={p.id} p={p} />);
}
