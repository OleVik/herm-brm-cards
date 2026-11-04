import ExcelJS from 'exceljs';
import { DOMAINS, CHAINS, SEGMENTS, VERSION, LAYOUT_COLS } from './config.js';

// phase index range covered by a segment; 'Recruit - Confer' -> Recruit..Confer
const rangeOf = (seg, phases) => {
  if (!seg) return null;
  const ix = seg.span ? seg.seg.split(' - ').map((n) => phases.findIndex((p) => p.seg === n)) : [phases.indexOf(seg)];
  return [ix[0], ix[ix.length - 1]];
};

export const clean = (s) => (s == null ? '' : String(s)).normalize('NFKC').replace(/\s+/g, ' ').trim();

async function readTable(file, headerRow) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const heads = [];
  ws.getRow(headerRow).eachCell((c, i) => { heads[i] = clean(c.text); });
  const rows = [];
  ws.eachRow((row, n) => {
    if (n <= headerRow) return;
    const o = {};
    heads.forEach((h, i) => { if (h && !(h in o)) o[h] = clean(row.getCell(i).text); });
    rows.push(o);
  });
  return rows;
}

export async function buildModel(enFile, noFile) {
  const enRows = (await readTable(enFile, 1)).filter((r) => /^BC\d+$/.test(r['Capability Code']));
  const noRows = (await readTable(noFile, 2)).filter((r) => /^BC\d+$/.test(r.Code));
  const no = new Map(noRows.map((r) => [r.Code, r]));

  const nodes = new Map();
  for (const r of enRows) {
    const n = no.get(r['Capability Code']);
    nodes.set(r['Capability Code'], {
      code: r['Capability Code'], level: Number(r['Capability Level']), type: r['Capability Type'],
      chain: r['Value Chain'], segment: r['Value Chain Segment'], parent: r['Parent Capability'].split(' ')[0] || null,
      en: r['Capability Name'], en_desc: r['Capability Description'], notes: r['Capability Notes'],
      no: n?.Name ?? '', no_desc: n?.Description ?? '', kids: [],
    });
  }
  for (const o of nodes.values()) if (o.parent) nodes.get(o.parent).kids.push(o);
  // children inherit stream/phase from their L1 parent
  for (const o of nodes.values()) {
    const top = o.parent ? nodes.get(o.parent) : o;
    o.stream = top.type === 'Enabling' ? 'Enabling' : top.chain;
    const seg = SEGMENTS.find((s) => s.chain === top.chain && s.seg === top.segment);
    const phases = SEGMENTS.filter((s) => s.chain === top.chain && !s.span);
    Object.assign(o, { segEn: seg?.seg ?? '', segNo: seg?.no ?? '', span: !!seg?.span,
      phaseRange: rangeOf(seg, phases), phaseCount: seg ? phases.length : 0,
      cols: o.level === 1 ? (LAYOUT_COLS[o.code] ?? LAYOUT_COLS.default) : undefined });
  }
  const l1 = [...nodes.values()].filter((o) => o.level === 1);
  const chains = Object.entries(CHAINS).map(([key, c]) => ({
    ...c, segments: SEGMENTS.filter((s) => s.chain === key).map((s) => ({
      id: s.id, en: s.seg, no: s.no, span: !!s.span,
      range: rangeOf(s, SEGMENTS.filter((x) => x.chain === key && !x.span)),
      caps: l1.filter((o) => o.chain === key && o.segment === s.seg) })),
  }));
  const model = { version: VERSION, langs: ['NO', 'EN'], domains: [
    { ...DOMAINS.Core, chains },
    { ...DOMAINS.Enabling, caps: l1.filter((o) => o.type === 'Enabling') }] };
  return { model, nodes, noRows: no };
}

export function qaReport({ nodes, noRows }) {
  const ec = new Set(nodes.keys()), nc = new Set(noRows.keys());
  const norm = (s) => clean(s).replace(/[’”"]/g, "'").replace(/'+$/, '');
  const L = [`# QA report – EN catalogue (HERM ${VERSION}) vs NO workbook`, '',
    `EN: ${ec.size} capabilities · NO rows: ${nc.size} · matched: ${[...ec].filter((c) => nc.has(c)).length}`, '',
    '## In EN but without Norwegian text (cards show a placeholder)',
    ...[...ec].filter((c) => !nc.has(c)).map((c) => `- ${c} ${nodes.get(c).en} (parent ${nodes.get(c).parent})`), '',
    '## In NO but not in EN (retired/renumbered – excluded: no parent or order)',
    ...[...nc].filter((c) => !ec.has(c)).map((c) => `- ${c} ${noRows.get(c).Name}`), '',
    '## English text in the NO workbook differs from the authoritative EN catalogue',
    ...[...ec].filter((c) => nc.has(c) && norm(nodes.get(c).en_desc) !== norm(noRows.get(c)['Description (English)']))
      .map((c) => `- ${c} ${nodes.get(c).en}`), '',
    '## Open reviewer questions in the NO workbook',
    ...[...nc].filter((c) => noRows.get(c)['Revisjon merknad'].includes('?')).map((c) => `- ${c}: ${noRows.get(c)['Revisjon merknad']}`)];
  return L.join('\n') + '\n';
}
