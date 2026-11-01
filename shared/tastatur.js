/* Eingabefelder über der Bildschirmtastatur halten – für alle Seiten des Projekts.
   iOS schiebt ein Feld beim Fokus zwar selbst nach oben, in der Home-Bildschirm-App aber oft nicht weit genug:
   die schwebende Leiste über der Tastatur (Pfeile, Haken) deckt es dann zu. Deshalb wird nach dem Fokus und
   nach jeder Größenänderung der sichtbaren Fläche (Tastatur auf/zu) nachgemessen und so weit gerollt, dass das
   Feld mit Abstand über der Tastatur steht.
   window.imEingabefeld() sagt Seiten mit eigener Scrollgrenze, dass gerade getippt wird. */
(() => {
  const KEIN_TEXT = /^(checkbox|radio|button|submit|reset|file|range|color|date|time|month|week|datetime-local|hidden|image)$/i;
  const istFeld = el => !!el && (el.isContentEditable || el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && !KEIN_TEXT.test(el.type) && !el.readOnly));
  window.imEingabefeld = () => istFeld(document.activeElement);

  const vv = window.visualViewport;
  if (!vv) return;
  const ABSTAND = 64;   /* Platz für die schwebende Leiste über der iOS-Tastatur plus etwas Luft */
  let timer = 0;
  function zeigen() {
    const el = document.activeElement;
    if (!istFeld(el)) return;
    const tastatur = innerHeight - vv.height > 80;
    if (!tastatur) return;                         /* ohne Bildschirmtastatur (PC) nichts tun */
    const r = el.getBoundingClientRect();
    const unten = vv.offsetTop + vv.height - ABSTAND;
    if (r.bottom > unten) scrollBy(0, Math.ceil(r.bottom - unten));
  }
  const bald = (ms) => { clearTimeout(timer); timer = setTimeout(zeigen, ms); };
  document.addEventListener("focusin", () => bald(350), true);   /* nach dem Hochfahren der Tastatur */
  vv.addEventListener("resize", () => bald(80));
})();
