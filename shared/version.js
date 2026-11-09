/* Bei JEDEM Push auf main, der live gehen soll: oben einen neuen Eintrag mit der nächsten Nummer einfügen,
   Zeit (Europe/Berlin) und kurz, was neu ist. Der oberste Eintrag ist der aktuelle Stand.
   Die Fußzeile zeigt „Version nr“; ein Tipp darauf klappt die letzten Änderungen auf. */
window.SITE_VERSIONEN = [
  { nr: 20, stand: "2026-11-09 18:59", was: "Rezeptfilter brechen um statt seitlich zu wischen; Kapha als 🐘" },
  { nr: 19, stand: "2026-11-09 18:43", was: "Rezepte: Symbole für Art und Mahlzeit statt Tags, Herzen für Patrick (blau) und Kerstin (lila), geordnete Filter" },
  { nr: 18, stand: "2026-11-07 10:19", was: "Einkaufsliste erscheint beim Öffnen sofort im letzten Stand; unten „Wird aktualisiert …“, bis der frische Stand da ist" },
  { nr: 17, stand: "2026-11-07 10:10", was: "Rezeptfotos werden nur noch beim ersten Mal geladen (Foto-Links bleiben über App-Starts gleich)" },
  { nr: 16, stand: "2026-11-07 10:00", was: "Schnellerer Start (Daten warten nicht mehr auf den Namen, Vorverbindung zu Supabase); Rezeptbilder: erste 4 zuerst, jedes Bild erscheint fertig statt Stück für Stück" },
  { nr: 15, stand: "2026-11-07 09:53", was: "Einkauf kompakter; leere Kategorien nur beim Ziehen; zugeklappte Kategorie in Bernstein mit Anzahl; Pfeil zur Projektübersicht an der Überschrift" },
  { nr: 14, stand: "2026-11-07 01:08", was: "Nur Hinweise für Claude: Aufträge und kcal-Prüfung im Projektleitfaden" },
  { nr: 13, stand: "2026-11-07 00:43", was: "Claude kann Rezepte per Auftrag auf die Einkaufsliste setzen (läuft beim Öffnen der App); Rezept-Regeln: Gramm und Nährwerte je Zutat" },
  { nr: 12, stand: "2026-11-07 00:13", was: "Anzeigename direkt aus der eigenen Zeile der Zugangsliste" },
  { nr: 11, stand: "2026-11-06 23:58", was: "Anzeigename kommt aus der Datenbank; keine E-Mail-Adressen mehr im Code" },
  { nr: 10, stand: "2026-11-06 23:45", was: "Rezepte: Abschnitt Original (z. B. Papas Rezept, antippen öffnet groß); Links in Tipps und Quelle anklickbar; 40 Rezepte aus Notion übernommen" },
  { nr: 9, stand: "2026-11-06 21:45", was: "Rezepte kommen aus der Datenbank statt aus dem Repo; neu: Gefüllte Paprika, Vegetarische Bratlinge" },
  { nr: 8, stand: "2026-11-02 00:36", was: "Zuordnungen und Vorschläge: antippen, langer Druck oder Rechtsklick zum Ändern; Logos gehören zur einzelnen Zuordnung bzw. zum Vorschlag je Kategorie" },
  { nr: 7, stand: "2026-11-01 18:43", was: "Einkauf: Sortierung nur über Stichwörter; Verschieben trägt ein Stichwort in die Zuordnung ein" },
  { nr: 6, stand: "2026-11-01 18:06", was: "Tastatur: Scrollgrenze rechnet mit sichtbarer Höhe; Hinweis auf neue Version auch beim Zurückholen der App" },
  { nr: 5, stand: "2026-11-01 17:48", was: "Eingabefelder: Tastatur verdeckt sie nicht mehr, iOS schiebt sie selbst hoch" },
  { nr: 4, stand: "2026-11-01 17:15", was: "Tageskarten gleich hoch, Bewertung auf Chiphöhe, Versionsnummer mit Verlauf in der Fußzeile" },
  { nr: 3, stand: "2026-11-01 16:45", was: "Anmeldung rutscht auf dem iPhone über die Tastatur" },
  { nr: 2, stand: "2026-11-01 16:34", was: "Einkaufsplaner mit Icon, Startseite nach Login" },
  { nr: 1, stand: "2026-11-01 16:33", was: "App-Icons, Startseite nach Login" }
];
window.SITE_VERSION = window.SITE_VERSIONEN[0];
