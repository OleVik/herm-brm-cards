# HERM BRM cards

Builds teaching material for the Higher Education Reference Model (HERM) Business Reference Model from two Excel files: the English catalogue (authoritative) and a Norwegian translation, joined on capability code.

Outputs:

- `model.json`: the joined, ordered model (domain, value stream, phase, level 1, level 2).
- `index.html`: a self-contained, interactive view with selection, saving, import and export.
- `qa_report.md`: where the two workbooks disagree (missing translations, retired codes, differing English text).
- Four print PDFs: sheets for levels 0 to 2 (boards, mats, tiles, discussion cards).
- A workshop kit: an A3 capability map, an A4 goal worksheet and an A8 card deck.

## Getting started

Requirements: Node.js 18 or newer, and yarn or npm.

- Put the two workbooks in `data/`, or point to them with `--en` and `--no`.
  - Default English file: `data/HERM-BRM.xlsx`.
  - Default Norwegian file: `data/norsk.xlsx`.
- Install and build:
  - `yarn install` (or `npm install`). Re-run it after updating the source, because `jspdf` is needed for PDF export in `index.html`.
  - `yarn build` builds everything into `docs/`.

## Commands

- `yarn build`: everything (model, HTML, QA report, level 0 to 2 sheets, workshop kit).
- `yarn build:html`: only `index.html`.
- `yarn build:kit`: only the workshop kit.
- `yarn build:pdf`: only the level 0 to 2 sheets.
- `yarn build --only-html --only-qa`: shorthand flags, which can be combined.
- `yarn build --only html qa`: the same thing, written as a list.
- `yarn build --language-priorities="EN,NO" --a6-layout=single --out out-en`: options can be mixed freely.
- `node src/cli.js --help`: lists every option.

Parts: `json`, `html`, `qa`, `pdf` (level 0 to 2 sheets) and `kit` (workshop poster, worksheet and deck).

Behaviour to know about:

- Each part is built independently. A failure in one is reported at the end with a non-zero exit code, and the others still build.
- If `jspdf` is not installed, `index.html` is still built, without PDF export, and a warning says so.
- The build refuses an outdated `src/template.html` and says what to replace, so a stale template cannot silently produce a page without the newer features.

## Language and styling

- `--language-priorities="NO,EN"` is the default. The first language is primary (full colour, larger) and the second is muted.
- A single value, such as `"NO"`, prints one language only.
- Missing text becomes a grey placeholder on print, and a red border in `index.html`.
- Phase names, stream labels, the NTNU graphic-profile palette, paper sizes and interface strings are in `src/config.js`.
- Colour marks the value stream: NTNU-blå for Learning & Teaching, turquoise for Research, sand for Enabling. The phase is shown by a highlighted chevron or dot.
- `LAYOUT_COLS` in `src/config.js` sets whether a level-1 box is one or two tile-columns wide.

## The four sheet levels

Each level is a separate PDF. Print at 100 % ("actual size").

- `1-level0-A3-boards.pdf`: A3 landscape, 3 sheets.
  - One board per value stream (Learning & Teaching, Research) and one for Enabling.
  - Phase chevrons in flow order, with dashed zones that list which level-1 mats belong where.
  - No level-1 cards.
- `2-level1-A4-mats.pdf`: A4 landscape, 29 sheets.
  - One mat per level-1 capability, with its phase highlighted in the phase strip.
  - Name and description, plus dashed slots (labelled by code) sized for its level-2 tiles.
- `3-level2-A5-tiles.pdf`: A5 portrait, 31 sheets.
  - Names only, as 62×26 mm cut-out tiles, 14 per sheet, one parent per sheet.
  - A parent with more than 14 children is split evenly across sheets.
- `4-level2-A6-cards.pdf`: A6 cards, 4 per A4 sheet (use `--a6-layout=single` for one per A6 page), 156 cards.
  - Primary name and description, the second language muted, a breadcrumb and a "place on" line.

Physical use:

- Lay the A3 board down as the map and put each A4 mat in the order its zone shows.
- Cut the A5 sheet into tiles and place each tile in the slot with the same code.
- The A6 card is the "turn it over and discuss" companion to a tile, with the same code, colour and phase dots.

## Workshop kit

For a goal-setting workshop: each person links their goals for the next two years to the capabilities that create the value. Built with `yarn build:kit`, and also part of the default build.

- `A-poster-A3.pdf`: one A3 landscape sheet per person.
  - The whole model on one sheet: value-stream arrows, every level-1 box and every level-2 tile (code and name, with a tick box).
  - Missing translations have a red border.
  - Descriptions are read in `index.html`.
  - The largest tile height that fits one A3 is chosen automatically and reported when building.
- `B-worksheet-A4.pdf`: A4 portrait, one copy per goal.
  - Recipe-card style: goal, value for the university, how we know it is achieved, capabilities by stream (code and name), notes.
- `C-deck-A8-on-A4.pdf`: 10 A4 sheets per table.
  - 156 bilingual A8 cards (52×74 mm), 4×4 per A4 with no waste.
  - Cut with a guillotine: 3 vertical and 3 horizontal cuts per sheet, and stack-cut the copies.
  - Print on 160 to 200 gsm paper at actual size.

## index.html

`src/cli.js` builds it from three things: `src/template.html` (markup, CSS and JavaScript), the joined model (embedded inline), and jsPDF (inlined, for PDF export). The result is one self-contained file of about 575 KB with no external requests. It follows `--language-priorities`, including the language of the interface.

Layout:

- Value streams are block arrows in flow order. Groups that span several phases sit under those phases only.
- Each stream fills the page width, using flexible columns with no fixed widths.
- Below 1000 px the phases stack top to bottom, and all text wraps.
- A capability missing a name or description in either language gets a red border. The header shows the count, and hides it when nothing is missing.
- Search highlights matches and keeps their parent boxes readable. Non-matching items lose their fill and show muted text; text is never faded with opacity.
- The licence line from `LICENSE` in `src/config.js` is shown as small muted text at the bottom of the page, in the footer of every page of the PDF export, and as a `license` field in the JSON export.
- Text colours meet WCAG 2.x level AA (at least 4.5:1) in both light and dark mode, on every background the page uses: plain, the three stream tints, selected, highlighted and warning.
  - The colour tokens are at the top of the `<style>` block in `src/template.html` (`--fg`, `--mut`, `--ac`).
  - `python3 tools/audit-contrast.py` re-checks every visible text element across the UI states (needs Python and Playwright, and is not part of the Node build).

Interface language and icons:

- The interface (buttons, the _About the model_ popup, the detail panel, dialogs, and the headings of the PDF export) follows the language toggle:
  - English by default (_NO + EN_) and with _EN_ selected.
  - Norwegian while _NO_ is selected.
  - Open popups and the detail panel update immediately when the toggle changes.
- The order of the content follows the toggle too: _NO + EN_ uses `--language-priorities`, _EN_ shows English first, _NO_ shows Norwegian first.
- Every button has an emoji or Unicode icon next to its label, for example 💾 Save, 📑 Save as…, ➕ New selection, 🗑️ Delete / clear, 📥 Import, 📤 Export JSON, 📄 Export PDF.
  - The icons are decorative (`aria-hidden`); the text label carries the meaning. They are defined in `IC` in `src/template.html`.
- Norwegian and English texts are tagged `lang="nb"` and `lang="en"`, so hyphenation and screen readers treat each correctly.
- Interface strings are in the `UI` object in `src/template.html` (one set per language). The _About the model_ text is in `HELP` in `src/config.js`.

Menus and keyboard:

- The _About the model_ menu at the top right is a toggleable `details` element with a user-oriented explanation of the model, in the interface language.
  - The text lives in `HELP` in `src/config.js` and is based on the HERM Business Reference Model PDF. Edit it there, then rebuild.
  - It closes with Esc or a click outside it.
- Esc closes things in this order: an open dialog, then the _About the model_ menu, then the detail panel.
- All buttons, the drop-down, checkboxes, tiles and box titles show a pointer cursor. A disabled button shows a "not allowed" cursor.

Selection:

- Tick a capability's checkbox, or use _Select_ in its detail panel. Level 1 and level 2 can both be selected.
- Selections are saved in the browser's `localStorage` (key `herm-brm:selections:v1`).
  - Saves are per browser and per file location.
  - The working selection is also kept, so a reload loses nothing.

Saving and swapping:

- _Save_, _Save as…_ and _New selection_ manage saved selections.
- A drop-down swaps between saved selections.

Delete / clear (always confirmed):

- On an unsaved selection it clears the ticks.
- On a saved selection you choose one of two actions:
  - _Clear selection_ removes the ticks but keeps the save until you save again, so the cleared state counts as an unsaved change.
  - _Delete saved selection_ removes the save from this browser and empties the workspace.
- It is disabled when there is nothing to clear or delete.

Unsaved-changes guard:

- _New selection_, switching to another save, and importing all ask first: save and continue, discard, or cancel.
- Closing the tab warns too.
- If the browser blocks storage, saving is disabled and the warning points to JSON export instead.

Export and import:

- Export the current selection, saved or not, as JSON or as PDF.
  - JSON uses the schema `herm-brm-selection/1`: the codes, plus names and descriptions in both languages.
  - PDF is grouped by value stream, with breadcrumbs and descriptions.
- Import reads that JSON back. Unknown codes are skipped and reported.

## Source layout

- `src/cli.js`: command-line options and the build steps.
- `src/model.js`: reads both workbooks, joins them, and writes the QA report.
- `src/config.js`: labels, phase names, palette, paper sizes, layout widths, the _About the model_ text and the expected template version.
- `src/pdf.js`: the level 0 to 2 sheets and shared drawing helpers.
- `src/kit.js`: the workshop poster, worksheet and card deck.
- `src/template.html`: the markup, styles, interface strings, icons and script for `index.html`.
- `tools/audit-contrast.py`: optional WCAG contrast audit of the built `index.html`.

## Licence

HERM is a collaborative community effort curated by CAUDIT with EUNIS, UCISA and EDUCAUSE, offered under CC BY-NC-SA 4.0. Extensions and adaptations should be shared back to the community. The codebase is AI-generated and MIT-licensed.
