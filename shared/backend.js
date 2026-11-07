/* Gemeinsame Anbindung an Supabase für alle Projekte in diesem Repo.
   Einbinden (nach vendor/supabase-js-*.js und config.js):
     <script src="../shared/backend.js" data-app="einkaufsplan"></script>
   Stellt window.backend bereit:
     backend.ready            Promise, erfüllt sobald jemand angemeldet ist (vorher erscheint die Anmeldung)
     backend.named            Promise mit dem Anzeigenamen (kommt nebenher, blockiert die Daten nicht)
     backend.use("db")        Datenbank mit derselben Schnittstelle wie im Claude-Artefakt:
                              db.collection(name).orderBy(feld).onSnapshot(cb, err) / .get() / .doc(id)
                              db.doc("sammlung/id").set(daten) / .update(teil) / .delete() → gelöscht? / .get()
     backend.use("user")      { id, email, name, can() }
     backend.use("assets")    Fotospeicher: upload(blob) → {id, sizeBytes}, delete(id)
     backend.blobUrl(id)      Bild-URL (vorher mit prefetchBlobs geholt), sonst ""
     backend.prefetchBlobs(ids)
     backend.signOut()
   Alle Daten liegen in der Tabelle public.docs, getrennt nach Projekt (Spalte app). */
(function(){
  const cfg = window.BACKEND_CONFIG;
  const me = document.currentScript;
  const APP = me?.dataset.app || "allgemein";
  const sb = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
            storageKey: "haus-auth" }
  });

  /* ---------- Anmeldung ---------- */
  let session = null, resolveAuth, myName = "";
  const authed = new Promise(r => resolveAuth = r);
  const ready = authed;
  /* Der Anzeigename steht in public.allowed_users (jede Person sieht nur ihre eigene Zeile), nicht im öffentlichen Code.
     Er wird nebenher geholt; das Laden der Daten wartet nicht darauf. */
  const named = authed.then(async s => {
    try{ myName = (await sb.from("allowed_users").select("name").maybeSingle()).data?.name || ""; }catch(e){}
    if(!myName) myName = String(s.user.email || "").split("@")[0];
    return myName;
  });

  const CSS = `
  #auth{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-start;justify-content:center;
    padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));overflow-y:auto;
    background:var(--bg,#f6f8f6);color:var(--ink,#18261f);font-family:var(--body,system-ui,-apple-system,sans-serif)}
  #auth form{width:100%;max-width:360px;margin:auto 0;display:flex;flex-direction:column;gap:12px}
  #auth h1{font-family:var(--display,inherit);font-size:1.6rem;margin:0}
  #auth p{margin:0;color:var(--muted,#5f6f66);font-size:.95rem;line-height:1.45}
  #auth input{font:inherit;font-size:16px;padding:11px 12px;border-radius:10px;border:1px solid var(--line,#dde5df);
    background:var(--surface,#fff);color:inherit;width:100%}
  #auth input.code{letter-spacing:.3em;font-variant-numeric:tabular-nums;text-align:center}
  #auth button{font:600 1rem inherit;font-family:inherit;padding:12px;border-radius:10px;border:0;cursor:pointer;
    background:var(--accent,#2f7a4a);color:var(--surface,#fff)}
  #auth button.ghost{background:none;color:var(--muted,#5f6f66);font-weight:500;padding:4px}
  #auth .err{color:var(--bad,#b42318)}
  #auth [hidden]{display:none!important}`;

  function showLogin(msg){
    if(document.getElementById("auth")) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    let email = ""; try{ email = localStorage.getItem("haus-email") || "" }catch(e){}
    const box = document.createElement("div"); box.id = "auth";
    box.innerHTML = `<form novalidate>
      <h1>Anmelden</h1>
      <p id="a-info">Gib deine E-Mail-Adresse ein. Du bekommst eine Mail mit einem Anmeldelink und einem Code.</p>
      <input id="a-mail" type="email" autocomplete="email" inputmode="email" placeholder="E-Mail" value="">
      <input id="a-code" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Code aus der Mail" hidden>
      <button id="a-go" type="submit">Mail schicken</button>
      <button id="a-back" type="button" class="ghost" hidden>Andere Adresse / neue Mail</button>
      <p id="a-err" class="err" role="alert"></p>
    </form>`;
    document.body.appendChild(box);
    // iOS (v. a. als Home-Bildschirm-App) schiebt fixierte Elemente nicht über die Tastatur:
    // Anmeldefläche auf den sichtbaren Bereich (visualViewport) begrenzen, dann rutscht das Formular hoch.
    const vv = window.visualViewport;
    if(vv){
      const fit = () => {
        if(!box.isConnected){ vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); return; }
        box.style.top = vv.offsetTop + "px"; box.style.height = vv.height + "px"; box.style.bottom = "auto";
      };
      vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); fit();
    }
    box.addEventListener("focusin", e => setTimeout(() => e.target.scrollIntoView?.({block: "center"}), 300));
    const $ = id => box.querySelector("#" + id);
    $("a-mail").value = email;
    if(msg) $("a-err").textContent = msg;
    let step = "mail";
    const setStep = s => {
      step = s;
      $("a-code").hidden = $("a-back").hidden = s !== "code";
      $("a-mail").disabled = s === "code";
      $("a-go").textContent = s === "code" ? "Anmelden" : "Mail schicken";
      $("a-info").textContent = s === "code"
        ? "Die Mail ist unterwegs. Tippe auf den Link in der Mail oder gib hier den Code ein."
        : "Gib deine E-Mail-Adresse ein. Du bekommst eine Mail mit einem Anmeldelink und einem Code.";
      (s === "code" ? $("a-code") : $("a-mail")).focus();
    };
    $("a-back").onclick = () => { $("a-err").textContent = ""; setStep("mail"); };
    box.querySelector("form").onsubmit = async e => {
      e.preventDefault(); $("a-err").textContent = ""; $("a-go").disabled = true;
      const mail = $("a-mail").value.trim().toLowerCase();
      try{
        if(step === "mail"){
          if(!/^\S+@\S+\.\S+$/.test(mail)) throw {message: "Bitte eine gültige E-Mail-Adresse eingeben."};
          try{ localStorage.setItem("haus-email", mail) }catch(e){}
          const { error } = await sb.auth.signInWithOtp({ email: mail,
            options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
          if(error) throw error;
          setStep("code");
        } else {
          const token = $("a-code").value.replace(/\s/g, "");
          const { error } = await sb.auth.verifyOtp({ email: mail, token, type: "email" });
          if(error) throw error;
        }
      }catch(err){ $("a-err").textContent = authMsg(err); }
      finally{ $("a-go").disabled = false; }
    };
  }
  function authMsg(err){
    const m = String(err?.message || err || "");
    if(/not allowed|Database error saving new user|Registrierung/i.test(m)) return "Diese Adresse ist nicht freigeschaltet.";
    if(/rate limit|too many|security purposes/i.test(m)) return "Gerade wurden zu viele Mails verschickt. Bitte etwas später nochmal versuchen.";
    if(/not authorized/i.test(m)) return "An diese Adresse kann Supabase noch keine Mail schicken (eigener Mailserver fehlt).";
    if(/expired|invalid/i.test(m)) return "Der Code stimmt nicht oder ist abgelaufen.";
    if(/sending .*email|smtp/i.test(m)) return "Die Mail konnte nicht verschickt werden. Bitte die Mail-Einstellungen in Supabase prüfen.";
    if(/fetch|network/i.test(m)) return "Keine Verbindung. Bitte Internet prüfen.";
    return m || "Das hat nicht geklappt.";
  }
  function hideLogin(){ document.getElementById("auth")?.remove(); }

  sb.auth.onAuthStateChange((ev, s) => {
    session = s;
    if(s){ hideLogin(); resolveAuth(s); }
    else if(ev === "SIGNED_OUT"){ try{ localStorage.removeItem(URL_KEY) }catch(e){} location.reload(); }
  });
  sb.auth.getSession().then(({ data, error }) => {
    if(data?.session){ session = data.session; hideLogin(); resolveAuth(data.session); }
    else {
      const p = new URLSearchParams(location.search);
      const err = p.get("error_description");
      const start = () => showLogin(err ? "Der Link hat nicht funktioniert: " + err : "");
      document.body ? start() : addEventListener("DOMContentLoaded", start);
    }
  });

  /* ---------- Datenbank wie im Artefakt ---------- */
  const T = "docs";
  const cache = new Map();          /* sammlung → Map(id → {data, version}) */
  const watchers = new Map();       /* sammlung → Set(watcher) */
  let channel = null;
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const docObj = (id, r) => ({ id, exists: !!r, version: r?.version, data: () => clone(r?.data) });

  function cmp(field, dir){
    const k = dir === "desc" ? -1 : 1;
    return (a, b) => {
      const x = a.data()?.[field], y = b.data()?.[field];
      if(x === y) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      if(x == null) return 1; if(y == null) return -1;
      return (x < y ? -1 : 1) * k;
    };
  }
  function snapOf(coll, order){
    const m = cache.get(coll) || new Map();
    const docs = [...m].map(([id, r]) => docObj(id, r));
    if(order) docs.sort(cmp(order.field, order.dir));
    return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f) };
  }
  async function pull(coll){
    const { data, error } = await sb.from(T).select("id,data,version").eq("app", APP).eq("collection", coll);
    if(error) throw error;
    cache.set(coll, new Map(data.map(r => [r.id, { data: r.data, version: r.version }])));
  }
  function notify(coll){ for(const w of watchers.get(coll) || []) w.fire(); }
  async function resyncAll(){
    for(const coll of watchers.keys()){
      try{ await pull(coll); notify(coll); }catch(e){ for(const w of watchers.get(coll) || []) w.err?.(e); }
    }
  }
  function ensureChannel(){
    if(channel) return;
    let first = true;
    channel = sb.channel("docs-" + APP)
      .on("postgres_changes", { event: "*", schema: "public", table: T }, p => {
        const row = p.eventType === "DELETE" ? p.old : p.new;
        if(!row || row.app !== APP || !cache.has(row.collection)) return;
        const m = cache.get(row.collection);
        if(p.eventType === "DELETE") m.delete(row.id);
        else m.set(row.id, { data: row.data, version: row.version });
        notify(row.collection);
      })
      .subscribe(status => {
        /* Nach einer Unterbrechung alles frisch holen, damit nichts verpasst wird */
        if(status === "SUBSCRIBED"){ if(!first) resyncAll(); first = false; }
      });
  }
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible" && watchers.size) resyncAll(); });

  function splitPath(path){
    const i = path.lastIndexOf("/");
    if(i < 1) throw new Error("Pfad braucht sammlung/id: " + path);
    return [path.slice(0, i), path.slice(i + 1)];
  }
  function local(coll, id, data){
    if(!cache.has(coll)) return;
    const m = cache.get(coll);
    if(data === undefined) m.delete(id); else m.set(id, { data, version: m.get(id)?.version });
    notify(coll);
  }
  async function guarded(coll, fn){
    try{ return await fn(); }
    catch(e){ try{ await pull(coll); notify(coll); }catch(_){} throw e; }
  }

  function docRef(coll, id){
    return {
      id, path: coll + "/" + id,
      async get(){
        const { data, error } = await sb.from(T).select("id,data,version").eq("app", APP).eq("collection", coll).eq("id", id).maybeSingle();
        if(error) throw error;
        return docObj(id, data);
      },
      set(data, opts){
        if(opts?.merge) return this.update(data);
        const d = clone(data);
        local(coll, id, d);
        return guarded(coll, async () => {
          const { error } = await sb.from(T).upsert({ app: APP, collection: coll, id, data: d });
          if(error) throw error;
        });
      },
      update(patch){
        const p = clone(patch);
        const cur = cache.get(coll)?.get(id);
        if(cur) local(coll, id, { ...cur.data, ...p });
        return guarded(coll, async () => {
          const { error } = await sb.rpc("docs_merge", { p_app: APP, p_collection: coll, p_id: id, p_patch: p });
          if(error) throw error;
        });
      },
      delete(){
        local(coll, id, undefined);
        return guarded(coll, async () => {
          const { data, error } = await sb.from(T).delete().eq("app", APP).eq("collection", coll).eq("id", id).select("id");
          if(error) throw error;
          return data.length > 0;
        });
      }
    };
  }
  function query(coll, order){
    return {
      orderBy: (field, dir) => query(coll, { field, dir }),
      doc: id => docRef(coll, id),
      async get(){ await pull(coll); return snapOf(coll, order); },
      onSnapshot(cb, err){
        const w = { fire: () => { try{ cb(snapOf(coll, order)); }catch(e){ console.error(e); } }, err };
        if(!watchers.has(coll)) watchers.set(coll, new Set());
        watchers.get(coll).add(w);
        ensureChannel();
        (cache.has(coll) ? Promise.resolve() : pull(coll)).then(() => w.fire(), e => err?.(e));
        return () => watchers.get(coll)?.delete(w);
      }
    };
  }
  const db = {
    collection: name => query(name, null),
    doc: path => { const [c, id] = splitPath(path); return docRef(c, id); }
  };

  /* ---------- Fotos (privater Speicher, Zugriff über zeitlich begrenzte Links) ---------- */
  /* Links bleiben über App-Starts gleich (localStorage), damit der Browser die Fotos aus seinem Speicher nimmt;
     erneuert wird ein Link erst, wenn er in weniger als einem Tag abläuft */
  const URL_TTL = 60 * 60 * 24 * 7, URL_KEY = "haus-fotolinks-" + APP, TAG = 864e5;
  const urls = new Map();   /* asset-id → {u: Link, x: Ablauf in ms} */
  try{ for(const [id, v] of Object.entries(JSON.parse(localStorage.getItem(URL_KEY) || "{}"))) if(v.x - Date.now() > TAG) urls.set(id, v); }catch(e){}
  const saveUrls = () => { try{ localStorage.setItem(URL_KEY, JSON.stringify(Object.fromEntries(urls))) }catch(e){} };
  async function prefetchBlobs(ids){
    const need = [...new Set(ids)].filter(id => id && !(urls.get(id)?.x - Date.now() > TAG));
    if(!need.length) return;
    const { data, error } = await sb.storage.from(cfg.bucket).createSignedUrls(need, URL_TTL);
    if(error) throw error;
    const x = Date.now() + URL_TTL * 1000;
    for(const r of data || []) if(r.signedUrl) urls.set(r.path, {u: r.signedUrl, x});
    saveUrls();
  }
  const assets = {
    async upload(blob){
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const id = APP + "/" + crypto.randomUUID() + "." + ext;
      const { error } = await sb.storage.from(cfg.bucket).upload(id, blob, { contentType: blob.type || "image/jpeg", upsert: false });
      if(error) throw error;
      await prefetchBlobs([id]).catch(() => {});
      return { id, sizeBytes: blob.size };
    },
    async delete(id){
      const { error } = await sb.storage.from(cfg.bucket).remove([id]);
      if(error) throw error;
      urls.delete(id); saveUrls();
    }
  };

  async function use(name){
    const s = await ready;
    if(name === "db") return db;
    if(name === "assets") return assets;
    if(name === "user") return { id: s.user.id, email: s.user.email, name: await named, can: async () => true };
    return null;
  }

  window.backend = {
    app: APP, client: sb, ready, named, use, prefetchBlobs,
    blobUrl: id => urls.get(id)?.u || "",
    get userName(){ return session ? myName : ""; },
    signOut: () => sb.auth.signOut()
  };
})();
