import { useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { setMaxAnisotropy } from '../three/textures';
import * as game from '../game/world';
import { getState } from '../store';
import { Gondolas, Room } from './Room';
import { Shelves } from './Shelves';
import Hand from './Hand';
import BasketArm from './BasketArm';
import People from './People';
import Fridges from './Fridges';
import Checkout from './Checkout';
import Avatar from './Avatar';

/**
 * The store renders in two passes: the world, then a "view" scene glued to the camera
 * that holds the hand and the product in your hand, so they never clip into shelves.
 */
export default function Game() {
  const { gl, scene, camera } = useThree();
  const overlay = useMemo(() => new THREE.Scene(), []);
  const viewRoot = useRef();

  // Runs during render so the textures built by the children get the right settings.
  useMemo(() => {
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
    scene.background = new THREE.Color('#f3f6f3');
    scene.fog = new THREE.Fog('#f3f6f3', 15, 34);
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    overlay.environment = env;
    camera.rotation.order = 'YXZ';
  }, [gl, scene, camera, overlay]);

  useLayoutEffect(() => {
    Object.assign(game.world, { gl, scene, camera, overlay, viewRoot: viewRoot.current });
    const detach = game.attachInput(gl.domElement);
    game.setPhase('intro');
    if (/[?&]plmdebug\b/.test(location.search)) {
      window.__plm = { ...game, getState, step(n = 1) { for (let i = 0; i < n; i++) game.frame(1 / 60); } };
    }
    return detach;
  }, [gl, scene, camera, overlay]);

  useFrame((_, dt) => game.frame(dt), 1);

  return (
    <>
      <hemisphereLight args={['#ffffff', '#d3d9d4', 1.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 8, 5]} intensity={1.1} />
      <Room />
      <Gondolas />
      <Shelves />
      <Fridges />
      <Checkout />
      <People />
      <Avatar />
      {createPortal(
        <group ref={viewRoot}>
          <hemisphereLight args={['#ffffff', '#c9d0cb', 0.9]} />
          <directionalLight position={[-1, 2, 1.6]} intensity={1.35} />
          <directionalLight position={[1.5, 0.5, -1]} intensity={0.45} />
          <Hand />
          <BasketArm />
        </group>,
        overlay,
      )}
    </>
  );
}
