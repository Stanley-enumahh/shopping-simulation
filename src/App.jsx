import { Component, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Game from './scene/Game';
import Hud from './ui/Hud';

const FONTS = ['600 20px Fredoka', '700 20px Fredoka', '20px "Bebas Neue"', '600 20px Figtree', '500 20px "DM Mono"'];

class WebGLGuard extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="modal"><div className="introcard">
        <h1>Eko Mart</h1>
        <p>This browser could not start 3D graphics. Try a recent Chrome, Edge, Safari or Firefox.</p>
      </div></div>
    );
  }
}

export default function App() {
  // Labels are drawn onto canvases, so wait for the fonts first (but never more than 2.5 s).
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    const load = document.fonts ? Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => null))) : Promise.resolve();
    Promise.race([load, new Promise((r) => setTimeout(r, 2500))]).then(() => setFontsReady(true));
  }, []);
  return (
    <WebGLGuard>
      {fontsReady && (
        <Canvas
          className="stage"
          flat
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 70, near: 0.03, far: 60, position: [-2, 1.62, 9.4] }}
          tabIndex={0}
          aria-label="A 3D supermarket you can walk around"
        >
          <Game />
        </Canvas>
      )}
      <Hud />
    </WebGLGuard>
  );
}
