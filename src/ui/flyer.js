import { PRODUCTS, fmt } from '../data/products';
import { labelTexture, fitLines, roundRect, mkCanvas } from '../three/textures';

// A shareable "my basket" flyer: store name, what you bought (with each pack's own label art),
// the total, and a link back to the game. Drawn on a canvas and exported as a PNG.
const GREEN = '#1f7a55', INK = '#1c2621', MUTED = '#5f6e67', PAPER = '#f3f6f3', TAG = '#ffd94a';
const W = 1080, COLS = [50, 560], CARD_W = 470, CARD_H = 170, ROW = 186, GRID_Y = 470, MAX_CARDS = 8;

/** The page address to send people to (without any debug query). */
export function shareLink() {
  try { return location.origin + location.pathname; } catch (e) { return ''; }
}
function groupItems(cart) {
  const m = new Map();
  for (const e of cart) m.set(e.ti, (m.get(e.ti) || 0) + 1);
  return [...m];
}
/** Draws a product's label into a square, cropped to the front of the pack. */
function drawThumb(g, p, x, y, s) {
  g.save();
  roundRect(g, x, y, s, s, 18); g.clip();
  g.fillStyle = p.c1; g.fillRect(x, y, s, s);
  let img = null;
  try { img = p._label ? labelTexture(p, 'lo').image : null; } catch (e) { img = null; }
  if (img) {
    const wraps = p._label.kind === 'wrap' || p._label.kind === 'band';
    const front = wraps ? Math.min(img.width, img.height * 1.3) : img.width; // a can's label wraps around: use the middle
    const sx = (img.width - front) / 2, sw = front, sh = img.height;
    const k = Math.max(s / sw, s / sh), dw = sw * k, dh = sh * k;
    g.drawImage(img, sx, 0, sw, sh, x + (s - dw) / 2, y + (s - dh) / 2, dw, dh);
  }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; roundRect(g, x, y, s, s, 18); g.stroke();
}
function leaf(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s / 24, s / 24);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(5, 19); g.bezierCurveTo(5, 11, 10, 6, 19, 5); g.bezierCurveTo(18, 14, 13, 19, 5, 19); g.fill();
  g.strokeStyle = GREEN; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(5, 19); g.lineTo(13, 11); g.stroke();
  g.restore();
}

export async function makeFlyer(receipt) {
  const groups = groupItems(receipt.cart);
  const count = receipt.cart.length;
  const total = receipt.cart.reduce((s, e) => s + PRODUCTS[e.ti].price, 0);
  const cards = groups.length > MAX_CARDS ? groups.slice(0, MAX_CARDS - 1) : groups;
  const extra = groups.length - cards.length;
  const rows = Math.ceil((cards.length + (extra ? 1 : 0)) / 2);
  const H = Math.max(1080, GRID_Y + rows * ROW + 200);
  const c = mkCanvas(W, H), g = c.getContext('2d');

  // background and header band
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const band = g.createLinearGradient(0, 0, W, 310);
  band.addColorStop(0, '#1f7a55'); band.addColorStop(1, '#2e9468');
  g.fillStyle = band; g.fillRect(0, 0, W, 310);
  g.globalAlpha = 0.08; g.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(80 + i * 130, 300, 60 + (i % 3) * 18, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(255,255,255,.16)'; roundRect(g, 60, 62, 104, 104, 28); g.fill();
  leaf(g, 72, 74, 80);
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = '600 78px Fredoka, Figtree, sans-serif'; g.fillText('Eko Mart', 196, 140);
  g.fillStyle = '#d4efe2'; g.font = '500 30px Figtree, sans-serif'; g.fillText('Everything for your kitchen · Lekki, Lagos', 198, 190);
  // "just shopped" sticker
  g.save(); g.translate(930, 250); g.rotate(-0.18);
  g.fillStyle = TAG; g.beginPath(); g.arc(0, 0, 92, 0, Math.PI * 2); g.fill();
  g.fillStyle = INK; g.textAlign = 'center'; g.font = '46px "Bebas Neue", Impact, sans-serif';
  g.fillText('JUST', 0, -14); g.fillText('SHOPPED!', 0, 34);
  g.restore();

  // title
  g.textAlign = 'left'; g.fillStyle = INK; g.font = '600 60px Fredoka, sans-serif'; g.fillText('My basket today', 50, 388);
  g.fillStyle = MUTED; g.font = '500 30px Figtree, sans-serif';
  const when = receipt.date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  g.fillText(`${count} item${count === 1 ? '' : 's'} · ${when}`, 52, 436);

  // item cards
  cards.forEach(([ti, n], i) => {
    const p = PRODUCTS[ti], x = COLS[i % 2], y = GRID_Y + Math.floor(i / 2) * ROW;
    g.save(); g.shadowColor = 'rgba(28,38,33,.10)'; g.shadowBlur = 24; g.shadowOffsetY = 6;
    g.fillStyle = '#fff'; roundRect(g, x, y, CARD_W, CARD_H, 24); g.fill(); g.restore();
    drawThumb(g, p, x + 20, y + 20, 130);
    const tx = x + 170, tw = CARD_W - 190;
    g.fillStyle = MUTED; g.font = '600 21px Figtree, sans-serif'; g.fillText(p.brand.toUpperCase(), tx, y + 46);
    const fit = fitLines(g, p.line, tw, 30, (s) => `600 ${s}px Fredoka, sans-serif`, 2, 1.1);
    g.fillStyle = INK; g.font = fit.font;
    fit.lines.forEach((l, k) => g.fillText(l, tx, y + 82 + k * fit.s * 1.1));
    g.fillStyle = MUTED; g.font = '500 22px "DM Mono", monospace'; g.fillText(`${n} × ${fmt(p.price)}`, tx, y + 146);
    g.textAlign = 'right'; g.fillStyle = GREEN; g.font = '600 28px Fredoka, sans-serif'; g.fillText(fmt(n * p.price), x + CARD_W - 22, y + 146);
    g.textAlign = 'left';
  });
  if (extra) {
    const i = cards.length, x = COLS[i % 2], y = GRID_Y + Math.floor(i / 2) * ROW;
    g.fillStyle = '#e3f1ea'; roundRect(g, x, y, CARD_W, CARD_H, 24); g.fill();
    g.fillStyle = GREEN; g.textAlign = 'center'; g.font = '600 36px Fredoka, sans-serif';
    g.fillText(`+ ${extra} more`, x + CARD_W / 2, y + CARD_H / 2 + 12); g.textAlign = 'left';
  }

  // total and footer
  const ty = GRID_Y + rows * ROW + 6;
  g.fillStyle = TAG; roundRect(g, 50, ty, W - 100, 92, 22); g.fill();
  g.fillStyle = INK; g.font = '600 36px Fredoka, sans-serif'; g.fillText('Total', 84, ty + 60);
  g.textAlign = 'right'; g.font = '600 50px Fredoka, sans-serif'; g.fillText(fmt(total), W - 84, ty + 64);
  g.textAlign = 'center'; g.fillStyle = MUTED; g.font = '500 26px Figtree, sans-serif';
  const link = shareLink().replace(/^https?:\/\//, '').replace(/\/$/, '');
  g.fillText(`Paid by ${receipt.method || 'card'} · Shop with me${link ? ' at ' + link : ''}`, W / 2, ty + 150);

  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const text = `Just did my shopping at Eko Mart 🛒 ${count} item${count === 1 ? '' : 's'} for ${fmt(total)}. Come and shop with me!`;
  return { blob, text, link: shareLink(), url: URL.createObjectURL(blob) };
}
