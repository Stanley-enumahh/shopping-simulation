import * as THREE from 'three';
import { bone, roundedBox } from '../three/geometry';

// A right hand in its own space: palm faces -Y, fingers point down -Z, thumb on the -X side,
// forearm and sleeve running back along +Z. Mirror it on X for a left hand.
export const FINGERS = [
  { x: -0.0255, z: -0.079, splay: 0.07, len: [0.041, 0.025, 0.02], r: 0.0089 }, // index
  { x: -0.0085, z: -0.083, splay: 0.02, len: [0.045, 0.028, 0.021], r: 0.0092 }, // middle
  { x: 0.0085, z: -0.081, splay: -0.035, len: [0.042, 0.026, 0.02], r: 0.0087 }, // ring
  { x: 0.0245, z: -0.074, splay: -0.1, len: [0.033, 0.02, 0.017], r: 0.0077 }, // little
];
const THUMB = { len: [0.03, 0.029, 0.023], r: [0.0128, 0.0112, 0.0102] };
const TAPER = [1, 0.93, 0.86];
export const ANCHOR = new THREE.Vector3(0, -0.036, -0.054); // where a held object sits, just off the palm

// Finger curl per finger (0 = straight, 1 = fist), thumb curl, and extra spread.
export const GRIPS = {
  relaxed: { c: [0.36, 0.44, 0.52, 0.6], t: 0.25, s: 0 },
  ready: { c: [0.18, 0.24, 0.3, 0.38], t: 0.1, s: 0.3 },
  open: { c: [0.04, 0.02, 0.05, 0.08], t: -0.2, s: 0.7 },
  grip: { c: [0.9, 0.95, 1.0, 1.05], t: 0.8, s: -0.25 },
  cradle: { c: [0.5, 0.56, 0.62, 0.7], t: 0.3, s: 0.12 },
  handle: { c: [1.1, 1.15, 1.18, 1.2], t: 0.65, s: -0.15 },
};

let shared = null;
function parts() {
  if (shared) return shared;
  const wrist = bone(0.026, 0.05); wrist.rotateY(Math.PI);
  const forearm = new THREE.CylinderGeometry(0.039, 0.034, 0.24, 22); forearm.rotateX(Math.PI / 2); forearm.translate(0, -0.002, 0.17);
  const sleeve = new THREE.CylinderGeometry(0.053, 0.046, 0.4, 30, 1, true); sleeve.rotateX(Math.PI / 2); sleeve.translate(0, 0, 0.285);
  shared = {
    geo: {
      palm: roundedBox(0.08, 0.034, 0.09, 0.015, 3),
      thenar: new THREE.SphereGeometry(0.024, 20, 14),
      wrist, forearm, sleeve,
      cuff: new THREE.TorusGeometry(0.046, 0.0085, 12, 36),
      fold: new THREE.TorusGeometry(0.049, 0.0038, 8, 36),
      fold2: new THREE.TorusGeometry(0.0515, 0.0042, 8, 36),
      nail: new THREE.SphereGeometry(1, 16, 10),
      ph: FINGERS.map((f) => f.len.map((l, k) => bone(f.r * TAPER[k], l))),
      th: THUMB.len.map((l, k) => bone(THUMB.r[k], l)),
    },
    mat: {
      skin: new THREE.MeshPhysicalMaterial({
        color: '#d99a74', roughness: 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffc9b0'),
        clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: 0.6,
      }),
      nail: new THREE.MeshStandardMaterial({ color: '#efc4b4', roughness: 0.2, envMapIntensity: 0.8 }),
      sleeve: new THREE.MeshStandardMaterial({ color: '#78a892', roughness: 0.95, side: THREE.DoubleSide }),
      cuff: new THREE.MeshStandardMaterial({ color: '#e7efe9', roughness: 0.9 }),
    },
  };
  return shared;
}

/** Bends the finger and thumb joints. curl is one value per finger. */
export function poseFingers(J, curl, thumb, spread) {
  for (let i = 0; i < 4; i++) {
    const f = J.f[i], c = Math.max(-0.15, curl[i]);
    if (!f || !f.root) continue;
    f.root.rotation.set(-c * 0.95, FINGERS[i].splay * (1 + spread), 0);
    f.j1.rotation.x = -c * 1.25;
    f.j2.rotation.x = -c * 0.85;
  }
  if (J.t.root) {
    J.t.root.rotation.set(-0.3 - thumb * 0.25, 0.95 - thumb * 0.55, -0.6);
    J.t.j1.rotation.x = -thumb * 0.55;
    J.t.j2.rotation.x = -thumb * 0.7;
  }
}

/** The hand, forearm and sleeve. `joints` is a ref that receives the finger joint groups. */
export function HandModel({ joints, anchor }) {
  const { geo, mat } = parts();
  const setF = (i, key) => (el) => { const f = (joints.current.f[i] = joints.current.f[i] || {}); f[key] = el; };
  const setT = (key) => (el) => { joints.current.t[key] = el; };
  const nail = (r, l) => (
    <mesh geometry={geo.nail} material={mat.nail} position={[0, r * 0.68, -l * 0.6]} scale={[r * 0.8, r * 0.3, r * 1.05]} rotation-x={0.06} />
  );
  return (
    <>
      <mesh geometry={geo.sleeve} material={mat.sleeve} />
      <mesh geometry={geo.cuff} material={mat.cuff} position-z={0.088} />
      <mesh geometry={geo.fold} material={mat.sleeve} position-z={0.19} rotation-x={0.08} />
      <mesh geometry={geo.fold2} material={mat.sleeve} position-z={0.31} rotation-x={-0.06} />
      <mesh geometry={geo.forearm} material={mat.skin} />
      <mesh geometry={geo.wrist} material={mat.skin} position-z={-0.012} scale={[1.08, 0.82, 1]} />
      <mesh geometry={geo.palm} material={mat.skin} position={[0, 0, -0.044]} />
      <mesh geometry={geo.thenar} material={mat.skin} position={[-0.025, -0.007, -0.03]} scale={[0.85, 0.55, 1.25]} />
      {FINGERS.map((f, i) => (
        <group key={i} ref={setF(i, 'root')} position={[f.x, 0.002, f.z]} rotation-order="YXZ">
          <mesh geometry={geo.ph[i][0]} material={mat.skin} />
          <group ref={setF(i, 'j1')} position-z={-f.len[0]}>
            <mesh geometry={geo.ph[i][1]} material={mat.skin} />
            <group ref={setF(i, 'j2')} position-z={-f.len[1]}>
              <mesh geometry={geo.ph[i][2]} material={mat.skin} />
              {nail(f.r * TAPER[2], f.len[2])}
            </group>
          </group>
        </group>
      ))}
      <group ref={setT('root')} position={[-0.034, -0.006, -0.022]} rotation-order="YXZ">
        <mesh geometry={geo.th[0]} material={mat.skin} />
        <group ref={setT('j1')} position-z={-THUMB.len[0]}>
          <mesh geometry={geo.th[1]} material={mat.skin} />
          <group ref={setT('j2')} position-z={-THUMB.len[1]}>
            <mesh geometry={geo.th[2]} material={mat.skin} />
            {nail(THUMB.r[2], THUMB.len[2])}
          </group>
        </group>
      </group>
      {anchor && <object3D ref={anchor} position={ANCHOR.toArray()} />}
    </>
  );
}
