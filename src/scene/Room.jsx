import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AISLES, AISLE_X, ENDCAP, FACES, FASHION, GONDOLAS, LEVELS, RACK } from '../data/products';
import { drawnTexture, fitLines, floorTexture, roundRect, softShadowTexture } from '../three/textures';
import { world } from '../game/world';

const GREEN = '#1f7a55', MUTED = '#5f6e67', INK = '#1c2621', MINT = '#d3eadf';

/** A flat plane with a canvas-drawn face. */
function Sign({ w, h, px = 1024, draw, basic = false, ...props }) {
  const tex = useMemo(() => drawnTexture(w, h, px, draw), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh {...props}>
      <planeGeometry args={[w, h]} />
      {basic ? <meshBasicMaterial map={tex} transparent toneMapped={false} /> : <meshLambertMaterial map={tex} transparent />}
    </mesh>
  );
}

function LightPanels() {
  const ref = useRef();
  const spots = useMemo(() => AISLE_X.flatMap((x) => [-9, -6, -3, 0, 3, 6, 9].map((z) => [x, z])), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
    spots.forEach(([x, z], i) => ref.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, 3.585, z), q, one)));
    ref.current.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} frustumCulled={false}>
      <planeGeometry args={[1.5, 0.45]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}

function AisleSign({ n, x }) {
  const draw = (g, W, H) => {
    g.fillStyle = '#ffffff'; roundRect(g, 4, 4, W - 8, H - 8, H * 0.18); g.fill();
    g.strokeStyle = MINT; g.lineWidth = 8; g.stroke();
    g.fillStyle = GREEN; g.beginPath(); g.arc(H * 0.52, H / 2, H * 0.33, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${H * 0.4}px Fredoka, sans-serif`; g.fillText(String(n), H * 0.52, H * 0.53);
    g.textAlign = 'left'; g.fillStyle = MUTED; g.font = `600 ${H * 0.14}px Figtree, sans-serif`; g.fillText('AISLE ' + n, H * 0.98, H * 0.3);
    const f = fitLines(g, AISLES[n], W - H * 1.1, H * 0.3, (s) => `600 ${s}px Fredoka, sans-serif`, 1, 1);
    g.fillStyle = INK; g.font = f.font; g.fillText(f.lines[0], H * 0.98, H * 0.6);
  };
  return (
    <group position={[x, 0, 0]}>
      <Sign w={1.7} h={0.46} draw={draw} position={[0, 2.78, 0.006]} />
      <Sign w={1.7} h={0.46} draw={draw} position={[0, 2.78, -0.006]} rotation-y={Math.PI} />
      {[-0.7, 0.7].map((dx) => (
        <mesh key={dx} position={[dx, 3.3, 0]}>
          <boxGeometry args={[0.012, 0.6, 0.012]} />
          <meshLambertMaterial color="#9aa6a0" />
        </mesh>
      ))}
    </group>
  );
}

function wallWord(word) {
  return (g, W, H) => {
    g.fillStyle = GREEN; g.globalAlpha = 0.85; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${H * 0.62}px Fredoka, sans-serif`; g.fillText(word, W / 2, H / 2);
  };
}
function drawFront(g, W, H) {
  g.fillStyle = '#f8f7f3'; g.fillRect(0, 0, W, H);
  g.fillStyle = MINT; g.fillRect(0, H * (1 - 1.1 / 3.6), W, H);
  const wy = H * (1 - 2.7 / 3.6), wh = H * (2.3 / 3.6);
  for (const [x0, x1] of [[0.6, 5.6], [10.4, 15.4]]) {
    const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#e6f3fa'); gr.addColorStop(1, '#f6fbfd');
    g.fillStyle = gr; g.fillRect((x0 / 16) * W, wy, ((x1 - x0) / 16) * W, wh);
    g.fillStyle = '#ffffff';
    for (let k = 1; k < 4; k++) g.fillRect(((x0 + ((x1 - x0) * k) / 4) / 16) * W - 4, wy, 8, wh);
  }
  const dx = (6.6 / 16) * W, dw = (2.8 / 16) * W, dy = H * (1 - 2.4 / 3.6);
  g.fillStyle = '#e9f5fb'; g.fillRect(dx, dy, dw, H - dy);
  g.fillStyle = '#c9d6d0'; g.fillRect(dx + dw / 2 - 3, dy, 6, H - dy);
  g.fillStyle = GREEN; g.font = '600 44px Figtree, sans-serif'; g.textAlign = 'center'; g.fillText('EXIT · ENTRANCE', W / 2, dy - 24);
}
function drawBackSign(g, W, H) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = GREEN; g.font = `600 ${H * 0.46}px Fredoka, sans-serif`; g.fillText('Eko Mart', W / 2, H * 0.4);
  g.fillStyle = MUTED; g.font = `500 ${H * 0.15}px Figtree, sans-serif`; g.fillText('EVERYTHING FOR YOUR KITCHEN  ·  LEKKI, LAGOS', W / 2, H * 0.82);
}

export function Room() {
  const floorTex = useMemo(() => floorTexture(), []);
  const walls = [[-8, 0, Math.PI / 2, 22], [8, 0, -Math.PI / 2, 22], [0, -11, 0, 16]];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[16, 22]} />
        <meshLambertMaterial map={floorTex} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={3.6}>
        <planeGeometry args={[16, 22]} />
        <meshLambertMaterial color="#fbfbf8" />
      </mesh>
      <LightPanels />
      {walls.map(([x, z, ry, w]) => (
        <group key={ry + ':' + z} position={[x, 0, z]} rotation-y={ry}>
          <mesh position-y={1.8}><planeGeometry args={[w, 3.6]} /><meshLambertMaterial color="#f8f7f3" /></mesh>
          <mesh position={[0, 0.55, 0.01]}><planeGeometry args={[w, 1.1]} /><meshLambertMaterial color={MINT} /></mesh>
        </group>
      ))}
      <Sign w={16} h={3.6} px={2048} draw={drawFront} basic position={[0, 1.8, 11]} rotation-y={Math.PI} />
      <Sign w={8} h={1.1} px={2048} draw={drawBackSign} position={[0, 2.95, -10.98]} />
      <Sign w={6} h={0.8} px={1536} draw={wallWord('Fashion Corner')} position={[-7.98, 2.65, 0]} rotation-y={Math.PI / 2} />
      <Sign w={6} h={1} px={1536} draw={wallWord('Home & Health')} position={[7.98, 2.3, 0]} rotation-y={-Math.PI / 2} />
      {AISLE_X.map((x, i) => <AisleSign key={x} n={i + 1} x={x} />)}
    </group>
  );
}

function Box({ size, mat, position, occluder }) {
  const ref = useRef();
  useLayoutEffect(() => {
    if (!occluder) return undefined;
    world.occluders.push(ref.current);
    return () => { world.occluders = world.occluders.filter((o) => o !== ref.current); };
  }, [occluder]);
  return (
    <mesh ref={ref} position={position} material={mat}>
      <boxGeometry args={size} />
    </mesh>
  );
}

function endSignDraw(a, b) {
  return (c, W, H) => {
    c.fillStyle = '#ffffff'; roundRect(c, 3, 3, W - 6, H - 6, H * 0.2); c.fill();
    c.fillStyle = INK; c.textBaseline = 'middle';
    const f = (s) => `600 ${s}px Fredoka, sans-serif`;
    const fa = fitLines(c, '‹ ' + a, W * 0.44, H * 0.34, f, 1, 1), fb = fitLines(c, b + ' ›', W * 0.44, H * 0.34, f, 1, 1);
    c.textAlign = 'left'; c.font = fa.font; c.fillText(fa.lines[0], W * 0.05, H / 2);
    c.textAlign = 'right'; c.font = fb.font; c.fillText(fb.lines[0], W * 0.95, H / 2);
    c.fillStyle = MINT; c.fillRect(W / 2 - 2, H * 0.22, 4, H * 0.56);
  };
}

const WOOD = new THREE.MeshStandardMaterial({ color: '#b68a5a', roughness: 0.9 });
const PROMO_RED = new THREE.MeshStandardMaterial({ color: '#d50000', roughness: 0.6 });
function promoHeader(left, right) {
  return (c, W, H) => {
    c.fillStyle = '#d50000'; roundRect(c, 3, 3, W - 6, H - 6, H * 0.16); c.fill();
    c.fillStyle = '#ffd600'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${H * 0.46}px "Bebas Neue", Impact, sans-serif`; c.fillText('PROMO · BIG SIZES', W / 2, H * 0.4);
    c.fillStyle = '#ffffff'; c.font = `600 ${H * 0.17}px Fredoka, sans-serif`;
    c.fillText(`‹ ${left}     ${right} ›`, W / 2, H * 0.78);
  };
}
/** The front end of a gondola: pallet, two shelves with red lips, side panels and a promo header. */
function EndCap({ left, right, M }) {
  const z0 = ENDCAP.z, dz = ENDCAP.depth, zc = z0 + dz / 2;
  return (
    <group>
      {/* pallet: deck boards on three runners */}
      {[-0.4, 0, 0.4].map((x) => <Box key={'r' + x} size={[0.1, 0.07, dz - 0.02]} mat={WOOD} position={[x, 0.035, zc]} />)}
      {[0, 1, 2, 3].map((k) => <Box key={'d' + k} size={[1.0, 0.025, 0.08]} mat={WOOD} position={[0, 0.0825 + 0.012, z0 + 0.06 + k * 0.1]} />)}
      <Box size={[1.0, 0.012, dz - 0.02]} mat={WOOD} position={[0, ENDCAP.levels[0] - 0.006, zc]} />
      {ENDCAP.levels.slice(1).map((top) => (
        <group key={top}>
          <Box size={[1.0, 0.025, dz]} mat={M.shelf} position={[0, top - 0.0125, zc]} />
          <Box size={[1.0, 0.05, 0.012]} mat={PROMO_RED} position={[0, top - 0.005, z0 + dz]} />
        </group>
      ))}
      {[-1, 1].map((s) => <Box key={s} size={[0.025, 1.72, dz]} mat={M.end} position={[s * 0.51, 0.86, zc]} />)}
      <Sign w={1.04} h={0.3} px={768} draw={promoHeader(left, right)} position={[0, 1.9, z0 + 0.02]} />
    </group>
  );
}

const OAK = new THREE.MeshStandardMaterial({ color: '#c9a27a', roughness: 0.75 });
const PANEL = new THREE.MeshStandardMaterial({ color: '#efe6d8', roughness: 0.85 });
const CHROME = new THREE.MeshStandardMaterial({ color: '#d3d8db', metalness: 0.85, roughness: 0.22 });
// Mirror glass: a soft sky-grey gradient with light streaks reads as a reflection without a second render.
function mirrorDraw(g, W, H) {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#f4f8fa'); gr.addColorStop(0.5, '#d5e1e6'); gr.addColorStop(1, '#eef3f5');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (const [x, w] of [[0.18, 0.08], [0.32, 0.03], [0.62, 0.1]]) { g.beginPath(); g.moveTo(W * x, H); g.lineTo(W * (x + w), H); g.lineTo(W * (x + w + 0.35), 0); g.lineTo(W * (x + 0.35), 0); g.fill(); }
}
function sectionSign(text) {
  return (c, W, H) => {
    c.fillStyle = INK; roundRect(c, 3, 3, W - 6, H - 6, H * 0.2); c.fill();
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const f = fitLines(c, text, W * 0.9, H * 0.56, (s) => `600 ${s}px Fredoka, sans-serif`, 1, 1);
    c.font = f.font; c.fillText(f.lines[0], W / 2, H * 0.54);
  };
}
/** Fashion corner on the left wall: oak shelves for shoes, eyewear, caps and folded clothes, arms for hanging clothes and a mirror. */
function FashionWall() {
  const F = FASHION, x0 = F.wallX, xc = x0 + F.depth / 2, front = x0 + F.depth;
  const shelves = ['shoes', 'glasses', 'caps', 'folded'].flatMap((k) => F[k].levels.flatMap((y) => F[k].runs.map(([z0, z1]) => [y, z0 - 0.05, z1 + 0.05])));
  const uprights = [-7.15, -4.8, -2.5, -0.6, 1.05, 1.55, 4.3, 7.15];
  return (
    <group>
      <Box size={[0.03, 2.1, 14.4]} mat={PANEL} position={[x0 + 0.015, 1.05, 0]} occluder />
      <Box size={[F.depth, 0.12, 14.4]} mat={OAK} position={[xc, 0.06, 0]} />
      {uprights.map((z) => <Box key={z} size={[0.04, 2.1, 0.03]} mat={OAK} position={[x0 + 0.05, 1.05, z]} />)}
      {shelves.map(([y, z0, z1]) => (
        <group key={y + ':' + z0}>
          <Box size={[F.depth, 0.025, z1 - z0]} mat={OAK} position={[xc, y - 0.0125, (z0 + z1) / 2]} />
          {[z0 + 0.06, z1 - 0.06].map((z) => <Box key={z} size={[F.depth - 0.04, 0.008, 0.012]} mat={CHROME} position={[xc, y - 0.03, z]} />)}
        </group>
      ))}
      {/* face-out arms for clothes on hangers */}
      {F.hang.arms.map((z) => (
        <group key={z}>
          <Box size={[0.02, 0.12, 0.05]} mat={CHROME} position={[x0 + 0.04, F.hang.hook - 0.02, z]} />
          <mesh position={[x0 + F.hang.length / 2 + 0.03, F.hang.hook, z]} rotation-z={Math.PI / 2} material={CHROME}>
            <cylinderGeometry args={[0.009, 0.009, F.hang.length, 10]} />
          </mesh>
          <mesh position={[x0 + F.hang.length + 0.03, F.hang.hook, z]} material={CHROME}><sphereGeometry args={[0.016, 12, 8]} /></mesh>
        </group>
      ))}
      {/* mirror between the eyewear and the clothes */}
      <Box size={[0.03, 1.16, F.mirror.w + 0.05]} mat={OAK} position={[x0 + 0.045, 1.46, F.mirror.z]} />
      <Sign w={F.mirror.w} h={1.1} px={256} draw={mirrorDraw} basic position={[x0 + 0.062, 1.46, F.mirror.z]} rotation-y={Math.PI / 2} />
      {[['SHOES', -4.8], ['EYEWEAR · CAPS', -0.6], ['CLOTHING', 5.25]].map(([t, z]) => (
        <Sign key={t} w={1.3} h={0.22} px={512} draw={sectionSign(t)} position={[x0 + 0.08, 2.02, z]} rotation-y={Math.PI / 2} />
      ))}
      <Box size={[0.05, 0.05, 14.4]} mat={OAK} position={[front - 0.02, 2.12, 0]} />
    </group>
  );
}
/** Small "Grab & go" stand at the end of the till: three shelves behind a header card. */
function TillRack() {
  const R = RACK, zc = R.z0 + R.depth / 2, sign = useMemo(() => sectionSign('GRAB & GO'), []);
  return (
    <group>
      <Box size={[R.width + 0.04, R.levels[0], R.depth + 0.02]} mat={OAK} position={[R.x, R.levels[0] / 2, zc]} />
      <Box size={[R.width + 0.04, 1.5, 0.02]} mat={PANEL} position={[R.x, 0.75, R.z0 + R.depth + 0.01]} />
      {[-1, 1].map((s) => <Box key={s} size={[0.02, 1.5, R.depth + 0.02]} mat={OAK} position={[R.x + s * (R.width / 2 + 0.01), 0.75, zc]} />)}
      {R.levels.slice(1).map((y) => (
        <group key={y}>
          <Box size={[R.width, 0.02, R.depth]} mat={OAK} position={[R.x, y - 0.01, zc]} />
          <Box size={[R.width, 0.03, 0.008]} mat={PROMO_RED} position={[R.x, y + 0.006, R.z0 + 0.004]} />
        </group>
      ))}
      <Box size={[R.width, 0.03, 0.008]} mat={PROMO_RED} position={[R.x, R.levels[0] + 0.006, R.z0 + 0.004]} />
      <Sign w={R.width + 0.04} h={0.16} px={512} draw={sign} position={[R.x, 1.58, R.z0 + R.depth - 0.001]} rotation-y={Math.PI} />
    </group>
  );
}

export function Gondolas() {
  return (
    <>
      <GondolaRuns />
      <FashionWall />
      <TillRack />
    </>
  );
}
function GondolaRuns() {
  const M = useMemo(() => ({
    base: new THREE.MeshLambertMaterial({ color: '#d5dbd6' }), panel: new THREE.MeshLambertMaterial({ color: '#e8ece8' }),
    shelf: new THREE.MeshLambertMaterial({ color: '#f6f7f5' }), lip: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    cap: new THREE.MeshLambertMaterial({ color: '#dfe5e0' }), end: new THREE.MeshLambertMaterial({ color: '#cfe7da' }),
    shadow: new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, opacity: 0.32, depthWrite: false, color: '#2e3b35' }),
  }), []);
  return GONDOLAS.map((g, gi) => {
    const left = FACES[gi * 2].cat, right = FACES[gi * 2 + 1].cat;
    return (
      <group key={g} position-x={g}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.003} material={M.shadow}><planeGeometry args={[1.9, 15.6]} /></mesh>
        <Box size={[1.0, 0.12, 14.3]} mat={M.base} position={[0, 0.06, 0]} />
        <Box size={[0.04, 1.86, 14.3]} mat={M.panel} position={[0, 1.05, 0]} occluder />
        {LEVELS.map((top) => (
          <group key={top}>
            <Box size={[0.96, 0.025, 14.2]} mat={M.shelf} position={[0, top - 0.0125, 0]} />
            <Box size={[0.012, 0.045, 14.2]} mat={M.lip} position={[-0.486, top - 0.005, 0]} />
            <Box size={[0.012, 0.045, 14.2]} mat={M.lip} position={[0.486, top - 0.005, 0]} />
          </group>
        ))}
        <Box size={[1.06, 0.05, 14.4]} mat={M.cap} position={[0, 2.0, 0]} />
        {[-1, 1].map((zs) => (
          <group key={zs}>
            <Box size={[1.06, 2.0, 0.05]} mat={M.end} position={[0, 1.0, zs * 7.18]} />
            {zs < 0 && (
              <Sign w={0.96} h={0.34} px={768} draw={endSignDraw(right, left)} position={[0, 1.62, -7.21]} rotation-y={Math.PI} />
            )}
          </group>
        ))}
        <EndCap left={left} right={right} M={M} />
      </group>
    );
  });
}
