# Claude in Chrome: Rezepte und Fotos in den Einkaufsplaner holen

Anleitung für Claude in Chrome. Aufruf durch Patrick: „Lies https://raw.githubusercontent.com/seinengel885/seinengel885.github.io/main/tools/chrome-import.md und arbeite diese Liste ab: …“.
Die Liste nennt je Zeile `id | URL | QUELLE` (Teil A, nur Foto) oder `id | Rezeptseite` (Teil B, Rezept und Foto).

Für meinen Einkaufsplaner Rezeptfotos und Rezeptdaten von Websites holen, die automatische Downloads sperren, und in meine Datenbank schreiben. Kein Token und kein Schlüssel wird gebraucht: Der fremde Tab schickt Bild bzw. Rezeptdaten per postMessage an den Einkaufsplaner-Tab, der speichert mit meiner Anmeldung. Arbeite sparsam: keine Seitentexte lesen, pro Bild höchstens ein Screenshot, alles Übrige per javascript_tool. Am Ende nur eine Tabelle: id | Foto ok / übersprungen (Grund) | Import ok (nur Teil B).

## 0. Einkaufsplaner-Tab vorbereiten (einmal)
Neuer Tab: https://seinengel885.github.io/einkaufsplaner/ (ich bin angemeldet). javascript_tool:
(()=>{if(window.__imp)return "schon bereit";window.__imp=1;
addEventListener("message",async e=>{const m=e.data;if(e.source!==window.__w||!m||!m.einkauf)return;const s=e.source,ok=t=>s.postMessage({einkaufOk:t},"*");
try{const db=await backend.use("db");if(m.bild){const up=await (await backend.use("assets")).upload(m.bild);
await db.doc("bilder/"+m.id).set({asset:up.id,quelle:m.quelle,geaendert:new Date().toISOString()});ok(`Foto ${m.id} ok ${Math.round(m.bild.size/1024)} KB`)}
else{await db.doc("import/"+m.id).set(m.daten);ok(`Import ${m.id} ok`)}}catch(err){ok(`FEHLER ${m.id}: ${err.message||err}`)}});
const p=document.createElement("div");p.id="imp";p.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:#fff;border:2px solid #333;padding:8px;font:16px sans-serif";
p.innerHTML='<input id="impurl" style="width:70%;font-size:16px" placeholder="URL"> <button id="impgo" style="font-size:16px">Öffnen</button>';
document.body.append(p);document.getElementById("impgo").onclick=()=>{window.__w=window.open(document.getElementById("impurl").value,"imp")};return "bereit";})()

Öffnen einer Seite: im Einkaufsplaner-Tab per javascript_tool `document.getElementById("impurl").value="URL"` setzen, dann den Knopf „Öffnen“ mit einem echten Klick (computer/click) drücken – ein Klick ist nötig, sonst blockt der Popup-Blocker. Es öffnet sich immer derselbe zweite Tab „imp“; darin arbeiten. (Braucht der Klick-Weg zu lange, darf ich auch Pop-ups für seinengel885.github.io erlauben – dann melde dich.)

## Skript FOTO (im Tab „imp“, in dem die Bild-URL geöffnet ist)
Ersetze ID und QUELLE:
(async()=>{const ID="ID",Q="QUELLE";const im=await createImageBitmap(await (await fetch(location.href)).blob());
const w=Math.min(720,im.width),h=Math.round(im.height*w/im.width),c=new OffscreenCanvas(w,h);c.getContext("2d").drawImage(im,0,0,w,h);
let j=await c.convertToBlob({type:"image/jpeg",quality:.8});if(j.size>153600)j=await c.convertToBlob({type:"image/jpeg",quality:.7});
if(!window.opener)return "kein opener – Tab nicht über den Knopf geöffnet";
const a=new Promise(r=>{addEventListener("message",e=>e.data?.einkaufOk&&r(e.data.einkaufOk));setTimeout(()=>r("keine Antwort"),30000)});
window.opener.postMessage({einkauf:1,id:ID,quelle:Q,bild:j},"https://seinengel885.github.io");return `${w}x${h}: `+await a;})()

Vor dem Hochladen: Screenshot ansehen. Hochladen nur, wenn das Bild das ganze Gericht gut erkennbar zeigt und zum Rezept passt (keine Collage, kein anderes Gericht). Sonst überspringen und Grund nennen.

## Skript IMPORT (im Tab „imp“ mit der Rezeptseite)
Ersetze ID:
(async()=>{const ID="ID";const all=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>{try{return [JSON.parse(s.textContent)].flat().flatMap(x=>[x,...(x["@graph"]||[])])}catch(e){return[]}});
const r=all.find(x=>[].concat(x["@type"]).includes("Recipe"));if(!r)return "kein Rezept-JSON-LD";const og=document.querySelector('meta[property="og:image"]')?.content||"";
if(!window.opener)return "kein opener";const a=new Promise(x=>{addEventListener("message",e=>e.data?.einkaufOk&&x(e.data.einkaufOk));setTimeout(()=>x("keine Antwort"),30000)});
window.opener.postMessage({einkauf:1,id:ID,daten:{url:location.href,rezept:r,ogImage:og}},"https://seinengel885.github.io");return `${r.name} | Bild: ${og} | `+await a;})()

## Teil A: Foto (Knopf mit der Bild-URL, Screenshot, FOTO)
## Teil B: Rezept (Knopf mit der Rezeptseite, IMPORT, dann Knopf mit der gemeldeten Bild-URL, Screenshot, FOTO mit QUELLE = Domain)

Cookie-Banner nur wegklicken, wenn sie das Skript stören. Nichts kaufen, nichts anmelden, keine anderen Seiten.
Zum Schluss im Einkaufsplaner-Tab die Seite neu laden (entfernt Panel und Empfänger).
