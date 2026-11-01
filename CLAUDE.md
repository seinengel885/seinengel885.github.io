# Hinweise für Claude

- Sprache mit Patrick: Deutsch. Kerstin ist die zweite Nutzerin.
- Jedes Projekt ist ein Ordner (`einkaufsplaner/`, später z. B. `todo/`), eingebunden über `shared/backend.js`
  mit eigenem `data-app`. Der Einkaufsplaner liegt in `einkaufsplaner/`, seine Daten aber unter
  `app = 'einkaufsplan'` (so heißt er in der Datenbank und im Fotospeicher weiter). Neue Projekte auf der Startseite `index.html` verlinken und mit eigenem Icon
  (`<ordner>/icons/`, `apple-touch-icon.png` 180 px, `icon-192.png`, `icon-512.png`) und `manifest.webmanifest` versehen.
- **Live gehen = direkt auf `main` pushen** (GitHub Pages liefert von `main` aus). Patrick hat das ausdrücklich erlaubt;
  kein Pull Request und keine Rückfrage nötig. Vorher `origin/main` in den Arbeitszweig mergen.
- **Vorschau vor dem Push:** Patrick prüft Änderungen in einer klickbaren Vorschau im Chat, bevor sie live gehen.
  `node tools/vorschau.mjs einkaufsplaner einkaufsplan <scratchpad>/vorschau` baut die Seite mit `shared/demo-backend.js`
  (Beispieldaten, keine Anmeldung, nichts geht an Supabase) und gibt die Dateiliste aus. Veröffentlichen mit dem
  Artifact-Tool: `file_path` = `<ziel>/index.html`, `root` = `<ziel>`, `files` = die Liste. Immer dieselbe Vorschau
  aktualisieren: https://claude.ai/artifact/2c352bzY4g3bf9WPx6eTmG (Einkaufsplaner). Erst nach Patricks „passt“ auf `main` pushen.
  Was nur in der Home-Bildschirm-App auftritt (z. B. Tastatur), zeigt die Vorschau nicht; dafür Bildschirmfotos aus Playwright.
- **Bei jedem Push auf `main`, der live gehen soll: `shared/version.js` aktualisieren**: `nr` um 1 erhöhen,
  `stand` (Zeit Europe/Berlin) und `was` (kurz, was neu ist). Die Fußzeile jeder Seite zeigt „Version nr“
  (Datum und Text nur als Tooltip), daran erkennt Patrick, ob GitHub Pages schon ausgeliefert hat.
  Jede Seite bindet dafür `shared/version.js` und `shared/footer.js` ein.
- Daten: Supabase-Projekt `ilozkxfqiqdyeejcddes`, Tabelle `public.docs` (app, collection, id, data jsonb),
  Verlauf in `public.docs_history`, Fotos im privaten Bucket `bilder`. Schemaänderungen als Migration anwenden
  und zusätzlich unter `supabase/migrations/` ablegen; danach den Sicherheitscheck (Advisors) laufen lassen.
- Zugriff nur für Adressen in `public.allowed_users`. Nie Daten oder geheime Schlüssel ins öffentliche Repo legen.
- Sicherung auf Zuruf: Dokumente aus `public.docs` (und Fotos) ins private Repo `seinengel885/backups`
  im Format von `tools/backup.mjs`.
- Rezept-Regeln stehen in `einkaufsplaner/regeln.html`.
