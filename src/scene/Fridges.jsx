import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FRIDGE } from '../data/products';
import { drawnTexture, mkCanvas, rng } from '../three/textures';
import { world } from '../game/world';
import { sfx } from '../game/audio';

// A bank of glass-door drinks fridges along the back wall. Doors swing open when you walk up.
const H = 2.05, W = FRIDGE.door * FRIDGE.doors, CX = FRIDGE.x0 + W / 2;
const DEPTH = FRIDGE.front - FRIDGE.back, CZ = (FRIDGE.front + FRIDGE.back) / 2;

/** Fogged glass: a faint blue tint, misting at the bottom and edges, scattered droplets. */
function condensation() {
  const c = mkCanvas(256, 640), g = c.getContext('2d'), rnd = rng(77);
  g.fillStyle = 'rgba(214,236,248,0.10)'; g.fillRect(0, 0, 256, 640);
  const fog = g.createLinearGradient(0, 640, 0, 300);
  fog.addColorStop(0, 'rgba(255,255,255,0.55)'); fog.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = fog; g.fillRect(0, 300, 256, 340);
  for (const [x0, x1] of [[0, 26], [256, 230]]) {
    const edge = g.createLinearGradient(x0, 0, x1, 0);
    edge.addColorStop(0, 'rgba(255,255,255,0.35)'); edge.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = edge; g.fillRect(Math.min(x0, x1), 0, 26, 640);
  }
  for (let i = 0; i < 420; i++) {
    const x = rnd() * 256, y = 200 + rnd() * 440, r = 0.8 + rnd() * 2.6;
    g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.35})`;
    g.beginPath(); g.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 14; i++) { // a few drips running down
    const x = rnd() * 256, y = 320 + rnd() * 200, len = 40 + rnd() * 120;
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y + len); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Door({ k, mats, glassMat, registerDoor }) {
  const hinge = useRef();
  const left = k % 2 === 0; // pairs open like double doors
  const hx = FRIDGE.x0 + FRIDGE.door * k + (left ? 0 : FRIDGE.door);
  const s = left ? 1 : -1, w = FRIDGE.door - 0.02;
  useEffect(() => registerDoor({ hinge: hinge.current, left, cx: hx + s * w / 2 }), [registerDoor, hx, s, w, left]);
  return (
    <group ref={hinge} position={[hx, 0.1, FRIDGE.front + 0.02]}>
      <group position-x={s * w / 2}>
        <mesh position-y={0.935} material={glassMat}><planeGeometry args={[w - 0.08, 1.79]} /></mesh>
        {[[0, 0.02, w, 0.04], [0, 1.85, w, 0.04]].map(([x, y, ww, hh], i) => (
          <mesh key={i} position={[x, y, 0]} material={mats.frame}><boxGeometry args={[ww, hh, 0.04]} /></mesh>
        ))}
        {[-1, 1].map((e) => (
          <mesh key={e} position={[e * (w / 2 - 0.02), 0.935, 0]} material={mats.frame}><boxGeometry args={[0.04, 1.87, 0.04]} /></mesh>
        ))}
        <mesh position={[-s * (w / 2 - 0.07), 1.0, 0.045]} material={mats.handle}><boxGeometry args={[0.022, 0.6, 0.03]} /></mesh>
      </group>
    </group>
  );
}

export default function Fridges() {
  const doors = useRef([]);
  const mats = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: '#e9eef0', roughness: 0.5 }),
    frame: new THREE.MeshStandardMaterial({ color: '#3a4146', roughness: 0.35, metalness: 0.6 }),
    handle: new THREE.MeshStandardMaterial({ color: '#cfd6da', roughness: 0.25, metalness: 0.9 }),
    back: new THREE.MeshBasicMaterial({ color: '#eef8ff', toneMapped: false }),
    shelf: new THREE.MeshStandardMaterial({ color: '#c9d3d8', roughness: 0.3, metalness: 0.5 }),
    light: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  }), []);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: condensation(), transparent: true, depthWrite: false, roughness: 0.08, metalness: 0.1, envMapIntensity: 1.2, side: THREE.DoubleSide,
  }), []);
  const sign = useMemo(() => drawnTexture(W, 0.22, 2048, (g, w, h) => {
    g.fillStyle = '#1f7a55'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${h * 0.6}px Fredoka, sans-serif`; g.fillText('CHILLED DRINKS  ·  ICE COLD', w / 2, h * 0.54);
  }), []);
  const registerDoor = useMemo(() => (d) => { doors.current.push({ ...d, angle: 0, vel: 0, open: false }); return () => { doors.current = doors.current.filter((x) => x.hinge !== d.hinge); }; }, []);

  useEffect(() => {
    const update = (dt) => {
      const px = world.pos.x, pz = world.pos.z;
      for (const d of doors.current) {
        const near = Math.abs(px - d.cx) < 0.9 && pz < FRIDGE.front + 2.4;
        if (near !== d.open) { d.open = near; sfx.fridgeDoor(near); }
        const target = near ? 1.15 : 0;
        const a = 60 * (target - d.angle) - 2 * 0.7 * Math.sqrt(60) * d.vel;
        d.vel += a * dt; d.angle += d.vel * dt;
        d.hinge.rotation.y = (d.left ? -1 : 1) * Math.max(0, d.angle);
      }
    };
    world.onFrame.push(update);
    return () => { world.onFrame = world.onFrame.filter((f) => f !== update); };
  }, []);

  return (
    <group>
      {/* cabinet */}
      <mesh position={[CX, H / 2, FRIDGE.back - 0.02]} material={mats.back}><boxGeometry args={[W, H, 0.04]} /></mesh>
      <mesh position={[CX, 0.05, CZ]} material={mats.body}><boxGeometry args={[W + 0.1, 0.1, DEPTH]} /></mesh>
      <mesh position={[CX, H + 0.06, CZ]} material={mats.body}><boxGeometry args={[W + 0.1, 0.12, DEPTH + 0.05]} /></mesh>
      {[-1, 1].map((e) => (
        <mesh key={e} position={[CX + e * (W / 2 + 0.03), H / 2, CZ]} material={mats.body}><boxGeometry args={[0.06, H, DEPTH]} /></mesh>
      ))}
      {Array.from({ length: FRIDGE.doors - 1 }, (_, i) => (
        <mesh key={i} position={[FRIDGE.x0 + FRIDGE.door * (i + 1), H / 2, FRIDGE.front - 0.01]} material={mats.frame}><boxGeometry args={[0.03, H - 0.1, 0.04]} /></mesh>
      ))}
      {FRIDGE.levels.map((y) => (
        <mesh key={y} position={[CX, y - 0.01, CZ + 0.02]} material={mats.shelf}><boxGeometry args={[W - 0.02, 0.015, DEPTH - 0.06]} /></mesh>
      ))}
      <mesh position={[CX, H - 0.04, FRIDGE.front - 0.08]} material={mats.light}><boxGeometry args={[W - 0.1, 0.02, 0.03]} /></mesh>
      <mesh position={[CX, H + 0.24, FRIDGE.front + 0.04]}>
        <planeGeometry args={[W, 0.22]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {Array.from({ length: FRIDGE.doors }, (_, k) => <Door key={k} k={k} mats={mats} glassMat={glassMat} registerDoor={registerDoor} />)}
    </group>
  );
}
