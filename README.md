# Eko Mart

A first-person 3D Nigerian supermarket you can walk around. Pick products off the shelf, turn them over in your hand, and fill your basket. Prices are in Naira.

Built with React 18, React Three Fiber and Three.js, bundled by Vite.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build and host

```bash
npm run build
```

Upload the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3). Asset paths are relative, so it also works from a sub-folder. On Vercel or Netlify you can instead connect the repo with build command `npm run build` and output folder `dist`.

## Where things live

| Path | What it does |
| --- | --- |
| `src/data/products.js` | The 48 products, store layout constants, prices |
| `src/game/world.js` | Movement, collisions, picking, the pick / put back / toss timelines, input |
| `src/game/audio.js` | Synthesized sound effects (Web Audio, no files) |
| `src/scene/Game.jsx` | Canvas setup and the two-pass render (store, then hand + held item on top) |
| `src/scene/HandModel.jsx` | Shared hand, forearm and sleeve model, finger grips |
| `src/scene/Hand.jsx` | Right hand: hangs by your side, rises when something is in reach, reaches, carries |
| `src/scene/BasketArm.jsx`, `src/game/basket.js` | Left hand carrying the shopping basket, how items are packed into it |
| `src/scene/Room.jsx`, `Shelves.jsx` | Store building, gondolas, signs and instanced product shelves |
| `src/three/` | Canvas-drawn labels and textures, product geometry |
| `src/ui/Hud.jsx` | React UI: top bar, cart, product card, joystick, intro, receipt |

Add `?plmdebug` to the URL to expose `window.__plm` for scripted testing.
