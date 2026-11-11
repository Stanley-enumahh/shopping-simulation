import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { world } from '../game/world';
import { TILL } from '../data/products';
import { makePerson, animatePerson, SKIN } from '../game/people';
import { buildBasket, BASKET } from '../game/basket';
import { drawnTexture, mkCanvas, roundRect } from '../three/textures';

// The till near the entrance: counter, conveyor belt, scanner, card terminal, customer display and the cashier.
const { cx, cz, w, d, h } = TILL;

function beltTexture() {
  const c = mkCanvas(64, 256), g = c.getContext('2d');
  g.fillStyle = '#2a2d2f'; g.fillRect(0, 0, 64, 256);
  g.fillStyle = '#34383b';
  for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 64, 3);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 5);
  t.rotation = Math.PI / 2; t.center.set(0.5, 0.5);
  return t;
}

export default function Checkout() {
  const cashierRef = useRef(), basketRef = useRef(), itemsRef = useRef(), pileRef = useRef(), screenMesh = useRef();
  const mats = useMemo(() => ({
    front: new THREE.MeshStandardMaterial({ color: '#d9c3a5', roughness: 0.7 }),
    stripe: new THREE.MeshStandardMaterial({ color: '#1f7a55', roughness: 0.6 }),
    top: new THREE.MeshStandardMaterial({ color: '#e8ecec', roughness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: '#b8c0c4', roughness: 0.3, metalness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: '#25292b', roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: '#0d1214', roughness: 0.05, metalness: 0.3 }),
    laser: new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }),
    rail: new THREE.MeshStandardMaterial({ color: '#9aa6a0', roughness: 0.4, metalness: 0.6 }),
  }), []);
  const belt = useMemo(() => beltTexture(), []);
  const display = useMemo(() => {
    const c = mkCanvas(512, 256), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const draw = (title, value) => {
      const g = c.getContext('2d');
      g.fillStyle = '#0b2a1f'; g.fillRect(0, 0, 512, 256);
      g.fillStyle = '#7dffb5'; g.font = '500 40px "DM Mono", monospace'; g.textBaseline = 'middle';
      g.fillText(title, 28, 70);
      g.textAlign = 'right'; g.font = '600 86px "DM Mono", monospace'; g.fillText(value, 488, 170); g.textAlign = 'left';
      t.needsUpdate = true;
    };
    draw('EKO FRESH MART', 'WELCOME');
    return { texture: t, draw };
  }, []);
  const tillSign = useMemo(() => drawnTexture(1.2, 0.36, 768, (g, W, H) => {
    g.fillStyle = '#1f7a55'; roundRect(g, 4, 4, W - 8, H - 8, H * 0.2); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${H * 0.42}px Fredoka, sans-serif`; g.fillText('TILL 2 · PAY HERE', W / 2, H * 0.53);
  }), []);
  const basket = useMemo(() => buildBasket(), []);

  useEffect(() => {
    const cashier = makePerson({ skin: SKIN[2], shirt: '#1f7a55', apron: '#f5f5f5', pants: '#263238', hair: 'puff', hairColor: '#1a1a1a' });
    cashier.root.position.set(cx + 0.35, 0, cz + 0.85); cashier.root.rotation.y = Math.PI;
    cashierRef.current.add(cashier.root);
    world.till = {
      cashier, basket: basketRef.current, items: itemsRef.current, pile: pileRef.current, display, beltMoving: false,
    };
    world.npcs = world.npcs || [];
    const update = (dt) => {
      const W = world, T = W.till;
      if (T.beltMoving) belt.offset.y -= dt * 0.6;
      const dx = W.pos.x - cashier.root.position.x, dz = W.pos.z - cashier.root.position.z;
      cashier.lookYaw = Math.hypot(dx, dz) < 5 ? THREE.MathUtils.clamp(Math.atan2(dx, dz) - Math.PI, -1, 1) : Math.sin(W.time * 0.25) * 0.4;
      cashier.reach += ((T.cashierReach || 0) - cashier.reach) * Math.min(1, dt * 8);
      animatePerson(cashier, dt, 0, W.time);
    };
    world.onFrame.push(update);
    return () => { world.onFrame = world.onFrame.filter((f) => f !== update); };
  }, [display, belt]);

  const beltX0 = TILL.beltX0, beltX1 = TILL.beltX1;
  return (
    <group>
      {/* counter */}
      <mesh position={[cx, h / 2, cz]} material={mats.front}><boxGeometry args={[w, h, d]} /></mesh>
      <mesh position={[cx, 0.6, cz - d / 2 - 0.004]} material={mats.stripe}><boxGeometry args={[w, 0.08, 0.01]} /></mesh>
      <mesh position={[cx, h + 0.015, cz]} material={mats.top}><boxGeometry args={[w + 0.06, 0.03, d + 0.06]} /></mesh>
      {/* conveyor belt with end rollers */}
      <mesh position={[(beltX0 + beltX1) / 2, h + 0.037, cz]}>
        <boxGeometry args={[beltX1 - beltX0, 0.012, 0.5]} />
        <meshStandardMaterial map={belt} roughness={0.85} />
      </mesh>
      {[beltX0, beltX1].map((x) => (
        <mesh key={x} position={[x, h + 0.037, cz]} rotation-x={Math.PI / 2} material={mats.steel}><cylinderGeometry args={[0.012, 0.012, 0.52, 12]} /></mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(beltX0 + beltX1) / 2, h + 0.06, cz + s * 0.27]} material={mats.steel}><boxGeometry args={[beltX1 - beltX0, 0.05, 0.02]} /></mesh>
      ))}
      {/* scanner: flat glass with a laser line, plus the upright window */}
      <mesh position={[TILL.scanX, h + 0.033, cz]} material={mats.glass}><boxGeometry args={[0.3, 0.008, 0.32]} /></mesh>
      <mesh position={[TILL.scanX, h + 0.039, cz]} material={mats.laser}><boxGeometry args={[0.26, 0.002, 0.004]} /></mesh>
      <mesh position={[TILL.scanX, h + 0.16, cz + 0.2]} material={mats.dark}><boxGeometry args={[0.32, 0.26, 0.06]} /></mesh>
      <mesh position={[TILL.scanX, h + 0.16, cz + 0.168]} material={mats.glass}><boxGeometry args={[0.24, 0.17, 0.004]} /></mesh>
      {/* bagging area */}
      <mesh position={[TILL.bagX, h - 0.06, cz]} material={mats.steel}><boxGeometry args={[0.5, 0.02, d - 0.05]} /></mesh>
      <group ref={pileRef} position={[TILL.bagX, h - 0.05, cz]} />
      {/* card terminal on the customer side */}
      <group position={[TILL.posX, h + 0.03, cz - 0.24]} rotation-x={-0.5}>
        <mesh material={mats.dark}><boxGeometry args={[0.08, 0.025, 0.16]} /></mesh>
        <mesh position={[0, 0.014, -0.035]} material={mats.glass}><boxGeometry args={[0.06, 0.003, 0.05]} /></mesh>
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
          <mesh key={r + '-' + c} position={[(c - 1) * 0.018, 0.014, 0.01 + r * 0.018]} material={mats.steel}><boxGeometry args={[0.012, 0.004, 0.012]} /></mesh>
        )))}
      </group>
      {/* customer display on a pole */}
      <mesh position={[TILL.screenX, h + 0.2, cz + 0.2]} material={mats.steel}><cylinderGeometry args={[0.015, 0.015, 0.4, 10]} /></mesh>
      <mesh ref={screenMesh} position={[TILL.screenX, h + 0.45, cz + 0.18]}>
        <boxGeometry args={[0.36, 0.2, 0.03]} />
        <meshStandardMaterial attach="material-0" color="#25292b" />
        <meshStandardMaterial attach="material-1" color="#25292b" />
        <meshStandardMaterial attach="material-2" color="#25292b" />
        <meshStandardMaterial attach="material-3" color="#25292b" />
        <meshStandardMaterial attach="material-4" color="#25292b" />
        <meshBasicMaterial attach="material-5" map={display.texture} toneMapped={false} />
      </mesh>
      {/* the counter basket (filled when you pay) */}
      <group ref={basketRef} position={[TILL.basketX, h + 0.03 + BASKET.depth, cz]} visible={false}>
        <primitive object={basket} />
        <group ref={itemsRef} />
      </group>
      {/* cashier's pen */}
      <mesh position={[cx - w / 2 - 0.03, 0.45, cz + d / 2 + 0.62]} material={mats.rail}><boxGeometry args={[0.05, 0.9, 1.25]} /></mesh>
      <mesh position={[cx + w / 2 + 0.75, 0.45, cz + d / 2 - 0.02]} material={mats.rail}><boxGeometry args={[1.5, 0.9, 0.05]} /></mesh>
      {[0, Math.PI].map((ry) => (
        <mesh key={ry} position={[cx, 2.6, cz + (ry ? 0.004 : -0.004)]} rotation-y={ry ? 0 : Math.PI}>
          <planeGeometry args={[1.2, 0.36]} /><meshBasicMaterial map={tillSign} toneMapped={false} />
        </mesh>
      ))}
      {[-0.5, 0.5].map((dx) => (
        <mesh key={dx} position={[cx + dx, 3.1, cz]} material={mats.rail}><boxGeometry args={[0.01, 0.65, 0.01]} /></mesh>
      ))}
      <group ref={cashierRef} />
    </group>
  );
}
