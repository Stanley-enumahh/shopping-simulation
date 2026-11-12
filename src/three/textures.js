import * as THREE from 'three';
import { fmt } from '../data/products';
import { drawArt, drawPieces } from './packArt';

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
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lum(hex) { const [r, g, b] = rgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
/** Mix a colour toward white (k > 0) or black (k < 0). */
export function tint(hex, k) {
  const t = k > 0 ? 255 : 0, a = Math.abs(k);
  return 'rgb(' + rgb(hex).map((v) => Math.round(v + (t - v) * a)).join(',') + ')';
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
  r = Math.max(0, Math.min(r, w / 2, h / 2));
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
/** Word-wraps a paragraph at a fixed size; returns the y after the last line. */
function paragraph(g, text, x, y, maxW, size, lh = 1.3, maxY = Infinity) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) {
      if (y + size > maxY) return y;
      g.fillText(line, x, y); y += size * lh; line = w;
    } else line = t;
  }
  if (line && y + size <= maxY) { g.fillText(line, x, y); y += size * lh; }
  return y;
}

function barcode(g, p, x, y, w, h, digits = false) {
  const rnd = rng(p.id * 31 + 7);
  g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1e2522';
  let cx = x + w * 0.08;
  const end = x + w * 0.92, bh = digits ? h * 0.7 : h * 0.8;
  while (cx < end) {
    const bw = Math.max(1, w * (0.012 + rnd() * 0.03));
    if (rnd() > 0.35) g.fillRect(cx, y + h * 0.08, Math.min(bw, end - cx), bh);
    cx += bw + w * 0.012;
  }
  if (digits) {
    g.font = `500 ${h * 0.16}px "DM Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText('6 154000 ' + String(10000 + p.id * 137).slice(-5) + ' ' + (p.id % 10), x + w / 2, y + h * 0.97);
  }
}
/** Little green-white-green flag + "Made in Nigeria". */
function madeInNigeria(g, x, y, size, color) {
  const fw = size * 1.5, fh = size;
  g.fillStyle = '#008751'; g.fillRect(x, y - fh, fw / 3, fh); g.fillRect(x + (fw * 2) / 3, y - fh, fw / 3, fh);
  g.fillStyle = '#ffffff'; g.fillRect(x + fw / 3, y - fh, fw / 3, fh);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.strokeRect(x, y - fh, fw, fh);
  g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `600 ${size}px Figtree, sans-serif`; g.fillText('Made in Nigeria', x + fw + size * 0.4, y - size * 0.1);
}
function burst(g, x, y, r, n, inner) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}
/** Starburst badge, e.g. "New improved taste". */
function badge(g, text, x, y, r) {
  g.save(); g.translate(x, y); g.rotate(-0.22);
  burst(g, 0, 0, r, 14, 0.82);
  g.fillStyle = '#ffd600'; g.fill(); g.lineWidth = r * 0.06; g.strokeStyle = '#d50000'; g.stroke();
  g.fillStyle = '#c62828'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const f = fitLines(g, text.toUpperCase(), r * 1.35, r * 0.95, (s) => `700 ${s}px Fredoka, sans-serif`, 3, 1.05);
  g.font = f.font;
  f.lines.forEach((l, i) => g.fillText(l, 0, (i - (f.lines.length - 1) / 2) * f.s * 1.05));
  g.restore();
}
/** Big outlined product name, the way Nigerian packs shout it. */
function bigName(g, p, x, y, w, h, align = 'center') {
  const ink = inkOn(p.c1);
  const f = fitLines(g, p.line, w, h, (s) => `700 ${s}px Fredoka, Figtree, sans-serif`, 3, 1.0);
  g.font = f.font; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const lh = f.s * 1.0, y0 = y + h / 2 - ((f.lines.length - 1) * lh) / 2, tx = align === 'center' ? x + w / 2 : x;
  f.lines.forEach((l, i) => {
    const ly = y0 + i * lh;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillText(l, tx + f.s * 0.05, ly + f.s * 0.07);
    g.lineWidth = f.s * 0.16; g.strokeStyle = ink === '#ffffff' ? 'rgba(0,0,0,.55)' : '#ffffff'; g.strokeText(l, tx, ly);
    g.fillStyle = ink; g.fillText(l, tx, ly);
  });
}
function ribbon(g, p, x, y, w, h) {
  g.font = `700 ${h * 0.62}px Fredoka, sans-serif`;
  const f = fitLines(g, p.brand.toUpperCase(), w - h, h * 0.62, (s) => `700 ${s}px Fredoka, sans-serif`, 1, 1);
  g.font = f.font;
  const tw = Math.min(w, g.measureText(f.lines[0]).width + h * 1.2), rx = x + (w - tw) / 2;
  roundRect(g, rx, y, tw, h, h / 2); g.fillStyle = p.c2; g.fill();
  g.lineWidth = Math.max(2, h * 0.08); g.strokeStyle = '#ffffff'; g.stroke();
  g.fillStyle = inkOn(p.c2); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(f.lines[0], x + w / 2, y + h * 0.54);
}
function window_(g, p, cx, cy, w, h) {
  g.save();
  roundRect(g, cx - w / 2, cy - h / 2, w, h, Math.min(w, h) * 0.22);
  g.fillStyle = 'rgba(255,255,255,.82)'; g.fill(); g.save(); g.clip();
  drawPieces(g, p.window, cx - w / 2, cy - h / 2, w, h, rng(p.id * 13 + 1));
  const sheen = g.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  sheen.addColorStop(0.2, 'rgba(255,255,255,0)'); sheen.addColorStop(0.35, 'rgba(255,255,255,.45)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = sheen; g.fillRect(cx - w / 2, cy - h / 2, w, h);
  g.restore();
  g.lineWidth = Math.max(2, Math.min(w, h) * 0.04); g.strokeStyle = '#ffffff'; g.stroke();
  g.restore();
}
function rays(g, p, cx, cy, r, box) {
  g.save(); g.beginPath(); g.rect(box[0], box[1], box[2], box[3]); g.clip();
  g.fillStyle = 'rgba(255,255,255,.13)';
  for (let i = 0; i < 18; i += 2) {
    const a0 = (i / 18) * Math.PI * 2, a1 = ((i + 1) / 18) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath(); g.fill();
  }
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
  glow.addColorStop(0, 'rgba(255,255,255,.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(box[0], box[1], box[2], box[3]);
  g.restore();
}
function sackBase(g, p, W, H) {
  if (p.window) {
    g.fillStyle = p.window === 'beans' ? '#c99a6b' : p.c1 === '#ffe082' ? '#f7e3a1' : '#f4edd7'; g.fillRect(0, 0, W, H);
    drawPieces(g, p.window, 0, 0, W, H, rng(p.id + 99));
    const sheen = g.createLinearGradient(0, 0, W, 0);
    sheen.addColorStop(0.15, 'rgba(255,255,255,.0)'); sheen.addColorStop(0.3, 'rgba(255,255,255,.35)'); sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.fillStyle = sheen; g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = '#f3efe6'; g.fillRect(0, 0, W, H);
    const step = Math.max(3, W / 90);
    g.lineWidth = step * 0.45;
    for (let x = 0; x < W; x += step) { g.strokeStyle = (x / step) % 2 ? 'rgba(160,150,130,.18)' : 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += step) { g.strokeStyle = (y / step) % 2 ? 'rgba(160,150,130,.14)' : 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = p.c2; g.fillRect(0, H * 0.04, W, H * 0.02); g.fillRect(0, H * 0.94, W, H * 0.02);
  }
  g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, 0, W, H * 0.07); // folded top
  g.strokeStyle = '#5d4037'; g.lineWidth = Math.max(1.5, H * 0.005); g.setLineDash([H * 0.015, H * 0.012]);
  g.beginPath(); g.moveTo(0, H * 0.035); g.lineTo(W, H * 0.035); g.stroke(); g.setLineDash([]);
}

/**
 * Front label. kind: 'face' (flat front), 'pillow' (crimped foil pack), 'sack', 'wrap' (all the way round a tin)
 * or 'band' (a band round a bottle). Wraps put the front in the middle and an info panel round the back.
 */
function drawFront(p, W, H, kind) {
  const c = mkCanvas(W, H), g = c.getContext('2d');
  const wrap = kind === 'wrap' || kind === 'band';
  let bx = 0, by = 0, bw = W, bh = H;
  if (wrap) { bw = Math.min(W * 0.36, H * 1.35); bx = (W - bw) / 2; }
  if (kind === 'pillow') { by = H * 0.075; bh = H * 0.85; }
  if (kind === 'sack') {
    sackBase(g, p, W, H);
    bx = W * 0.09; by = H * 0.12; bw = W * 0.82; bh = p.window ? H * 0.52 : H * 0.72;
    roundRect(g, bx, by, bw, bh, bw * 0.06); g.fillStyle = p.c1; g.fill();
    g.lineWidth = Math.max(2, bw * 0.015); g.strokeStyle = '#ffffff'; g.stroke();
  } else { g.fillStyle = p.c1; g.fillRect(0, 0, W, H); }
  const land = bw / bh > 1.45;
  const unit = Math.min(bw, bh);

  if (land) {
    const s = bh * 0.7, ax = bx + bh * 0.46, ay = by + bh * 0.5;
    rays(g, p, ax, ay, bw, [bx, by, bw, bh]);
    if (p.window) window_(g, p, ax, ay, s * 1.1, s * 0.75); else drawArt(g, p.art, ax, ay, s, p);
    const tx = bx + bh * 0.9, tw = bw - bh * 0.95;
    ribbon(g, p, tx, by + bh * 0.07, tw, bh * 0.17);
    bigName(g, p, tx, by + bh * 0.27, tw, bh * 0.42);
    const band = bh * 0.2;
    g.fillStyle = p.c2; g.fillRect(bx, by + bh - band, bw, band);
    g.fillStyle = inkOn(p.c2); g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `700 ${band * 0.55}px Figtree, sans-serif`; g.fillText(p.size, bx + bw * 0.03, by + bh - band / 2);
    g.textAlign = 'right'; g.font = `500 ${band * 0.32}px Figtree, sans-serif`; g.fillText('NAFDAC Reg. No. ' + p.nafdac, bx + bw * 0.97, by + bh - band / 2);
    if (p.badge) badge(g, p.badge, bx + bw - bh * 0.25, by + bh * 0.3, bh * 0.22);
  } else {
    const s = Math.min(bw * 0.66, bh * 0.34), ax = bx + bw / 2, ay = by + bh * 0.65;
    rays(g, p, ax, ay, Math.max(bw, bh), [bx, by, bw, bh]);
    ribbon(g, p, bx + bw * 0.1, by + bh * 0.045, bw * 0.8, bh * 0.1);
    bigName(g, p, bx + bw * 0.06, by + bh * 0.17, bw * 0.88, bh * 0.28);
    if (p.window) window_(g, p, ax, ay, bw * 0.7, bh * 0.26); else drawArt(g, p.art, ax, ay, s, p);
    const band = bh * 0.15, yb = by + bh - band;
    g.fillStyle = p.c2; g.fillRect(bx, yb, bw, band);
    g.fillStyle = inkOn(p.c2); g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `700 ${band * 0.5}px Figtree, sans-serif`; g.fillText(p.size, bx + bw * 0.05, yb + band * 0.42);
    g.textAlign = 'right'; g.font = `500 ${band * 0.22}px Figtree, sans-serif`; g.fillText('NAFDAC Reg. No. ' + p.nafdac, bx + bw * 0.95, yb + band * 0.3);
    madeInNigeria(g, bx + bw * 0.95 - band * 1.85, yb + band * 0.82, band * 0.22, inkOn(p.c2));
    if (p.badge) badge(g, p.badge, bx + bw * 0.8, by + bh * 0.27, unit * 0.15);
  }

  if (kind === 'pillow') {
    // crimped seams top and bottom
    for (const y0 of [0, H - H * 0.075]) {
      g.fillStyle = tint(p.c1, -0.18); g.fillRect(0, y0, W, H * 0.075);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = Math.max(1, W * 0.004);
      for (let x = 0; x < W; x += W * 0.025) { g.beginPath(); g.moveTo(x, y0 + H * 0.01); g.lineTo(x, y0 + H * 0.065); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `600 ${H * 0.03}px Figtree, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText('TEAR HERE ›', W * 0.96, H * 0.0375);
  }
  if (kind === 'sack') {
    const r = Math.min(W, H) * 0.12;
    circle(g, W * 0.8, H * 0.86, r, '#c62828'); g.lineWidth = r * 0.08; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const f = fitLines(g, p.size.toUpperCase(), r * 1.6, r * 0.8, (s) => `700 ${s}px Fredoka, sans-serif`, 1, 1);
    g.font = f.font; g.fillText(f.lines[0], W * 0.8, H * 0.865);
    if (!p.window) { g.fillStyle = '#5d4037'; g.font = `600 ${H * 0.028}px Figtree, sans-serif`; g.textAlign = 'left'; g.fillText('NAFDAC Reg. No. ' + p.nafdac, W * 0.06, H * 0.9); }
  }
  if (p.finish === 'foil' || p.finish === 'gloss') {
    const sheen = g.createLinearGradient(0, 0, W, H * 0.4);
    sheen.addColorStop(0.18, 'rgba(255,255,255,0)'); sheen.addColorStop(0.3, `rgba(255,255,255,${p.finish === 'foil' ? 0.28 : 0.16})`); sheen.addColorStop(0.42, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.75, 'rgba(255,255,255,0)'); sheen.addColorStop(0.82, 'rgba(255,255,255,.12)'); sheen.addColorStop(0.9, 'rgba(255,255,255,0)');
    g.fillStyle = sheen; g.fillRect(0, 0, W, H);
  }
  if (wrap) {
    // round the back: barcode on one side, an info panel on the other
    const bwd = Math.min(W * 0.1, H * 0.7);
    barcode(g, p, W * 0.035, H * 0.28, bwd, H * 0.44);
    const px = W * 0.68, pw = W * 0.28, py = H * 0.12, ph = H * 0.76;
    roundRect(g, px, py, pw, ph, ph * 0.08); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill();
    g.fillStyle = '#1e2522'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const fs = Math.max(6, Math.min(ph * 0.09, pw * 0.05));
    g.font = `700 ${fs}px Figtree, sans-serif`; g.fillText('INGREDIENTS', px + pw * 0.05, py + fs * 1.4);
    g.font = `500 ${fs * 0.8}px Figtree, sans-serif`;
    const yEnd = paragraph(g, ingredients(p), px + pw * 0.05, py + fs * 2.6, pw * 0.9, fs * 0.8, 1.25, py + ph * 0.72);
    g.font = `500 ${fs * 0.75}px "DM Mono", monospace`;
    g.fillText('NAFDAC Reg. No. ' + p.nafdac, px + pw * 0.05, Math.max(yEnd + fs, py + ph * 0.82));
    g.fillText(bestBefore(p), px + pw * 0.05, Math.max(yEnd + fs * 1.9, py + ph * 0.93));
  }
  return c;
}
function circle(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }

/* ---------- back-of-pack text ---------- */
const HOME = /detergent|insect|soap|pads|toothpaste|menthol|condom/i;
export function ingredients(p) {
  const l = p.line.toLowerCase();
  const table = [
    [/noodle/, 'Wheat flour, palm olein, salt, potassium carbonate. Seasoning: salt, sugar, chicken flavour, onion, chilli, flavour enhancer, vitamin A.'],
    [/plantain chips/, 'Unripe plantain (80%), vegetable oil, salt.'], [/chin chin/, 'Wheat flour, sugar, margarine, milk powder, eggs, nutmeg, vegetable oil.'],
    [/kuli/, 'Groundnut paste, ginger, chilli pepper, salt.'], [/roasted groundnut/, 'Groundnuts, salt.'], [/coconut/, 'Coconut, sugar, caramel.'],
    [/tiger/, 'Tiger nuts.'], [/biscuit|cracker/, 'Wheat flour, vegetable fat, sugar, salt, raising agents.'], [/milk powder/, 'Full cream milk powder, vitamins A and D.'],
    [/evaporated/, 'Milk, stabiliser, vitamins A and D.'], [/flakes/, 'Cereal grains, sugar, salt, malt extract, vitamins (A, B1, B2, niacin), iron.'],
    [/custard/, 'Corn starch, salt, vanilla flavour, colour (annatto).'], [/chocolate/, 'Malt extract, sugar, cocoa powder, milk solids, vitamins and minerals.'],
    [/tea/, 'Black tea.'], [/sugar/, 'Refined cane sugar.'], [/rice/, 'Parboiled long grain rice.'], [/yellow garri/, 'Fermented cassava granules, palm oil.'],
    [/garri/, 'Fermented cassava granules.'], [/beans/, 'Brown honey beans (oloyin).'], [/poundo/, 'Dried yam flour.'], [/semolina/, 'Wheat semolina.'],
    [/egusi/, 'Ground melon seeds.'], [/spaghetti|macaroni/, 'Durum wheat semolina, water.'], [/sachet water|table water|chilled water/, 'Treated drinking water.'],
    [/pineapple ginger/, 'Pineapple juice, ginger extract, water.'], [/pineapple/, 'Pineapple juice (100%).'],
    [/orange|cola|lemon/, 'Carbonated water, sugar, fruit juice concentrate, citric acid, flavouring, colour.'],
    [/zobo/, 'Water, hibiscus leaves, ginger, cloves, pineapple, sugar.'], [/kunu/, 'Water, tiger nuts, dates, ginger.'],
    [/malt/, 'Water, barley malt, maize, hops, sugar, caramel.'], [/chapman/, 'Carbonated water, sugar, fruit juices, grenadine, bitters.'],
    [/energy/, 'Carbonated water, sugar, taurine, caffeine, B vitamins.'], [/yoghurt/, 'Milk, sugar, strawberry, live cultures.'],
    [/fura/, 'Millet, cultured milk, spices.'], [/palm oil/, '100% red palm oil.'], [/groundnut oil/, 'Refined groundnut oil.'],
    [/tomato/, 'Tomato concentrate, salt.'], [/corned/, 'Beef, salt, sugar, preservative.'],
    [/seasoning/, 'Salt, flavour enhancer, starch, sugar, chicken fat, onion, spices.'], [/suya/, 'Groundnut powder, ginger, chilli, salt, spices.'],
    [/detergent/, 'Surfactants, soda ash, enzymes, perfume.'], [/insect/, 'Insecticide (pyrethroids), solvent, propellant.'],
    [/soap/, 'Soap base, shea butter, glycerine, perfume.'], [/pads/, 'Cotton-soft cover, absorbent core, adhesive.'],
    [/toothpaste/, 'Calcium carbonate, water, sorbitol, sodium fluoride, mint flavour.'], [/menthol/, 'Petroleum jelly, menthol, camphor, eucalyptus oil.'],
    [/condom/, 'Natural rubber latex, silicone lubricant.'],
  ];
  const hit = table.find(([re]) => re.test(l));
  return hit ? hit[1] : 'See pack for details.';
}
function directions(p) {
  const l = p.line.toLowerCase();
  if (/detergent/.test(l)) return ['Dissolve one cup in 5 litres of water. Soak, wash and rinse.', 'Keep out of reach of children. Avoid contact with eyes.'];
  if (/insect/.test(l)) return ['Close doors and windows. Spray for 10 seconds, leave the room for 15 minutes, then air it out.', 'Flammable. Do not spray near food or open flames.'];
  if (/soap/.test(l)) return ['Lather on wet skin and rinse.', 'For external use only.'];
  if (/pads/.test(l)) return ['Remove the backing, place in underwear and change every 4 to 6 hours.', 'Wrap and dispose of in a bin. Do not flush.'];
  if (/toothpaste/.test(l)) return ['Brush twice a day for two minutes.', 'Children under 6: pea-sized amount, with an adult watching.'];
  if (/menthol/.test(l)) return ['Rub a small amount on the forehead, chest or aching muscles.', 'For external use only. Keep away from eyes.'];
  if (/condom/.test(l)) return ['Open the wrapper carefully. Use a new condom every time.', 'Check the expiry date. Use only water- or silicone-based lubricants.'];
  return null;
}
function bestBefore(p) {
  const d = new Date(2027, (p.id * 5) % 12, 1);
  return 'BB: ' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() + '   Batch L' + (2300 + p.id * 17);
}
const ADDRESSES = ['Plot 12, Oba Akran Avenue, Ikeja, Lagos', 'Km 7, Kano–Zaria Road, Kano', 'Trans-Amadi Industrial Layout, Port Harcourt',
  'Plot 5, Ogba Industrial Estate, Lagos', 'Agbara Industrial Estate, Ogun State', 'Plot 3, Industrial Layout, Enugu'];

/** Back of pack: ingredients or directions, nutrition table, barcode, batch and maker's address. */
function drawBack(p, W, H) {
  const c = mkCanvas(W, H), g = c.getContext('2d');
  const u = Math.min(W, H), pad = u * 0.06;
  g.fillStyle = tint(p.c1, 0.86); g.fillRect(0, 0, W, H);
  const head = Math.max(H * 0.1, u * 0.14);
  g.fillStyle = p.c1; g.fillRect(0, 0, W, head);
  g.fillStyle = inkOn(p.c1); g.textAlign = 'left'; g.textBaseline = 'middle';
  const hf = fitLines(g, p.brand + ' · ' + p.line, W - pad * 2, head * 0.5, (s) => `700 ${s}px Fredoka, sans-serif`, 1, 1);
  g.font = hf.font; g.fillText(hf.lines[0], pad, head / 2);

  g.fillStyle = '#1e2522'; g.textBaseline = 'alphabetic';
  const fs = Math.max(7, u * 0.045), x = pad, w = W - pad * 2;
  let y = head + fs * 1.8;
  const dir = directions(p), home = HOME.test(p.line);
  g.font = `700 ${fs}px Figtree, sans-serif`; g.fillText(home ? 'COMPOSITION' : 'INGREDIENTS', x, y); y += fs * 1.3;
  g.font = `500 ${fs * 0.85}px Figtree, sans-serif`; y = paragraph(g, ingredients(p), x, y, w, fs * 0.85, 1.3, H * 0.62) + fs * 0.4;
  if (dir) {
    g.font = `700 ${fs}px Figtree, sans-serif`; g.fillText('DIRECTIONS', x, y); y += fs * 1.3;
    g.font = `500 ${fs * 0.85}px Figtree, sans-serif`; y = paragraph(g, dir[0], x, y, w, fs * 0.85, 1.3, H * 0.66) + fs * 0.4;
    g.font = `700 ${fs * 0.85}px Figtree, sans-serif`; g.fillStyle = '#b71c1c'; y = paragraph(g, 'CAUTION: ' + dir[1], x, y, w, fs * 0.85, 1.3, H * 0.7) + fs * 0.4;
    g.fillStyle = '#1e2522';
  } else if (!/water/i.test(p.line)) {
    // nutrition table
    const rnd = rng(p.id * 71 + 3), drink = p.u === 'ml', oil = /oil/i.test(p.line);
    const kcal = oil ? 884 : drink ? Math.round(30 + rnd() * 35) : Math.round(300 + rnd() * 220);
    const fat = oil ? 100 : drink ? +(rnd() * 2).toFixed(1) : +(1 + rnd() * 25).toFixed(1);
    const protein = oil ? 0 : drink ? +(rnd() * 3).toFixed(1) : +(2 + rnd() * 14).toFixed(1);
    const carbs = oil ? 0 : Math.max(0, Math.round((kcal - fat * 9 - protein * 4) / 4));
    const rows = [['Energy', kcal + ' kcal'], ['Protein', protein + ' g'], ['Carbohydrate', carbs + ' g'], ['Fat', fat + ' g']];
    const rh = fs * 1.35, th = rh * (rows.length + 1);
    if (y + th < H * 0.74) {
      g.strokeStyle = '#1e2522'; g.lineWidth = Math.max(1, fs * 0.08); g.strokeRect(x, y, w, th);
      g.font = `700 ${fs * 0.85}px Figtree, sans-serif`; g.fillText(`NUTRITION INFORMATION per 100 ${drink ? 'ml' : 'g'}`, x + fs * 0.4, y + rh * 0.72);
      g.font = `500 ${fs * 0.85}px Figtree, sans-serif`;
      rows.forEach(([k, v], i) => {
        const ry = y + rh * (i + 1);
        g.beginPath(); g.moveTo(x, ry); g.lineTo(x + w, ry); g.stroke();
        g.textAlign = 'left'; g.fillText(k, x + fs * 0.4, ry + rh * 0.72);
        g.textAlign = 'right'; g.fillText(v, x + w - fs * 0.4, ry + rh * 0.72);
      });
      g.textAlign = 'left'; y += th + fs;
    }
    g.font = `500 ${fs * 0.8}px Figtree, sans-serif`;
    y = paragraph(g, 'Store in a cool, dry place away from direct sunlight.' + (/oil|milk|yoghurt|fura|juice/i.test(p.line) ? ' Refrigerate after opening.' : ''), x, y, w, fs * 0.8, 1.3, H * 0.76);
  }
  // bottom block: barcode, registration, batch, maker
  const by = H * 0.78, bh = H * 0.18;
  const bw = Math.min(w * 0.42, bh * 2.2);
  barcode(g, p, x, by, bw, bh, true);
  const tx = x + bw + pad * 0.6, tw = w - bw - pad * 0.6, ts = Math.max(6, Math.min(fs * 0.75, bh * 0.16));
  g.fillStyle = '#1e2522'; g.textAlign = 'left'; g.font = `600 ${ts}px "DM Mono", monospace`;
  g.fillText('NAFDAC Reg. No. ' + p.nafdac, tx, by + ts * 1.2);
  g.fillText(bestBefore(p), tx, by + ts * 2.5);
  g.font = `500 ${ts}px Figtree, sans-serif`;
  paragraph(g, `Manufactured by ${p.brand.replace(/[.']/g, '')} Nig. Ltd, ${ADDRESSES[p.id % ADDRESSES.length]}.`, tx, by + ts * 3.9, tw, ts, 1.25, by + bh);
  madeInNigeria(g, x, H - pad * 0.4, Math.max(6, ts), '#1e2522');
  return c;
}

/** Card swing tag for clothes, shoes and accessories: brand band, name, size, price and barcode. */
function drawSwing(p, W, H) {
  const c = mkCanvas(W, H), g = c.getContext('2d'), pad = W * 0.1;
  g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, W, H);
  const head = p.shape === 'cap' || p.shape === 'glasses' ? p.c1 : '#1c2621';
  g.fillStyle = head; g.fillRect(0, 0, W, H * 0.3);
  g.fillStyle = '#d9d2c3'; g.beginPath(); g.arc(W / 2, H * 0.07, W * 0.06, 0, Math.PI * 2); g.fill(); // string hole
  g.fillStyle = inkOn(head);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const bf = fitLines(g, p.brand.toUpperCase(), W - pad * 2, H * 0.1, (s) => `600 ${s}px Fredoka, sans-serif`, 1, 1.1);
  g.font = bf.font; g.fillText(bf.lines[0], W / 2, H * 0.2);
  g.fillStyle = '#1c2621';
  const lf = fitLines(g, p.line, W - pad * 2, H * 0.16, (s) => `600 ${s}px Figtree, sans-serif`, 2, 1.1);
  g.font = lf.font; lf.lines.forEach((l, i) => g.fillText(l, W / 2, H * 0.37 + i * lf.s * 1.1));
  g.fillStyle = '#5f6e67'; g.font = `500 ${H * 0.05}px "DM Mono", monospace`; g.fillText(p.size, W / 2, H * 0.57);
  g.fillStyle = '#1c2621';
  let ps = H * 0.12;
  do { g.font = `600 ${ps}px Fredoka, sans-serif`; ps *= 0.94; } while (g.measureText(fmt(p.price)).width > W - pad * 2 && ps > 6);
  g.fillText(fmt(p.price), W / 2, H * 0.7);
  barcode(g, p, pad, H * 0.79, W - pad * 2, H * 0.16, false);
  return c;
}
/** Product label. p._label = { aspect, kind } is set when its 3D shape is built. 'lo' for shelves, 'hi' up close. */
export function labelTexture(p, res) {
  p._tex = p._tex || {};
  if (p._tex[res]) return p._tex[res];
  const { aspect, kind } = p._label;
  const S = res === 'hi' ? 1024 : 320;
  let W, H;
  if (kind === 'wrap' || kind === 'band') { W = S * 2; H = Math.round(Math.max(64, Math.min(W, W / aspect))); }
  else if (aspect >= 1) { W = S; H = Math.max(32, Math.round(S / aspect)); }
  else { H = S; W = Math.max(32, Math.round(S * aspect)); }
  return (p._tex[res] = toTexture(kind === 'swing' ? drawSwing(p, W, H) : drawFront(p, W, H, kind)));
}
/** Back label, only drawn at close-up resolution (on the shelf the back faces the shelf). */
export function backTexture(p) {
  p._tex = p._tex || {};
  if (p._tex.back) return p._tex.back;
  const a = p._label.aspect, S = 1024;
  const W = a >= 1 ? S : Math.max(64, Math.round(S * a)), H = a >= 1 ? Math.max(64, Math.round(S / a)) : S;
  return (p._tex.back = toTexture(drawBack(p, W, H)));
}
/** What you see through a clear jar: the snack or spice inside. */
export function contentsTexture(p) {
  p._tex = p._tex || {};
  if (p._tex.contents) return p._tex.contents;
  const c = mkCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = p.contents; g.fillRect(0, 0, 256, 256);
  const kind = /nut/i.test(p.line) ? 'nuts' : /coconut/i.test(p.line) ? 'chinchin' : 'rgba(255,255,255,.25)';
  drawPieces(g, kind, 0, 0, 256, 256, rng(p.id * 5 + 2));
  const t = toTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return (p._tex.contents = t);
}

export function tagTexture(p) {
  const c = mkCanvas(256, 96), g = c.getContext('2d');
  g.fillStyle = p.promo ? '#ffffff' : '#ffd94a'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = p.promo ? '#d50000' : p.c1; g.fillRect(0, 0, 9, 96);
  g.fillStyle = '#1c2621'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const fit = fitLines(g, p.line, 116, 19, (s) => `600 ${s}px Figtree, sans-serif`, 2, 1.1);
  g.font = fit.font; fit.lines.forEach((l, i) => g.fillText(l, 20, 28 + i * fit.s * 1.12));
  g.font = '500 13px "DM Mono", monospace'; g.fillText(p.unit, 20, 84);
  g.textAlign = 'right';
  let ps = 40;
  do { g.font = `600 ${ps}px Fredoka, sans-serif`; ps -= 2; } while (g.measureText(fmt(p.price)).width > 112 && ps > 18);
  g.fillStyle = p.promo ? '#d50000' : '#1c2621';
  g.fillText(fmt(p.price), 244, 62);
  g.fillStyle = '#1c2621';
  if (p.promo) {
    g.font = '600 14px Figtree, sans-serif'; const was = 'was ' + fmt(p.promo.was);
    g.fillText(was, 244, 22); const ww = g.measureText(was).width;
    g.strokeStyle = '#d50000'; g.lineWidth = 2; g.beginPath(); g.moveTo(244 - ww, 17); g.lineTo(244, 17); g.stroke();
  }
  g.font = '500 12px "DM Mono", monospace'; g.fillText(p.size, 244, 84);
  return toTexture(c);
}
/** Red "PROMO!" shelf-talker that sticks out from the shelf edge. */
let promoTex = null;
export function promoTexture() {
  if (promoTex) return promoTex;
  const c = mkCanvas(256, 256), g = c.getContext('2d');
  burst(g, 128, 128, 120, 16, 0.84); g.fillStyle = '#d50000'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd600'; g.stroke();
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '62px "Bebas Neue", Impact, sans-serif';
  g.fillText('PROMO!', 128, 116); g.font = '600 24px Fredoka, sans-serif'; g.fillStyle = '#ffd600'; g.fillText('Big savings', 128, 160);
  return (promoTex = toTexture(c));
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
