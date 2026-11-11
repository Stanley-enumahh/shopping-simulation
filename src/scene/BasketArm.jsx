import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { world } from '../game/world';
import { BASKET, buildBasket } from '../game/basket';
import { ANCHOR, GRIPS, HandModel, poseFingers } from './HandModel';

// The left hand holds a shopping basket by its handles. The rig origin is the handle bar.
const POSES = {
  rest: { p: [-0.3, -0.25, -0.66], r: [0.12, 0.3, 0.04] }, // carried low on the left, rim just in view
  receive: { p: [-0.17, -0.13, -0.56], r: [0.5, 0.2, -0.12] }, // lifted and tipped towards you to take an item
  away: { p: [-0.4, -1.0, -0.35], r: [0.1, 0.3, 0.04] }, // set down on the till counter
};
// Left hand wraps over the bar: fingers point inward (+X), forearm runs out to the left and down.
const HAND_ROT = new THREE.Euler(0.85, -Math.PI / 2, 0, 'YXZ');
const HAND_POS = ANCHOR.clone().applyEuler(HAND_ROT).negate();
const clamp = THREE.MathUtils.clamp;
function spring(cur, vel, tgt, k, zeta, dt) {
  const a = k * (tgt - cur) - 2 * zeta * Math.sqrt(k) * vel;
  vel += a * dt;
  return [cur + vel * dt, vel];
}

export default function BasketArm() {
  const rig = useRef(), pivot = useRef(), items = useRef();
  const joints = useRef({ f: [], t: {} });
  const basket = useMemo(() => buildBasket(), []);

  useEffect(() => {
    world.basket = { items: items.current, pivot: pivot.current, kick: 0 };
    const pos = new THREE.Vector3().fromArray(POSES.rest.p), pv = new THREE.Vector3();
    const rot = new THREE.Vector3().fromArray(POSES.rest.r), rv = new THREE.Vector3();
    const tp = new THREE.Vector3(), tr = new THREE.Vector3();
    let ax = 0, avx = 0, az = 0, avz = 0, lastMove = 0, squeeze = 0;
    const G = GRIPS.handle, curl = G.c.slice();

    const update = (dt) => {
      const W = world, B = W.basket, m = W.moveAmt, ph = W.stepPhase, live = W.reduceMotion ? 0 : 1;
      const P = POSES[W.basketMode] || POSES.rest;
      tp.fromArray(P.p); tr.fromArray(P.r);
      tp.x *= Math.min(1, 0.3 + W.camera.aspect * 0.45);
      // Carried weight: it dips with each step and trails when you turn.
      tp.y += (Math.abs(Math.cos(ph)) - 0.6) * 0.012 * m;
      tp.x += Math.sin(ph) * 0.005 * m;
      const lx = clamp(W.lookVel.x, -6, 6), ly = clamp(W.lookVel.y, -6, 6);
      tp.x += lx * 0.01; tp.y -= ly * 0.008;
      tp.y += Math.sin(W.time * 1.5 + 1) * 0.0025 * live;
      const k = W.basketMode === 'receive' ? 140 : 80;
      for (const a of ['x', 'y', 'z']) {
        [pos[a], pv[a]] = spring(pos[a], pv[a], tp[a], k, 0.8, dt);
        [rot[a], rv[a]] = spring(rot[a], rv[a], tr[a], k * 0.8, 0.8, dt);
      }
      rig.current.position.copy(pos);
      rig.current.rotation.set(rot.x, rot.y, rot.z);
      rig.current.visible = !W.third && pos.y > -0.8;

      // The basket swings from the handle like a pendulum.
      const accel = (m - lastMove) / Math.max(dt, 1e-3); lastMove = m;
      const driveX = clamp(-accel * 0.06, -0.25, 0.25) + Math.sin(ph * 2) * 0.025 * m;
      const driveZ = clamp(-lx * 0.05, -0.3, 0.3) + Math.sin(ph) * 0.045 * m;
      if (B.kick) { avx += B.kick; squeeze = 1; B.kick = 0; }
      const stiff = W.basketMode === 'receive' ? 60 : 24;
      [ax, avx] = spring(ax, avx, driveX * live, stiff, 0.2, dt);
      [az, avz] = spring(az, avz, driveZ * live, stiff, 0.2, dt);
      pivot.current.rotation.set(ax, 0, az);

      squeeze *= Math.exp(-dt * 5);
      for (let i = 0; i < 4; i++) curl[i] = G.c[i] + squeeze * 0.12;
      poseFingers(joints.current, curl, G.t + squeeze * 0.1, G.s);
    };
    world.onFrame.push(update);
    return () => { world.onFrame = world.onFrame.filter((f) => f !== update); };
  }, []);

  return (
    <group ref={rig}>
      <group rotation={HAND_ROT} position={HAND_POS}>
        <group scale={[-1, 1, 1]}>
          <HandModel joints={joints} />
        </group>
      </group>
      <group ref={pivot}>
        <group position-y={-BASKET.handle}>
          <primitive object={basket} />
          <group ref={items} />
        </group>
      </group>
    </group>
  );
}
