// Everything that is NOT in the Excel files lives here: structural labels, paper sizes, palette, UI strings.
export const VERSION = "3.2.0";
// Licence line, shown discreetly at the bottom of index.html and in its PDF/JSON export.
export const LICENSE = "CC BY-NC-SA 4.0 © 2025 CAUDIT";
// Bump together with src/template.html (<meta name="herm-template-version">). The build refuses a mismatched template.
export const TEMPLATE_VERSION = 8;

export const DOMAINS = {
  Core: { id: "BD001", en: "Core capabilities", no: "Kjernekapabiliteter" },
  Enabling: {
    id: "BD002",
    en: "Enabling capabilities",
    no: "Muliggjørende kapabiliteter",
  },
};
export const CHAINS = {
  "Learning & Teaching": {
    id: "BV001",
    en: "Learning & Teaching",
    no: "Verdistrøm utdanning",
  },
  Research: { id: "BV002", en: "Research", no: "Verdistrøm forskning" },
};
// Display order. `span: true` = group spanning several phases (drawn beneath the phases).
// Norwegian phase names as used in the NTNU diagram; the spanning label is a placeholder.
export const SEGMENTS = [
  { chain: "Learning & Teaching", seg: "Design", id: "BV003", no: "Designe" },
  {
    chain: "Learning & Teaching",
    seg: "Recruit - Confer",
    id: "BV004",
    no: "Rekruttere – Tildele",
    span: true,
  },
  {
    chain: "Learning & Teaching",
    seg: "Recruit",
    id: "BV005",
    no: "Rekruttere",
  },
  { chain: "Learning & Teaching", seg: "Enrol", id: "BV006", no: "Innrullere" },
  { chain: "Learning & Teaching", seg: "Deliver", id: "BV007", no: "Levere" },
  { chain: "Learning & Teaching", seg: "Assess", id: "BV008", no: "Vurdere" },
  { chain: "Learning & Teaching", seg: "Confer", id: "BV009", no: "Tildele" },
  { chain: "Research", seg: "Plan", id: "BV010", no: "Planlegge" },
  { chain: "Research", seg: "Fund", id: "BV011", no: "Finansiere" },
  { chain: "Research", seg: "Assure", id: "BV012", no: "Sikre" },
  { chain: "Research", seg: "Conduct", id: "BV013", no: "Gjennomføre" },
  { chain: "Research", seg: "Disseminate", id: "BV014", no: "Formidle" },
];

// NTNU graphic profile (i.ntnu.no/wiki/-/wiki/Norsk/Farger+i+grafisk+profil).
// dark / mid / light = base colour and two lighter nuances from the published palette.
export const STREAM_COLORS = {
  "Learning & Teaching": { dark: "#00509e", mid: "#9db7e1", light: "#cfdaf1" }, // NTNU-blå + blue nuances
  Research: { dark: "#2e7578", mid: "#97d2d4", light: "#d1eaeb" }, // turquoise nuances
  Enabling: { dark: "#7d705a", mid: "#e0d0af", light: "#eee5d5" }, // sand nuances
};
export const INK = "#282d37"; // NTNU dark grey
export const MUTED = "#6b737d"; // secondary language

// Paper sizes in mm (portrait).
export const PAPER = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
};
export const TILE = { w: 62, h: 26 };

export const LABELS = {
  NO: {
    posterTitle: "Kapabilitetskart for høyere utdanning",
    name: "Navn",
    date: "Dato",
    wsTitle: "Mål og kapabiliteter",
    unit: "Enhet / team",
    period: "Periode",
    goal: "Mål",
    goalHint: "Hva vil jeg oppnå de neste to årene?",
    value: "Verdi for universitetet",
    valueHint: "Hvem får nytte av det, og hva er verdien?",
    measure: "Hvordan ser vi at målet er nådd?",
    caps: "Kapabiliteter målet bygger på",
    capsHint: "Skriv kode og navn (se kapabilitetskartet)",
    notes: "Notater",
    level: "Nivå",
    placeOn: "Legges på",
    contains: "Inneholder",
    sheet: "Ark",
    missingName: "[Norsk navn mangler]",
    missingDesc: "[Norsk beskrivelse mangler]",
  },
  EN: {
    posterTitle: "Higher education capability map",
    name: "Name",
    date: "Date",
    wsTitle: "Goals and capabilities",
    unit: "Unit / team",
    period: "Period",
    goal: "Goal",
    goalHint: "What do I want to achieve in the next two years?",
    value: "Value for the university",
    valueHint: "Who benefits, and what is the value?",
    measure: "How will we know the goal is achieved?",
    caps: "Capabilities the goal builds on",
    capsHint: "Write code and name (see the capability map)",
    notes: "Notes",
    level: "Level",
    placeOn: "Place on",
    contains: "Contains",
    sheet: "Sheet",
    missingName: "[English name missing]",
    missingDesc: "[English description missing]",
  },
};

// Layout width of a level-1 box in "tile columns" (1 or 2), as in the NTNU diagram.
// Default 2; these four are drawn single-column there.
export const LAYOUT_COLS = {
  default: 2,
  BC028: 1,
  BC032: 1,
  BC071: 1,
  BC093: 1,
};

// User-oriented explanation shown in the "About the model" menu of index.html.
// Based on HERM-BRM-V320-model.pdf (description, understanding business capabilities, usage, major concepts)
// and the BRM explainer. Shown in the primary language (--language-priorities). Keep it free of numbers that change per version.
// Each section: title + any of `paras` (paragraphs) and `items` (bullet list).
export const HELP = {
  NO: {
    title: "Om modellen",
    sections: [
      {
        title: "Hva er dette?",
        paras: [
          "Forretningskapabilitetsmodellen for høyere utdanning (HERM Business Reference Model) er en felles, standardisert beskrivelse av hva et universitet eller en høyskole må kunne gjøre. Den gir virksomhetsledere, virksomhetsarkitekter og teknologistrateger et felles språk for å snakke om effektivitet, behov og utfordringer.",
          "Modellen står sammen med forretningsmodellkanvasen (Business Model Canvas) og viser de to kjerneverdistrømmene i høyere utdanning, utdanning og forskning, med kapabilitetene under dem.",
        ],
      },
      {
        title: "Hva er en forretningskapabilitet?",
        paras: [
          "En kapabilitet er en bestemt kombinasjon av mennesker, prosess, informasjon og teknologi som skal til for å levere et avgrenset resultat og nå et konkret mål. Kapabiliteter beskriver hva virksomheten gjør, ikke hvem som gjør det, hvor det gjøres eller hvordan organisasjonen er bygget opp. Derfor står modellen seg selv om organisasjonen endres.",
          "Resultater som «studiesuksess» eller «organisasjonskultur» er ikke kapabiliteter. De er konsekvenser av hvordan kapabilitetene er satt sammen og utviklet.",
        ],
      },
      {
        title: "Slik leser du kartet",
        items: [
          "Kjernekapabiliteter støtter direkte de to verdistrømmene og står under fasen de hører til. Fasene er pilene øverst i hver verdistrøm, og rekkefølgen viser hvordan verdi flyter fra én fase til neste.",
          "Noen grupper, som studentadministrasjon og studentstøtte, brukes i flere faser og står derfor under alle fasene de dekker.",
          "Muliggjørende kapabiliteter er de en hvilken som helst virksomhet trenger, som strategi, økonomi, HR, informasjon, eiendom, jus og markedsføring. De støtter kjernekapabilitetene på tvers av begge verdistrømmene og holder institusjonen i gang.",
          "Modellen har to nivåer: de større boksene er nivå 1 (grupper), og flisene er nivå 2 (kapabiliteter). Hver har en stabil kode, for eksempel BC002.",
        ],
      },
      {
        title: "Hva brukes modellen til?",
        paras: [
          "Modellen er et holdepunkt for å vurdere for eksempel strategisk betydning, modenhet, driftsutfordringer, investeringer og organisering. Den gir sporbarhet fra virksomhetens mål ned til informasjonen, teknologien og andre ressurser som kreves. Legg gjerne organisasjonsstrukturen oppå kartet for å få med konteksten.",
        ],
      },
      {
        title: "I denne visningen",
        items: [
          "Klikk på en kapabilitet for å se beskrivelsen på begge språk.",
          "Kryss av kapabiliteter for å bygge et utvalg, for eksempel de et mål bygger på. Utvalget kan lagres i nettleseren og eksporteres som JSON eller PDF.",
          "En rød ramme betyr at navn eller beskrivelse mangler på ett av språkene.",
        ],
      },
    ],
  },
  EN: {
    title: "About the model",
    sections: [
      {
        title: "What is this?",
        paras: [
          "The Higher Education Business Capability Model (the HERM Business Reference Model) is a shared, standard description of what a university or college must be able to do. It gives business stakeholders, enterprise architects and technology strategists a common language for discussing effectiveness, needs and challenges.",
          "It stands alongside the Business Model Canvas and lays out the two core value chains of higher education, Learning & Teaching and Research, with the capabilities beneath them.",
        ],
      },
      {
        title: "What is a business capability?",
        paras: [
          "A capability is a particular combination of people, process, information and technology needed to deliver a specific result and reach a concrete objective. Capabilities describe what the institution does, not who does it, where it is done or how the organisation is structured. That is why the model stays valid when the organisation changes.",
          'Outcomes such as "student success" or "organisational culture" are not capabilities. They are consequences of how the capabilities are configured and developed.',
        ],
      },
      {
        title: "How to read the map",
        items: [
          "Core capabilities directly support the two value chains and sit under the phase they belong to. The phases are the arrows at the top of each value chain, and their order shows how value flows from one phase to the next.",
          "Some groups, such as student management and student support, are used in several phases and therefore sit under every phase they cover.",
          "Enabling capabilities are the ones any organisation needs, such as strategy, finance, HR, information, estate, legal and marketing. They support the core capabilities across both value chains and keep the institution running.",
          "The model has two levels: the larger boxes are level 1 (groups) and the tiles are level 2 (capabilities). Each has a stable code, for example BC002.",
        ],
      },
      {
        title: "What is the model used for?",
        paras: [
          "It is an anchor for assessing things like strategic importance, maturity, operational pain points, investment and organisation. It gives traceability from business objectives down to the information, technology and other resources needed. Consider laying your organisational structure over the map to add context.",
        ],
      },
      {
        title: "In this view",
        items: [
          "Click a capability to read its description in both languages.",
          "Tick capabilities to build a selection, for example the ones a goal relies on. A selection can be saved in the browser and exported as JSON or PDF.",
          "A red border means a name or description is missing in one of the languages.",
        ],
      },
    ],
  },
};
