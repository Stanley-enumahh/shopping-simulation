import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { world } from '../game/world';
import { ANCHOR, GRIPS, HandModel, poseFingers } from './HandModel';

// Wrist position and rotation (x pitch, y yaw, z roll) for the right hand, in camera space.
const POSES = {
  // Arm hanging by your side, well below and behind the view so the sleeve never swings into it.
  rest: { p: [0.27, -0.8, -0.1], r: [-1.3, 0.25, -0.6] },
  // Something is in reach: the hand comes up into the lower right, loose and ready.
  hover: { p: [0.2, -0.26, -0.44], r: [0.06, 0.4, -0.55] },
  // For these two, r is [extra pitch, extra yaw, roll] on top of aiming the arm from the shoulder.
  reach: { r: [0.05, 0.25, -1.3] }, // palm turned inward to close around the item
  carry: { r: [0.18, 0.35, -2.75] }, // palm up, under the item
};
const SHOULDER = new THREE.Vector3(0.27, -0.44, 0.16); // where the arm comes from, behind and below the camera
const clamp = THREE.MathUtils.clamp;
const aimDir = new THREE.Vector3();
/** Pitch and yaw that point the forearm from the shoulder through `pos`, plus the given roll. */
function aimFrom(pos, roll, out) {
  aimDir.copy(pos).sub(SHOULDER).normalize();
  return out.set(Math.atan2(aimDir.y, -aimDir.z), Math.asin(clamp(-aimDir.x, -1, 1)), roll);
}
// Points on the sleeve surface; if any lands on screen close to the camera or high up, the sleeve is in the way.
const SLEEVE_PROBE = [];
for (const z of [0.12, 0.2, 0.28, 0.36, 0.44]) for (const [x, y] of [[0.055, 0], [-0.055, 0], [0, 0.055], [0, -0.055]]) SLEEVE_PROBE.push(new THREE.Vector3(x, y, z));
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(35));
const probeV = new THREE.Vector3();
function sleeveIntrudes(arm, aspect) {
  for (const p of SLEEVE_PROBE) {
    probeV.copy(p).applyQuaternion(arm.quaternion).add(arm.position);
    if (probeV.z >= -0.03) continue;
    const d = -probeV.z, sx = probeV.x / d / (TAN_HALF_FOV * aspect), sy = probeV.y / d / TAN_HALF_FOV;
    if (Math.abs(sx) < 1.1 && Math.abs(sy) < 1.1 && (d < 0.32 || sy > -0.65)) return true;
  }
  return false;
}
function spring(cur, vel, tgt, k, zeta, dt) {
  const a = k * (tgt - cur) - 2 * zeta * Math.sqrt(k) * vel;
  vel += a * dt;
  return [cur + vel * dt, vel];
}

export default function Hand() {
  const root = useRef();
  const anchor = useRef();
  const joints = useRef({ f: [], t: {} });

  useEffect(() => {
    world.hand.anchor = anchor.current;
    const pos = new THREE.Vector3().fromArray(POSES.rest.p), pv = new THREE.Vector3();
    const rot = new THREE.Vector3().fromArray(POSES.rest.r), rv = new THREE.Vector3();
    const curl = GRIPS.relaxed.c.slice(), cv = [0, 0, 0, 0];
    let thumb = 0.25, tv = 0, spread = 0, sv = 0;
    const tp = new THREE.Vector3(), tr = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), off = new THREE.Vector3();

    const update = (dt) => {
      const W = world, H = W.hand, t = W.time, live = W.reduceMotion ? 0 : 1;
      let mode = H.mode;
      if (mode === 'carry' && !W.held) mode = 'rest';

      // 1. Base target for the current action.
      let k = 90, zeta = 0.75;
      if (mode === 'carry' || mode === 'reach') {
        // Put the palm's anchor on the target, with the forearm pointing back to the shoulder.
        const goal = mode === 'carry' ? W.held.support : H.reach;
        const R = POSES[mode].r;
        tr.fromArray(R);
        for (let it = 0; it < 2; it++) {
          q.setFromEuler(e.set(tr.x, tr.y, tr.z));
          tp.copy(goal).sub(off.copy(ANCHOR).applyQuaternion(q));
          aimFrom(tp, R[2], tr);
          tr.x += R[0]; tr.y += R[1] * 0.3;
        }
        q.setFromEuler(e.set(tr.x, tr.y, tr.z));
        tp.copy(goal).sub(off.copy(ANCHOR).applyQuaternion(q));
        if (mode === 'carry') { tp.x += 0.01; k = 320; zeta = 0.9; } else { k = 210; zeta = 0.8; }
      } else {
        const P = POSES[mode] || POSES.rest;
        tp.fromArray(P.p); tr.fromArray(P.r);
        tp.x *= Math.min(1, 0.25 + W.camera.aspect * 0.5); // keep it on screen in portrait
        if (mode === 'hover') { k = 120; zeta = 0.78; }
      }

      // 2. Life on top: arm swing with each step, lag when you turn, breathing.
      const m = W.moveAmt, ph = W.stepPhase;
      if (mode === 'rest') {
        // Natural arm swing: forward and back, opposite to the right foot.
        tp.z += Math.sin(ph) * 0.1 * m;
        tp.y += (1 - Math.cos(ph * 2)) * 0.006 * m;
        tr.x += Math.sin(ph) * 0.32 * m;
      } else if (mode === 'hover') {
        tp.z += Math.sin(ph) * 0.012 * m;
        tp.y += (Math.abs(Math.cos(ph)) - 0.6) * 0.01 * m;
        tr.x += Math.sin(ph) * 0.05 * m;
      }
      const free = mode === 'rest' || mode === 'hover' ? 1 : 0.25;
      const lx = clamp(W.lookVel.x, -6, 6), ly = clamp(W.lookVel.y, -6, 6);
      tp.x += lx * 0.011 * free; tp.y -= ly * 0.009 * free;
      tr.y += lx * 0.05 * free; tr.x -= ly * 0.04 * free;
      tp.y += Math.sin(t * 1.5) * 0.003 * live;
      tr.z += Math.sin(t * 0.8) * 0.03 * live;
      if (mode === 'carry') {
        tr.z += clamp(W.held.vx, -20, 20) * 0.006;
        tr.x += clamp(W.held.vy, -20, 20) * 0.004;
      }

      // 3. Springs.
      const steps = dt > 0.02 ? 2 : 1, h = dt / steps;
      for (let s = 0; s < steps; s++) {
        for (const a of ['x', 'y', 'z']) {
          [pos[a], pv[a]] = spring(pos[a], pv[a], tp[a], k, zeta, h);
          [rot[a], rv[a]] = spring(rot[a], rv[a], tr[a], k * 0.85, zeta, h);
        }
      }
      root.current.position.copy(pos);
      root.current.rotation.set(rot.x, rot.y, rot.z);
      // A hanging arm is never drawn; it appears only while rising to use something or on its way back down,
      // and on the way down it is hidden the moment the sleeve would swing up past the camera.
      root.current.visible = !W.third && (mode !== 'rest' || (pos.y > -0.42 && !sleeveIntrudes(root.current, W.camera.aspect)));

      // 4. Fingers.
      const G = GRIPS[H.fingers] || GRIPS.relaxed;
      H.squeeze *= Math.exp(-dt * 6);
      for (let i = 0; i < 4; i++) {
        const c = G.c[i] + Math.sin(t * (1.3 + i * 0.37) + i * 1.7) * 0.04 * live + H.squeeze * 0.22;
        [curl[i], cv[i]] = spring(curl[i], cv[i], c, 260, 0.75, dt);
      }
      [thumb, tv] = spring(thumb, tv, G.t + H.squeeze * 0.2, 220, 0.8, dt);
      [spread, sv] = spring(spread, sv, G.s, 200, 0.8, dt);
      poseFingers(joints.current, curl, thumb, spread);
    };
    world.onFrame.push(update);
    return () => { world.onFrame = world.onFrame.filter((f) => f !== update); };
  }, []);

  return (
    <group ref={root}>
      <HandModel joints={joints} anchor={anchor} />
    </group>
  );
}
