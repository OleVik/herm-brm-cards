// Workshop kit: one A3 capability map per person, an A4 goal worksheet, and a shared A8 card deck (16 per A4).
import path from 'node:path';
import { STREAM_COLORS, INK, MUTED, LABELS, VERSION, CHAINS } from './config.js';
import { mm, FONT, oneLine, fitText, langStyle, chevrons, writePdf, pick, segName, col, orderedCapabilities, isMissing } from './pdf.js';

const RED = '#d32f2f';

/** Primary name (bold) with the secondary name muted beneath; shrinks until it fits and no word is broken. Units: pt. */
function nameBlock(doc, o, env, { x, y, w, h, max, min, prefix = '' }) {
  const a = langStyle(o, env.P, 'name', true), b = env.S && langStyle(o, env.S, 'name', false);
  a.t = prefix + a.t;
  const H = (t, f, z) => doc.font(f).fontSize(z).heightOfString(t, { width: w, lineGap: z * 0.15 });
  const wide = (t, f, z) => Math.max(...t.split(/\s+/).map((q) => doc.font(f).fontSize(z).widthOfString(q)));
  let s = max;
  const bad = () => H(a.t, a.font, s) + (b ? H(b.t, b.font, s * 0.75) + 1 : 0) > h ||
    wide(a.t, a.font, s) > w || (b && wide(b.t, b.font, s * 0.75) > w);
  while (s > min && bad()) s -= 0.2;
  const used = fitText(doc, a.t, { x, y, w, h, font: a.font, size: s, min: s, color: a.color });
  if (b) fitText(doc, b.t, { x, y: y + used + 1, w, h: Math.max(0, h - used - 1), font: b.font, size: s * 0.75, min: s * 0.75, color: b.color });
}
const tickBox = (doc, x, y, c) => doc.lineWidth(0.4).rect(x, y, mm(2.3), mm(2.3)).stroke(c.dark);
const bilingualLabel = (doc, env, key, x, y, size) => { // primary bold + secondary muted, same line
  const P = LABELS[env.P][key]; oneLine(doc, P, { x, y, w: mm(150), font: FONT.b, size, color: INK });
  if (env.S) oneLine(doc, LABELS[env.S][key], { x: x + doc.font(FONT.b).fontSize(size).widthOfString(P) + mm(2), y: y + size * 0.1, w: mm(150), size: size * 0.8, color: MUTED });
};

// ================= A3 poster: the whole model on one sheet =================
const MG = 6, GAP = 0.8, PAD = 1, TITLE = 6, CHEV = 6.5, HEAD = 5.5, HEADER = 12, FOOT = 5, W2 = 420 - 2 * MG, MINTW = 27;
export const boxH = (k, n, th) => PAD + TITLE + Math.ceil(k / n) * th + (Math.ceil(k / n) - 1) * GAP + PAD;

export function streamPlan(chain, th) {
  const ph = chain.segments.filter((s) => !s.span), sp = chain.segments.filter((s) => s.span);
  const wd = (g) => g.caps.reduce((a, o) => a + o.cols, 0);
  const units = (a, b) => ph.slice(a, b + 1).reduce((q, g) => q + wd(g), 0);
  const covered = (i) => sp.some((g) => i >= g.range[0] && i <= g.range[1]);
  const spanH = sp.map((g) => g.caps.map((o) => boxH(o.kids.length, units(...g.range), th)));
  const spanTotal = spanH.flat().reduce((a, v) => a + v + GAP, 0);
  let rowH = 0, free = 0;
  ph.forEach((g, i) => g.caps.forEach((o) => {
    const h = boxH(o.kids.length, o.cols, th);
    if (covered(i)) rowH = Math.max(rowH, h); else free = Math.max(free, h);
  }));
  rowH = Math.max(rowH, free - spanTotal);
  return { ph, sp, wd, units, covered, spanH, spanTotal, rowH, height: CHEV + 1.5 + rowH + spanTotal };
}
export function enablingPlan(caps, th, nc) {
  const bw = (W2 - (nc - 1) * GAP) / nc, tpr = Math.max(1, Math.floor((bw - 2 * PAD + GAP) / (MINTW + GAP)));
  const cols = Array(nc).fill(0);
  // longest-first packing into the shortest column, then model order within each column
  const sized = caps.map((o, i) => ({ o, i, h: boxH(o.kids.length, tpr, th) })).sort((a, b) => b.h - a.h);
  sized.forEach((b) => { b.c = cols.indexOf(Math.min(...cols)); cols[b.c] += b.h + GAP; });
  const run = Array(nc).fill(0);
  const placed = sized.slice().sort((a, b) => a.i - b.i).map((b) => { const y = run[b.c]; run[b.c] += b.h + GAP; return { o: b.o, c: b.c, y, h: b.h }; });
  return { bw, tpr, placed, height: Math.max(...cols) - GAP };
}

function posterTile(doc, o, x, y, w, h, env) {
  const c = col(o), miss = isMissing(o);
  doc.lineWidth(miss ? 0.9 : 0.3).roundedRect(x, y, w, h, mm(0.8)).fillAndStroke('#fff', miss ? RED : c.mid);
  oneLine(doc, o.code, { x: x + mm(1), y: y + mm(0.7), w: mm(12), font: FONT.b, size: 4.6, color: c.dark });
  tickBox(doc, x + w - mm(3.1), y + mm(0.8), c);
  nameBlock(doc, o, env, { x: x + mm(1), y: y + mm(3.4), w: w - mm(2), h: h - mm(3.9), max: 6.4, min: 4 });
}
function posterBox(doc, o, x, y, w, h, n, th, env) {
  const c = col(o), miss = isMissing(o);
  doc.lineWidth(miss ? 0.9 : 0.4).roundedRect(x, y, w, h, mm(1)).fillAndStroke(c.light, miss ? RED : c.mid);
  tickBox(doc, x + w - mm(PAD + 2.6), y + mm(PAD), c);
  nameBlock(doc, o, env, { x: x + mm(PAD + 0.3), y: y + mm(PAD), w: w - mm(2 * PAD + 3.2), h: mm(TITLE - 0.4), max: 6.8, min: 4.2, prefix: `${o.code}  ` });
  const tw = (w - mm(2 * PAD) - (n - 1) * mm(GAP)) / n, ty = y + mm(PAD + TITLE);
  o.kids.forEach((k, i) => posterTile(doc, k, x + mm(PAD) + (i % n) * (tw + mm(GAP)), ty + Math.floor(i / n) * mm(th + GAP), tw, mm(th), env));
}
function drawStream(doc, chain, y0, th, env) {
  const c = STREAM_COLORS[chain.en], pl = streamPlan(chain, th);
  const items = pl.ph.map((g) => ({ P: g[env.P.toLowerCase()], S: env.S && g[env.S.toLowerCase()] }));
  const { cells } = chevrons(doc, { x: mm(MG), y: y0, w: mm(W2), h: mm(CHEV), c, fs: 7.5, items, weights: pl.ph.map(pl.wd), active: null });
  const yRow = y0 + mm(CHEV + 1.5);
  pl.ph.forEach((g, i) => {
    let off = 0; const total = pl.wd(g);
    g.caps.forEach((o) => {
      const x = cells[i].x + (off / total) * cells[i].w, w = (o.cols / total) * cells[i].w - mm(GAP);
      posterBox(doc, o, x, yRow, w, mm(pl.covered(i) || !pl.sp.length ? pl.rowH : pl.rowH + pl.spanTotal - GAP), o.cols, th, env);
      off += o.cols;
    });
  });
  let yy = yRow + mm(pl.rowH + GAP);
  pl.sp.forEach((g, gi) => g.caps.forEach((o, k) => {
    const x0 = cells[g.range[0]].x, x1 = cells[g.range[1]].x + cells[g.range[1]].w - mm(GAP);
    posterBox(doc, o, x0, yy, x1 - x0, mm(pl.spanH[gi][k]), pl.units(...g.range), th, env);
    yy += mm(pl.spanH[gi][k] + GAP);
  }));
}
function heading(doc, env, o, y) {
  const c = STREAM_COLORS[o.key], a = o.P, size = 9;
  oneLine(doc, a, { x: mm(MG), y, w: mm(200), font: FONT.b, size, color: c.dark });
  if (o.S) oneLine(doc, o.S, { x: mm(MG) + doc.font(FONT.b).fontSize(size).widthOfString(a) + mm(2), y: y + 1, w: mm(200), size: 7, color: MUTED });
}

export function drawPoster(doc, env) {
  const W = mm(420), H = mm(297), chains = env.model.domains[0].chains, ena = env.model.domains[1];
  const lab = (o) => ({ P: o[env.P.toLowerCase()], S: env.S && o[env.S.toLowerCase()] });
  const avail = 297 - 2 * MG - FOOT - HEADER;
  let best = null;
  for (let th = 15; th >= 8.5 && !best; th -= 0.25) {
    for (const nc of [4, 5, 6, 7, 8]) {
      const e = enablingPlan(ena.caps, th, nc);
      const total = chains.reduce((q, c) => q + HEAD + streamPlan(c, th).height + 2, 0) + HEAD + e.height;
      if (total <= avail && (!best || e.height < best.e.height)) best = { th, nc, e, total };
    }
  }
  if (!best) throw new Error('poster: capabilities do not fit on one A3');
  const { th, e } = best;
  doc.addPage({ size: [W, H], margin: 0 });
  // header
  oneLine(doc, LABELS[env.P].posterTitle, { x: mm(MG), y: mm(MG), w: mm(200), font: FONT.b, size: 16, color: STREAM_COLORS['Learning & Teaching'].dark });
  if (env.S) oneLine(doc, `${LABELS[env.S].posterTitle}  ·  HERM ${VERSION}`, { x: mm(MG), y: mm(MG + 7), w: mm(200), size: 8, color: MUTED });
  for (const [i, k] of ['name', 'date'].entries()) {
    const x = mm(MG + 215 + i * 105); oneLine(doc, `${LABELS[env.P][k]}${env.S ? ' / ' + LABELS[env.S][k] : ''}`, { x, y: mm(MG + 3), w: mm(60), size: 6, color: MUTED });
    doc.lineWidth(0.4).moveTo(x, mm(MG + 8.5)).lineTo(x + mm(i ? 80 : 95), mm(MG + 8.5)).stroke(INK);
  }
  let y = mm(MG + HEADER);
  for (const ch of chains) {
    heading(doc, env, { ...lab(ch), key: ch.en }, y); y += mm(HEAD);
    drawStream(doc, ch, y, th, env); y += mm(streamPlan(ch, th).height + 2);
  }
  heading(doc, env, { ...lab(ena), key: 'Enabling' }, y); y += mm(HEAD);
  e.placed.forEach(({ o, c, y: oy, h }) => posterBox(doc, o, mm(MG + c * (e.bw + GAP)), y + mm(oy), mm(e.bw), mm(h), e.tpr, th, env));
  oneLine(doc, `HERM ${VERSION} Business Reference Model · CC BY-NC-SA 4.0 · CAUDIT / EDUCAUSE / UCISA / EUNIS  ·  ${env.P === 'NO' ? 'Kryss av kapabilitetene du bruker' : 'Tick the capabilities you use'}`,
    { x: mm(MG), y: H - mm(MG), w: mm(W2), size: 5.5, color: MUTED });
  return { tileHeightMm: th, enablingColumns: best.nc };
}

// ================= A4 worksheet: one goal -> value -> capabilities (HERM recipe-card style) =================
export function drawWorksheet(doc, env) {
  const W = 210, M = 12, iw = W - 2 * M, L = (k) => LABELS[env.P][k];
  doc.addPage({ size: [mm(210), mm(297)], margin: 0 });
  const dark = STREAM_COLORS['Learning & Teaching'].dark;
  doc.rect(0, 0, mm(210), mm(20)).fill(dark);
  oneLine(doc, L('wsTitle'), { x: mm(M), y: mm(5), w: mm(iw), font: FONT.b, size: 17, color: '#fff' });
  if (env.S) oneLine(doc, LABELS[env.S].wsTitle, { x: mm(M), y: mm(13), w: mm(iw), size: 9, color: '#cfdaf1' });
  const line = (x, y, w) => doc.lineWidth(0.4).moveTo(mm(x), mm(y)).lineTo(mm(x + w), mm(y)).stroke(INK);
  let y = 27;
  [['name', 70], ['unit', 70], ['period', 40]].reduce((x, [k, w]) => {
    bilingualLabel(doc, env, k, mm(x), mm(y - 5), 7); line(x, y + 2, w); return x + w + 4;
  }, M);
  const area = (key, hint, h) => {
    bilingualLabel(doc, env, key, mm(M), mm(y), 9);
    oneLine(doc, `${L(`${key}Hint`) ?? ''}${env.S && LABELS[env.S][`${key}Hint`] ? '  ·  ' + LABELS[env.S][`${key}Hint`] : ''}`, { x: mm(M), y: mm(y + 5), w: mm(iw), font: FONT.i, size: 6.5, color: MUTED });
    doc.lineWidth(0.5).roundedRect(mm(M), mm(y + 9), mm(iw), mm(h), mm(1.5)).stroke(dark);
    y += 9 + h + 5;
  };
  y = 40;
  area('goal', true, 36); area('value', true, 32);
  // measure has no hint key: reuse label only
  bilingualLabel(doc, env, 'measure', mm(M), mm(y), 9);
  doc.lineWidth(0.5).roundedRect(mm(M), mm(y + 6), mm(iw), mm(24), mm(1.5)).stroke(dark); y += 36;
  bilingualLabel(doc, env, 'caps', mm(M), mm(y), 9);
  oneLine(doc, `${L('capsHint')}${env.S ? '  ·  ' + LABELS[env.S].capsHint : ''}`, { x: mm(M), y: mm(y + 5), w: mm(iw), font: FONT.i, size: 6.5, color: MUTED });
  y += 10;
  const cw = (iw - 2 * 4) / 3, rows = 9;
  [CHAINS['Learning & Teaching'], CHAINS.Research, { en: 'Enabling', no: env.model.domains[1].no }].forEach((st, i) => {
    const c = STREAM_COLORS[st.en], x = M + i * (cw + 4);
    doc.rect(mm(x), mm(y), mm(cw), mm(7)).fill(c.dark);
    oneLine(doc, st[env.P.toLowerCase()], { x: mm(x + 2), y: mm(y + 1.4), w: mm(cw - 4), font: FONT.b, size: 8, color: '#fff' });
    if (env.S) oneLine(doc, st[env.S.toLowerCase()], { x: mm(x + 2), y: mm(y + 4.6), w: mm(cw - 4), size: 5, color: c.light });
    for (let r = 0; r < rows; r++) {
      const ry = y + 7 + r * 7.6;
      doc.rect(mm(x), mm(ry), mm(cw), mm(7.6)).lineWidth(0.3).fillAndStroke(r % 2 ? '#fff' : c.light, c.mid);
      oneLine(doc, 'BC', { x: mm(x + 1.5), y: mm(ry + 4.6), w: mm(8), font: FONT.b, size: 6, color: c.dark });
      doc.lineWidth(0.3).moveTo(mm(x + 9), mm(ry + 6.4)).lineTo(mm(x + cw - 1.5), mm(ry + 6.4)).stroke(c.dark);
    }
  });
  y += 7 + rows * 7.6 + 5;
  bilingualLabel(doc, env, 'notes', mm(M), mm(y), 9);
  doc.lineWidth(0.5).roundedRect(mm(M), mm(y + 6), mm(iw), mm(Math.max(15, 297 - M - y - 12)), mm(1.5)).stroke(dark);
  oneLine(doc, `HERM ${VERSION} · CC BY-NC-SA 4.0`, { x: mm(M), y: mm(297 - 7), w: mm(iw), size: 5.5, color: MUTED });
}

// ================= A8 card deck: 16 cards (4x4) per A4, abutting so a guillotine cuts the grid =================
const CW = 52, CH = 74;
function drawCard(doc, o, x, y, env) {
  const c = col(o), par = env.nodes.get(o.parent), m = mm(3.2), w = mm(CW) - 2 * m;
  doc.rect(x, y, mm(CW), mm(9.5)).fill(c.dark);
  oneLine(doc, o.code, { x: x + m, y: y + mm(1.4), w: mm(24), font: FONT.b, size: 9, color: '#fff' });
  oneLine(doc, `${LABELS[env.P].level} 2`, { x: x + mm(CW) - m - mm(14), y: y + mm(2.3), w: mm(14), size: 5.5, color: c.light, align: 'right' });
  const path = `${o.phaseCount ? segName(o, env.P) : env.model.domains[1][env.P.toLowerCase()]} › ${par.code} ${pick(par, env.P) || par.en}`;
  oneLine(doc, path, { x: x + m, y: y + mm(6.3), w, size: 4.8, color: '#fff' });
  const parts = [[env.P, 'name', true], [env.P, 'desc', true], ...(env.S ? [[env.S, 'name', false], [env.S, 'desc', false]] : [])]
    .map(([L, k, pri]) => ({ k, ...langStyle(o, L, k, pri) }));
  const avail = mm(CH - 9.5 - 3 - 7.5), gaps = mm(1) * 2 + (env.S ? mm(3) : 0);
  const H = (p, z) => doc.font(p.font).fontSize(p.k === 'name' ? z + 1 : z).heightOfString(p.t, { width: w, lineGap: z * 0.15 });
  let s = 8.5;
  const fits = () => parts.reduce((q, p) => q + H(p, s), 0) + gaps <= avail &&
    parts.every((p) => p.t.split(/\s+/).every((q) => doc.font(p.font).fontSize(p.k === 'name' ? s + 1 : s).widthOfString(q) <= w));
  while (s > 4.8 && !fits()) s -= 0.1;
  let cy = y + mm(9.5 + 2.2);
  parts.forEach((p, i) => {
    if (env.S && i === 2) { doc.lineWidth(0.3).moveTo(x + m, cy + mm(0.8)).lineTo(x + mm(CW) - m, cy + mm(0.8)).stroke(c.mid); cy += mm(3); }
    const sz = p.k === 'name' ? s + 1 : s, hh = H(p, s);
    fitText(doc, p.t, { x: x + m, y: cy, w, h: hh + 1, font: p.font, size: sz, min: sz, color: p.color });
    cy += hh + mm(1);
  });
  const by = y + mm(CH) - mm(3.6);
  if (o.phaseCount) for (let i = 0; i < o.phaseCount; i++)
    doc.circle(x + m + mm(0.8) + i * mm(2.2), by, mm(0.75)).fill(i >= o.phaseRange[0] && i <= o.phaseRange[1] ? c.dark : c.mid);
  oneLine(doc, `${LABELS[env.P].placeOn} ${par.code}`, { x: x + mm(CW) - m - mm(26), y: by - mm(1), w: mm(26), size: 4.6, color: MUTED, align: 'right' });
  doc.lineWidth(0.25).rect(x, y, mm(CW), mm(CH)).stroke('#cfd3d8');
}
export function drawDeck(doc, env, l2s) {
  l2s.forEach((o, i) => {
    if (i % 16 === 0) doc.addPage({ size: [mm(210), mm(297)], margin: 0 });
    const k = i % 16;
    drawCard(doc, o, mm(1) + (k % 4) * mm(CW), mm(0.5) + Math.floor(k / 4) * mm(CH), env);
  });
}

export async function buildKit({ model, nodes, outDir, langs, phases }) {
  const env = { model, nodes, P: langs[0], S: langs[1] ?? null, phases };
  const { l2s } = orderedCapabilities(model);
  const f = (n) => path.join(outDir, n), t = `HERM BRM ${VERSION}`;
  let info;
  const files = [
    await writePdf(f('A-poster-A3.pdf'), `${t} – capability map`, (d) => { info = drawPoster(d, env); }),
    await writePdf(f('B-worksheet-A4.pdf'), `${t} – goal worksheet`, (d) => drawWorksheet(d, env)),
    await writePdf(f('C-deck-A8-on-A4.pdf'), `${t} – card deck`, (d) => drawDeck(d, env, l2s)),
  ];
  return { files, info, cards: l2s.length, sheets: Math.ceil(l2s.length / 16) };
}
