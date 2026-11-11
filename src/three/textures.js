import * as THREE from 'three';
import { fmt } from '../data/products';

let maxAniso = 8;
export const setMaxAnisotropy = (n) => { maxAniso = Math.min(8, n || 1); };

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
export const inkOn = (hex) => (lum(hex) > 0.58 ? '#1e2522' : '#ffffff');
export function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Shrinks text until it fits in maxW x maxH, wrapping onto at most maxLines. */
export function fitLines(g, text, maxW, maxH, fontFn, maxLines, lh) {
  const words = text.split(' ');
  for (let s = maxH; s > 5; s *= 0.93) {
    g.font = fontFn(s);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width <= maxW || !cur) cur = t;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines && lines.length * s * lh <= maxH * 1.02 && lines.every((l) => g.measureText(l).width <= maxW)) {
      return { s, lines, font: g.font };
    }
  }
  g.font = fontFn(6);
  return { s: 6, lines: [text], font: g.font };
}

function motif(g, p, W, H, wrap) {
  const rnd = rng(p.id * 977 + 13);
  g.save(); g.globalAlpha = 0.24; g.fillStyle = p.c2; g.strokeStyle = p.c2;
  const xs = wrap ? [W / 2, 0, W] : [W / 2];
  if (p.m === 0) {
    const r = Math.min(wrap ? W * 0.17 : W, H) * 0.42;
    for (const x of xs) {
      g.beginPath(); g.arc(x, H * 0.46, r, 0, Math.PI * 2); g.fill();
      g.lineWidth = H * 0.018; g.beginPath(); g.arc(x, H * 0.46, r * 1.18, 0, Math.PI * 2); g.stroke();
    }
  } else if (p.m === 1) {
    g.lineWidth = H * 0.05;
    for (let x = -H; x < W + H; x += H * 0.16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * 0.3, H * 0.3); g.stroke(); }
  } else if (p.m === 2) {
    g.lineWidth = H * 0.032;
    for (let k = 0; k < 3; k++) {
      const y0 = H * (0.64 + k * 0.05);
      g.beginPath();
      for (let x = 0; x <= W; x += 4) g.lineTo(x, y0 + Math.sin(x / (H * 0.09) + k) * H * 0.018);
      g.stroke();
    }
  } else if (p.m === 3) {
    const st = H * 0.085, r = H * 0.016;
    for (let y = st / 2, row = 0; y < H * 0.8; y += st, row++) {
      for (let x = (row % 2) * st / 2; x < W + st; x += st) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    }
  } else {
    const n = wrap ? 16 : 8;
    for (let i = 0; i < n; i++) {
      g.save(); g.translate(rnd() * W, rnd() * H * 0.78); g.rotate(rnd() * Math.PI);
      g.beginPath(); g.ellipse(0, 0, H * 0.09, H * 0.036, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  g.restore();
}
function barcode(g, p, x, y, w, h) {
  const rnd = rng(p.id * 31 + 7);
  g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1e2522';
  let cx = x + w * 0.08;
  const end = x + w * 0.92;
  while (cx < end) {
    const bw = Math.max(1, w * (0.012 + rnd() * 0.03));
    if (rnd() > 0.35) g.fillRect(cx, y + h * 0.1, Math.min(bw, end - cx), h * 0.8);
    cx += bw + w * 0.012;
  }
}
function drawLabel(p, W, H, wrap) {
  const c = mkCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = p.c1; g.fillRect(0, 0, W, H);
  motif(g, p, W, H, wrap);
  const cw = wrap ? Math.min(W * 0.34, H * 1.25) : W, cx = W / 2, ink = inkOn(p.c1), bandH = H * 0.2;
  g.fillStyle = p.c2; g.fillRect(0, H - bandH, W, bandH);
  g.fillStyle = ink === '#ffffff' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.16)';
  g.fillRect(0, H - bandH - H * 0.014, W, H * 0.014);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
  let fit = fitLines(g, p.brand.toUpperCase(), cw * 0.8, H * 0.075, (s) => `600 ${s}px Fredoka, Figtree, sans-serif`, 1, 1);
  g.font = fit.font; g.fillText(fit.lines[0], cx, H * 0.12);
  const big = p.f === 'b' ? (s) => `${s}px "Bebas Neue", Impact, sans-serif` : (s) => `700 ${s}px Fredoka, Figtree, sans-serif`;
  fit = fitLines(g, p.line, cw * 0.86, H * 0.42, big, 3, 0.98);
  g.font = fit.font;
  const lh = fit.s * 0.98, y0 = H * 0.46 - ((fit.lines.length - 1) * lh) / 2;
  fit.lines.forEach((l, i) => g.fillText(l, cx, y0 + i * lh + (p.f === 'b' ? fit.s * 0.06 : 0)));
  g.fillStyle = inkOn(p.c2); g.font = `600 ${Math.round(bandH * 0.46)}px Figtree, sans-serif`;
  if (wrap) {
    g.fillText(p.size, cx, H - bandH / 2);
    barcode(g, p, W * 0.04, H * 0.32, Math.min(W * 0.09, H * 0.6), H * 0.34);
  } else {
    g.textAlign = 'left'; g.fillText(p.size, W * 0.06, H - bandH / 2);
    const bw = Math.min(W * 0.24, bandH * 1.7);
    barcode(g, p, W - bw - W * 0.05, H - bandH * 0.88, bw, bandH * 0.76);
  }
  return c;
}

/** Product label, drawn at shelf resolution ('lo') or close-up resolution ('hi', made on first pick). */
export function labelTexture(p, aspect, wrap, res) {
  p._tex = p._tex || {};
  if (p._tex[res]) return p._tex[res];
  const S = res === 'hi' ? 1024 : 320;
  let W, H;
  if (wrap) { W = S * 2; H = Math.round(Math.max(64, Math.min(W, W / aspect))); }
  else if (aspect >= 1) { W = S; H = Math.max(32, Math.round(S / aspect)); }
  else { H = S; W = Math.max(32, Math.round(S * aspect)); }
  return (p._tex[res] = toTexture(drawLabel(p, W, H, wrap)));
}

export function tagTexture(p) {
  const c = mkCanvas(256, 96), g = c.getContext('2d');
  g.fillStyle = '#ffd94a'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = p.c1; g.fillRect(0, 0, 9, 96);
  g.fillStyle = '#1c2621'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const fit = fitLines(g, p.line, 116, 19, (s) => `600 ${s}px Figtree, sans-serif`, 2, 1.1);
  g.font = fit.font; fit.lines.forEach((l, i) => g.fillText(l, 20, 28 + i * fit.s * 1.12));
  g.font = '500 13px "DM Mono", monospace'; g.fillText(p.unit, 20, 84);
  g.textAlign = 'right';
  let ps = 40;
  do { g.font = `600 ${ps}px Fredoka, sans-serif`; ps -= 2; } while (g.measureText(fmt(p.price)).width > 112 && ps > 18);
  g.fillText(fmt(p.price), 244, 60);
  g.font = '500 12px "DM Mono", monospace'; g.fillText(p.size, 244, 84);
  return toTexture(c);
}

/** A canvas-drawn texture sized for a plane of w x h metres. */
export function drawnTexture(w, h, px, draw) {
  const c = mkCanvas(px, Math.round((px * h) / w));
  draw(c.getContext('2d'), c.width, c.height);
  return toTexture(c);
}

export function floorTexture() {
  const c = mkCanvas(256, 256), g = c.getContext('2d'), rnd = rng(5);
  const tones = ['#eef0ec', '#ebeee9', '#f1f3ef', '#eceeea'];
  for (let i = 0; i < 4; i++) { g.fillStyle = tones[i]; g.fillRect((i % 2) * 128, Math.floor(i / 2) * 128, 128, 128); }
  g.globalAlpha = 0.05; g.fillStyle = '#5a6b62';
  for (let i = 0; i < 500; i++) g.fillRect(rnd() * 256, rnd() * 256, 1.4, 1.4);
  g.globalAlpha = 1; g.fillStyle = '#d9ded8';
  g.fillRect(0, 0, 256, 2); g.fillRect(0, 128, 256, 2); g.fillRect(0, 0, 2, 256); g.fillRect(128, 0, 2, 256);
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(16 / 1.2, 22 / 1.2);
  return t;
}

export function softShadowTexture() {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 22; g.shadowOffsetX = 1000; g.fillStyle = '#000';
  g.fillRect(-1000 + 30, 30, 68, 68);
  return new THREE.CanvasTexture(c);
}
