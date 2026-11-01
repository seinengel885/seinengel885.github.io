# Hinweise für Claude

- Sprache mit Patrick: Deutsch. Kerstin ist die zweite Nutzerin.
- Jedes Projekt ist ein Ordner (`einkaufsplaner/`, später z. B. `todo/`), eingebunden über `shared/backend.js`
  mit eigenem `data-app`. Der Einkaufsplaner liegt in `einkaufsplaner/`, seine Daten aber unter
  `app = 'einkaufsplan'` (so heißt er in der Datenbank und im Fotospeicher weiter). Neue Projekte auf der Startseite `index.html` verlinken und mit eigenem Icon
  (`<ordner>/icons/`, `apple-touch-icon.png` 180 px, `icon-192.png`, `icon-512.png`) und `manifest.webmanifest` versehen.
- **Ablauf:** Claude arbeitet lokal, aktualisiert die Vorschau, Patrick testet. Sagt Patrick eines der Codewörter **„live“, „Freigabe“, „ausrollen“ oder
  „veröffentlichen“**, pusht Claude
  sofort direkt auf `main` (GitHub Pages liefert von `main` aus) – ohne Pull Request, ohne Rückfrage, ohne weitere Branches.
  Vorher `git fetch origin main` und `origin/main` mergen, nie mit Überschreiben (force) pushen. Ohne Codewort wird nichts gepusht;
  „passt“ bestätigt nur eine Änderung und ist **kein** Codewort.
- **Vorschau vor dem Push:** Patrick prüft Änderungen in einer klickbaren Vorschau im Chat, bevor sie live gehen.
  `node tools/vorschau.mjs einkaufsplaner einkaufsplan <scratchpad>/vorschau` baut die Seite mit `shared/demo-backend.js`
  (Beispieldaten, keine Anmeldung, nichts geht an Supabase) und gibt die Dateiliste aus. Veröffentlichen mit dem
  Artifact-Tool: `file_path` = `<ziel>/index.html`, `root` = `<ziel>`, `files` = die Liste. Immer dieselbe Vorschau
  aktualisieren: https://claude.ai/artifact/2c352bzY4g3bf9WPx6eTmG (Einkaufsplaner); in einer neuen Sitzung erst mit
  `action: "read"` lesen, dann mit `url` veröffentlichen.
  **Ungefragt:** Vor jeder Antwort, die eine Änderung am Code meldet, die Vorschau neu bauen und veröffentlichen, und den
  Link in der ersten Antwort jeder Sitzung nennen. Patrick kommentiert direkt in der Vorschau; diese Kommentare kommen als
  „Artifact comment“ hier an und werden im jeweiligen Thread beantwortet.
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
