/* Bei JEDEM Push auf main, der live gehen soll: oben einen neuen Eintrag mit der nächsten Nummer einfügen,
   Zeit (Europe/Berlin) und kurz, was neu ist. Der oberste Eintrag ist der aktuelle Stand.
   Die Fußzeile zeigt „Version nr“; ein Tipp darauf klappt die letzten Änderungen auf. */
window.SITE_VERSIONEN = [
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
