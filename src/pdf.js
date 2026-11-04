import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { PAPER, TILE, STREAM_COLORS, INK, MUTED, LABELS, VERSION } from './config.js';

const mm = (v) => (v * 72) / 25.4;
const FONT = { r: 'Helvetica', b: 'Helvetica-Bold', i: 'Helvetica-Oblique' };
const FOOT = `HERM ${VERSION} Business Reference Model · CC BY-NC-SA 4.0 · CAUDIT / EDUCAUSE / UCISA / EUNIS`;

// ---------- language helpers: P = primary (full colour), S = secondary (muted) ----------
const pick = (o, L, k = 'name') => (k === 'name' ? (L === 'NO' ? o.no : o.en) : L === 'NO' ? o.no_desc : o.en_desc) || '';
const segName = (o, L) => (L === 'NO' ? o.segNo : o.segEn);
const col = (o) => STREAM_COLORS[o.stream];

// ---------- low-level drawing ----------
function oneLine(doc, text, { x, y, w, font = FONT.r, size, min = 4, color = INK, align = 'left' }) {
  let s = size;
  doc.font(font);
  while (s > min && doc.fontSize(s).widthOfString(text) > w) s -= 0.25;
  doc.fontSize(s).fillColor(color).text(text, x, y, { width: w, align, lineBreak: false, ellipsis: true });
  return s * 1.2;
}
/** Draw wrapped text, shrinking the font until it fits in h. Returns height used. */
function fitText(doc, text, { x, y, w, h, font = FONT.r, size, min = 5, color = INK, align = 'left' }) {
  let s = size, gap = () => s * 0.15;
  doc.font(font);
  const words = text.split(/\s+/);
  const tooBig = () => doc.fontSize(s).heightOfString(text, { width: w, lineGap: gap() }) > h ||
    words.some((t) => doc.widthOfString(t) > w); // never break inside a word while it can still shrink
  while (s > min && tooBig()) s -= 0.25;
  const used = doc.fontSize(s).heightOfString(text, { width: w, lineGap: gap() });
  doc.fillColor(color).text(text, x, y, { width: w, height: h, lineGap: gap(), align, ellipsis: true });
  return Math.min(used, h);
}
/** Primary/secondary text pair. Missing text becomes a muted placeholder. */
function langStyle(o, L, k, primary) {
  const t = pick(o, L, k);
  if (t) return { t, font: primary && k === 'name' ? FONT.b : FONT.r, color: primary ? INK : MUTED };
  return { t: LABELS[L][k === 'name' ? 'missingName' : 'missingDesc'], font: FONT.i, color: MUTED };
}
function chevrons(doc, { x, y, w, h, items, weights, active, c, fs, secondary }) {
  const n = items.length, notch = h * 0.28, gap = mm(1.2), ws = weights || items.map(() => 1);
  const tot = ws.reduce((p, q) => p + q, 0), usable = w - (notch - gap), cells = [];
  let acc = 0;
  items.forEach((it, i) => {
    const a = x + (usable * acc) / tot; acc += ws[i];
    const cr = x + (usable * acc) / tot, bx = cr + notch - gap;
    cells.push({ x: a, w: cr - a });
    const on = !!active && i >= active[0] && i <= active[1];
    const pts = [[a, y], [bx - notch, y], [bx, y + h / 2], [bx - notch, y + h], [a, y + h]];
    if (i > 0) pts.push([a + notch, y + h / 2]);
    doc.polygon(...pts).fill(on ? c.dark : c.light);
    const tx = a + (i > 0 ? notch : 0) + mm(1), tw = bx - a - notch * (i > 0 ? 2 : 1) - mm(2);
    const h1 = fs * 1.2, h2 = secondary && it.S ? fs * 0.62 * 1.2 : 0, ty = y + (h - h1 - h2) / 2;
    oneLine(doc, it.P, { x: tx, y: ty, w: tw, font: FONT.b, size: fs, color: on ? '#fff' : INK, align: 'center' });
    if (h2) oneLine(doc, it.S, { x: tx, y: ty + h1, w: tw, size: fs * 0.62, color: on ? c.light : MUTED, align: 'center' });
  });
  return { cells };
}
const dashedBox = (doc, x, y, w, h, color, r = 2) =>
  doc.roundedRect(x, y, w, h, mm(r)).lineWidth(0.6).dash(mm(2), { space: mm(1.5) }).stroke(color).undash();
const footer = (doc, pw, ph, extra) => {
  oneLine(doc, `${extra}  ·  ${FOOT}`, { x: mm(8), y: ph - mm(6), w: pw - mm(16), size: 5.5, color: MUTED });
};
function phaseItems(o, env) {
  // phase names for the stream that node `o` belongs to
  return env.phases[o.stream].map((s) => ({ P: s[env.P], S: env.S && s[env.S] }));
}

// ---------- LEVEL 0: A3 board, one per stream ----------
function drawBoards(doc, env) {
  const [w, h] = PAPER.A3.slice().reverse(), W = mm(w), H = mm(h), M = mm(12);
  const itemList = (items, x, y, bw, maxH) => {
    let cy = y;
    for (const o of items) {
      const a = langStyle(o, env.P, 'name', true), b = env.S && langStyle(o, env.S, 'name', false);
      cy += fitText(doc, `${o.code}\n${a.t}`, { x, y: cy, w: bw, h: mm(16), font: a.font, size: 10.5, color: a.color, min: 6 }) + mm(0.8);
      if (b) cy += fitText(doc, b.t, { x: x + mm(1), y: cy, w: bw - mm(1), h: mm(10), font: b.font, size: 8, color: b.color, min: 6 }) + mm(2);
    }
  };
  const title = (x, o, c) => {
    const a = langStyle(o, env.P, 'name', true), b = env.S && langStyle(o, env.S, 'name', false);
    oneLine(doc, a.t, { x, y: mm(10), w: W - 2 * M, font: FONT.b, size: 30, color: c.dark });
    if (b) oneLine(doc, b.t, { x, y: mm(23), w: W - 2 * M, size: 16, color: MUTED });
  };
  for (const ch of env.model.domains[0].chains) {
    doc.addPage({ size: [W, H], margin: 0 });
    const c = STREAM_COLORS[ch.en], phases = ch.segments.filter((s) => !s.span), spans = ch.segments.filter((s) => s.span);
    title(M, ch, c);
    const weights = phases.map((g) => g.caps.reduce((q, o) => q + o.cols, 0));
    const { cells } = chevrons(doc, { x: M, y: mm(38), w: W - 2 * M, h: mm(26), c, fs: 20, secondary: !!env.S, weights,
      active: null, items: phases.map((g) => ({ P: g[env.P.toLowerCase()], S: env.S && g[env.S.toLowerCase()] })) });
    const spanTop = mm(222), zy = mm(70), full = H - mm(14);
    phases.forEach((g, i) => {
      // a phase covered by a spanning group stops above it; others (e.g. Design) run to the bottom
      const covered = spans.some((q) => i >= q.range[0] && i <= q.range[1]);
      const zx = cells[i].x, zw = cells[i].w - mm(2), bottom = covered ? spanTop - mm(7) : full;
      dashedBox(doc, zx, zy, zw, bottom - zy, c.mid);
      itemList(g.caps, zx + mm(3), zy + mm(3), zw - mm(6));
    });
    spans.forEach((g) => {
      const x0 = cells[g.range[0]].x, x1 = cells[g.range[1]].x + cells[g.range[1]].w - mm(2);
      dashedBox(doc, x0, spanTop, x1 - x0, full - spanTop, c.mid);
      oneLine(doc, g[env.P.toLowerCase()], { x: x0 + mm(3), y: spanTop + mm(3), w: mm(200), font: FONT.b, size: 9, color: c.dark });
      g.caps.forEach((o, i) => itemList([o], x0 + mm(3) + i * mm(120), spanTop + mm(10), mm(112)));
    });
    footer(doc, W, H, `${LABELS[env.P].level} 0 · A3`);
  }
  const en = env.model.domains[1], c = STREAM_COLORS.Enabling;
  doc.addPage({ size: [W, H], margin: 0 });
  title(M, en, c);
  const cols = 5, gw = (W - 2 * M - (cols - 1) * mm(4)) / cols, rows = Math.ceil(en.caps.length / cols);
  const gh = (H - mm(48) - mm(14) - (rows - 1) * mm(4)) / rows;
  en.caps.forEach((o, i) => {
    const x = M + (i % cols) * (gw + mm(4)), y = mm(40) + Math.floor(i / cols) * (gh + mm(4));
    doc.roundedRect(x, y, gw, mm(8), 0).fill(c.dark);
    dashedBox(doc, x, y + mm(8), gw, gh - mm(8), c.mid, 0);
    itemList([o], x + mm(3), y + mm(11), gw - mm(6));
  });
  footer(doc, W, H, `${LABELS[env.P].level} 0 · A3`);
}

// ---------- tile (level 2, names only) ----------
export function drawTile(doc, o, x, y, env) {
  const W = mm(TILE.w), H = mm(TILE.h), c = col(o);
  doc.save().roundedRect(x, y, W, H, mm(2)).clip().rect(x, y, W, mm(2.6)).fill(c.dark).restore();
  doc.roundedRect(x, y, W, H, mm(2)).lineWidth(0.6).stroke(c.dark);
  oneLine(doc, o.code, { x: x + mm(3), y: y + mm(4), w: mm(20), font: FONT.b, size: 7.5, color: c.dark });
  oneLine(doc, o.parent, { x: x + W - mm(23), y: y + mm(4), w: mm(20), size: 6.5, color: MUTED, align: 'right' });
  const a = langStyle(o, env.P, 'name', true), b = env.S && langStyle(o, env.S, 'name', false);
  const bx = x + mm(3), bw = W - mm(6), by = y + mm(8), bh = mm(12.5);
  let s = 10.5;
  const hh = (t, f, z) => doc.font(f).fontSize(z).heightOfString(t, { width: bw });
  while (s > 6.5 && hh(a.t, a.font, s) + (b ? hh(b.t, b.font, s * 0.72) + 1 : 0) > bh) s -= 0.25;
  const used = fitText(doc, a.t, { x: bx, y: by, w: bw, h: bh, font: a.font, size: s, color: a.color, min: s });
  if (b) fitText(doc, b.t, { x: bx, y: by + used + 1, w: bw, h: bh - used, font: b.font, size: s * 0.72, color: b.color, min: s * 0.72 });
  // phase dots (placement within the value stream) + grandparent label
  const by2 = y + H - mm(3.2);
  if (o.phaseCount) {
    for (let i = 0; i < o.phaseCount; i++) {
      doc.circle(x + mm(3.8) + i * mm(2.6), by2, mm(0.9)).fill(i >= o.phaseRange[0] && i <= o.phaseRange[1] ? c.dark : c.mid);
    }
  }
  const gp = o.phaseCount ? segName(o, env.P) : env.nodes.get(o.parent)[env.P === 'NO' ? 'no' : 'en'];
  oneLine(doc, gp, { x: x + mm(22), y: by2 - mm(1.2), w: W - mm(25), size: 6, color: MUTED, align: 'right' });
}

// ---------- LEVEL 1: A4 landscape mat with slots for its tiles ----------
function drawMats(doc, env, l1s) {
  const W = mm(297), H = mm(210), M = mm(10), sw = mm(TILE.w + 2), sh = mm(TILE.h + 2), g = mm(3);
  for (const o of l1s) {
    doc.addPage({ size: [W, H], margin: 0 });
    const c = col(o);
    if (o.phaseCount) {
      chevrons(doc, { x: M, y: M, w: W - 2 * M, h: mm(13), c, fs: 10, items: phaseItems(o, env), active: o.phaseRange });
    } else {
      doc.rect(M, M, W - 2 * M, mm(13)).fill(c.dark);
      oneLine(doc, env.model.domains[1][env.P.toLowerCase()], { x: M + mm(4), y: M + mm(3.2), w: W, font: FONT.b, size: 13, color: '#fff' });
    }
    oneLine(doc, `${o.code}  ·  ${LABELS[env.P].level} 1`, { x: M, y: mm(28), w: mm(120), font: FONT.b, size: 9, color: c.dark });
    const a = langStyle(o, env.P, 'name', true), b = env.S && langStyle(o, env.S, 'name', false);
    const u = fitText(doc, a.t, { x: M, y: mm(34), w: mm(122), h: mm(26), font: a.font, size: 24, color: a.color, min: 14 });
    if (b) fitText(doc, b.t, { x: M, y: mm(35) + u, w: mm(122), h: mm(14), font: b.font, size: 13, color: b.color });
    const da = langStyle(o, env.P, 'desc', true), db = env.S && langStyle(o, env.S, 'desc', false);
    const du = fitText(doc, da.t, { x: mm(140), y: mm(28), w: mm(147), h: mm(30), font: da.font, size: 11, color: da.color, min: 8 });
    if (db) fitText(doc, db.t, { x: mm(140), y: mm(30) + du, w: mm(147), h: mm(50) - du, font: db.font, size: 8.5, color: db.color, min: 6 });
    const cols = 4, y0 = mm(82);
    o.kids.forEach((k, i) => {
      const x = M + (i % cols) * (sw + g), y = y0 + Math.floor(i / cols) * (sh + mm(2));
      dashedBox(doc, x, y, sw, sh, c.mid);
      oneLine(doc, k.code, { x: x + mm(3), y: y + mm(2), w: mm(30), size: 7, color: c.mid, font: FONT.b });
    });
    footer(doc, W, H, `${LABELS[env.P].level} 1 · A4 · ${o.code}`);
  }
}

// ---------- LEVEL 2: A5 sheets of cut-out tiles, one parent per sheet (split evenly if > capacity) ----------
function drawTileSheets(doc, env, l1s) {
  const W = mm(148), H = mm(210), cols = 2, gx = mm(4), gy = mm(2), tw = mm(TILE.w), th = mm(TILE.h);
  const rows = Math.floor((H - mm(16) + gy) / (th + gy)), cap = cols * rows;
  const x0 = (W - cols * tw - (cols - 1) * gx) / 2, y0 = mm(7);
  for (const o of l1s) {
    const pages = Math.ceil(o.kids.length / cap), per = Math.ceil(o.kids.length / pages);
    for (let p = 0; p < pages; p++) {
      doc.addPage({ size: [W, H], margin: 0 });
      o.kids.slice(p * per, (p + 1) * per).forEach((k, i) =>
        drawTile(doc, k, x0 + (i % cols) * (tw + gx), y0 + Math.floor(i / cols) * (th + gy), env));
      const nm = langStyle(o, env.P, 'name', true).t;
      oneLine(doc, `${LABELS[env.P].level} 2 · A5 · ${o.code} ${nm}${pages > 1 ? ` (${p + 1}/${pages})` : ''} · ${LABELS[env.P].sheet.toLowerCase()} for utklipp / cut-out`,
        { x: mm(8), y: H - mm(6), w: W - mm(16), size: 5.5, color: MUTED });
    }
  }
}

// ---------- LEVEL 2: A6 discussion cards (names + descriptions) ----------
function drawCard(doc, o, x, y, env) {
  const W = mm(105), H = mm(148), c = col(o), M = mm(7), par = env.nodes.get(o.parent);
  doc.rect(x, y, W, mm(22)).fill(c.dark);
  oneLine(doc, o.code, { x: x + M, y: y + mm(4), w: mm(40), font: FONT.b, size: 15, color: '#fff' });
  oneLine(doc, `${LABELS[env.P].level} 2`, { x: x + W - M - mm(30), y: y + mm(5.5), w: mm(30), size: 8, color: c.light, align: 'right' });
  const path = (L) => `${o.phaseCount ? segName(o, L) : env.model.domains[1][L.toLowerCase()]} › ${par.code} ${pick(par, L) || '…'}`;
  oneLine(doc, path(env.P), { x: x + M, y: y + mm(11.5), w: W - 2 * M, size: 7, color: '#fff' });
  if (env.S) oneLine(doc, path(env.S), { x: x + M, y: y + mm(16), w: W - 2 * M, size: 6.5, color: c.light });
  let cy = y + mm(26);
  if (o.phaseCount) {
    chevrons(doc, { x: x + M, y: cy, w: W - 2 * M, h: mm(6), c, fs: 5.5, items: phaseItems(o, env), active: o.phaseRange });
    cy += mm(10);
  }
  const bodyW = W - 2 * M, bottom = y + H - mm(16);
  const put = (L, k, primary, size, maxH) => {
    const s = langStyle(o, L, k, primary);
    const u = fitText(doc, s.t, { x: x + M, y: cy, w: bodyW, h: Math.min(maxH, bottom - cy), font: s.font, size, color: s.color });
    cy += u + mm(2);
  };
  put(env.P, 'name', true, 17, mm(22)); put(env.P, 'desc', true, 11, mm(38));
  if (env.S) {
    doc.moveTo(x + M, cy + mm(1)).lineTo(x + W - M, cy + mm(1)).lineWidth(0.4).stroke(c.mid); cy += mm(4);
    put(env.S, 'name', false, 10.5, mm(14)); put(env.S, 'desc', false, 8.5, mm(26));
  }
  oneLine(doc, `${LABELS[env.P].placeOn}: ${par.code} ${pick(par, env.P) || par.en}${o.phaseCount ? ` (${segName(o, env.P)})` : ''}`,
    { x: x + M, y: y + H - mm(12), w: bodyW, font: FONT.b, size: 7, color: c.dark });
  oneLine(doc, FOOT, { x: x + M, y: y + H - mm(7), w: bodyW, size: 4.5, color: MUTED });
  doc.rect(x, y, W, H).lineWidth(0.4).dash(mm(1.5), { space: mm(1.5) }).stroke('#b0b6bd').undash();
}
function drawCards(doc, env, l2s, layout) {
  const W = mm(105), H = mm(148);
  if (layout === 'single') {
    for (const o of l2s) { doc.addPage({ size: [W, H], margin: 0 }); drawCard(doc, o, 0, 0, env); }
    return;
  }
  l2s.forEach((o, i) => {
    if (i % 4 === 0) doc.addPage({ size: [mm(210), mm(297)], margin: 0 });
    drawCard(doc, o, (i % 2) * W, mm(0.5) + Math.floor((i % 4) / 2) * H, env);
  });
}

// ---------- orchestration ----------
export async function writePdf(file, title, draw) {
  const doc = new PDFDocument({ autoFirstPage: false, margin: 0, info: { Title: title, Author: 'HERM BRM cards', Subject: 'CC BY-NC-SA 4.0' } });
  const out = fs.createWriteStream(file);
  doc.pipe(out);
  draw(doc);
  doc.end();
  await new Promise((res, rej) => { out.on('finish', res); out.on('error', rej); });
  return file;
}

/** Capabilities in model order: phase groups first, then spanning groups, then Enabling. */
export function orderedCapabilities(model) {
  const l1s = [], l2s = [];
  const walk = (o) => { l1s.push(o); l2s.push(...o.kids); };
  for (const ch of model.domains[0].chains) for (const s of ch.segments) if (!s.span) s.caps.forEach(walk);
  for (const ch of model.domains[0].chains) for (const s of ch.segments) if (s.span) s.caps.forEach(walk);
  model.domains[1].caps.forEach(walk);
  return { l1s, l2s };
}
/** A capability is missing a translation when a name or description is empty in either language. */
export const isMissing = (o) => !o.no || !o.no_desc || !o.en || !o.en_desc;

export async function buildPdfs({ model, nodes, outDir, langs, a6Layout, phases }) {
  const env = { model, nodes, P: langs[0], S: langs[1] ?? null, phases };
  const { l1s, l2s } = orderedCapabilities(model);
  const f = (n) => path.join(outDir, n);
  const t = `HERM BRM ${VERSION}`;
  const files = [
    await writePdf(f('1-level0-A3-boards.pdf'), `${t} – level 0 boards`, (d) => drawBoards(d, env)),
    await writePdf(f('2-level1-A4-mats.pdf'), `${t} – level 1 mats`, (d) => drawMats(d, env, l1s)),
    await writePdf(f('3-level2-A5-tiles.pdf'), `${t} – level 2 tiles`, (d) => drawTileSheets(d, env, l1s)),
    await writePdf(f(`4-level2-A6-cards${a6Layout === 'single' ? '-single' : ''}.pdf`), `${t} – level 2 cards`, (d) => drawCards(d, env, l2s, a6Layout)),
  ];
  return { files, counts: { boards: model.domains[0].chains.length + 1, mats: l1s.length, tiles: l2s.length, cards: l2s.length } };
}

export { mm, FONT, oneLine, fitText, langStyle, chevrons, pick, segName, col };
