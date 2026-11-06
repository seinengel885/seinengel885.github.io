/* Probebetrieb für die klickbare Vorschau (tools/vorschau.mjs): dieselbe Schnittstelle wie backend.js,
   aber ohne Supabase und ohne Anmeldung. Startdaten kommen aus window.DEMO_DATA = { sammlung: { id: daten } }.
   Alles, was man in der Vorschau ändert, bleibt nur in diesem Browser (localStorage) und erreicht nie die echte Datenbank.
   Ein Hinweisband oben zeigt das an und kann die Vorschau auf die Startdaten zurücksetzen. */
(function(){
  const me = document.currentScript;
  const APP = me?.dataset.app || "allgemein";
  const KEY = "vorschau-" + APP + "-" + (window.DEMO_STAND || "");
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

  let store = null;
  try{ store = JSON.parse(localStorage.getItem(KEY) || "null"); }catch(e){}
  if(!store) store = clone(window.DEMO_DATA || {});
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };
  const coll = c => store[c] || (store[c] = {});

  const watchers = new Map();
  const docObj = (id, d) => ({ id, exists: d !== undefined, data: () => clone(d) });
  function cmp(field, dir){
    const k = dir === "desc" ? -1 : 1;
    return (a, b) => {
      const x = a.data()?.[field], y = b.data()?.[field];
      if(x === y) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      if(x == null) return 1; if(y == null) return -1;
      return (x < y ? -1 : 1) * k;
    };
  }
  function snapOf(c, order){
    const docs = Object.entries(coll(c)).map(([id, d]) => docObj(id, d));
    if(order) docs.sort(cmp(order.field, order.dir));
    return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f) };
  }
  function changed(c){
    save();
    setTimeout(() => { for(const w of watchers.get(c) || []) w(); }, 0);
  }
  function docRef(c, id){
    return {
      id, path: c + "/" + id,
      async get(){ return docObj(id, coll(c)[id]); },
      async set(data, opts){
        coll(c)[id] = opts?.merge ? { ...(coll(c)[id] || {}), ...clone(data) } : clone(data); changed(c);
      },
      async update(patch){ coll(c)[id] = { ...(coll(c)[id] || {}), ...clone(patch) }; changed(c); },
      async delete(){ const had = id in coll(c); delete coll(c)[id]; changed(c); return had; }
    };
  }
  function query(c, order){
    return {
      orderBy: (field, dir) => query(c, { field, dir }),
      doc: id => docRef(c, id),
      async get(){ return snapOf(c, order); },
      onSnapshot(cb){
        const w = () => { try{ cb(snapOf(c, order)); }catch(e){ console.error(e); } };
        if(!watchers.has(c)) watchers.set(c, new Set());
        watchers.get(c).add(w);
        setTimeout(w, 0);
        return () => watchers.get(c)?.delete(w);
      }
    };
  }
  const db = {
    collection: name => query(name, null),
    doc: path => { const i = path.lastIndexOf("/"); return docRef(path.slice(0, i), path.slice(i + 1)); }
  };

  /* Fotos: nur für diese Sitzung im Speicher */
  const urls = new Map();
  const assets = {
    async upload(blob){
      const id = APP + "/vorschau-" + Date.now() + ".jpg";
      urls.set(id, URL.createObjectURL(blob));
      return { id, sizeBytes: blob.size };
    },
    async delete(id){ urls.delete(id); }
  };

  /* Beispielfoto für die Vorschau: ruhiger Farbverlauf je Rezept, damit man die Bildflächen sieht */
  function platzhalter(id){
    let h = 0; for(const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},45%,78%)"/>
      <stop offset="1" stop-color="hsl(${(h + 40) % 360},40%,62%)"/></linearGradient></defs>
      <rect width="720" height="480" fill="url(#g)"/>
      <text x="360" y="252" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" fill="rgba(0,0,0,.45)">Beispielfoto</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  const NAME = "Vorschau";
  const ready = Promise.resolve({ user: { id: "vorschau", email: "vorschau@example.org" } });
  async function use(name){
    if(name === "db") return db;
    if(name === "assets") return assets;
    if(name === "user") return { id: "vorschau", email: "vorschau@example.org", name: NAME, can: async () => true };
    return null;
  }
  window.backend = {
    app: APP, ready, use, demo: true,
    prefetchBlobs: async () => {},
    blobUrl: id => urls.get(id) || (String(id).startsWith("platzhalter/") ? platzhalter(id) : ""),
    userName: NAME,
    signOut: async () => {}
  };

  /* Hinweisband */
  const css = `#vorschau-band{display:flex;gap:10px;align-items:center;
    justify-content:center;flex-wrap:wrap;padding:6px max(16px,env(safe-area-inset-right,0px)) 6px max(16px,env(safe-area-inset-left,0px));
    background:#fff4cc;color:#4a3b00;font:13px/1.35 system-ui,-apple-system,sans-serif;text-align:center}
  #vorschau-band button{font:inherit;font-weight:600;color:inherit;background:none;border:1px solid currentColor;border-radius:999px;
    padding:2px 10px;cursor:pointer}`;
  function band(){
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const b = document.createElement("div"); b.id = "vorschau-band";
    b.innerHTML = `<span><strong>Vorschau</strong> mit Beispieldaten. Änderungen bleiben in diesem Browser.</span>
      <button type="button">Zurücksetzen</button>`;
    b.querySelector("button").onclick = () => { try{ localStorage.removeItem(KEY); }catch(e){} location.reload(); };
    document.body.prepend(b);
  }
  document.body ? band() : addEventListener("DOMContentLoaded", band);
})();
