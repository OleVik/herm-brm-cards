#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Command, InvalidArgumentError, Option } from "commander";
import { buildModel, qaReport } from "./model.js";
import { buildPdfs } from "./pdf.js";
import { buildKit } from "./kit.js";
import { SEGMENTS, CHAINS, TEMPLATE_VERSION, HELP, LICENSE } from "./config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const PARTS = ["json", "html", "qa", "pdf", "kit"];

function parseLangs(v) {
  const l = v
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (
    !l.length ||
    l.length > 2 ||
    new Set(l).size !== l.length ||
    l.some((x) => !["NO", "EN"].includes(x))
  )
    throw new InvalidArgumentError(
      'use "NO,EN", "EN,NO", or a single language',
    );
  return l;
}

const program = new Command()
  .name("herm-brm")
  .description(
    "Build HERM BRM model JSON, a self-contained HTML view, and printable EN/NO sheets and cards from Excel sources.\n" +
      "Outputs: json (model.json), html (index.html), qa (qa_report.md), pdf (level 0-2 sheets), kit (workshop poster, worksheet, deck).",
  )
  .option(
    "--en <file>",
    "authoritative English catalogue",
    "data/HERM-BRM.xlsx",
  )
  .option("--no <file>", "Norwegian translation workbook", "data/norsk.xlsx")
  .option("--out <dir>", "output directory", "docs")
  .option(
    "--language-priorities <list>",
    "first = primary (full colour), second = muted",
    parseLangs,
    ["NO", "EN"],
  )
  .addOption(
    new Option(
      "--a6-layout <layout>",
      "A6 cards on A4 sheets (4-up) or one per A6 page",
    )
      .choices(["4up", "single"])
      .default("4up"),
  )
  .addOption(
    new Option("--only <parts...>", "build only these outputs").choices(PARTS),
  );
// shorthand flags: --only-html, --only-pdf, ... (can be combined)
for (const p of PARTS) program.option(`--only-${p}`, `same as --only ${p}`);
program.parse();
const o = program.opts();
const chosen = new Set([
  ...(o.only ?? []),
  ...PARTS.filter((p) => o[`only${p[0].toUpperCase()}${p.slice(1)}`]),
]);
const want = (p) => !chosen.size || chosen.has(p);

const phases = Object.fromEntries(
  Object.keys(CHAINS).map((c) => [
    c,
    SEGMENTS.filter((s) => s.chain === c && !s.span).map((s) => ({
      EN: s.seg,
      NO: s.no,
    })),
  ]),
);

let data;
try {
  data = await buildModel(o.en, o.no);
} catch (e) {
  console.error(
    `✗ could not read the Excel sources (${o.en}, ${o.no}): ${e.message}`,
  );
  process.exit(1);
}
const { model, nodes, noRows } = data;
model.langs = o.languagePriorities;
await fs.mkdir(o.out, { recursive: true });

/** jsPDF is inlined into index.html so PDF export works offline. If it is missing, still build the page without it. */
async function loadJsPdf() {
  try {
    const src = await fs.readFile(
      require.resolve("jspdf/dist/jspdf.umd.min.js"),
      "utf8",
    );
    return src.replace(/<\/script/gi, "<\\/script");
  } catch {
    console.warn(
      '⚠ jspdf is not installed (run "yarn install" or "npm install"): index.html is built WITHOUT PDF export',
    );
    return "";
  }
}

const steps = {
  json: async () =>
    fs.writeFile(
      path.join(o.out, "model.json"),
      JSON.stringify(model, null, 1),
    ),
  html: async () => {
    const tpl = await fs.readFile(path.join(here, "template.html"), "utf8");
    const found = tpl.match(
      /name="herm-template-version" content="(\d+)"/,
    )?.[1];
    if (
      Number(found) !== TEMPLATE_VERSION ||
      !["__DATA__", "__V__", "__JSPDF__"].every((k) => tpl.includes(k))
    )
      throw new Error(
        `src/template.html is out of date (version ${
          found ?? "unmarked"
        }, this build needs ${TEMPLATE_VERSION}). ` +
          "Older templates lack selection, saving, import and export. Replace src/template.html with the latest one (or unzip the full source).",
      );
    const json = JSON.stringify({
      ...model,
      help: HELP,
      license: LICENSE,
    }).replace(/</g, "\\u003c");
    const jspdf = await loadJsPdf();
    await fs.writeFile(
      path.join(o.out, "index.html"),
      tpl
        .replaceAll("__V__", model.version)
        .replace("__DATA__", () => json)
        .replace("__JSPDF__", () => jspdf),
    );
    console.log(
      `html: ${path.join(o.out, "index.html")} (template v${found}, PDF export ${
        jspdf ? "included" : "MISSING"
      })`,
    );
  },
  qa: async () =>
    fs.writeFile(path.join(o.out, "qa_report.md"), qaReport({ nodes, noRows })),
  kit: async () => {
    const r = await buildKit({
      model,
      nodes,
      outDir: o.out,
      langs: o.languagePriorities,
      phases,
    });
    console.log(
      "kit:",
      r.info,
      `${r.cards} cards on ${r.sheets} A4 sheets`,
      r.files.map((f) => path.basename(f)).join(" "),
    );
  },
  pdf: async () => {
    const r = await buildPdfs({
      model,
      nodes,
      outDir: o.out,
      langs: o.languagePriorities,
      a6Layout: o.a6Layout,
      phases,
    });
    console.log(
      "pdf:",
      r.counts,
      r.files.map((f) => path.basename(f)).join(" "),
    );
  },
};

// Each output is built independently: one failing step must not stop the others.
const failed = [];
for (const p of PARTS) {
  if (!want(p)) continue;
  try {
    await steps[p]();
  } catch (e) {
    failed.push(p);
    console.error(`✗ ${p} failed: ${e.stack ?? e.message}`);
  }
}
if (failed.length) {
  console.error(`\nFailed: ${failed.join(", ")}`);
  process.exitCode = 1;
}
