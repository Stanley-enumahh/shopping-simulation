import { useSyncExternalStore } from 'react';

const SETTINGS_KEY = 'ekofresh.settings.v1';
export const DEFAULT_SETTINGS = {
  sensitivity: 1, // mouse / touch look multiplier
  fov: 70,
  sfx: 0.8,
  music: 0.5,
  voices: true, // spoken announcements and greetings
  view: 'first', // 'first' | 'third'
};
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch (e) { return { ...DEFAULT_SETTINGS }; }
}

// A tiny external store: the game loop writes to it, React components read from it.
let state = {
  phase: 'loading', // loading | intro | walk | picking | inspect | returning | checkout
  cart: [], // [{ ti, idx, mesh, twist }] product index + the shelf slot it came from
  inspecting: null, // product id being held
  hover: null, // product id under the cursor
  locked: false,
  lockRefused: false,
  touchUI: false,
  cartOpen: false,
  settingsOpen: false,
  receipt: null,
  toast: null,
  aisle: 'Front of store',
  muted: false,
  cartBump: 0,
  subtitle: null, // { who, text, id }
  prompt: null, // short interaction hint, e.g. 'Press E to pay at the till'
  till: null, // checkout progress shown on screen, see game/checkout.js
  dragHint: false,
  flyer: null, // { url, blob, text, link } the shareable picture shown after paying
  settings: loadSettings(),
};
const listeners = new Set();

export const getState = () => state;
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  let changed = false;
  for (const k in next) if (state[k] !== next[k]) { changed = true; break; }
  if (!changed) return;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
export function setSettings(patch) {
  const settings = { ...state.settings, ...patch };
  setState({ settings });
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* storage is optional */ }
}
export const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const useStore = (sel) => useSyncExternalStore(subscribe, () => sel(state));
