# Hinweise für Claude

- Sprache mit Patrick: Deutsch. Kerstin ist die zweite Nutzerin.
- Jedes Projekt ist ein Ordner (`einkaufsplan/`, später z. B. `todo/`), eingebunden über `shared/backend.js`
  mit eigenem `data-app`. Neue Projekte auf der Startseite `index.html` verlinken und mit eigenem Icon
  (`<ordner>/icons/`, `apple-touch-icon.png` 180 px, `icon-192.png`, `icon-512.png`) und `manifest.webmanifest` versehen.
- **Bei jeder Änderung, die live gehen soll: `shared/version.js` aktualisieren** (Zeit Europe/Berlin, kurz was neu ist).
  Die Fußzeile jeder Seite zeigt diesen Stand, daran erkennt Patrick, ob GitHub Pages schon ausgeliefert hat.
  Jede Seite bindet dafür `shared/version.js` und `shared/footer.js` ein.
- Daten: Supabase-Projekt `ilozkxfqiqdyeejcddes`, Tabelle `public.docs` (app, collection, id, data jsonb),
  Verlauf in `public.docs_history`, Fotos im privaten Bucket `bilder`. Schemaänderungen als Migration anwenden
  und zusätzlich unter `supabase/migrations/` ablegen; danach den Sicherheitscheck (Advisors) laufen lassen.
- Zugriff nur für Adressen in `public.allowed_users`. Nie Daten oder geheime Schlüssel ins öffentliche Repo legen.
- Sicherung auf Zuruf: Dokumente aus `public.docs` (und Fotos) ins private Repo `seinengel885/backups`
  im Format von `tools/backup.mjs`.
- Rezept-Regeln stehen in `einkaufsplan/regeln.html`.
