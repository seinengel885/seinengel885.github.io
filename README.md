# seinengel885.github.io

Unsere kleinen Web-Projekte, veröffentlicht über GitHub Pages unter https://seinengel885.github.io/.

| Ordner | Was |
|---|---|
| `/` | Startseite mit Links zu den Projekten |
| `einkaufsplan/` | Essensplan: Woche, Einkaufsliste, Rezepte (vorher ein Claude-Artefakt) |
| `shared/` | Gemeinsam für alle Projekte: Supabase-Anbindung, Anmeldung, Symbol |
| `supabase/migrations/` | Datenbankaufbau in Supabase (so wie angewendet) |
| `tools/backup.mjs` | Sicherung aller Daten ins private Repo `seinengel885/backups` |

## Daten und Anmeldung

- Daten liegen in Supabase (Projekt „PE's Project“, Frankfurt), Tabelle `public.docs`.
  Jedes Projekt hat seinen eigenen Wert in der Spalte `app`, z. B. `einkaufsplan`.
- Jede Änderung und Löschung hebt den alten Stand in `public.docs_history` auf.
- Fotos liegen im privaten Speicher-Bucket `bilder`.
- Zugriff nur nach Anmeldung, und nur für die Adressen in `public.allowed_users`
  (Patrick und Kerstin). Andere Adressen können kein Konto anlegen.
- Angemeldet wird per Mail: Link anklicken oder den Code aus der Mail eingeben.

Der Schlüssel in `shared/config.js` ist der öffentliche „publishable key“. Ohne Anmeldung
sieht man damit nichts. Geheime Schlüssel gehören nie ins Repo.

## Neues Projekt anlegen

1. Ordner anlegen, z. B. `vorrat/`, mit einer `index.html`.
2. Darin einbinden:
   ```html
   <script src="../shared/vendor/supabase-js-2.117.3.js"></script>
   <script src="../shared/config.js"></script>
   <script src="../shared/backend.js" data-app="vorrat"></script>
   ```
3. `await backend.ready`, dann `const db = await backend.use("db")` und
   `db.collection("sachen").onSnapshot(...)` bzw. `db.doc("sachen/123").set({...})`.
4. Link auf der Startseite `index.html` ergänzen.

## Sicherung

```bash
git clone https://github.com/seinengel885/backups ../backups
SUPABASE_SECRET_KEY=sb_secret_... node tools/backup.mjs --push
```

Den geheimen Schlüssel gibt es im Supabase-Dashboard unter Project Settings → API Keys.
Alternativ in `tools/.backup.env` ablegen (wird nicht committet). Claude kann die Sicherung
auf Zuruf auch selbst über den Supabase-Zugang machen.
