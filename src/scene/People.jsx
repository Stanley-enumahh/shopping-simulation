import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AISLE_X, FACES, PRODUCTS } from '../data/products';
import { world, getPhase } from '../game/world';
import { makePerson, animatePerson, SKIN } from '../game/people';
import { packBasket } from '../game/basket';
import { centredProduct } from '../three/productModels';
import { sfx } from '../game/audio';
import { say } from '../game/voice';
import { getState } from '../store';

// Other shoppers walk the aisles, stop at shelves, fill their baskets, pay and leave.
// A security guard at the door greets you. Announcements and distant trolleys add life.
const FRONT_Z = 7.9, BACK_Z = -8.5, DOOR = [0, 10.45], TILL_SPOT = [4.3, 8.05], QUEUE_SPOT = [2.7, 7.9];
// A Lagos crowd: Ankara, aso-oke, kaftans, jerseys, jeans; gele, fila, braids, locs, fades.
const ANKARA_A = { fabric: 'ankara', c2: '#1a237e', c3: '#ffd600' }, ANKARA_B = { fabric: 'ankara', c2: '#ffeb3b', c3: '#e65100' };
const LOOKS = [
  { figure: 'm', build: 'avg', skin: SKIN[1], top: { kind: 'shirt', color: '#00897b', fabric: 'ankara', c2: '#ffd600', c3: '#d84315' }, bottom: { kind: 'trousers', color: '#2b2f3a' }, hair: 'fade', shoes: '#3e2723' },
  { figure: 'f', build: 'avg', skin: SKIN[3], top: { kind: 'tee', color: '#e65100', ...ANKARA_A }, bottom: { kind: 'wrapper', color: '#e65100', ...ANKARA_A }, hair: 'none', headwear: { kind: 'gele', c1: '#7b1fa2', c2: '#ffd54f', c3: '#4a148c' }, shoes: '#8d6e63' },
  { figure: 'f', build: 'slim', skin: SKIN[0], top: { kind: 'tee', color: '#f4c430' }, bottom: { kind: 'jeans', color: '#3f5a8a', fabric: 'denim' }, hair: 'braids', hairColor: '#1a1a1a', shoes: '#f2f2f2' },
  { figure: 'm', build: 'heavy', skin: SKIN[4], top: { kind: 'kaftan', color: '#f3ede1', fabric: 'kaftan', c2: '#c9a227' }, bottom: { kind: 'trousers', color: '#f3ede1' }, hair: 'none', headwear: { kind: 'fila', c1: '#6a1b9a', c2: '#ffd54f' }, shoes: '#6d3b1f' },
  { figure: 'm', build: 'slim', skin: SKIN[5], top: { kind: 'tee', color: '#008751', fabric: 'jersey', c2: '#ffffff' }, bottom: { kind: 'jeans', color: '#2c3e66', fabric: 'denim' }, hair: 'locs', hairColor: '#2b1a10', shoes: '#f2f2f2' },
  { figure: 'f', build: 'heavy', skin: SKIN[2], top: { kind: 'shirt', color: '#c2185b', sleeve: 'long' }, bottom: { kind: 'skirt', color: '#1a237e' }, hair: 'bun', hairColor: '#120c08', shoes: '#212121' },
  { figure: 'm', build: 'avg', skin: SKIN[2], top: { kind: 'polo', color: '#455a64' }, bottom: { kind: 'jeans', color: '#33415c', fabric: 'denim' }, hair: 'low', headwear: { kind: 'cap', color: '#212121' }, shoes: '#f2f2f2' },
  { figure: 'f', build: 'avg', skin: SKIN[4], top: { kind: 'tee', color: '#2e7d32', ...ANKARA_B }, bottom: { kind: 'skirt', color: '#2e7d32', ...ANKARA_B }, hair: 'afro', hairColor: '#1a1a1a', shoes: '#c9a227' },
];
const SHOPPERS = 6;
const GREETINGS = ['Good day! Welcome to Eko Mart.', 'You are welcome, oga. Baskets dey your hand already.', 'Welcome! Enjoy your shopping.'];
const GOODBYES = ['Thank you, safe journey!', 'Thank you o, come again!', 'Bye bye, see you next time.'];
const ANNOUNCEMENTS = [
  'Attention shoppers. Buy two Sharp Sharp noodles and get one free, in aisle three. Today only.',
  'Good day, customers. Chilled drinks are waiting for you in the fridges at the back of the store.',
  'Attention please. Would the owner of a silver Camry parked across the gate kindly move it. Thank you.',
  'Dear customers, our tills close at ten p m. Thank you for shopping at Eko Mart.',
  'Attention shoppers. Ofada Gold rice is now on promo. Grab your bag before it finishes!',
];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** 0 -> 1 -> 0 over [a, b], eased at both ends. */
const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.min(1, Math.sin(((t - a) / (b - a)) * Math.PI) * 1.25));

/** Which shelf face a shopper standing in aisle `ai` sees when facing direction dx (+1 = +X). */
function faceIndexFor(ai, dx) {
  const x = AISLE_X[ai];
  return FACES.findIndex((f) => !f.fridge && f.side === -dx && Math.abs(f.g - (x + dx * 2)) < 0.6);
}

export default function People() {
  const group = useRef();

  useEffect(() => {
    const W = world, root = group.current;
    W.npcs = [];

    // Security guard by the entrance.
    const guard = makePerson({
      figure: 'm', build: 'heavy', skin: SKIN[4], guard: true, hair: 'none', shoes: '#0d0d0d',
      top: { kind: 'uniform', color: '#1f2a44' }, bottom: { kind: 'trousers', color: '#1a2238' }, headwear: { kind: 'guard', color: '#1f2a44' },
    });
    guard.root.position.set(1.9, 0, 10.15); guard.root.rotation.y = Math.PI;
    root.add(guard.root);
    W.npcs.push({ x: 1.9, z: 10.15, r: 0.3 });
    let greetCooldown = 0, greetedOnce = false, saidBye = false;

    // Shoppers.
    const looks = [...LOOKS].sort(() => Math.random() - 0.5).slice(0, SHOPPERS);
    const shoppers = looks.map((look, i) => {
      const p = makePerson({ ...look, basket: true, phone: true, scale: look.figure === 'f' ? rand(0.92, 0.99) : rand(0.98, 1.05) });
      root.add(p.root);
      const ai = i % 4;
      const s = { p, x: AISLE_X[ai], z: rand(-5, 5), heading: 0, path: [], state: 'idle', timer: rand(0.5, 3), items: [], speed: rand(0.85, 1.1), ai, coll: { x: 0, z: 0, r: 0.3 }, lastStep: 0 };
      W.npcs.push(s.coll);
      return s;
    });

    function goTo(s, pts, next) { s.path = pts.map(([x, z]) => ({ x, z })); s.state = 'walk'; s.after = next; }
    function corridorPath(s, toX, toZ) {
      const pts = [];
      const inAisle = Math.abs(s.z) < 7.4;
      const cross = toZ > 0 ? FRONT_Z : BACK_Z;
      if (inAisle) {
        const end = Math.abs(toX - s.x) < 0.3 ? (toZ > s.z ? FRONT_Z : BACK_Z) : (Math.abs(s.z - FRONT_Z) < Math.abs(s.z - BACK_Z) ? FRONT_Z : BACK_Z);
        if (Math.abs(toX - s.x) < 0.3) { pts.push([s.x, toZ]); return pts; }
        pts.push([s.x, end]);
        if (end !== cross) pts.push([7.0 * Math.sign(s.x || 1), end], [7.0 * Math.sign(s.x || 1), cross]);
      }
      pts.push([toX, cross], [toX, toZ]);
      return pts;
    }
    function nextAisle(s) {
      s.ai = (s.ai + 1 + Math.floor(Math.random() * 3)) % 4;
      goTo(s, corridorPath(s, AISLE_X[s.ai], rand(-6, 6)), 'browse');
    }
    function startBrowse(s) {
      const dx = s.ai === 0 ? 1 : s.ai === 3 ? -1 : Math.random() < 0.5 ? 1 : -1;
      s.faceDx = dx; s.state = 'browse'; s.timer = 0;
      // pick what to look at first, so the reach goes to the right shelf height
      const fi = faceIndexFor(s.ai, dx);
      s.target = fi < 0 ? -1 : fi * 8 + Math.floor(Math.random() * 8);
      s.p.reachH = [-1, -0.5, 0, 1][s.target < 0 ? 2 : Math.floor((s.target % 8) / 2)];
      s.checkPhone = Math.random() < 0.2;
    }
    /** Take the item off the shelf into the right hand, to look at it. */
    function takeItem(s) {
      if (s.target < 0) return;
      const mesh = centredProduct(PRODUCTS[s.target]);
      mesh.position.set(0, -0.08, 0.05);
      s.p.wristR.add(mesh);
      s.inHand = { ti: s.target, twist: rand(-0.3, 0.3), mesh };
    }
    /** Put what is in the hand into the basket. */
    function stowItem(s) {
      const entry = s.inHand;
      if (!entry) return;
      s.inHand = null;
      s.p.wristR.remove(entry.mesh);
      entry.mesh.position.set(0, 0, 0);
      s.items.push(entry);
      s.p.basketItems.add(entry.mesh);
      packBasket(s.items).forEach((pose, i) => { s.items[i].mesh.position.copy(pose.pos); s.items[i].mesh.quaternion.copy(pose.quat); });
      sfx.stepAt(s.x, s.z);
    }
    function clearItems(s) { for (const e of s.items) s.p.basketItems.remove(e.mesh); s.items = []; }
    function tillBusy(self) {
      if (getPhase() === 'checkout') return true;
      return shoppers.some((o) => o !== self && (o.state === 'paying' || (o.state === 'walk' && o.after === 'pay')));
    }

    // Start everyone somewhere sensible.
    shoppers.forEach((s, i) => { s.state = 'idle'; s.timer = 0.5 + i * 0.7; });

    let paTimer = 28, trolleyTimer = 12;
    const v = new THREE.Vector3();
    const update = (dt) => {
      const phase = getPhase();
      if (phase === 'loading') return;
      const t = W.time, px = W.pos.x, pz = W.pos.z;

      // Guard: watches the door, greets you when you come close, says goodbye on your way out.
      const gdx = px - 1.9, gdz = pz - 10.15, gd = Math.hypot(gdx, gdz);
      guard.lookYaw = gd < 6 ? THREE.MathUtils.clamp(Math.atan2(gdx, gdz) - Math.PI, -1.1, 1.1) : Math.sin(t * 0.3) * 0.5;
      greetCooldown -= dt;
      if (phase !== 'intro' && gd < 3.4 && greetCooldown <= 0) {
        const leaving = W.paid && pz > 9;
        if (!greetedOnce || leaving) {
          say('Guard', leaving ? pick(GOODBYES) : pick(GREETINGS));
          guard.wave = 1; greetedOnce = true; greetCooldown = 25;
          if (leaving) { W.paid = false; saidBye = true; }
        }
      }
      if (saidBye && gd > 6) saidBye = false;
      guard.wave = Math.max(0, guard.wave - dt * 0.45);
      animatePerson(guard, dt, 0, t);

      // Shoppers.
      for (const s of shoppers) {
        const p = s.p;
        let moving = 0;
        if (s.state === 'idle') {
          s.timer -= dt;
          if (s.timer <= 0) {
            p.root.visible = true; p.root.scale.setScalar(1);
            if (s.respawn) { s.respawn = false; goTo(s, [[0, FRONT_Z], [AISLE_X[s.ai], FRONT_Z], [AISLE_X[s.ai], rand(-6, 6)]], 'browse'); }
            else goTo(s, [[s.x, s.z]], 'browse');
          }
        } else if (s.state === 'walk') {
          const tgt = s.path[0];
          if (!tgt) {
            const nxt = s.after;
            if (nxt === 'browse') startBrowse(s);
            else if (nxt === 'pay') { s.state = 'paying'; s.timer = 0; }
            else if (nxt === 'queue') { s.state = 'queue'; s.timer = 0; }
            else if (nxt === 'leave') { s.state = 'gone'; s.timer = 0; }
            else s.state = 'idle';
          } else {
            const dx = tgt.x - s.x, dz = tgt.z - s.z, d = Math.hypot(dx, dz);
            if (d < 0.05) s.path.shift();
            else {
              // Give way to the player and to other shoppers just ahead.
              const fx = dx / d, fz = dz / d;
              const blocked = [[px, pz, 0.95], ...shoppers.filter((o) => o !== s && o.state !== 'gone' && o.state !== 'idle').map((o) => [o.x, o.z, 0.75])]
                .some(([ox, oz, rr]) => { const ex = ox - s.x, ez = oz - s.z, ed = Math.hypot(ex, ez); return ed < rr && (ex * fx + ez * fz) / (ed || 1) > 0.45; });
              if (blocked) { s.wait = (s.wait || 0) + dt; }
              if (!blocked || s.wait > 2.5) {
                s.wait = 0;
                const step = Math.min(d, s.speed * dt);
                s.x += fx * step; s.z += fz * step; moving = 1;
                s.heading = Math.atan2(fx, fz);
              }
            }
          }
        } else if (s.state === 'browse') {
          s.timer += dt;
          s.heading = Math.atan2(s.faceDx, 0);
          const tt = s.timer;
          if (s.checkPhone) {
            p.phone = bump(tt, 0.3, 3.4); // a quick look at the phone instead of the shelf
          } else {
            // reach to the shelf, take the item, look at it, then drop it in the basket
            p.reach = bump(tt, 0.4, 2.0);
            p.lookPitch = p.reachH * -0.15;
            if (tt > 1.2 && !s.took) { s.took = true; if (Math.random() < 0.8) takeItem(s); }
            p.inspect = s.inHand ? bump(tt, 1.6, 3.4) : 0;
            if (tt > 3.2 && s.inHand) stowItem(s);
          }
          if (s.timer > 3.6 + (s.items.length % 2) * 0.6) {
            s.took = false; p.reach = 0; p.inspect = 0; p.phone = 0; p.lookPitch = 0; stowItem(s);
            if (s.items.length >= 3 + Math.floor(Math.random() * 3)) {
              goTo(s, tillBusy(s) ? [...corridorPath(s, QUEUE_SPOT[0], QUEUE_SPOT[1])] : [...corridorPath(s, TILL_SPOT[0], TILL_SPOT[1])], tillBusy(s) ? 'queue' : 'pay');
            } else nextAisle(s);
          }
        } else if (s.state === 'queue') {
          s.heading = Math.PI * 0.4;
          s.timer += dt;
          p.phone += (1 - p.phone) * Math.min(1, dt * 3); // scrolling while they wait
          if (!tillBusy(s)) goTo(s, [TILL_SPOT], 'pay');
          else if (s.timer > 12) goTo(s, [[0, 9.4], DOOR], 'leave');
        } else if (s.state === 'paying') {
          s.heading = 0; // facing the till
          s.timer += dt;
          const beeps = Math.floor(s.timer / 0.65);
          if (beeps !== s.beeps && beeps <= s.items.length) { s.beeps = beeps; sfx.beep(5.4, 9.0); }
          if (s.timer > 0.65 * s.items.length + 2.5) { s.beeps = 0; clearItems(s); goTo(s, [[2.4, 9.3], [0, 9.6], DOOR], 'leave'); }
        } else if (s.state === 'gone') {
          s.timer += dt;
          p.root.scale.setScalar(Math.max(0.001, 1 - s.timer * 2));
          if (s.timer > 0.5) { p.root.visible = false; s.state = 'idle'; s.timer = rand(5, 12); s.x = DOOR[0]; s.z = DOOR[1]; s.ai = Math.floor(Math.random() * 4); s.after = null; s.path = []; s.respawn = true; }
        }
        // Smoothly turn toward the heading.
        let dh = s.heading - p.root.rotation.y;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        p.root.rotation.y += dh * Math.min(1, dt * 7);
        p.root.position.set(s.x, 0, s.z);
        if (s.state !== 'queue' && s.state !== 'browse') p.phone += (0 - p.phone) * Math.min(1, dt * 4);
        // glance along the shelves while walking an aisle
        p.lookYaw = s.state === 'walk' && Math.abs(s.z) < 7 ? Math.sin(t * 0.45 + p.seed) * 0.65 : 0;
        animatePerson(p, dt, moving, t);
        const stepN = Math.floor(p.phase / Math.PI);
        if (moving && stepN !== s.lastStep) { s.lastStep = stepN; sfx.stepAt(s.x, s.z); }
        s.coll.x = s.x; s.coll.z = s.z; s.coll.r = p.root.visible ? 0.3 : 0;
      }

      // Announcements and trolleys.
      if (phase !== 'intro') {
        paTimer -= dt; trolleyTimer -= dt;
        if (paTimer <= 0) { paTimer = rand(70, 120); sfx.chime(); say('Announcement', pick(ANNOUNCEMENTS), { delay: 1.4 }); }
        if (trolleyTimer <= 0) {
          trolleyTimer = rand(14, 32);
          v.set(pick([-7, -1, 1, 7]), 0, pick([FRONT_Z, BACK_Z]));
          sfx.trolley(v.x, v.z);
        }
      }
      // Fridge hum fades in near the back wall.
      sfx.setFridge(THREE.MathUtils.clamp(1 - (pz + 10.2) / 4, 0, 1) * (Math.abs(px) < 5 ? 1 : 0.5));
    };
    W.onFrame.push(update);
    W.greetNow = () => { greetCooldown = 0; };
    return () => {
      W.onFrame = W.onFrame.filter((f) => f !== update);
      while (root.children.length) root.remove(root.children[0]);
      W.npcs = [];
    };
  }, []);

  return <group ref={group} />;
}
