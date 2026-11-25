/* Logos der Einkaufsliste: Bio und Angebot gelten allgemein und stehen hier. Die Geschäfte stehen nur in der Datenbank
   (einstellungen/logos = {liste: [{k, n, c, logo, w?}], defs}; w = weitere Wörter, die beim Eingeben das Logo setzen): logo ist der Inhalt eines 24×24-SVG, defs sind gemeinsame
   Verläufe und Bilder (einmal global eingefügt, weil eine id in einem gerade versteckten Abzeichen nicht gefunden würde).
   Gespeichert wird am Eintrag nur der Schlüssel k (Feld labels); die Reihenfolge hier bestimmt die Folge in Zeilen und Auswahl. */
const LEAF=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/></svg>`;
const LG=inner=>`<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
const LABELS_FEST=[
  {k:"bio",n:"Bio",c:"#3d8b37",g:LEAF},
  {k:"angebot",n:"Angebot",c:"#e8590c",g:"%"}
];
let LABELS=LABELS_FEST;
const logoDefs=document.createElementNS("http://www.w3.org/2000/svg","svg");
logoDefs.setAttribute("width","0"); logoDefs.setAttribute("height","0"); logoDefs.setAttribute("aria-hidden","true");
logoDefs.style.position="absolute";
document.body.prepend(logoDefs);
/* Geschäfte aus der Datenbank übernehmen; true, wenn sich etwas geändert hat */
let logoStand="";
function setLogos(d){
  const liste=Array.isArray(d?.liste)?d.liste.filter(L=>L&&typeof L.k==="string"&&L.n):[];
  const stand=JSON.stringify([liste,d?.defs||""]); if(stand===logoStand) return false; logoStand=stand;
  logoDefs.innerHTML=`<defs>${typeof d?.defs==="string"?d.defs:""}</defs>`;
  LABELS=[...LABELS_FEST,...liste.map(L=>({k:L.k,n:L.n,c:L.c||"#666",logo:LG(String(L.logo||"")),w:Array.isArray(L.w)?L.w:[]}))];
  return true;
}
