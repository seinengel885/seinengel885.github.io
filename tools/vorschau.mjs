/* Baut eine klickbare Vorschau eines Projekts für Claude (als Artefakt veröffentlicht).
   Die Seite läuft mit shared/demo-backend.js statt Supabase: keine Anmeldung, Beispieldaten,
   Änderungen bleiben im Browser.

     node tools/vorschau.mjs [ordner] [app] [ziel]
     node tools/vorschau.mjs einkaufsplaner einkaufsplan /tmp/vorschau

   Gibt am Ende die Dateiliste für den Artefakt-Aufruf (files) als JSON aus.
   Die Beispieldaten sind erfunden und werden bei jedem Bau passend zum heutigen Datum erzeugt. */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";

const [ordner = "einkaufsplaner", app = "einkaufsplan", ziel = "vorschau-build"] = process.argv.slice(2);
const root = new URL("..", import.meta.url).pathname;
const src = join(root, ordner);
rmSync(ziel, { recursive: true, force: true });
mkdirSync(join(ziel, "shared"), { recursive: true });

/* Projektdateien ohne Icons/Manifest übernehmen */
cpSync(src, ziel, { recursive: true, filter: p => !/\/icons(\/|$)|manifest\.webmanifest$/.test(p) });
for(const f of ["version.js", "footer.js", "demo-backend.js"]) cpSync(join(root, "shared", f), join(ziel, "shared", f));

/* Beispieldaten */
const heute = new Date();
const iso = d => d.toISOString().slice(0, 10);
const tag = n => { const d = new Date(heute); d.setDate(d.getDate() + n); return iso(d); };
function beispiel(){
  if(app !== "einkaufsplan") return {};
  let rez = [];
  try{ rez = JSON.parse(readFileSync(join(src, "rezepte/index.json"), "utf8")).rezepte || []; }catch(e){}
  const r = i => rez[i % Math.max(rez.length, 1)];
  const days = {};
  const plan = [
    [-3, 0, { rating: "gut", comment: "Kinder haben nachgenommen." }],
    [-2, 1, { rating: "ok" }],
    [-1, null, { dish: "Vesper", note: "Brot, Käse, Gemüse" }],
    [0, 2, {}], [1, 3, { note: "Kerstin kocht" }], [2, null, { dish: "Reste" }], [3, 4, { tags: ["Gäste"] }]
  ];
  plan.forEach(([n, ri, extra], k) => {
    const x = ri == null ? null : r(ri);
    days["d" + k] = { date: tag(n), dish: x ? x.name : "", ...(x ? { recipe: x.id } : {}), ...extra };
  });
  days.j1 = { date: tag(0), joker: true, dish: r(5)?.name || "Nudeln mit Tomatensoße", ...(r(5) ? { recipe: r(5).id } : {}) };
  const s = (name, section, extra = {}) => ({ name, section, list: "Einkaufsliste", qty: "", checked: false, labels: [], ...extra });
  const shopping = {
    s1: s("Paprika", "Gemüse & Obst", { qty: "3" }),
    s2: s("Zwiebeln", "Gemüse & Obst", { qty: "1 Netz" }),
    s3: s("Naturjoghurt", "Kühlregal", { labels: ["bio"] }),
    s4: s("Eier", "Kühlregal", { qty: "10", checked: true }),
    s5: s("Kichererbsen", "Vorrat", { qty: "2 Dosen" }),
    s6: s("Zahnpasta", "Drogerie", { labels: ["dm"] })
  };
  Object.values(shopping).forEach((x, i) => x.order = (i + 1) * 1000);
  const erfahrungen = {
    e1: { titel: "Beispiel: Plan ist eine Speisekarte", text: "Erfundener Eintrag für die Vorschau.", kategorie: "Planung", catOrder: 1, order: 1, woche: 1 },
    e2: { titel: "Beispiel: Einmal pro Woche Vesper", text: "Erfundener Eintrag für die Vorschau.", kategorie: "Planung", catOrder: 1, order: 2, woche: 1 }
  };
  /* Jedes Rezept bekommt ein Platzhalterfoto (echte Fotos liegen im privaten Speicher) */
  const bilder = Object.fromEntries(rez.map(x => [x.id, { asset: "platzhalter/" + x.id, quelle: "Platzhalter in der Vorschau" }]));
  return { days, shopping, erfahrungen, bilder };
}

/* Neue Startdaten → neuer Speicherschlüssel, damit alte Änderungen im Browser sie nicht verdecken */
const daten = JSON.stringify(beispiel());
const stand = createHash("sha1").update(daten).digest("hex").slice(0, 10);

/* index.html umbauen: Artefakt-Gerüst weg, Supabase durch Probebetrieb ersetzen */
const titel = (readFileSync(join(src, "index.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [, ordner])[1];
let html = readFileSync(join(src, "index.html"), "utf8");
html = html.replace(/^[\s\S]*?<body>/, "").replace(/<\/body>\s*<\/html>\s*$/, "");
html = html.replace(/<script src="\.\.\/shared\/vendor\/[^"]*"><\/script>\s*/g, "")
           .replace(/<script src="\.\.\/shared\/config\.js"><\/script>\s*/g, "")
           .replace(/<script src="\.\.\/shared\/backend\.js"/,
             `<script>window.DEMO_STAND=${JSON.stringify(stand)};window.DEMO_DATA=${daten};</script>\n` +
             `<script src="shared/demo-backend.js"`)
           .replace(/\.\.\/shared\//g, "shared/");
if(/backend\.js"/.test(html) && !/demo-backend\.js/.test(html)) throw new Error("backend.js nicht ersetzt");
html = `<title>${titel} Vorschau</title>\n` + html;
writeFileSync(join(ziel, "index.html"), html);

/* Dateiliste für das Artefakt */
const files = {};
(function walk(d){
  for(const n of readdirSync(d)){
    const p = join(d, n);
    if(statSync(p).isDirectory()) walk(p);
    else if(n !== "index.html" || d !== ziel) files[relative(ziel, p)] = p;
  }
})(ziel);
console.log(JSON.stringify({ page: join(ziel, "index.html"), files }, null, 1));
