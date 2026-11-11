import { useEffect, useRef } from 'react';
import { world, getPhase } from '../game/world';
import { makePerson, animatePerson, SKIN } from '../game/people';
import { packBasket } from '../game/basket';
import { centredProduct } from '../three/productModels';
import { PRODUCTS } from '../data/products';
import { getState, subscribe } from '../store';

// You, as seen from the third-person camera: same sage sleeves as the first-person arms,
// carrying a basket that shows what is in your cart.
export default function Avatar() {
  const group = useRef();
  useEffect(() => {
    const me = makePerson({ skin: SKIN[3], shirt: '#78a892', pants: '#2b2f3a', hair: 'short', basket: true });
    group.current.add(me.root);
    let shown = null;
    const sync = () => {
      const cart = getState().cart;
      if (cart === shown) return;
      shown = cart;
      while (me.basketItems.children.length) me.basketItems.remove(me.basketItems.children[0]);
      const poses = packBasket(cart);
      cart.forEach((e, i) => {
        const m = centredProduct(PRODUCTS[e.ti]);
        m.position.copy(poses[i].pos); m.quaternion.copy(poses[i].quat);
        me.basketItems.add(m);
      });
    };
    sync();
    const unsub = subscribe(sync);
    const update = (dt) => {
      const W = world;
      me.root.visible = W.third;
      if (!W.third) return;
      me.root.position.set(W.pos.x, 0, W.pos.z);
      me.root.rotation.y = W.yaw + Math.PI;
      const phase = getPhase();
      me.reach += ((phase === 'picking' || phase === 'returning' ? 1 : W.hover ? 0.25 : 0) - me.reach) * Math.min(1, dt * 6);
      animatePerson(me, dt, W.moveAmt, W.time);
    };
    W_push(update);
    return () => { unsub(); world.onFrame = world.onFrame.filter((f) => f !== update); };
  }, []);
  return <group ref={group} />;
}
function W_push(fn) { world.onFrame.push(fn); }
