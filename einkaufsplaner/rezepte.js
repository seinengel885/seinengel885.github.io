/* Rezepte: Liste, Rezeptansicht, Kochmodus und Regeln.
   Eine Vorlage für alle Rezepte – die Rezeptdaten liegen in Supabase (Sammlung rezepte).
   Wird von index.html eingebunden, damit es keinen Seitenwechsel gibt (sonst reißt die Live-Verbindung zur Datenbank ab).
   Navigation läuft über window.nav(view, arg) aus index.html. */
(() => {
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const link = h => h.replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);   /* Adressen in Tipps und Quelle anklickbar (h ist schon escaped) */
const md = s => link(esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"));   /* **fett** für Mengen im Schritt */
const $ = id => document.getElementById(id);
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = (title, text) => `<div class="state"><strong>${esc(title)}</strong>${text}</div>`;

/* ---------- Daten ----------
   Rezepte sind Inhalte und liegen in Supabase (Sammlung rezepte, ein Dokument je Rezept, id = Rezept-id), nicht im Repo.
   Live-Abo: Der erste Stand kommt sofort aus dem Browser (data-merken), danach der frische aus der Datenbank. */
let indexP = null, freshP = null; const cache = new Map();
const sorted = () => [...cache.values()].sort((a,b) => a.name.localeCompare(b.name, "de"));
function loadIndex(){
  if(!indexP){
    let fresh; freshP = new Promise(r => fresh = r);
    indexP = use("db").then(db => new Promise((res, rej) => {
      if(!db) return rej("keine Datenbank");
      let first = true;
      const un = db.collection("rezepte").onSnapshot(s => {
        cache.clear(); s.docs.forEach(d => cache.set(d.id, {...d.data(), id: d.id}));
        if(!s.fromCache) fresh();
        if(first){ first = false; res(sorted()); return; }
        all = sorted();
        if(!$("v-list").hidden && $("cards")) drawCards();
      }, e => { if(first){ un(); indexP = null; fresh(); rej(e); } else fresh(); });
    }));
  }
  return indexP;
}
async function loadRecipe(id){
  await loadIndex();
  if(!cache.has(id)) await freshP;   /* gemerkter Stand ist älter als das Rezept */
  if(!cache.has(id)) throw 404;
  return cache.get(id);
}

/* ---------- Fotos ----------
   Alle Rezeptfotos liegen im Bildspeicher des Artefakts; die Datenbank ordnet zu: bilder/<rezept-id> {asset, quelle?}.
   Hochladen in der App: Foto wählen oder aufnehmen → im Browser auf 720 px Breite verkleinert → ersetzt das bisherige Foto.
   720 px = doppelte Anzeigebreite auf dem iPhone. Safari komprimiert schwächer als andere Encoder: liegt das Foto
   bei 80 % Qualität über 150 KB, wird es einmal mit 70 % gespeichert (28.10.). */
const BILD_W = 720, BILD_Q = [0.8, 0.7], BILD_MAX = 150 * 1024;
const own = new Map();   /* rezept-id → {asset, quelle, fokus?} */
const blobSrc = a => window.backend?.blobUrl(a) || "";   /* Fotos liegen im privaten Supabase-Speicher */
const bildOf = r => own.has(r.id) ? blobSrc(own.get(r.id).asset) : "";
const use = n => window.backend?.use ? window.backend.use(n) : Promise.resolve(null);
let assets = null, bilderDB = null, busy = false;
const CAM = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
const PEN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>`;
const OK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const uploadHTML = () => assets ? `<label class="upl${busy ? " busy" : ""}" aria-label="Eigenes Foto hochladen">${CAM}<input type="file" accept="image/*" id="upl"${busy ? " disabled" : ""}></label>` : "";
/* Bildausschnitt: Fokuspunkt in Prozent (Mitte = 50/50) – gilt für Rezeptbild und Vorschau in der Liste (28.10.) */
const fokusCSS = id => { const f = own.get(id)?.fokus; return f ? `object-position:${f.x}% ${f.y}%` : ""; };
/* Ein Bearbeiten-Knopf; im Bearbeiten-Modus stehen dort Kamera und Fertig, und das Foto lässt sich verschieben */
const adjHTML = () => bilderDB && recipe ? `<button type="button" class="edb" aria-label="Foto bearbeiten">${PEN}</button><button type="button" class="adjb" aria-label="Fertig">${OK}</button>` : "";

/* Bild an allen sichtbaren Stellen dieses Rezepts tauschen, ohne die Ansicht neu zu zeichnen.
   Ein neues Bild wird erst eingesetzt, wenn es ganz geladen und dekodiert ist: Es erscheint in einem Schritt,
   nicht Stück für Stück. Fertige Bilder (fertig) setzen Liste und Rezept gleich beim Zeichnen ein. */
const fertig = new Set();
function showBild(id, prio){
  const b = own.get(id); if(!b) return Promise.resolve();
  const src = blobSrc(b.asset); if(!src) return Promise.resolve();
  return Promise.all([...document.querySelectorAll(`[data-bild="${CSS.escape(id)}"]`)].map(box => {
    const hero = box.classList.contains("hero");
    const set = img => {
      img.style.cssText = fokusCSS(id);
      if(hero){ img.alt = recipe?.name || ""; b.quelle ? img.title = "Foto: " + b.quelle : img.removeAttribute("title"); }
    };
    const alt = box.querySelector("img");
    if(alt?.getAttribute("src") === src){ set(alt); return; }
    const img = new Image(); img.alt = "";
    if(prio) img.fetchPriority = "high";
    img.src = src;
    return img.decode().then(() => {
      fertig.add(src); set(img);
      const jetzt = box.querySelector("img");
      jetzt ? jetzt.replaceWith(img) : box.querySelector(".ph").after(img);
    }, () => {});
  }));
}
/* Sichtbare Bilder holen: das geöffnete Rezept und die ersten 4 Karten zuerst, die übrigen danach */
async function showBilder(){
  const ids = [...new Set([...document.querySelectorAll("#v-detail:not([hidden]) .hero[data-bild], #cards [data-bild]")].map(b => b.dataset.bild))]
    .filter(id => own.has(id));
  await Promise.all(ids.slice(0, 4).map(id => showBild(id, true)));
  ids.slice(4).forEach(id => showBild(id));
}
const bildTag = (id, alt, extra = "") => { const src = bildOf({id}); return fertig.has(src) ? `<img src="${esc(src)}" alt="${esc(alt)}"${extra} style="${fokusCSS(id)}">` : ""; };
/* Knöpfe im Rezeptbild nachziehen, wenn Speicher oder Foto erst später da sind */
function ctlRefresh(){
  const h = document.querySelector("#r-main .hero"); if(!h) return;
  if(assets && !h.querySelector(".upl")) h.insertAdjacentHTML("beforeend", uploadHTML());
  if(!h.querySelector(".edb")) h.insertAdjacentHTML("beforeend", adjHTML());
}

/* Ausschnitt verschieben im Bearbeiten-Modus: das Foto folgt dem Finger; gespeichert wird beim Loslassen */
let drag = null;
document.addEventListener("click", e => {
  const b = e.target.closest(".edb,.adjb"); if(!b) return;
  b.closest(".hero").classList.toggle("adj", b.classList.contains("edb"));
});
document.addEventListener("pointerdown", e => {
  const h = e.target.closest(".hero.adj"); if(!h || e.target.closest("button,label")) return;
  const img = h.querySelector("img"), id = recipe?.id; if(!img?.naturalWidth || !own.has(id)) return;
  const r = h.getBoundingClientRect(), k = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
  const f = own.get(id).fokus || {x: 50, y: 50};
  drag = {id, img, sx: e.clientX, sy: e.clientY, x0: f.x, y0: f.y, x: f.x, y: f.y,
    ox: img.naturalWidth * k - r.width, oy: img.naturalHeight * k - r.height};   /* überstehende Pixel je Richtung */
  h.setPointerCapture(e.pointerId); e.preventDefault();
});
document.addEventListener("pointermove", e => {
  if(!drag) return;
  const clamp = v => Math.min(100, Math.max(0, v));
  /* Finger nach unten zieht das Foto mit nach unten → oberer Teil wird sichtbar */
  if(drag.ox > 0) drag.x = clamp(drag.x0 - (e.clientX - drag.sx) / drag.ox * 100);
  if(drag.oy > 0) drag.y = clamp(drag.y0 - (e.clientY - drag.sy) / drag.oy * 100);
  drag.img.style.objectPosition = `${drag.x}% ${drag.y}%`;
});
async function endDrag(){
  if(!drag) return;
  const d = drag; drag = null;
  const x = Math.round(d.x), y = Math.round(d.y);
  if(x === Math.round(d.x0) && y === Math.round(d.y0)) return;
  const b = own.get(d.id); if(!b) return;
  b.fokus = {x, y}; showBild(d.id);
  try{ await bilderDB.doc(d.id).set({asset: b.asset, quelle: b.quelle, fokus: b.fokus, geaendert: new Date().toISOString()}); }
  catch(e){ window.toast?.("Ausschnitt konnte nicht gespeichert werden."); }
}
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);
function setBusy(on){
  busy = on;
  const l = document.querySelector(".upl"); if(!l) return;
  l.classList.toggle("busy", on); l.querySelector("input").disabled = on;
}

/* Verkleinern: Ausrichtung aus den Fotodaten übernimmt der Browser beim Dekodieren; kleinere Fotos bleiben, wie sie sind */
async function shrink(file){
  const url = URL.createObjectURL(file);
  try{
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, BILD_W / img.naturalWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, c.width, c.height);
    let blob = null;
    for(const q of BILD_Q){
      blob = await new Promise(res => c.toBlob(res, "image/jpeg", q));
      if(!blob) throw new Error("toBlob");
      if(blob.size <= BILD_MAX) break;
    }
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

async function upload(file){
  const id = recipe?.id; if(!id || !assets || !bilderDB || busy) return;
  setBusy(true);
  try{
    const blob = await shrink(file).catch(() => { throw {msg: "Dieses Foto lässt sich nicht öffnen."}; });
    const up = await assets.upload(blob);
    const old = own.get(id)?.asset;
    await bilderDB.doc(id).set({asset: up.id, quelle: "eigenes Foto", geaendert: new Date().toISOString()});
    own.set(id, {asset: up.id, quelle: "eigenes Foto"}); showBild(id); ctlRefresh();   /* neues Foto startet wieder mittig */
    if(old && old !== up.id) assets.delete(old).catch(() => {});   /* ersetztes Foto aus dem Speicher löschen */
    window.toast?.(`Foto gespeichert (${Math.round(up.sizeBytes / 1024)} KB)`);
  }catch(e){
    window.toast?.(e?.msg || (e?.code === "not_granted" ? "Hochladen ist hier nicht erlaubt." : "Foto konnte nicht gespeichert werden."));
  }finally{ setBusy(false); }
}
document.addEventListener("change", e => {
  if(e.target.id !== "upl") return;
  const f = e.target.files?.[0]; e.target.value = "";
  if(f) upload(f);
});

/* Zuordnungen live (erster Stand aus dem Browser); das Hochladen-Symbol erscheint nur, wenn der Bildspeicher erreichbar ist */
use("db").then(db => {
  if(!db) return;
  bilderDB = db.collection("bilder");
  bilderDB.onSnapshot(async s => {
    own.clear();
    s.docs.forEach(d => { const v = d.data(); if(v?.asset) own.set(d.id, {asset: v.asset, quelle: v.quelle || "", fokus: v.fokus}); });
    await window.backend?.prefetchBlobs([...own.values()].map(b => b.asset)).catch(() => {});
    showBilder();
  }, () => {});
});
use("assets").then(a => {
  assets = a;
  if(recipe && !$("v-detail").hidden) ctlRefresh();
});

/* ---------- Art, Mahlzeit, Merkmale und Herzen (7.11.) ----------
   Statt freier Tags trägt jedes Rezept feste Felder: art (vegetarisch / fleisch = Fleisch oder Fisch / flexibel = mit oder
   ohne, durch eine Variante im Rezept) und gang (fruehstueck / snack / suess; fehlt = Hauptgericht).
   Weitere Merkmale (Ja/Nein-Felder am Rezept mit Symbol und Filter) stehen nur in der Datenbank:
   einstellungen/merkmale = {liste: [{feld, sym, name}]}. Auf der Karte stehen Symbole, im Rezept und im Filter Symbol und Wort.
   Herzen: zwei Farben, jede Person nimmt sich eine. Welche Farbe zu wem gehört, steht in einstellungen/herzen
   ({<Konto-id>: 0|1}); wer noch keine hat, bekommt beim ersten Tippen die freie. Die Herzen eines Rezepts liegen in der
   Sammlung lieblinge (id = Rezept-id, {"0": true, "1": true}), nicht im Rezept. Namen kennt die App dafür nicht. */
const ART = {vegetarisch: {sym: "🌱", name: "Vegetarisch"}, fleisch: {sym: "🍖", name: "Fleisch & Fisch"},
             flexibel: {sym: "🌱🍖", name: "Mit oder ohne Fleisch"}};
const GANG = {haupt: {sym: "🍽️", name: "Hauptgericht"}, fruehstueck: {sym: "🥣", name: "Frühstück"},
              snack: {sym: "🥨", name: "Snack"}, suess: {sym: "🧁", name: "Süßes & Backen"}};
const gangOf = r => GANG[r.gang] ? r.gang : "haupt";
let MERKMALE = [];
const HERZEN = ["0", "1"];
let herzZuteilung = {}, meinKonto = null;
const meinHerz = () => herzZuteilung[meinKonto] != null ? String(herzZuteilung[meinKonto]) : null;
const herzName = h => h === meinHerz() ? "Mein Herz" : "Anderes Herz";
const HERZ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.8 4.5 7.1 4.5c2 0 3.5 1.1 4.9 2.8 1.4-1.7 2.9-2.8 4.9-2.8 3.3 0 5.5 3.2 4.3 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>';
const favs = new Map();   /* rezept-id → Set der Herzen ("0", "1") */
const herzen = id => HERZEN.filter(h => favs.get(id)?.has(h));
const herzHTML = h => `<span class="herz herz-${h}" title="${herzName(h)}">${HERZ}</span>`;
/* Merkmale eines Rezepts: auf der Karte nur Symbole, im Rezept mit Wort */
function merkmale(r, lang){
  const out = [], a = ART[r.art], g = gangOf(r);
  if(a) out.push(lang ? `<span class="tag${r.art === "fleisch" ? " fleisch" : ""}">${a.sym} ${a.name}</span>` : `<span class="sym" title="${a.name}">${a.sym}</span>`);
  if(lang || g !== "haupt") out.push(lang ? `<span class="tag">${GANG[g].sym} ${GANG[g].name}</span>` : `<span class="sym" title="${GANG[g].name}">${GANG[g].sym}</span>`);
  MERKMALE.filter(m => r[m.feld]).forEach(m => out.push(lang ? `<span class="tag">${esc(m.sym)} ${esc(m.name)}</span>` : `<span class="sym" title="${esc(m.name)}">${esc(m.sym)}</span>`));
  return out.join("");
}
let favDB = null, setDB = null;
use("user").then(u => { meinKonto = u?.id || null; showHerzen(); });
use("db").then(db => {
  if(!db) return;
  favDB = db.collection("lieblinge"); setDB = db.collection("einstellungen");
  setDB.onSnapshot(s => {
    const doc = id => s.docs.find(d => d.id === id)?.data() || {};
    herzZuteilung = doc("herzen");
    const l = doc("merkmale").liste;
    MERKMALE = Array.isArray(l) ? l.filter(m => m && typeof m.feld === "string" && m.name) : [];
    regelnHTML = typeof doc("regeln").html === "string" ? doc("regeln").html : null;
    if(!$("v-rules").hidden) showRules();
    showHerzen(); if($("filters")) $("filters").innerHTML = filterKnoepfe();
    if(!$("v-list").hidden && $("cards")) drawCards();
  }, () => {});
  favDB.onSnapshot(s => {
    favs.clear(); s.docs.forEach(d => { const v = d.data() || {}; favs.set(d.id, new Set(HERZEN.filter(h => v[h]))); });
    showHerzen();
  }, () => {});
});
/* Herzen an allen sichtbaren Stellen neu setzen; filtert die Liste nach Herzen, wird sie neu gezeichnet */
function showHerzen(){
  document.querySelectorAll("[data-herz]").forEach(el => {
    const h = herzen(el.dataset.herz);
    el.innerHTML = h.map(herzHTML).join("") || (el.tagName === "BUTTON" ? `<span class="herz leer">${HERZ}</span>` : "");
    if(el.tagName === "BUTTON") el.setAttribute("aria-label", h.length ? h.map(herzName).join(" und ") : "Kein Herz");
  });
  if(filter.herz && !$("v-list").hidden && $("cards")) drawCards();
}
async function toggleHerz(id, h){
  const s = new Set(favs.get(id)); s.has(h) ? s.delete(h) : s.add(h);
  favs.set(id, s); showHerzen();
  try{ s.size ? await favDB.doc(id).set(Object.fromEntries([...s].map(x => [x, true]))) : await favDB.doc(id).delete(); }
  catch(e){ window.toast?.("Herz konnte nicht gespeichert werden."); }
}
/* Eigenes Herz; beim ersten Mal die Farbe nehmen, die noch niemand hat */
function eigenesHerz(){
  if(meinHerz() != null || !meinKonto) return meinHerz() ?? HERZEN[0];
  const vergeben = Object.values(herzZuteilung).map(String);
  const h = HERZEN.find(x => !vergeben.includes(x)) ?? HERZEN[0];
  herzZuteilung = {...herzZuteilung, [meinKonto]: Number(h)};
  setDB?.doc("herzen").set(herzZuteilung).catch(() => {});
  return h;
}
/* Tippen setzt oder entfernt das eigene Herz, langer Druck (oder Rechtsklick) das andere */
let herzPress = null;
const anderesHerz = () => HERZEN.find(h => h !== eigenesHerz());
document.addEventListener("pointerdown", e => {
  const b = e.target.closest("button[data-herz]"); if(!b || e.button > 0 || !favDB) return;
  herzPress = {b, x: e.clientX, y: e.clientY, lang: false,
    t: setTimeout(() => { herzPress.lang = true; navigator.vibrate?.(12); toggleHerz(b.dataset.herz, anderesHerz()); }, 450)};
});
const herzEnde = () => { if(herzPress) clearTimeout(herzPress.t); };
document.addEventListener("pointermove", e => { if(herzPress && Math.hypot(e.clientX - herzPress.x, e.clientY - herzPress.y) > 8){ herzEnde(); herzPress = null; } }, {passive: true});
document.addEventListener("pointercancel", () => { herzEnde(); herzPress = null; });
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-herz]"); if(!b || !favDB) return;
  const lang = herzPress?.b === b && herzPress.lang; herzEnde(); herzPress = null;
  if(!lang) toggleHerz(b.dataset.herz, eigenesHerz());
});
document.addEventListener("contextmenu", e => {
  const b = e.target.closest("button[data-herz]"); if(!b) return;
  e.preventDefault();
  const lang = herzPress?.lang; herzEnde(); herzPress = null;
  if(!lang && favDB) toggleHerz(b.dataset.herz, anderesHerz());   /* Rechtsklick; Android meldet den langen Druck auch so */
});

/* ---------- Rezeptliste ---------- */
/* Filter: je Gruppe eine Wahl, Gruppen werden kombiniert. Vegetarisch und Fleisch & Fisch zeigen auch die flexiblen Rezepte. */
const filterListe = () => [
  ["art", "vegetarisch"], ["art", "fleisch"],
  ...Object.keys(GANG).map(g => ["gang", g]),
  ...HERZEN.map(h => ["herz", h]), ...MERKMALE.map(m => ["mk", m.feld])];
const filterKnoepfe = () => `<button data-g="" aria-pressed="${!filterAktiv()}">Alle</button>${filterListe().map(([g, v]) =>
  `<button data-g="${g}" data-v="${esc(v)}" aria-pressed="${filter[g] === v}"${g === "herz" ? ` aria-label="${herzName(v)}" style="--c:var(--herz-${v})"` : ""}>${filterLabel(g, v)}</button>`).join("")}`;
const filterLabel = (g, v) => { if(g === "art") return `${ART[v].sym} ${ART[v].name}`; if(g === "gang") return `${GANG[v].sym} ${GANG[v].name}`;
  if(g === "herz") return herzHTML(v); const m = MERKMALE.find(x => x.feld === v); return m ? `${esc(m.sym)} ${esc(m.name)}` : ""; };
const passt = r => (!filter.art || r.art === filter.art || r.art === "flexibel") && (!filter.gang || gangOf(r) === filter.gang)
  && (!filter.herz || favs.get(r.id)?.has(filter.herz)) && (!filter.mk || r[filter.mk]);
let all = [], filter = {}, query = "";
try{ const f = JSON.parse(localStorage.getItem("rezeptfilter")); if(f && typeof f === "object")
  filter = {art: f.art, gang: f.gang, herz: HERZEN.includes(f.herz) ? f.herz : undefined, mk: f.mk}; }catch(e){}
const filterAktiv = () => Object.values(filter).some(Boolean);

/* Suche: Name, Tags und Zutaten. Groß/klein, Akzente und ä/ae egal; mehrere Wörter müssen alle passen.
   Die Zutaten stehen nur in den einzelnen Rezeptdateien – sie werden beim ersten Suchwort nachgeladen. */
const norm = s => String(s ?? "").toLowerCase().replace(/ß/g, "ss").replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u")
  .normalize("NFD").replace(/[̀-ͯ]/g, "");
const ingr = new Map();   /* id → [{text, n}] */
let ingrP = null;
function loadIngredients(){
  if(!ingrP) ingrP = Promise.all(all.map(r => loadRecipe(r.id)
      .then(d => ingr.set(r.id, (d.zutaten || []).map(z => ({
        text: String(z.text || "").split(/[,(]/)[0].trim(),   /* „rote Paprika, in Streifen“ → „rote Paprika“ */
        n: norm(z.text)}))))
      .catch(() => {})))
    .then(() => { if(query) drawCards(); });
  return ingrP;
}
/* Treffer: null = passt nicht; sonst die Zutaten, über die es (auch) passt */
function match(r, words){
  const head = norm([r.name, ART[r.art]?.name, GANG[gangOf(r)].name, ...MERKMALE.filter(m => r[m.feld]).map(m => m.name)].join(" "));
  const zs = ingr.get(r.id) || [], hits = new Set();
  for(const w of words){
    if(head.includes(w)) continue;
    const z = zs.filter(z => z.n.includes(w));
    if(!z.length) return null;
    z.forEach(x => hits.add(x.text));
  }
  return [...hits];
}

function cardHTML(r, hits){
  return `<a class="card" href="#rezept-${esc(r.id)}" data-nav="detail" data-arg="${esc(r.id)}">
      <span class="thumb" data-bild="${esc(r.id)}"><span class="ph">${esc(r.name.slice(0,1))}</span>${bildTag(r.id, "")}</span>
      <div><div class="n">${esc(r.name)}</div>
      <div class="k">~${esc(r.kcal)} kcal · ${esc(r.portionen)} Portionen</div>
      ${hits.length ? `<div class="hit">Mit ${esc(hits.slice(0,3).join(", "))}${hits.length > 3 ? " …" : ""}</div>` : ""}
      <div class="tags"><span class="tag">${esc(r.minuten)}'</span>${merkmale(r)}<span class="herzen" data-herz="${esc(r.id)}">${herzen(r.id).map(herzHTML).join("")}</span></div></div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a>`;
}
/* Nur die Karten neu zeichnen – das Suchfeld bleibt stehen und behält Fokus und Tastatur */
function drawCards(){
  const words = norm(query).split(/\s+/).filter(Boolean);
  const list = [];
  for(const r of all){
    if(!passt(r)) continue;
    const hits = words.length ? match(r, words) : [];
    if(hits) list.push(cardHTML(r, hits));
  }
  const why = words.length ? (filterAktiv() ? `Kein Rezept mit „${esc(query.trim())}“ unter diesem Filter.` : `Kein Rezept mit „${esc(query.trim())}“ im Namen oder in den Zutaten.`)
                           : "Für diesen Filter gibt es noch kein Rezept.";
  $("cards").innerHTML = list.join("") || state("Keine Treffer", why);
  $("q-clear").hidden = !query;
  /* Beim Suchen oder Filtern: wie viele von allen Rezepten zu sehen sind */
  const n = all.length;
  $("r-count").textContent = (filterAktiv() || words.length) ? `${list.length} von ${n} ${n === 1 ? "Rezept" : "Rezepten"}`
                                                      : `${n} ${n === 1 ? "Rezept" : "Rezepte"}`;
  showBilder();
}
function drawList(){
  $("v-list").innerHTML = `
    <div class="lhead"><p class="sub" id="r-count" aria-live="polite"></p><button class="linkbtn" data-nav="rules">Regeln</button></div>
    <div class="search" role="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input type="search" id="q" placeholder="Rezept oder Zutat suchen" aria-label="Rezepte durchsuchen" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" value="${esc(query)}">
      <button type="button" id="q-clear" aria-label="Suche leeren" hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <div class="filters" id="filters">${filterKnoepfe()}</div>
    <div class="cards" id="cards"></div>`;
  drawCards();
}
async function showList(){
  if(!all.length) $("v-list").innerHTML = state("Rezepte werden geladen …", "");
  try{ all = await loadIndex(); drawList(); if(query) loadIngredients(); }
  catch(e){ $("v-list").innerHTML = state("Rezepte nicht erreichbar", "Bitte die Seite neu laden."); }
}
$("v-list").addEventListener("click", e => {
  if(e.target.closest("#q-clear")){ query = ""; $("q").value = ""; drawCards(); $("q").focus(); return; }
  const b = e.target.closest("#filters button"); if(!b) return;
  const {g, v} = b.dataset;
  if(!g) filter = {}; else filter[g] = filter[g] === v ? null : v;   /* nochmal tippen hebt die Wahl auf */
  try{ localStorage.setItem("rezeptfilter", JSON.stringify(filter)) }catch(err){}
  for(const x of $("filters").querySelectorAll("button")) x.setAttribute("aria-pressed", x.dataset.g ? filter[x.dataset.g] === x.dataset.v : !filterAktiv());
  drawCards();
});
$("v-list").addEventListener("input", e => {
  if(e.target.id !== "q") return;
  query = e.target.value;
  if(query.trim()) loadIngredients();
  drawCards();
});
$("v-list").addEventListener("keydown", e => {
  if(e.target.id !== "q") return;
  if(e.key === "Enter"){ e.preventDefault(); e.target.blur(); }            /* Tastatur zu, Treffer sichtbar */
  if(e.key === "Escape" && query){ query = ""; e.target.value = ""; drawCards(); }
});

/* ---------- Personen: Mengen umrechnen (26.10.) ----------
   Faktor = gewählte Personen / Portionen des Rezepts. Umgerechnet werden die Zutatenmengen, „ca.“-Angaben
   im Zutatentext und die **fetten** Mengen in den Schritten. Zeiten und Temperaturen bleiben, ebenso
   Mengen nach „je“ / „pro Person“. Gewählte Zahl wird je Rezept auf dem Gerät gemerkt. */
const FRAC = {"¼":.25, "½":.5, "¾":.75, "⅓":1/3, "⅔":2/3};
const NUM = /(\d+(?:,\d+)?)?([¼½¾⅓⅔])|\d+(?:,\d+)?/g;
function fmtNum(v, unit){
  if(/^(g|ml)\b/i.test(unit)) return String(v >= 100 ? Math.round(v/10)*10 : v >= 20 ? Math.round(v/5)*5 : Math.max(1, Math.round(v)));
  if(/^(kg|l)\b/i.test(unit)) return String(Math.round(v*10)/10).replace(".", ",");
  const spoon = /^(el|tl|prise|msp)\b/i.test(unit);   /* Löffel in ¼/½-Schritten, Stückzahlen ab 2 ganz */
  if(v >= 10 || (!spoon && v >= 2)) return String(Math.round(v));
  const st = spoon ? (v < 2 ? .25 : .5) : .5, r = Math.max(st, Math.round(v/st)*st), i = Math.floor(r), f = r - i;
  const g = {.25:"¼", .5:"½", .75:"¾"}[f] || "";
  return (i || !g ? String(i) : "") + g;
}
function scaleStr(s, k){
  if(k === 1) return s;
  return s.replace(NUM, (m, a, fr, off, all) => {
    const v = fr ? (a ? parseFloat(a.replace(",", ".")) : 0) + FRAC[fr] : parseFloat(m.replace(",", "."));
    return fmtNum(v*k, all.slice(off + m.length).trimStart());
  });
}
const scaleText = (s, k) => k === 1 ? s : String(s ?? "").replace(/ca\.\s*[\d¼½¾⅓⅔][\d,¼½¾⅓⅔]*(\s*[a-zA-Z]+)?/g, m => scaleStr(m, k));
const scaleStep = (s, k) => k === 1 ? s : String(s ?? "").replace(/\*\*(.+?)\*\*/g, (m, inner, off, all) =>
  /min|sek|std|stund|°/i.test(inner) || /\b(je|pro person)\s*$/i.test(all.slice(0, off)) ? m : "**" + scaleStr(inner, k) + "**");
const PMIN = 1, PMAX = 12;
let pers = 2;
const factor = () => pers / (recipe?.portionen || pers);

/* ---------- Rezeptansicht ---------- */
const main = $("r-main");
let recipe = null, steps = [], wanted = null;
const cook = $("cook");
/* Haken (24.11.): je Rezept im Browser, drei unabhängige Sätze. rz = Zutaten im Rezept (vorrätig, bleiben beim
   Einkaufswagen weg), kz/ks = Zutaten und Schritte im Kochmodus. */
const MARK = {rz:"zutaten-", kz:"koch-zutaten-", ks:"schritte-"}, marks = {rz:{}, kz:{}, ks:{}};
function loadMarks(){ for(const m in MARK){ try{ marks[m] = JSON.parse(localStorage.getItem(MARK[m] + recipe.id) || "{}") }catch(e){ marks[m] = {} } } }
const chk = (m, k, inner) => `<label class="chk${marks[m][k] ? " done" : ""}"><input type="checkbox" data-m="${m}" data-k="${k}"${marks[m][k] ? " checked" : ""}>${inner}</label>`;
function setMark(m, k, val){
  const o = marks[m]; if(val) o[k] = 1; else delete o[k];
  try{ Object.keys(o).length ? localStorage.setItem(MARK[m] + recipe.id, JSON.stringify(o)) : localStorage.removeItem(MARK[m] + recipe.id) }catch(e){}
  document.querySelectorAll(`input[data-m="${m}"][data-k="${k}"]`).forEach(i => { i.checked = val; i.parentNode.classList.toggle("done", val); });
  drawResets();
}
/* „Alle Haken entfernen“ steht nur da, wenn es etwas zu entfernen gibt */
function drawResets(){ document.querySelectorAll("[data-reset]").forEach(b => b.hidden = b.dataset.reset.split(" ").every(m => !Object.keys(marks[m]).length)); }
function onMarks(e){ const m = e.target.dataset.m; if(m) setMark(m, e.target.dataset.k, e.target.checked); }
function resetMarks(b){ b.dataset.reset.split(" ").forEach(m => Object.keys(marks[m]).forEach(k => setMark(m, k, false))); }
/* Personen-Wähler steht bei Zutaten, Zubereitung und im Kochmodus, alle zeigen dieselbe Zahl */
const persHTML = `<div class="pers" role="group" aria-label="Personen"><button type="button" class="pb" data-p="-1" aria-label="Eine Person weniger">−</button><span class="pn" role="status"></span><button type="button" class="pb" data-p="1" aria-label="Eine Person mehr">+</button></div>`;
const topBar = () => $("v-detail").querySelector(".top");

async function showRecipe(id){
  wanted = id;
  if(recipe && recipe.id === id) return;            /* schon offen, Scrollstand behalten */
  main.innerHTML = state("Rezept wird geladen …", "Gleich erscheinen Zutaten und Schritte.");
  if(!/^[a-z0-9-]+$/.test(id || "")){ main.innerHTML = state("Kein Rezept gewählt", `<button class="linkbtn" data-nav="list">Zur Rezeptliste</button>`); return; }
  try{
    const r = await loadRecipe(id);
    if(wanted === id) render(r, id);
  }catch(e){
    if(wanted === id) main.innerHTML = state("Dieses Rezept gibt es noch nicht", `Claude kann es im Chat anlegen. <button class="linkbtn" data-nav="list">Zur Rezeptliste</button>`);
  }
}

function render(r, id){
  recipe = {...r, id};
  loadMarks();
  pers = +r.portionen || 2;
  try{ const p = +localStorage.getItem("personen-" + id); if(p >= PMIN && p <= PMAX) pers = p; }catch(e){}
  steps = [];
  (r.phasen || []).forEach((p,pi) => p.schritte.forEach((s,si) => steps.push({k:"s"+steps.length, pi, si, n:p.schritte.length, phase:p.titel, ...s})));
  main.innerHTML = `
  <div class="hero" data-bild="${esc(id)}"><span class="ph">${esc(r.name)}</span>${bildTag(id, r.name, own.get(id)?.quelle ? ` title="Foto: ${esc(own.get(id).quelle)}"` : "")}${uploadHTML()}${adjHTML()}</div>
  <h1 id="rtitle">${esc(r.name)}</h1>
  <div class="facts"><span class="fact">~${esc(r.kcal)} kcal / Portion</span><span class="fact">${esc(r.portionen)} Portionen</span><span class="fact">${esc(r.minuten)} Min.</span></div>
  <p class="sub">${esc(r.kurz)}</p>
  <div class="tags rmerk">${merkmale(r, true)}<button type="button" class="herzbtn" data-herz="${esc(id)}"></button></div>

  <nav class="jump" id="jump" aria-label="Abschnitte">
    <div class="jt" id="jt" aria-hidden="true">${esc(r.name)}</div>
    <div class="jrow">${(r.beilagen || []).length ? `<button data-to="s-beilage">Beilage</button>` : ""}<button data-to="s-zutaten">Zutaten</button><button data-to="s-zubereitung">Zubereitung</button>${(r.tipps || []).length ? `<button data-to="s-tipps">Tipps</button>` : ""}${(r.originale || []).length ? `<button data-to="s-original">Original</button>` : ""}</div>
  </nav>

  ${(r.beilagen || []).length ? `<section id="s-beilage"><h2>Beilage</h2>${r.beilageHinweis ? `<p class="hint" style="margin:-2px 2px 8px">${md(r.beilageHinweis)}</p>` : ""}
    <div class="box"><ul class="list side">${r.beilagen.map(b => `<li><div><b>${esc(b.name)}</b><small>${md(b.text || "")}</small></div></li>`).join("")}</ul></div></section>` : ""}

  <section id="s-zutaten"><div class="zhead"><h2>Zutaten</h2>${persHTML}<button type="button" class="toshop" id="toshop" hidden></button></div><div class="box"><ul class="list zl" id="zl">${zutatenHTML("rz")}</ul></div><button class="reset" data-reset="rz">Alle Haken entfernen</button></section>

  <section id="s-zubereitung"><div class="zhead"><h2>Zubereitung</h2>
    ${persHTML}
    ${steps.length ? `<button class="cookstart" id="cookstart">Kochmodus</button>` : ""}</div>
  ${stepsHTML(false)}
  </section>

  ${(r.tipps || []).length ? `<section id="s-tipps"><h2>Tipps</h2><div class="box"><ul class="tips">${r.tipps.map(t => `<li><b>${esc(t.titel)}:</b> ${md(t.text)}</li>`).join("")}</ul></div></section>` : ""}
  ${(r.originale || []).length ? `<section id="s-original"><h2>Original</h2><div class="box">${r.originale.map(o => `<figure class="rz-original"><a target="_blank" rel="noopener"><img data-asset="${esc(o.asset)}" alt="${esc(o.titel)}"></a><figcaption>${esc(o.titel)}</figcaption></figure>`).join("")}</div></section>` : ""}
  ${r.quelle ? `<p class="src">${link(esc(r.quelle))}</p>` : ""}`;
  /* Originale (z. B. ein handgeschriebenes Rezept) liegen im privaten Fotospeicher wie die Rezeptfotos; antippen öffnet sie groß */
  const orig = [...main.querySelectorAll("img[data-asset]")];
  if(orig.length) window.backend?.prefetchBlobs(orig.map(i => i.dataset.asset)).then(() => orig.forEach(i => { i.src = i.parentNode.href = blobSrc(i.dataset.asset); })).catch(() => {});

  /* Sprungleiste klebt unter der Kopfleiste; der kleine Titel steht von Anfang an darin (29.10.) */
  const off = topBar().offsetHeight;
  document.documentElement.style.setProperty("--toph", off + "px");
  drawPers(); drawResets(); shopBtn(); showBild(id, true); showHerzen();
}
function zutatenHTML(m){
  const k = factor();
  return (recipe.zutaten || []).map((z,i) => `<li class="${z.optional ? "opt" : ""}">${chk(m, "z"+i, `<span class="m">${esc(scaleStr(z.menge || "", k))}</span><span>${esc(scaleText(z.text, k))}${z.optional ? " <small>(optional)</small>" : ""}</span>`)}</li>`).join("");
}
/* Zubereitung: im Rezept zum Lesen, im Kochmodus jeder Schritt zum Abhaken */
function stepsHTML(cooking){
  return (recipe.phasen || []).map((p,pi) => `<h3>${esc(p.titel)}</h3><div class="box"><ul class="steps">${steps.filter(s => s.pi === pi).map(s => {
    const t = `<span class="t" data-t="${s.k}">${stepHTML(s)}</span>`;
    return `<li>${cooking ? chk("ks", s.k, t) : t}</li>`;
  }).join("")}</ul></div>`).join("");
}
function stepHTML(s){
  const k = factor();
  return md(scaleStep(s.text, k)) + ((s.sub || []).length ? `<ul>${s.sub.map(x => `<li>${md(scaleStep(x, k))}</li>`).join("")}</ul>` : "");
}
function drawPers(){
  const t = pers + (pers === 1 ? " Person" : " Personen");
  const all = sel => [...main.querySelectorAll(sel), ...cook.querySelectorAll(sel)];
  all(".pn").forEach(pn => {
    pn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>${pers}`;
    pn.setAttribute("aria-label", t); pn.title = t;
  });
  all('.pb[data-p="-1"]').forEach(b => b.disabled = pers <= PMIN);
  all('.pb[data-p="1"]').forEach(b => b.disabled = pers >= PMAX);
}
function setPers(n){
  n = Math.min(PMAX, Math.max(PMIN, n)); if(n === pers) return;
  pers = n;
  try{ n === +recipe.portionen ? localStorage.removeItem("personen-" + recipe.id) : localStorage.setItem("personen-" + recipe.id, n) }catch(e){}
  $("zl").innerHTML = zutatenHTML("rz");
  if(!cook.hidden) $("c-zl").innerHTML = zutatenHTML("kz");
  steps.forEach(s => document.querySelectorAll(`[data-t="${s.k}"]`).forEach(t => t.innerHTML = stepHTML(s)));
  drawPers();
}

/* ---------- Zutaten auf die Einkaufsliste (29.10.) ----------
   Mengen wie gerade angezeigt (gewählte Personen), optionale Zutaten bleiben weg. Den Rest macht window.Einkauf
   in index.html (Liste, Kategorie, Speichern). Liegen offene Zutaten des Rezepts schon auf der Liste, werden sie ersetzt. */
/* Symbole: Wagen mit Pfeil hinein = auf die Liste; Wagen mit Kreispfeil = Mengen auf der Liste aktualisieren */
const CART_BODY = `<path d="M2 9h2.2l2 8.5h11l2.3-6.5H7"/><circle cx="8.5" cy="20.6" r="1.2"/><circle cx="16" cy="20.6" r="1.2"/>`;
const CART_ADD = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CART_BODY}<path d="M13 1.8v6.6M10.2 5.8 13 8.6l2.8-2.8"/></svg>`;
const CART_UPD = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CART_BODY}<g stroke-width="1.8"><path d="M15.76 7.21A3.6 3.6 0 1 1 15.31 2.14"/><path d="M13.42 2.31 15.31 2.14 15.14 .25"/></g></svg>`;
/* „rote Paprika, in Streifen“ → „rote Paprika“; „Salz, Pfeffer“ bleibt (nach dem Komma groß = weitere Zutat) */
const cleanName = t => String(t || "").replace(/,\s+(?=\p{Ll})[\s\S]*$/u, "").trim();
function shopBtn(){
  const b = $("toshop"); if(!b || !recipe) return;
  b.hidden = !window.Einkauf;
  const upd = !!window.Einkauf?.count(recipe.id), t = upd ? "Mengen auf der Einkaufsliste aktualisieren" : "Auf die Einkaufsliste";
  if(b.dataset.s !== String(upd)){ b.dataset.s = upd; b.innerHTML = upd ? CART_UPD : CART_ADD; }
  b.setAttribute("aria-label", t); b.title = t;
}
/* Einkaufswagen öffnet eine kleine Auswahl direkt darunter: Tag zum Einkaufen (−1 / Datum / +1 / Ohne)
   und der Knopf zum Übernehmen. Vorauswahl: der Tag, den die Zutaten des Rezepts schon tragen, sonst ohne (29.10.). */
let sp = null, spDue = "";
function spDraw(){
  const E = window.Einkauf, l = spDue ? E.dueLabel(spDue) : "";
  const d = spDue ? new Date(spDue + "T12:00") : null;
  $("sp-lbl").textContent = d ? (/\./.test(l) ? "" : l + ", ") + d.toLocaleDateString("de-DE", {day:"numeric", month:"numeric"}) : "Ohne Tag";
  $("sp-in").value = spDue;
  sp.querySelector('[data-d="-1"]').disabled = !!spDue && spDue <= E.today();
  sp.querySelector(".sp-none").setAttribute("aria-pressed", !spDue);
}
function closeShopPop(){ if(!sp) return; sp.remove(); sp = null; $("toshop")?.setAttribute("aria-expanded", "false"); }
function openShopPop(){
  const b = $("toshop"), E = window.Einkauf; if(!b || !E) return;
  if(sp){ closeShopPop(); return; }
  spDue = E.dueOf(recipe.id);
  const upd = !!E.count(recipe.id), all = shopZutaten(recipe).length, n = shopZutaten(recipe, marks.rz).length;
  sp = document.createElement("div"); sp.className = "spop"; sp.setAttribute("role", "dialog"); sp.setAttribute("aria-label", "Auf die Einkaufsliste");
  sp.innerHTML = `<div class="sp-row"><button type="button" class="sp-b" data-d="-1" aria-label="Einen Tag früher">−1</button>
    <label class="sp-date"><span id="sp-lbl"></span><input type="date" id="sp-in" aria-label="Tag zum Einkaufen"></label>
    <button type="button" class="sp-b" data-d="1" aria-label="Einen Tag später">+1</button>
    <button type="button" class="sp-b sp-none" data-d="0">Ohne</button></div>
    <button type="button" class="sp-go"${n ? "" : " disabled"}>${upd ? "Mengen aktualisieren" : "Auf die Einkaufsliste"}${n < all ? ` (${n} von ${all})` : ""}</button>`;
  document.body.appendChild(sp);
  const r = b.getBoundingClientRect();
  sp.style.top = (r.bottom + 6) + "px"; sp.style.right = Math.max(8, document.documentElement.clientWidth - r.right) + "px";
  b.setAttribute("aria-expanded", "true");
  spDraw();
}
document.addEventListener("click", e => {
  if(!sp || !sp.contains(e.target)) return;
  const E = window.Einkauf, d = e.target.closest(".sp-b");
  if(d){ const n = +d.dataset.d;
    /* ohne Tag starten ±1 bei heute; früher als heute geht nicht */
    spDue = !n ? "" : !spDue ? E.today() : (t => t < E.today() ? E.today() : t)(E.addDays(spDue, n));
    spDraw(); return; }
  if(e.target.closest(".sp-go")){ const due = spDue; closeShopPop(); toShop(due); }
});
document.addEventListener("change", e => { if(e.target.id === "sp-in"){ spDue = e.target.value || ""; spDraw(); } });
document.addEventListener("pointerdown", e => { if(sp && !sp.contains(e.target) && !e.target.closest("#toshop")) closeShopPop(); }, true);
addEventListener("scroll", () => closeShopPop(), {passive:true});

/* Einträge für die Einkaufsliste: Mengen für p Personen, optionale und im Rezept abgehakte (have) Zutaten bleiben weg.
   Den Rest macht window.Einkauf */
const shopZutaten = (r, have = {}) => (r.zutaten || []).filter((z,i) => !z.optional && !have["z"+i]);
function addToShop(r, p, due, have){
  const k = p / (r.portionen || p);
  const entries = shopZutaten(r, have)
    .map(z => ({qty: scaleStr(z.menge || "", k).trim(), name: cleanName(scaleText(z.text, k)), hint: [scaleStr(z.menge || "", k), z.text].filter(Boolean).join(" ")})).filter(z => z.name);
  return window.Einkauf.addRecipe({id: r.id, name: r.name, pers: p, entries, due});
}
/* Auftrag von Claude (Sammlung auftraege, siehe index.html) */
async function orderToShop({rezept, pers: p, due}){
  const r = await loadRecipe(rezept);
  return addToShop(r, p || r.portionen, due || "");
}

async function toShop(due){
  const b = $("toshop"); if(!b || b.disabled || !window.Einkauf) return;
  b.disabled = true;
  try{ await addToShop(recipe, pers, due, marks.rz); }
  finally{ b.disabled = false; shopBtn(); }
}

main.addEventListener("change", onMarks);
main.addEventListener("click", e => {
  if(e.target.id === "cookstart"){ openCook(); return; }
  if(e.target.closest("#toshop")){ openShopPop(); return; }
  const pb = e.target.closest(".pb"); if(pb){ e.preventDefault(); setPers(pers + +pb.dataset.p); return; }
  const to = e.target.dataset.to;
  if(to){ /* Sprungmarke: unter Kopfleiste und Sprungleiste landen */
    const off = topBar().offsetHeight + $("jump").offsetHeight + 8;
    const y = $(to).getBoundingClientRect().top + scrollY - off;
    window.scrollTo({top:y, behavior: reduceMotion() ? "auto" : "smooth"});
    return;
  }
  if(e.target.dataset.reset) resetMarks(e.target);
});
addEventListener("resize", () => { if(!$("v-detail").hidden) document.documentElement.style.setProperty("--toph", topBar().offsetHeight + "px"); });

/* ---------- Kochmodus (24.11.): Zutaten und Zubereitung zum Abhaken, große Schrift, Bildschirm bleibt an ---------- */
let wake = null;
function drawCook(){
  $("c-body").innerHTML = `<section><h2>Zutaten</h2><div class="box"><ul class="list zl" id="c-zl">${zutatenHTML("kz")}</ul></div></section>
    <section><h2>Zubereitung</h2>${stepsHTML(true)}</section>
    <button class="reset" data-reset="kz ks">Alle Haken entfernen</button>`;
  drawPers(); drawResets();
}
async function openCook(){
  if(!recipe) return;
  $("c-title").textContent = recipe.name;
  $("c-pers").innerHTML = persHTML;
  drawCook(); $("c-body").scrollTop = 0;
  cook.hidden = false; document.body.classList.add("cooking");
  $("c-close").focus();
  try{ if(cook.requestFullscreen) await cook.requestFullscreen() }catch(e){}
  try{ if(navigator.wakeLock) wake = await navigator.wakeLock.request("screen") }catch(e){}
}
/* Schließen behält die Haken */
function closeCook(){
  closeShopPop();
  if(cook.hidden) return;
  cook.hidden = true; document.body.classList.remove("cooking");
  try{ if(document.fullscreenElement) document.exitFullscreen() }catch(e){}
  try{ wake && wake.release(); wake = null }catch(e){}
  $("cookstart")?.focus();
}
document.addEventListener("visibilitychange", async () => {
  if(!cook.hidden && document.visibilityState === "visible" && navigator.wakeLock){ try{ wake = await navigator.wakeLock.request("screen") }catch(e){} }
});
cook.addEventListener("change", onMarks);
cook.addEventListener("click", e => {
  if(e.target.closest("#c-close")){ closeCook(); return; }
  const pb = e.target.closest(".pb"); if(pb){ setPers(pers + +pb.dataset.p); return; }
  if(e.target.dataset.reset) resetMarks(e.target);
});
document.addEventListener("keydown", e => { if(!cook.hidden && e.key === "Escape" && !e.defaultPrevented && !e.isComposing) closeCook(); });

/* ---------- Regeln: stehen nur in der Datenbank (einstellungen/regeln = {html}), kommen mit den Einstellungen ---------- */
let regelnHTML = null;
function showRules(){
  $("rules-body").innerHTML = regelnHTML ?? state("Regeln werden geladen …", "");
}

/* ---------- Vorladen: Rezeptliste, sobald die Seite fertig ist ----------
   Wartet auf das load-Ereignis und dann auf eine ruhige Lücke, damit der Wochenplan zuerst steht.
   Danach öffnen „Rezepte“ und jedes Rezept ohne Wartezeit (alle Rezepte kommen mit einer Abfrage). */
function preload(){
  loadIndex().then(list => {
    all = list;
    if($("v-list").hidden) drawList();
  }).catch(() => {});
}
const whenIdle = cb => ("requestIdleCallback" in window) ? requestIdleCallback(cb, {timeout:3000}) : setTimeout(cb, 300);
if(document.readyState === "complete") whenIdle(preload);
else addEventListener("load", () => whenIdle(preload), {once:true});

window.Rezepte = { showList, showRecipe, showRules, closeCook, isCooking: () => !cook.hidden, shopChanged: shopBtn, orderToShop, current: () => recipe && !$("v-detail").hidden ? {id: recipe.id, name: recipe.name} : null };
})();
