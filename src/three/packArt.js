// Food and product illustrations for pack labels, drawn with canvas shapes (no image files).
// Every function draws centred on (x, y) inside a square of size s.

const circle = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } };
const ellipse = (g, x, y, rx, ry, rot, fill) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } };
const outline = (g, w = 2, c = 'rgba(0,0,0,.28)') => { g.lineWidth = w; g.strokeStyle = c; g.stroke(); };

function bowl(g, x, y, s, rim = '#ffffff', body = '#e9eef0') {
  g.beginPath(); g.moveTo(x - s * 0.42, y); g.quadraticCurveTo(x, y + s * 0.5, x + s * 0.42, y); g.closePath();
  g.fillStyle = body; g.fill(); outline(g, s * 0.012);
  ellipse(g, x, y, s * 0.42, s * 0.07, 0, rim); outline(g, s * 0.012);
}
function steam(g, x, y, s) {
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = s * 0.025; g.lineCap = 'round';
  for (const dx of [-0.12, 0, 0.12]) {
    g.beginPath(); g.moveTo(x + dx * s, y);
    g.bezierCurveTo(x + (dx - 0.06) * s, y - s * 0.08, x + (dx + 0.06) * s, y - s * 0.14, x + dx * s, y - s * 0.22); g.stroke();
  }
}
function tomato(g, x, y, r) {
  circle(g, x, y, r, '#e53935'); outline(g, r * 0.06);
  ellipse(g, x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.15, -0.6, 'rgba(255,255,255,.45)');
  g.fillStyle = '#2e7d32';
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ellipse(g, x + Math.cos(a) * r * 0.18, y - r * 0.85 + Math.sin(a) * r * 0.1, r * 0.2, r * 0.07, a, '#2e7d32'); }
}
function chili(g, x, y, s, rot, col = '#d32f2f') {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(-s * 0.05, -s * 0.18); g.quadraticCurveTo(s * 0.12, 0, -s * 0.02, s * 0.22); g.quadraticCurveTo(-s * 0.1, 0, -s * 0.05, -s * 0.18);
  g.fillStyle = col; g.fill(); outline(g, s * 0.01);
  g.fillStyle = '#2e7d32'; g.fillRect(-s * 0.07, -s * 0.22, s * 0.06, s * 0.05);
  g.restore();
}
function peanut(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  circle(g, -s * 0.05, 0, s * 0.065, '#d9a066'); circle(g, s * 0.05, 0, s * 0.06, '#d9a066');
  g.strokeStyle = 'rgba(120,70,30,.5)'; g.lineWidth = s * 0.008; g.beginPath(); g.arc(0, 0, s * 0.03, 0, Math.PI * 2); g.stroke();
  g.restore();
}
function drop(g, x, y, s, fill) {
  g.beginPath(); g.moveTo(x, y - s * 0.3); g.bezierCurveTo(x + s * 0.24, y, x + s * 0.2, y + s * 0.22, x, y + s * 0.22);
  g.bezierCurveTo(x - s * 0.2, y + s * 0.22, x - s * 0.24, y, x, y - s * 0.3); g.fillStyle = fill; g.fill(); outline(g, s * 0.012);
  ellipse(g, x - s * 0.06, y + s * 0.02, s * 0.04, s * 0.08, 0.3, 'rgba(255,255,255,.55)');
}
function cup(g, x, y, s, drink, saucer = true) {
  if (saucer) { ellipse(g, x, y + s * 0.2, s * 0.32, s * 0.06, 0, '#ffffff'); outline(g, s * 0.01); }
  g.beginPath(); g.moveTo(x - s * 0.22, y - s * 0.1); g.lineTo(x + s * 0.22, y - s * 0.1); g.quadraticCurveTo(x + s * 0.2, y + s * 0.2, x, y + s * 0.2);
  g.quadraticCurveTo(x - s * 0.2, y + s * 0.2, x - s * 0.22, y - s * 0.1); g.fillStyle = '#ffffff'; g.fill(); outline(g, s * 0.012);
  ellipse(g, x, y - s * 0.1, s * 0.22, s * 0.05, 0, drink);
  g.lineWidth = s * 0.03; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(x + s * 0.25, y, s * 0.07, -1.2, 1.2); g.stroke();
}
function leaf(g, x, y, s, rot, col = '#43a047') {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, -s * 0.2); g.quadraticCurveTo(s * 0.13, 0, 0, s * 0.2); g.quadraticCurveTo(-s * 0.13, 0, 0, -s * 0.2);
  g.fillStyle = col; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = s * 0.01; g.beginPath(); g.moveTo(0, -s * 0.18); g.lineTo(0, s * 0.18); g.stroke();
  g.restore();
}
function star(g, x, y, r, n = 5, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}

/** Scatter of product pieces (chips, chin chin, grains…) used for see-through windows and jar contents. */
export function drawPieces(g, kind, x, y, w, h, rnd) {
  const n = Math.max(12, Math.round((w * h) / 260));
  for (let i = 0; i < n; i++) {
    const px = x + rnd() * w, py = y + rnd() * h, s = Math.min(w, h);
    switch (kind) {
      case 'chips': ellipse(g, px, py, s * 0.09, s * 0.065, rnd() * 3, rnd() < 0.5 ? '#f6c344' : '#e9ad2f'); outline(g, 1, 'rgba(150,90,10,.4)'); break;
      case 'chinchin': g.fillStyle = rnd() < 0.5 ? '#d89a4a' : '#c4823a'; g.save(); g.translate(px, py); g.rotate(rnd()); g.fillRect(-s * 0.03, -s * 0.03, s * 0.06, s * 0.06); g.restore(); break;
      case 'nuts': peanut(g, px, py, s * 0.9, rnd() * 3); break;
      case 'kulikuli': g.fillStyle = '#9c5a23'; g.save(); g.translate(px, py); g.rotate(rnd() * 3); g.fillRect(-s * 0.08, -s * 0.015, s * 0.16, s * 0.03); g.restore(); break;
      case 'garri': circle(g, px, py, s * 0.012 + rnd() * s * 0.01, rnd() < 0.5 ? '#f3e7c4' : '#e8d9a8'); break;
      case 'beans': ellipse(g, px, py, s * 0.035, s * 0.022, rnd() * 3, rnd() < 0.5 ? '#a0612e' : '#8a4f22'); break;
      case 'egusi': circle(g, px, py, s * 0.014 + rnd() * s * 0.012, rnd() < 0.5 ? '#efe2b8' : '#e2d29e'); break;
      default: circle(g, px, py, s * 0.02 + rnd() * s * 0.015, rnd() < 0.5 ? kind : 'rgba(0,0,0,.15)');
    }
  }
}

export function drawArt(g, art, x, y, s, p) {
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  switch (art) {
    case 'noodles': {
      bowl(g, x, y + s * 0.08, s, '#ffffff', p.c2 === '#ffffff' ? '#e53935' : p.c2);
      g.strokeStyle = '#f7d36a'; g.lineWidth = s * 0.022;
      for (let k = 0; k < 7; k++) {
        g.beginPath();
        for (let t = 0; t <= 1; t += 0.05) g.lineTo(x - s * 0.36 + t * s * 0.72, y + s * 0.06 - Math.sin(t * Math.PI * 4 + k) * s * 0.03 - k * s * 0.008);
        g.stroke();
      }
      circle(g, x + s * 0.12, y + s * 0.0, s * 0.07, '#ffffff'); circle(g, x + s * 0.12, y + s * 0.0, s * 0.035, '#ffb300');
      chili(g, x - s * 0.18, y - s * 0.02, s * 0.6, 1.2);
      leaf(g, x - s * 0.02, y - s * 0.03, s * 0.35, 0.9, '#66bb6a');
      steam(g, x, y - s * 0.1, s);
      break;
    }
    case 'chips': case 'chinchin': case 'kulikuli': {
      ellipse(g, x, y + s * 0.18, s * 0.42, s * 0.08, 0, 'rgba(0,0,0,.12)');
      const rnd = mini(p.id);
      drawPieces(g, art === 'chips' ? 'chips' : art, x - s * 0.38, y - s * 0.2, s * 0.76, s * 0.4, rnd);
      if (art === 'chips') { // a plantain
        g.save(); g.translate(x + s * 0.2, y - s * 0.26); g.rotate(-0.5);
        g.beginPath(); g.moveTo(-s * 0.22, 0); g.quadraticCurveTo(0, s * 0.16, s * 0.22, 0); g.quadraticCurveTo(0, s * 0.08, -s * 0.22, 0);
        g.fillStyle = '#7cb342'; g.fill(); outline(g, s * 0.01); g.restore();
      }
      break;
    }
    case 'nuts': {
      const rnd = mini(p.id);
      for (let i = 0; i < 9; i++) peanut(g, x + (rnd() - 0.5) * s * 0.6, y + (rnd() - 0.5) * s * 0.4, s * 1.6, rnd() * 3);
      break;
    }
    case 'coconut': {
      circle(g, x - s * 0.1, y, s * 0.26, '#6d4c41'); outline(g, s * 0.01);
      circle(g, x - s * 0.1, y, s * 0.2, '#fffaf0');
      const rnd = mini(p.id);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#c8955a'; g.save(); g.translate(x + s * 0.2 + (rnd() - 0.5) * s * 0.2, y + s * 0.1 + (rnd() - 0.5) * s * 0.2); g.rotate(rnd()); g.fillRect(-s * 0.04, -s * 0.04, s * 0.08, s * 0.08); g.restore(); }
      break;
    }
    case 'biscuit': {
      for (let k = 2; k >= 0; k--) {
        g.fillStyle = k ? '#d9a35b' : '#e8b86d';
        g.save(); g.translate(x + k * s * 0.08, y - k * s * 0.05); g.rotate(-0.08);
        g.fillRect(-s * 0.26, -s * 0.16, s * 0.52, s * 0.32); outline(g, s * 0.008); g.strokeRect(-s * 0.26, -s * 0.16, s * 0.52, s * 0.32);
        if (!k) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) circle(g, -s * 0.15 + i * s * 0.15, -s * 0.06 + j * s * 0.12, s * 0.014, '#a86e2c');
        g.restore();
      }
      break;
    }
    case 'milk': {
      g.beginPath();
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2, r = s * (0.24 + (i % 2) * 0.07); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75); }
      g.closePath(); g.fillStyle = '#ffffff'; g.fill(); outline(g, s * 0.01, 'rgba(0,60,140,.25)');
      cup(g, x, y + s * 0.02, s * 0.7, '#fffdf5', false);
      break;
    }
    case 'flakes': {
      bowl(g, x, y + s * 0.08, s, '#ffffff', '#1e88e5');
      const rnd = mini(p.id);
      for (let i = 0; i < 16; i++) {
        g.save(); g.translate(x + (rnd() - 0.5) * s * 0.6, y + s * 0.02 - rnd() * s * 0.14); g.rotate(rnd() * 3);
        g.beginPath(); g.moveTo(-s * 0.05, 0); g.lineTo(0, -s * 0.03); g.lineTo(s * 0.05, s * 0.01); g.lineTo(0, s * 0.03); g.closePath();
        g.fillStyle = rnd() < 0.5 ? '#f4b33d' : '#e59a24'; g.fill(); g.restore();
      }
      break;
    }
    case 'custard': bowl(g, x, y + s * 0.06, s, '#ffe082', '#ffffff'); ellipse(g, x, y + s * 0.06, s * 0.36, s * 0.05, 0, '#ffca28'); g.strokeStyle = '#b0bec5'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(x + s * 0.1, y + s * 0.04); g.lineTo(x + s * 0.34, y - s * 0.22); g.stroke(); break;
    case 'cocoa': cup(g, x, y, s, '#5d4037'); steam(g, x, y - s * 0.18, s * 0.8); break;
    case 'tea': cup(g, x, y, s, '#8d4b1c'); g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.008; g.beginPath(); g.moveTo(x + s * 0.05, y - s * 0.1); g.lineTo(x + s * 0.2, y - s * 0.3); g.stroke(); g.fillStyle = '#ffca28'; g.fillRect(x + s * 0.17, y - s * 0.36, s * 0.08, s * 0.07); break;
    case 'sugar': {
      for (const [dx, dy] of [[-0.14, 0.08], [0.12, 0.08], [0, -0.1]]) {
        const cx = x + dx * s, cy = y + dy * s, k = s * 0.13;
        g.fillStyle = '#ffffff'; g.fillRect(cx - k, cy - k, k * 2, k * 2); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = s * 0.01; g.strokeRect(cx - k, cy - k, k * 2, k * 2);
        g.fillStyle = '#e3eef7'; g.beginPath(); g.moveTo(cx - k, cy - k); g.lineTo(cx - k * 0.6, cy - k * 1.4); g.lineTo(cx + k * 1.4, cy - k * 1.4); g.lineTo(cx + k, cy - k); g.fill();
      }
      break;
    }
    case 'rice': {
      bowl(g, x, y + s * 0.1, s, '#ffffff', '#c62828');
      g.beginPath(); g.ellipse(x, y + s * 0.08, s * 0.38, s * 0.22, 0, Math.PI, 0); g.fillStyle = '#fffdf6'; g.fill(); outline(g, s * 0.008);
      const rnd = mini(p.id);
      for (let i = 0; i < 40; i++) ellipse(g, x + (rnd() - 0.5) * s * 0.66, y + s * 0.06 - rnd() * s * 0.18, s * 0.018, s * 0.007, rnd() * 3, 'rgba(210,190,140,.8)');
      leaf(g, x + s * 0.28, y - s * 0.1, s * 0.4, 0.6, '#43a047');
      break;
    }
    case 'garri': case 'egusi': case 'beans': {
      bowl(g, x, y + s * 0.1, s, '#ffffff', '#795548');
      g.beginPath(); g.ellipse(x, y + s * 0.08, s * 0.38, s * 0.18, 0, Math.PI, 0); g.fillStyle = art === 'beans' ? '#9a5a2a' : art === 'garri' ? (p.c1 === '#ffe082' ? '#f6d77a' : '#f5ecd2') : '#eadcb0'; g.fill();
      drawPieces(g, art, x - s * 0.32, y - s * 0.08, s * 0.64, s * 0.16, mini(p.id));
      if (art === 'egusi') { ellipse(g, x + s * 0.28, y - s * 0.16, s * 0.14, s * 0.1, 0.4, '#7cb342'); outline(g, s * 0.01); }
      break;
    }
    case 'yam': {
      g.save(); g.translate(x - s * 0.08, y - s * 0.02); g.rotate(-0.4);
      ellipse(g, 0, 0, s * 0.34, s * 0.12, 0, '#8d6e63'); outline(g, s * 0.01);
      ellipse(g, s * 0.32, 0, s * 0.04, s * 0.11, 0, '#fff8e1'); g.restore();
      circle(g, x + s * 0.18, y + s * 0.14, s * 0.14, '#fffdf5'); outline(g, s * 0.01);
      break;
    }
    case 'grain': {
      g.strokeStyle = '#c49a3a'; g.lineWidth = s * 0.02;
      for (const dx of [-0.12, 0, 0.12]) {
        g.beginPath(); g.moveTo(x + dx * s, y + s * 0.3); g.lineTo(x + dx * s * 0.6, y - s * 0.2); g.stroke();
        for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) ellipse(g, x + dx * s * 0.6 + sd * s * 0.035, y - s * 0.2 + k * s * 0.07, s * 0.035, s * 0.018, sd * 0.6, '#e2b84d');
      }
      break;
    }
    case 'pasta': {
      ellipse(g, x, y + s * 0.1, s * 0.42, s * 0.12, 0, '#ffffff'); outline(g, s * 0.01);
      g.strokeStyle = '#f2cf72'; g.lineWidth = s * 0.016;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x, y + s * 0.05, s * (0.08 + k * 0.035), s * (0.04 + k * 0.012), 0, 0, Math.PI * 2); g.stroke(); }
      ellipse(g, x, y + s * 0.02, s * 0.12, s * 0.05, 0, '#d84315');
      leaf(g, x + s * 0.05, y - s * 0.02, s * 0.25, 0.8);
      break;
    }
    case 'water': {
      drop(g, x, y, s * 1.1, '#29b6f6');
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = s * 0.02;
      for (let k = 0; k < 2; k++) { g.beginPath(); for (let t = 0; t <= 1; t += 0.05) g.lineTo(x - s * 0.4 + t * s * 0.8, y + s * (0.28 + k * 0.07) + Math.sin(t * 12) * s * 0.015); g.stroke(); }
      break;
    }
    case 'pineapple': {
      ellipse(g, x, y + s * 0.08, s * 0.18, s * 0.24, 0, '#f9a825'); outline(g, s * 0.01);
      g.strokeStyle = 'rgba(140,80,0,.5)'; g.lineWidth = s * 0.01;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * s * 0.06 - s * 0.15, y - s * 0.1); g.lineTo(x + k * s * 0.06 + s * 0.15, y + s * 0.3); g.stroke(); }
      for (let k = 0; k < 5; k++) leaf(g, x + (k - 2) * s * 0.04, y - s * 0.24, s * 0.5, (k - 2) * 0.35, '#2e7d32');
      break;
    }
    case 'orange': case 'fruit': {
      const cols = art === 'orange' ? ['#fb8c00', '#ffa726'] : ['#fb8c00', '#c62828', '#7cb342'];
      cols.forEach((c, k) => {
        const cx = x + (k - (cols.length - 1) / 2) * s * 0.22, cy = y + (k % 2) * s * 0.08;
        circle(g, cx, cy, s * 0.15, c); outline(g, s * 0.01);
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = s * 0.01;
        for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * s * 0.12, cy + Math.sin(a) * s * 0.12); g.stroke(); }
      });
      leaf(g, x + s * 0.12, y - s * 0.2, s * 0.35, 0.8);
      break;
    }
    case 'hibiscus': case 'flower': {
      const col = art === 'hibiscus' ? '#c2185b' : '#f06292';
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ellipse(g, x + Math.cos(a) * s * 0.14, y + Math.sin(a) * s * 0.14, s * 0.16, s * 0.1, a, col); outline(g, s * 0.008); }
      circle(g, x, y, s * 0.06, '#ffd54f');
      leaf(g, x + s * 0.24, y + s * 0.2, s * 0.4, 2.2);
      break;
    }
    case 'malt': {
      g.strokeStyle = '#d4a032'; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(x - s * 0.22, y + s * 0.3); g.lineTo(x - s * 0.16, y - s * 0.25); g.stroke();
      for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) ellipse(g, x - s * 0.17 + sd * s * 0.03, y - s * 0.22 + k * s * 0.06, s * 0.03, s * 0.016, sd * 0.6, '#f0c04a');
      g.beginPath(); g.moveTo(x - s * 0.02, y - s * 0.2); g.lineTo(x + s * 0.24, y - s * 0.2); g.lineTo(x + s * 0.2, y + s * 0.3); g.lineTo(x + s * 0.02, y + s * 0.3); g.closePath();
      g.fillStyle = '#3e1f0e'; g.fill(); outline(g, s * 0.01);
      ellipse(g, x + s * 0.11, y - s * 0.2, s * 0.13, s * 0.04, 0, '#f3dcb0');
      break;
    }
    case 'fizz': case 'bolt': {
      if (art === 'bolt') { g.beginPath(); g.moveTo(x + s * 0.05, y - s * 0.32); g.lineTo(x - s * 0.15, y + s * 0.04); g.lineTo(x, y + s * 0.04); g.lineTo(x - s * 0.06, y + s * 0.32); g.lineTo(x + s * 0.16, y - s * 0.06); g.lineTo(x + s * 0.01, y - s * 0.06); g.closePath(); g.fillStyle = p.c2; g.fill(); outline(g, s * 0.012); }
      else { for (let k = 0; k < 9; k++) { circle(g, x + Math.sin(k * 2.1) * s * 0.25, y + s * 0.25 - k * s * 0.06, s * (0.02 + (k % 3) * 0.012)); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = s * 0.012; g.stroke(); } }
      break;
    }
    case 'palm': {
      const rnd = mini(p.id);
      for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, r = rnd() * s * 0.2; ellipse(g, x - s * 0.08 + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, s * 0.06, s * 0.045, a, i % 3 ? '#e65100' : '#3e2723'); outline(g, s * 0.006); }
      drop(g, x + s * 0.24, y + s * 0.08, s * 0.6, '#c62200');
      leaf(g, x - s * 0.1, y - s * 0.26, s * 0.6, -0.4, '#2e7d32');
      break;
    }
    case 'tomato': tomato(g, x - s * 0.12, y + s * 0.04, s * 0.2); tomato(g, x + s * 0.16, y + s * 0.08, s * 0.16); tomato(g, x + s * 0.02, y - s * 0.12, s * 0.13); break;
    case 'meat': {
      g.beginPath(); g.moveTo(x - s * 0.3, y - s * 0.1); g.quadraticCurveTo(x, y - s * 0.3, x + s * 0.3, y - s * 0.08); g.quadraticCurveTo(x + s * 0.32, y + s * 0.2, x, y + s * 0.2); g.quadraticCurveTo(x - s * 0.34, y + s * 0.18, x - s * 0.3, y - s * 0.1);
      g.fillStyle = '#c75b5b'; g.fill(); outline(g, s * 0.01);
      g.strokeStyle = 'rgba(255,230,230,.7)'; g.lineWidth = s * 0.015;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - s * 0.2 + k * s * 0.1, y - s * 0.12); g.quadraticCurveTo(x - s * 0.15 + k * s * 0.1, y, x - s * 0.2 + k * s * 0.12, y + s * 0.12); g.stroke(); }
      leaf(g, x + s * 0.26, y - s * 0.18, s * 0.35, 0.5);
      break;
    }
    case 'cubes': {
      for (const [dx, dy] of [[-0.15, 0.06], [0.1, 0.1], [-0.02, -0.12]]) { g.fillStyle = '#ffd54f'; g.fillRect(x + dx * s - s * 0.1, y + dy * s - s * 0.1, s * 0.2, s * 0.2); g.strokeStyle = '#c62828'; g.lineWidth = s * 0.02; g.strokeRect(x + dx * s - s * 0.1, y + dy * s - s * 0.1, s * 0.2, s * 0.2); }
      // a drumstick
      g.save(); g.translate(x + s * 0.26, y - s * 0.12); g.rotate(0.7);
      ellipse(g, 0, 0, s * 0.11, s * 0.08, 0, '#c9782c'); outline(g, s * 0.01);
      g.fillStyle = '#fff8e1'; g.fillRect(s * 0.08, -s * 0.02, s * 0.1, s * 0.04); circle(g, s * 0.19, -s * 0.02, s * 0.025, '#fff8e1'); circle(g, s * 0.19, s * 0.02, s * 0.025, '#fff8e1');
      g.restore();
      break;
    }
    case 'chili': chili(g, x - s * 0.08, y, s * 1.4, 0.4); chili(g, x + s * 0.12, y + s * 0.04, s * 1.2, -0.3, '#ef6c00'); break;
    case 'bubbles': {
      for (let k = 0; k < 8; k++) { circle(g, x + Math.sin(k * 2.4) * s * 0.28, y + Math.cos(k * 1.7) * s * 0.22, s * (0.05 + (k % 3) * 0.03), 'rgba(255,255,255,.35)'); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = s * 0.012; g.stroke(); }
      g.fillStyle = '#ffffff'; star(g, x + s * 0.2, y - s * 0.2, s * 0.08, 4, 0.3); g.fill();
      break;
    }
    case 'mosquito': {
      g.strokeStyle = '#212121'; g.lineWidth = s * 0.012;
      ellipse(g, x, y, s * 0.04, s * 0.15, 0.3, '#424242');
      for (const sd of [-1, 1]) { ellipse(g, x + sd * s * 0.1, y - s * 0.05, s * 0.1, s * 0.04, sd * 0.4, 'rgba(255,255,255,.7)'); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, y + k * s * 0.03); g.lineTo(x + sd * s * 0.18, y + s * 0.12 + k * s * 0.04); g.stroke(); } }
      circle(g, x, y, s * 0.3); g.strokeStyle = '#d50000'; g.lineWidth = s * 0.05; g.stroke();
      g.beginPath(); g.moveTo(x - s * 0.21, y - s * 0.21); g.lineTo(x + s * 0.21, y + s * 0.21); g.stroke();
      break;
    }
    case 'feather': {
      g.save(); g.translate(x, y); g.rotate(-0.6);
      g.beginPath(); g.moveTo(0, -s * 0.32); g.quadraticCurveTo(s * 0.16, 0, 0, s * 0.3); g.quadraticCurveTo(-s * 0.16, 0, 0, -s * 0.32); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
      g.strokeStyle = p.c2; g.lineWidth = s * 0.01; g.beginPath(); g.moveTo(0, -s * 0.3); g.lineTo(0, s * 0.36); g.stroke(); g.restore();
      break;
    }
    case 'smile': {
      g.beginPath(); g.moveTo(x - s * 0.16, y - s * 0.2); g.quadraticCurveTo(x, y - s * 0.28, x + s * 0.16, y - s * 0.2);
      g.quadraticCurveTo(x + s * 0.2, y + s * 0.05, x + s * 0.1, y + s * 0.28); g.lineTo(x + s * 0.03, y + s * 0.05); g.lineTo(x - s * 0.03, y + s * 0.05); g.lineTo(x - s * 0.1, y + s * 0.28);
      g.quadraticCurveTo(x - s * 0.2, y + s * 0.05, x - s * 0.16, y - s * 0.2); g.fillStyle = '#ffffff'; g.fill(); outline(g, s * 0.012, 'rgba(0,80,160,.4)');
      g.fillStyle = '#ffd54f'; star(g, x + s * 0.24, y - s * 0.24, s * 0.08, 4, 0.3); g.fill();
      break;
    }
    case 'leaf': leaf(g, x - s * 0.1, y, s, -0.5, '#2e7d32'); leaf(g, x + s * 0.1, y, s * 0.9, 0.5, '#66bb6a'); break;
    case 'shield': {
      g.beginPath(); g.moveTo(x, y - s * 0.3); g.lineTo(x + s * 0.24, y - s * 0.2); g.quadraticCurveTo(x + s * 0.24, y + s * 0.15, x, y + s * 0.32); g.quadraticCurveTo(x - s * 0.24, y + s * 0.15, x - s * 0.24, y - s * 0.2); g.closePath();
      g.fillStyle = p.c2; g.fill(); outline(g, s * 0.012, 'rgba(255,255,255,.6)');
      g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(x - s * 0.1, y); g.lineTo(x - s * 0.02, y + s * 0.09); g.lineTo(x + s * 0.12, y - s * 0.1); g.stroke();
      break;
    }
    case 'strawberry': {
      g.beginPath(); g.moveTo(x, y + s * 0.3); g.quadraticCurveTo(x - s * 0.3, y - s * 0.05, x - s * 0.1, y - s * 0.2); g.quadraticCurveTo(x, y - s * 0.25, x + s * 0.1, y - s * 0.2); g.quadraticCurveTo(x + s * 0.3, y - s * 0.05, x, y + s * 0.3);
      g.fillStyle = '#e53935'; g.fill(); outline(g, s * 0.01);
      for (let k = 0; k < 10; k++) ellipse(g, x + Math.sin(k * 2.3) * s * 0.12, y + Math.cos(k * 1.3) * s * 0.12, s * 0.012, s * 0.02, 0, '#ffeb3b');
      for (let k = 0; k < 4; k++) leaf(g, x + (k - 1.5) * s * 0.06, y - s * 0.24, s * 0.3, (k - 1.5) * 0.6);
      break;
    }
    default: leaf(g, x, y, s, 0.3);
  }
  g.restore();
}

function mini(seed) { let a = (seed * 9301 + 49297) >>> 0; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a & 0xffff) / 0x10000; }; }
