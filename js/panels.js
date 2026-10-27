// Floating UI drawn on canvases. Buttons are found from the UV coordinate
// where a controller ray (or mouse) hits the panel.
import * as THREE from 'three';

const GOLD = '#d4af6a', INK = '#f2ead9', DIM = '#b9ad98';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

class CanvasPanel {
  constructor(pxW, pxH, mW) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = pxW; this.canvas.height = pxH;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const mH = mW * pxH / pxW;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(mW, mH),
      new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    this.mesh.renderOrder = 10;
    this.mesh.userData.panel = this;
    this.buttons = [];   // {id, x, y, w, h} in canvas px
    this.hover = null;
  }
  buttonAt(uv) {
    const x = uv.x * this.canvas.width, y = (1 - uv.y) * this.canvas.height;
    const b = this.buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    return b ? b.id : null;
  }
  setHover(id) { if (id !== this.hover) { this.hover = id; this.draw(); } }
  drawButton(b, label, primary = false) {
    const ctx = this.ctx, hov = this.hover === b.id;
    roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
    ctx.fillStyle = hov ? GOLD : (primary ? 'rgba(212,175,106,0.28)' : 'rgba(255,255,255,0.10)');
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = hov ? GOLD : 'rgba(212,175,106,0.7)'; ctx.stroke();
    ctx.fillStyle = hov ? '#1a1612' : INK;
    ctx.font = `600 ${Math.round(b.h * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
}

export class InfoPanel extends CanvasPanel {
  constructor() {
    super(1024, 800, 0.62);
    this.data = null; this.index = 0; this.total = 1;
    this.mesh.visible = false;
  }
  show(data, index, total, { showNote = true, credit = '' } = {}) {
    this.data = data; this.index = index; this.total = total;
    this.showNote = showNote; this.credit = credit;
    this.draw(); this.mesh.visible = true;
  }
  hide() { this.mesh.visible = false; this.data = null; }
  layout(s) {
    // returns the list of draw ops and the total height at text scale s
    const ctx = this.ctx, d = this.data, W = this.canvas.width, pad = 48, maxW = W - pad * 2;
    const ops = []; let y = 44;
    ctx.font = `700 ${Math.round(46 * s)}px ${FONT}`;
    for (const l of wrap(ctx, d.title, maxW - 90)) { ops.push({ t: l, x: pad + 86, y, f: ctx.font, c: INK }); y += 54 * s; }
    y = Math.max(y, 44 + 70) + 14 * s;
    ctx.font = `400 ${Math.round(31 * s)}px ${FONT}`;
    for (const l of wrap(ctx, d.body, maxW)) { ops.push({ t: l, x: pad, y, f: ctx.font, c: INK }); y += 41 * s; }
    if (d.quote) {
      y += 16 * s; const qTop = y;
      ctx.font = `italic 400 ${Math.round(29 * s)}px Georgia, "Times New Roman", serif`;
      for (const l of wrap(ctx, '“' + d.quote.text + '”', maxW - 30)) { ops.push({ t: l, x: pad + 30, y, f: ctx.font, c: '#f1dcaa' }); y += 38 * s; }
      ctx.font = `400 ${Math.round(23 * s)}px ${FONT}`;
      ops.push({ t: `— ${d.quote.source}${this.credit ? ', ' + this.credit : ''}`, x: pad + 30, y: y + 4 * s, f: ctx.font, c: DIM }); y += 34 * s;
      ops.push({ bar: true, y0: qTop - 4, y1: y - 8 });
    }
    if (d.note && this.showNote) {
      y += 10 * s;
      ctx.font = `400 ${Math.round(23 * s)}px ${FONT}`;
      for (const l of wrap(ctx, d.note, maxW)) { ops.push({ t: l, x: pad, y, f: ctx.font, c: DIM }); y += 30 * s; }
    }
    if (d.think) {
      y += 18 * s;
      ctx.font = `700 ${Math.round(22 * s)}px ${FONT}`;
      ops.push({ t: 'THINK ABOUT IT', x: pad, y, f: ctx.font, c: GOLD }); y += 32 * s;
      ctx.font = `600 ${Math.round(30 * s)}px ${FONT}`;
      for (const l of wrap(ctx, d.think, maxW)) { ops.push({ t: l, x: pad, y, f: ctx.font, c: INK }); y += 40 * s; }
    }
    return { ops, height: y };
  }
  draw() {
    if (!this.data) return;
    const ctx = this.ctx, W = this.canvas.width, Hc = this.canvas.height;
    const footer = 110;
    let s = 1, L = this.layout(s);
    while (L.height > Hc - footer - 10 && s > 0.6) { s -= 0.04; L = this.layout(s); }
    ctx.clearRect(0, 0, W, Hc);
    roundRect(ctx, 4, 4, W - 8, Hc - 8, 36);
    ctx.fillStyle = 'rgba(22,19,16,0.93)'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = GOLD; ctx.stroke();
    // number badge
    ctx.beginPath(); ctx.arc(48 + 32, 44 + 30, 32, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
    ctx.fillStyle = '#1a1612'; ctx.font = `800 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(this.index + 1), 48 + 32, 44 + 31);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for (const op of L.ops) {
      if (op.bar) { ctx.fillStyle = GOLD; ctx.fillRect(48, op.y0, 6, op.y1 - op.y0); continue; }
      ctx.font = op.f; ctx.fillStyle = op.c; ctx.fillText(op.t, op.x, op.y);
    }
    const by = Hc - footer + 18, bh = 74;
    this.buttons = [
      { id: 'prev', x: 48, y: by, w: 250, h: bh },
      { id: 'close', x: W / 2 - 125, y: by, w: 250, h: bh },
      { id: 'next', x: W - 48 - 250, y: by, w: 250, h: bh },
    ];
    this.drawButton(this.buttons[0], '‹  Back');
    this.drawButton(this.buttons[1], 'Close', true);
    this.drawButton(this.buttons[2], 'Next  ›');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `400 22px ${FONT}`; ctx.fillStyle = DIM;
    this.tex.needsUpdate = true;
  }
}

export class Toolbar extends CanvasPanel {
  constructor() {
    super(1400, 150, 0.84);
    this.small = false; this.labels = true;
    this.draw();
  }
  draw() {
    const ctx = this.ctx, W = this.canvas.width, Hc = this.canvas.height;
    ctx.clearRect(0, 0, W, Hc);
    roundRect(ctx, 4, 4, W - 8, Hc - 8, 40);
    ctx.fillStyle = 'rgba(22,19,16,0.9)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = GOLD; ctx.stroke();
    const items = [
      ['left', 'Turn ‹', 180], ['right', 'Turn ›', 180], ['size', this.small ? 'Life size' : 'Table size', 230],
      ['move', 'Move', 170], ['labels', this.labels ? 'Hide dots' : 'Show dots', 230], ['exit', 'Exit', 150],
    ];
    const gap = 24, total = items.reduce((a, i) => a + i[2], 0) + gap * (items.length - 1);
    let x = (W - total) / 2; const h = 92, y = (Hc - h) / 2;
    this.buttons = [];
    for (const [id, label, w] of items) {
      const b = { id, x, y, w, h }; this.buttons.push(b);
      this.drawButton(b, label, id === 'exit');
      x += w + gap;
    }
    this.tex.needsUpdate = true;
  }
}

// Numbered marker texture
export function makeMarkerTexture(n) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fillStyle = 'rgba(212,175,106,0.95)'; ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = '#fff8e6'; ctx.stroke();
  ctx.fillStyle = '#1a1612'; ctx.font = `800 64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class HintPanel extends CanvasPanel {
  constructor() { super(1024, 180, 0.6); this.text = ''; this.mesh.visible = false; }
  setText(text) {
    if (text === this.text) return;
    this.text = text;
    const ctx = this.ctx, W = this.canvas.width, Hc = this.canvas.height;
    ctx.clearRect(0, 0, W, Hc);
    roundRect(ctx, 4, 4, W - 8, Hc - 8, 40);
    ctx.fillStyle = 'rgba(22,19,16,0.85)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = GOLD; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `600 38px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = wrap(ctx, text, W - 80);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, Hc / 2 + (i - (lines.length - 1) / 2) * 48));
    this.tex.needsUpdate = true;
  }
}
