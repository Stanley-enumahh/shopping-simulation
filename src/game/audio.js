// Every sound is synthesized with Web Audio (no files), modelled on the real thing:
// shoes on vinyl tile, sleeve rustle, the material of whatever you pick up, a till scanner,
// a receipt printer, store hum, fridges, trolleys, a PA chime and soft in-store music.
let ac = null, master = null, sfxGain = null, musicGain = null, bus = null, musicBus = null, white = null, brown = null;
let fridgeGain = null, muted = false;
const vol = { sfx: 0.8, music: 0.5 };
const listener = { x: 0, z: 0, yaw: 0 };

function makeReverb(seconds, decay) {
  const len = Math.floor(ac.sampleRate * seconds), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = ac.createConvolver(); conv.buffer = ir;
  return conv;
}
function loop(buffer, filterType, freq, gain, dest) {
  const src = ac.createBufferSource(); src.buffer = buffer; src.loop = true;
  const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(dest); src.start();
  return g;
}
function startAmbience() {
  loop(brown, 'lowpass', 380, 0.05, sfxGain); // air conditioning
  for (const [f, v] of [[100, 0.0035], [200, 0.0015], [300, 0.0006]]) { // lighting hum
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(sfxGain); o.start();
  }
  // Fridge compressor: a low drone plus a little hiss, faded in when you are near the fridges.
  fridgeGain = ac.createGain(); fridgeGain.gain.value = 0; fridgeGain.connect(sfxGain);
  const o = ac.createOscillator(), og = ac.createGain();
  o.type = 'sawtooth'; o.frequency.value = 58; og.gain.value = 0.02;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
  o.connect(lp); lp.connect(og); og.connect(fridgeGain); o.start();
  loop(white, 'bandpass', 2600, 0.012, fridgeGain);
}
function init() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 1;
    const comp = ac.createDynamicsCompressor();
    master.connect(comp); comp.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.gain.value = vol.sfx; sfxGain.connect(master);
    musicGain = ac.createGain(); musicGain.gain.value = vol.music * 0.5; musicGain.connect(master);
    bus = ac.createGain();
    const rev = makeReverb(1.3, 3.2), wet = ac.createGain(); wet.gain.value = 0.16;
    bus.connect(sfxGain); bus.connect(rev); rev.connect(wet); wet.connect(sfxGain);
    // Music comes out of small ceiling speakers: thin, band-limited, a bit roomy.
    musicBus = ac.createGain();
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4800;
    const mrev = makeReverb(1.8, 2.6), mwet = ac.createGain(); mwet.gain.value = 0.35;
    musicBus.connect(hp); hp.connect(lp); lp.connect(musicGain); lp.connect(mrev); mrev.connect(mwet); mwet.connect(musicGain);
    const n = ac.sampleRate * 3;
    white = ac.createBuffer(1, n, ac.sampleRate);
    brown = ac.createBuffer(1, n, ac.sampleRate);
    const w = white.getChannelData(0), b = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
    startAmbience();
    startMusic();
  } catch (e) { ac = null; }
}

const r = (a, b) => a + Math.random() * (b - a);
function envelope(g, t, a, v, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function out(node, pan, dest) {
  const to = dest || bus;
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); p.connect(to); }
  else node.connect(to);
}
/** Filtered noise burst. `when` is an absolute AudioContext time (used by the music scheduler). */
function noise({ type = 'lowpass', f = 1000, f2, q = 0.7, a = 0.003, d = 0.08, v = 0.1, at = 0, when, pan = 0, dest }) {
  if (!ac) return;
  const t = when != null ? when : ac.currentTime + at;
  const src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = white; flt.type = type; flt.Q.value = q; flt.frequency.setValueAtTime(f, t);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  envelope(g, t, a, v, d);
  src.connect(flt); flt.connect(g); out(g, pan, dest);
  src.start(t, Math.random() * 2); src.stop(t + a + d + 0.05);
}
/** Decaying sine partials: the ring of metal or glass. */
function ring(freqs, { d = 0.15, v = 0.02, at = 0, pan = 0 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f * r(0.97, 1.03);
    envelope(g, t, 0.001, v / (1 + i * 0.6), d * (1 - i * 0.12));
    o.connect(g); out(g, pan); o.start(t); o.stop(t + d + 0.05);
  });
}
/** A pitched note with a soft envelope. */
function tone(f, { d = 0.1, v = 0.05, a = 0.004, at = 0, when, type = 'sine', pan = 0.15, dest, hold = true, f2 } = {}) {
  if (!ac) return;
  const t = when != null ? when : ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  if (hold) g.gain.setValueAtTime(v, t + Math.max(a, d - 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); out(g, pan, dest); o.start(t); o.stop(t + d + 0.02);
}
/** Gain and pan for a sound at a world position, heard from the player. */
function spatial(x, z) {
  const dx = x - listener.x, dz = z - listener.z, dist = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, -dz) + listener.yaw; // 0 = straight ahead
  return { g: 1 / (1 + dist * 0.45), pan: Math.sin(ang) * Math.min(1, dist / 2) * 0.8 };
}

const MATERIAL = { box: 'card', carton: 'card', bag: 'crinkle', can: 'metal', jar: 'glass', bottle: 'plastic', jug: 'plastic', tub: 'plastic' };
/** The sound of handling an item, by what it is made of. k scales loudness. */
function handle(shape, k = 1, at = 0, pan = 0.2) {
  switch (MATERIAL[shape] || 'card') {
    case 'card':
      noise({ type: 'bandpass', f: r(650, 900), q: 1.3, d: 0.05, v: 0.16 * k, at, pan });
      noise({ type: 'lowpass', f: 260, d: 0.06, v: 0.12 * k, at, pan });
      break;
    case 'crinkle':
      for (let i = 0; i < 9; i++) noise({ type: 'highpass', f: r(2500, 5500), d: r(0.008, 0.025), v: r(0.03, 0.08) * k, at: at + r(0, 0.2), pan: pan + r(-0.1, 0.1) });
      break;
    case 'metal':
      noise({ type: 'highpass', f: 2800, d: 0.012, v: 0.06 * k, at, pan });
      ring([2350, 3800, 5150, 6900], { d: 0.14, v: 0.025 * k, at, pan });
      noise({ type: 'lowpass', f: 300, d: 0.04, v: 0.06 * k, at, pan });
      break;
    case 'glass':
      ring([1750, 4250, 6800], { d: 0.2, v: 0.022 * k, at, pan });
      noise({ type: 'lowpass', f: 420, d: 0.045, v: 0.08 * k, at, pan });
      break;
    default: // plastic
      noise({ type: 'bandpass', f: r(1000, 1400), q: 1.6, d: 0.04, v: 0.12 * k, at, pan });
      noise({ type: 'lowpass', f: 320, d: 0.05, v: 0.07 * k, at, pan });
  }
}

/* ---------- in-store music: an original, gentle highlife-style loop ---------- */
const BPM = 106, STEP = 60 / BPM / 4;
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// An original Afrobeats-style groove: A minor, four bars of Am, F, C, G.
// Tresillo (3-3-2) kick, log-drum bass, swung shakers, rim on 2 and 4, congas and a palm-muted guitar.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const ROOT = [45, 41, 48, 43];
const KICK = [0, 3, 6, 8, 11, 14];
const LOG = [[0, 0], [3, 7], [6, 12], [10, 0], [13, 7]]; // [step, interval above the root]
const CONGA = [[2, 1], [5, 0], [7, 1], [10, 0], [13, 1], [15, 1]]; // [step, high?]
const LICK = [[2, 2], [3, 1], [6, 2], [7, 0], [10, 2], [11, 1], [14, 2], [15, 1]]; // [step, chord tone]
const HOOK = [76, 74, 72, 74, 76, 79, 76, 74]; // a short original lead phrase over bars 3–4
let musicStep = 0, nextTime = 0, musicTimer = 0, musicOn = true;
function scheduleStep(s, t0) {
  const bar = Math.floor(s / 16) % 4, i = s % 16, ch = CHORDS[bar], dest = musicBus, loopN = Math.floor(s / 64);
  const t = t0 + (i % 2 ? STEP * 0.14 : 0); // swing the off-beat 16ths
  if (KICK.includes(i) && (i < 8 || bar % 2 === 0 || i !== 14)) tone(95, { when: t, f2: 40, d: 0.22, v: i % 8 === 0 ? 0.32 : 0.22, pan: 0, dest, hold: false });
  if (i === 4 || i === 12) { noise({ when: t, type: 'bandpass', f: 2100, q: 1.6, d: 0.05, v: 0.06, dest }); tone(420, { when: t, d: 0.04, v: 0.04, dest, hold: false }); }
  noise({ when: t, type: 'highpass', f: 7000, d: i % 4 === 2 ? 0.05 : 0.022, v: i % 2 ? 0.032 : 0.016, dest, pan: 0.25 });
  for (const [st, iv] of LOG) {
    if (st === i) tone(NOTE(ROOT[bar] + iv - 12), { when: t, f2: NOTE(ROOT[bar] + iv - 12) * 0.82, d: 0.26, v: 0.2, type: 'sine', pan: 0, dest, hold: false });
  }
  for (const [st, hi] of CONGA) {
    if (st === i) tone(hi ? 330 : 220, { when: t, f2: hi ? 260 : 170, d: 0.12, v: 0.06, type: 'sine', pan: -0.35, dest, hold: false });
  }
  for (const [st, k] of LICK) {
    if (st !== i) continue;
    const n = ch[k] + 12;
    tone(NOTE(n), { when: t, d: 0.13, v: 0.045, a: 0.002, type: 'triangle', dest, pan: 0.4, hold: false });
    tone(NOTE(n) * 2, { when: t, d: 0.05, v: 0.01, a: 0.001, type: 'square', dest, pan: 0.4, hold: false });
  }
  if (i === 0) for (const n of ch) tone(NOTE(n + 12), { when: t, d: STEP * 15, v: 0.011, a: 0.3, type: 'sine', dest, pan: -0.15 });
  if (loopN % 2 === 1 && bar >= 2 && i % 4 === 0) { // lead phrase every other loop
    const n = HOOK[(bar - 2) * 4 + i / 4];
    tone(NOTE(n), { when: t, d: STEP * 3.2, v: 0.03, a: 0.01, type: 'triangle', dest, pan: 0.1, hold: false });
  }
}
function startMusic() {
  nextTime = ac.currentTime + 0.3;
  clearInterval(musicTimer);
  musicTimer = setInterval(() => {
    if (!ac || !musicOn || custom || vol.music <= 0) { nextTime = ac ? ac.currentTime + 0.1 : 0; return; }
    while (nextTime < ac.currentTime + 0.2) { scheduleStep(musicStep++, nextTime); nextTime += STEP; }
  }, 40);
}

/* ---------- your own music, from a file on your device, played through the store speakers ---------- */
let custom = null; // { el, url, src }
function playCustom(file) {
  init();
  if (!ac) return false;
  stopCustom();
  const url = URL.createObjectURL(file);
  const el = new Audio(url);
  el.loop = true;
  const src = ac.createMediaElementSource(el);
  src.connect(musicBus);
  custom = { el, url, src };
  el.play().catch(() => {});
  return true;
}
function stopCustom() {
  if (!custom) return;
  try { custom.el.pause(); custom.src.disconnect(); URL.revokeObjectURL(custom.url); } catch (e) { /* already stopped */ }
  custom = null;
}

export const sfx = {
  init,
  get muted() { return muted; },
  setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.03); },
  setVolumes(sfxV, musicV) {
    vol.sfx = sfxV; vol.music = musicV;
    if (!ac) return;
    sfxGain.gain.setTargetAtTime(sfxV, ac.currentTime, 0.05);
    musicGain.gain.setTargetAtTime(musicV * 0.5, ac.currentTime, 0.05);
  },
  setListener(x, z, yaw) { listener.x = x; listener.z = z; listener.yaw = yaw; },
  /** 0..1, how close the player is to the fridges. */
  setFridge(level) { if (fridgeGain) fridgeGain.gain.setTargetAtTime(level, ac.currentTime, 0.3); },
  /** Heel strike then a light scuff of the sole, alternating left and right feet. */
  step(n = 0, pace = 1) {
    const side = n % 2 ? 0.12 : -0.12, k = 0.7 + Math.min(1.6, pace) * 0.3;
    noise({ type: 'lowpass', f: r(170, 240), q: 0.9, a: 0.002, d: 0.07, v: 0.22 * k, pan: side });
    noise({ type: 'bandpass', f: r(900, 1300), q: 0.8, a: 0.002, d: 0.03, v: 0.025 * k, pan: side });
    noise({ type: 'bandpass', f: r(2000, 3200), q: 0.7, a: 0.01, d: 0.05, v: 0.012 * k, at: r(0.045, 0.07), pan: side });
  },
  /** Someone else's footstep somewhere in the store. */
  stepAt(x, z) {
    const s = spatial(x, z);
    if (s.g < 0.12) return;
    noise({ type: 'lowpass', f: r(170, 240), d: 0.06, v: 0.12 * s.g, pan: s.pan });
  },
  reach() { noise({ type: 'bandpass', f: 1500, f2: 2600, q: 0.6, a: 0.06, d: 0.18, v: 0.035, pan: 0.25 }); },
  grab(shape) { handle(shape, 1); },
  /** Setting an item down: the item itself plus the dull knock of the shelf. */
  place(shape) {
    handle(shape, 0.75);
    noise({ type: 'lowpass', f: 140, q: 1, d: 0.09, v: 0.16 });
    noise({ type: 'bandpass', f: 520, q: 2.5, d: 0.05, v: 0.03 });
  },
  /** The item landing in the plastic basket. */
  drop(shape) {
    handle(shape, 0.8, 0, -0.25);
    noise({ type: 'bandpass', f: 380, q: 2, d: 0.07, v: 0.08, pan: -0.25 });
    noise({ type: 'lowpass', f: 130, d: 0.1, v: 0.1, pan: -0.25 });
  },
  /** One till beep, optionally from a spot in the store. */
  beep(x, z) {
    const s = x == null ? { g: 1, pan: 0.15 } : spatial(x, z);
    tone(2780, { d: 0.085, v: 0.045 * s.g, pan: s.pan });
  },
  /** An item sliding across the scanner glass, then the beep. */
  scanItem(shape) { handle(shape, 0.5); noise({ type: 'bandpass', f: 700, f2: 1400, d: 0.12, v: 0.03, at: 0.02 }); tone(2780, { d: 0.085, v: 0.05, at: 0.14 }); },
  remove(shape) { noise({ type: 'bandpass', f: 900, f2: 2000, q: 0.6, a: 0.03, d: 0.14, v: 0.035 }); handle(shape, 0.6, 0.12); },
  click() { noise({ type: 'highpass', f: 3500, a: 0.001, d: 0.008, v: 0.05 }); },
  /** Card terminal: three keypad blips and the approval tone. */
  cardApproved() {
    for (let i = 0; i < 4; i++) tone(1320, { d: 0.05, v: 0.03, at: i * 0.18, type: 'square' });
    tone(1760, { d: 0.25, v: 0.04, at: 0.9 });
  },
  /** Phone notification for a received transfer. */
  transferIn() { tone(1046, { d: 0.12, v: 0.05 }); tone(1568, { d: 0.25, v: 0.05, at: 0.12 }); },
  /** Receipt printer chattering, then the paper torn off. */
  printer() {
    for (let i = 0; i < 22; i++) noise({ type: 'bandpass', f: r(2200, 2800), q: 3, a: 0.002, d: 0.018, v: 0.035, at: i * 0.032 });
    noise({ type: 'highpass', f: 1800, f2: 4000, a: 0.01, d: 0.12, v: 0.05, at: 0.8 });
  },
  /** Plastic bags rustling as the cashier packs. */
  bagging() { for (let i = 0; i < 12; i++) noise({ type: 'highpass', f: r(3000, 7000), d: r(0.01, 0.04), v: r(0.02, 0.05), at: r(0, 0.6), pan: r(0, 0.4) }); },
  /** The two-note PA chime before an announcement. */
  chime() {
    if (!ac) return;
    for (const [f, at] of [[659.3, 0], [523.3, 0.55]]) {
      tone(f, { d: 0.9, v: 0.07, a: 0.01, at, pan: 0, hold: false });
      tone(f * 2, { d: 0.5, v: 0.012, a: 0.01, at, pan: 0, hold: false });
    }
  },
  /** A shopping trolley rolling past somewhere, wheels rattling over tile joints. */
  trolley(x, z) {
    if (!ac) return;
    const s = spatial(x, z), dur = r(2, 3.5);
    for (let t = 0; t < dur; t += r(0.05, 0.11)) {
      const fade = Math.sin((t / dur) * Math.PI);
      noise({ type: 'bandpass', f: r(1200, 2600), q: 2, d: 0.02, v: 0.03 * s.g * fade, at: t, pan: s.pan });
      if (Math.random() < 0.25) ring([3200, 4700], { d: 0.05, v: 0.004 * s.g * fade, at: t, pan: s.pan });
    }
    noise({ type: 'lowpass', f: 160, d: dur, a: 0.4, v: 0.05 * s.g, pan: s.pan });
  },
  setMusic(on) { musicOn = on; },
  playCustom,
  stopCustom,
  /** Fridge door: the seal unsticking as it opens, a soft thud as it closes. */
  fridgeDoor(open) {
    if (open) { noise({ type: 'bandpass', f: 500, f2: 260, q: 1.4, d: 0.12, v: 0.05 }); noise({ type: 'highpass', f: 5000, d: 0.3, a: 0.05, v: 0.01 }); }
    else { noise({ type: 'lowpass', f: 180, d: 0.08, v: 0.12 }); noise({ type: 'bandpass', f: 900, q: 2, d: 0.03, v: 0.03 }); }
  },
};
