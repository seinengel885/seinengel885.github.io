# Hinweise für Claude

- Sprache mit Patrick: Deutsch. Kerstin ist die zweite Nutzerin.
- **Vor jeder Arbeit an der Oberfläche** den Skill `artefakt-bau` laden und die passenden Bausteine lesen (z. B. `eingabe-ios.md`:
  Bearbeiten ohne Rahmen und ohne Größenänderung, 16px; `ios-viewport.md`: Tastatur, kein `preventScroll` beim Fokussieren).
- **Sauberer Code:** Bei einem Fehler die Ursache beheben, nicht drumherum bauen. Erst prüfen, ob die native
  Browser-Funktion reicht; keine zusätzlichen Hilfsskripte, die einen eigenen Fehler ausgleichen.
- Jedes Projekt ist ein Ordner (`einkaufsplaner/`, später z. B. `todo/`), eingebunden über `shared/backend.js`
  mit eigenem `data-app`. Der Einkaufsplaner liegt in `einkaufsplaner/`, seine Daten aber unter
  `app = 'einkaufsplan'` (so heißt er in der Datenbank und im Fotospeicher weiter). Neue Projekte auf der Startseite `index.html` verlinken und mit eigenem Icon
  (`<ordner>/icons/`, `apple-touch-icon.png` 180 px, `icon-192.png`, `icon-512.png`) und `manifest.webmanifest` versehen.
- **Ablauf:** Claude arbeitet lokal, testet selbst (Playwright) und aktualisiert die Vorschau. Ist eine Änderung fertig und getestet,
  fragt Claude, ob sie live gehen soll. Nach Patricks Zustimmung pusht Claude direkt auf `main` (GitHub Pages liefert von `main` aus) –
  ohne Pull Request, ohne weitere Branches. Vorher `git fetch origin main` und `origin/main` mergen, nie mit Überschreiben (force) pushen.
  Den eigenen Arbeitsbranch darf Claude jederzeit pushen (Sicherung).
- **Vorschau:** Patrick kann Änderungen in einer klickbaren Vorschau im Chat ansehen.
  `node tools/vorschau.mjs einkaufsplaner einkaufsplan <scratchpad>/vorschau <scratchpad>/rezepte` baut die Seite mit `shared/demo-backend.js`
  (Beispieldaten, keine Anmeldung, nichts geht an Supabase; Rezepte als `<id>.json` aus dem Ordner im Scratchpad, da Inhalte nicht im Repo liegen) und gibt die Dateiliste aus. Veröffentlichen mit dem
  Artifact-Tool: `file_path` = `<ziel>/index.html`, `root` = `<ziel>`, `files` = die Liste. Immer dieselbe Vorschau
  aktualisieren: https://claude.ai/artifact/2c352bzY4g3bf9WPx6eTmG (Einkaufsplaner); in einer neuen Sitzung erst mit
  `action: "read"` lesen, dann mit `url` veröffentlichen.
  **Ungefragt:** Vor jeder Antwort, die eine Änderung am Code meldet, die Vorschau neu bauen und veröffentlichen, und den
  Link in der ersten Antwort jeder Sitzung nennen. Patrick kommentiert direkt in der Vorschau; diese Kommentare kommen als
  „Artifact comment“ hier an und werden im jeweiligen Thread beantwortet.
  Was nur in der Home-Bildschirm-App auftritt (z. B. Tastatur), zeigt die Vorschau nicht; dafür Bildschirmfotos aus Playwright.
- **Bei jedem Push auf `main`: `shared/version.js` ergänzen**: oben in `SITE_VERSIONEN` einen
  Eintrag mit der nächsten `nr`, `stand` (Zeit Europe/Berlin) und `was` (kurz, was neu ist). Die Fußzeile jeder Seite zeigt
  „Version nr“; ein Tipp darauf klappt die letzten fünf Änderungen auf. Daran erkennt Patrick, ob GitHub Pages schon
  ausgeliefert hat. Jede Seite bindet dafür `shared/version.js` und `shared/footer.js` ein.
- **Tastatur:** Das Feld über die iOS-Tastatur schiebt iOS selbst. Eigene Scrollgrenzen (z. B. Nachfedern) rechnen
  mit `visualViewport.height`, nicht mit `innerHeight` (bleibt auf dem iPhone bei offener Tastatur gleich).
- Daten: Supabase-Projekt `ilozkxfqiqdyeejcddes`, Tabelle `public.docs` (app, collection, id, data jsonb),
  Verlauf in `public.docs_history`, Fotos im privaten Bucket `bilder`. Schemaänderungen als Migration anwenden
  und zusätzlich unter `supabase/migrations/` ablegen; danach den Sicherheitscheck (Advisors) laufen lassen.
- **Auf GitHub nur Code, keine Inhalte.** Rezepte, Fotos und alle anderen Inhalte liegen nur in Supabase.
- Zugriff nur für Adressen in `public.allowed_users`. Nie Daten oder geheime Schlüssel ins öffentliche Repo legen.
- Sicherung auf Zuruf: Dokumente aus `public.docs` (und Fotos) ins private Repo `seinengel885/backups`
  im Format von `tools/backup.mjs`.
- Rezept-Regeln stehen in `einkaufsplaner/regeln.html`.
- **Begriffe im Einkaufsplaner** (mit Patrick so sprechen): *Logos* = Bio, Angebot und die Geschäfte (im Code `LABELS`,
  Feld `labels` am Eintrag). *Vorschläge* = Chips der Merkliste unter dem Listen-Symbol einer Kategorie in der
  Einkaufsliste (`cfg.merk`, Logos je Kategorie und Vorschlag in `cfg.merkLb[Kategorie][Name]`). Antippen legt einen Eintrag mit ihren Logos an (grüner Haken, wenn er
  offen auf der Liste steht); ändern per langem Druck oder Rechtsklick. *Zuordnungen* = Chips auf der Seite Zuordnung
  (Stichwörter der Kategorien, dazu „Immer im Haus“ und Mengeneinheiten). Sie wirken beim Eingeben eines Eintrags;
  Antippen öffnet sie direkt zum Ändern. Logos sind eine Eigenschaft der einzelnen Zuordnung einer Kategorie (`cfg.zuoLb[Kategorie][Wort]`): Die Zuordnung, die
  einen neuen Eintrag einsortiert, gibt ihm auch ihre Logos. Vorschläge stehen nicht auf der Seite Zuordnung.
