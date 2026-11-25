#!/usr/bin/env node
/* Sicherung aller Supabase-Daten in das private Repo seinengel885/backups.

   Aufruf (Node 18 oder neuer, keine Pakete nötig):
     SUPABASE_SECRET_KEY=sb_secret_... node tools/backup.mjs [--dir ../backups] [--push]

   Der geheime Schlüssel steht im Supabase-Dashboard unter Project Settings → API Keys → Secret keys.
   Er gehört NIE ins Repo. Alternativ in tools/.backup.env ablegen (wird von git ignoriert):
     SUPABASE_SECRET_KEY=sb_secret_...

   Ablage im Backup-Repo (eine Datei je Dokument, damit git jede Änderung einzeln zeigt):
     supabase/docs/<app>/<sammlung>/<id>.json
     supabase/history.json        Verlauf der letzten 90 Tage (alte Stände vor Änderungen/Löschungen)
     supabase/bilder/<pfad>       Fotos aus dem privaten Speicher
     supabase/stand.json          Zeitpunkt und Anzahl */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, ".backup.env");
if (existsSync(envFile)) for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const URL_ = process.env.SUPABASE_URL || "https://ilozkxfqiqdyeejcddes.supabase.co";
const KEY = process.env.SUPABASE_SECRET_KEY;
const DIR = resolve(opt("--dir") || process.env.BACKUP_DIR || join(here, "..", "..", "backups"));
const PUSH = args.includes("--push");
const BUCKET = "bilder";
if (!KEY) { console.error("SUPABASE_SECRET_KEY fehlt (siehe Kopf dieser Datei)."); process.exit(1); }
if (!existsSync(join(DIR, ".git"))) { console.error(`Kein git-Repo unter ${DIR}. Erst klonen: git clone https://github.com/seinengel885/backups ${DIR}`); process.exit(1); }

/* Der Schlüssel geht nur in den Header apikey; das reicht Supabase. (In der Claude-Umgebung setzt der Proxy ihn genau dort ein.) */
const H = { apikey: KEY };
async function rest(path, headers = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { ...H, ...headers } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function all(table, select, extra = "") {
  const out = []; const step = 1000;
  for (let from = 0; ; from += step) {
    const rows = await rest(`${table}?select=${select}${extra}`, { Range: `${from}-${from + step - 1}` });
    out.push(...rows); if (rows.length < step) return out;
  }
}
async function listBucket(prefix = "") {
  const r = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 })
  });
  if (!r.ok) throw new Error(`Bucket-Liste: ${r.status} ${await r.text()}`);
  const items = await r.json(); const files = [];
  for (const it of items) {
    const p = prefix ? `${prefix}/${it.name}` : it.name;
    if (it.id === null) files.push(...await listBucket(p)); else files.push({ path: p, size: it.metadata?.size });
  }
  return files;
}
const safe = s => String(s).replace(/[^A-Za-z0-9._@+-]/g, "_");
const walk = d => !existsSync(d) ? [] : readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

const base = join(DIR, "supabase");
const docs = await all("docs", "app,collection,id,data,version,updated_at,updated_by", "&order=app,collection,id");
const since = new Date(Date.now() - 90 * 864e5).toISOString();
const hist = await all("docs_history", "*", `&changed_at=gte.${since}&order=hid`);

const keep = new Set();
for (const d of docs) {
  const f = join(base, "docs", safe(d.app), safe(d.collection), safe(d.id) + ".json");
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(d, null, 2) + "\n"); keep.add(f);
}
for (const f of walk(join(base, "docs"))) if (!keep.has(f)) rmSync(f);   /* gelöschte Dokumente: bleiben in der git-Geschichte */
writeFileSync(join(base, "history.json"), JSON.stringify(hist, null, 1) + "\n");

let n = 0;
const files = await listBucket();
const keepImg = new Set();
for (const o of files) {
  const f = join(base, "bilder", ...o.path.split("/").map(safe)); keepImg.add(f);
  if (existsSync(f) && statSync(f).size === o.size) continue;
  const r = await fetch(`${URL_}/storage/v1/object/authenticated/${BUCKET}/${o.path.split("/").map(encodeURIComponent).join("/")}`, { headers: H });
  if (!r.ok) throw new Error(`Foto ${o.path}: ${r.status}`);
  mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, Buffer.from(await r.arrayBuffer())); n++;
}
for (const f of walk(join(base, "bilder"))) if (!keepImg.has(f)) rmSync(f);
writeFileSync(join(base, "stand.json"), JSON.stringify({ zeit: new Date().toISOString(), dokumente: docs.length, verlauf: hist.length, fotos: files.length }, null, 2) + "\n");
console.log(`${docs.length} Dokumente, ${hist.length} Verlaufseinträge, ${files.length} Fotos (${n} neu geladen) → ${base}`);

const git = (...a) => execFileSync("git", ["-C", DIR, ...a], { encoding: "utf8" });
git("add", "-A", "supabase");
if (!git("status", "--porcelain", "supabase").trim()) { console.log("Keine Änderungen seit der letzten Sicherung."); process.exit(0); }
git("commit", "-m", `Sicherung ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`);
console.log("Commit angelegt.");
if (PUSH) { git("push", "origin", "HEAD"); console.log("Gepusht."); }
