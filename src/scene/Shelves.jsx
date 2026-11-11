import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FRIDGE, LEVELS, PRODUCTS } from '../data/products';
import { matFor, partsFor } from '../three/productModels';
import { rng, tagTexture } from '../three/textures';
import { registerType } from '../game/world';

/** Fills one glass-door section of the fridge with a product, front facing the store. */
function layoutFridge(p) {
  const cx = FRIDGE.x0 + FRIDGE.door * (p.fridge + 0.5), inner = FRIDGE.door - 0.1;
  const step = p.W + 0.012, n = Math.max(1, Math.floor(inner / step)), pad = (inner - n * step) / 2;
  const rows = Math.max(1, Math.min(3, Math.floor(0.6 / (p.D + 0.02))));
  const stack = p.shape === 'can' ? 2 : 1;
  const rnd = rng(p.id * 211 + 5);
  const slots = [], box = new THREE.Box3(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  for (const top of FRIDGE.levels) for (let s = 0; s < stack; s++) for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) {
    const x = cx - inner / 2 + pad + (j + 0.5) * step + (rnd() - 0.5) * 0.006;
    const z = FRIDGE.front - 0.05 - p.D / 2 - r * (p.D + 0.02);
    const y = top + s * (p.H + 0.003);
    q.setFromEuler(e.set(0, (rnd() - 0.5) * (p.round ? 0.5 : 0.06), 0));
    slots.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, one));
    box.expandByPoint(new THREE.Vector3(x - p.maxDim / 2, y, z - p.maxDim / 2));
    box.expandByPoint(new THREE.Vector3(x + p.maxDim / 2, y + p.H * 1.05, z + p.maxDim / 2));
  }
  return { slots, box, top: FRIDGE.levels[1], tagX: cx, fridge: true };
}

/** Lays out every facing of one product along its shelf run. */
function layoutRun(p) {
  if (p.fridge != null) return layoutFridge(p);
  const { face, level, half } = p, top = LEVELS[level];
  const z0 = half === 0 ? -6.9 : 0.1, z1 = half === 0 ? -0.1 : 6.9;
  const gap = 0.012, step = p.W + gap, n = Math.floor((z1 - z0) / step), pad = (z1 - z0 - n * step) / 2;
  const rows = p.D < 0.13 ? 2 : 1;
  const stackable = p.shape === 'can' || p.shape === 'tub' || ((p.shape === 'box' || p.shape === 'bag') && p.H < 0.16);
  const stack = stackable ? Math.max(1, Math.min(level === 3 ? 3 : 2, Math.floor(0.39 / (p.H + 0.004)))) : 1;
  const rnd = rng(p.id * 101 + 3);
  const slots = [], box = new THREE.Box3(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  for (let s = 0; s < stack; s++) for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) {
    const x = face.g + face.side * (0.47 - p.D / 2 - r * (p.D + 0.02)) + (rnd() - 0.5) * 0.008;
    const z = z0 + pad + (j + 0.5) * step + (rnd() - 0.5) * 0.006;
    const y = top + s * (p.H + 0.003);
    q.setFromEuler(e.set(0, (face.side * Math.PI) / 2 + (rnd() - 0.5) * (p.round ? 0.5 : 0.06), 0));
    slots.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, one));
    box.expandByPoint(new THREE.Vector3(x - p.maxDim / 2, y, z - p.maxDim / 2));
    box.expandByPoint(new THREE.Vector3(x + p.maxDim / 2, y + p.H * 1.05, z + p.maxDim / 2));
  }
  return { slots, box, top, tagZ: (z0 + z1) / 2 };
}

function ProductRun({ p }) {
  const run = useMemo(() => layoutRun(p), [p]);
  const parts = useMemo(() => partsFor(p).map((pt) => ({ geo: pt.geo, mat: matFor(p, pt.role, 'lo') })), [p]);
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
  const { face } = p;
  return (
    <>
      {parts.map((pt, k) => (
        <instancedMesh key={k} ref={(el) => { meshes.current[k] = el; }} args={[pt.geo, pt.mat, run.slots.length]} frustumCulled={false} />
      ))}
      <mesh
        position={run.fridge ? [run.tagX, run.top - 0.008, FRIDGE.front - 0.04] : [face.g + face.side * 0.4935, run.top - 0.008, run.tagZ]}
        rotation-y={run.fridge ? 0 : (face.side * Math.PI) / 2}
      >
        <planeGeometry args={[0.15, 0.056]} />
        <meshBasicMaterial map={tag} toneMapped={false} />
      </mesh>
    </>
  );
}

export function Shelves() {
  return PRODUCTS.map((p) => <ProductRun key={p.id} p={p} />);
}
