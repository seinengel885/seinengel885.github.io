"""Rezepte (und ihre Fotos) aus einem Ordner nach Supabase schreiben – Inhalte gehen nie ins Repo.

    python3 -I tools/rezepte-import.py <ordner> [--nur-bilder]

<ordner>/<id>.json   ein Rezept (Felder wie in einkaufsplaner/regeln.html) → public.docs, collection rezepte
<ordner>/bilder.tsv  optional, je Zeile: id <TAB> bild-url <TAB> quelle
                     → Foto laden, auf 720 px Breite verkleinern (JPEG 80 %, über 150 KB 70 %),
                       in den Bucket bilder hochladen und bilder/<id> {asset, quelle} schreiben.
                     Ein Rezept, das schon ein Foto hat, behält es.

Der Secret Key steckt nicht im Skript: In der Claude-Umgebung setzt der Netzwerk-Proxy ihn in den Header apikey ein.
Anderswo SUPABASE_SECRET_KEY setzen."""
import io, json, os, sys, uuid, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

BASE = "https://ilozkxfqiqdyeejcddes.supabase.co"
APP = "einkaufsplan"
KEY = os.environ.get("SUPABASE_SECRET_KEY", "proxy-injected")
PFLICHT = ["name", "tags", "kcal", "portionen", "minuten", "kurz", "beilageHinweis", "beilagen", "zutaten", "phasen", "tipps", "quelle"]


def http(method, path, body=None, headers=None):
    h = {"apikey": KEY, **(headers or {})}
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path}: {e.code} {e.read().decode()[:300]}")


def upsert(collection, rows):
    body = json.dumps([{"app": APP, "collection": collection, "id": i, "data": d} for i, d in rows]).encode()
    http("POST", "/rest/v1/docs?on_conflict=app,collection,id", body,
         {"Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})


def pruefen(rid, r):
    fehler = [f for f in PFLICHT if f not in r]
    if not isinstance(r.get("kcal"), (int, float)): fehler.append("kcal keine Zahl")
    if any(not z.get("text") for z in r.get("zutaten", [])): fehler.append("Zutat ohne Text")
    if any("g" in z and (not isinstance(z["g"], (int, float)) or not z.get("nw")) for z in r.get("zutaten", [])):
        fehler.append("Zutat mit g ohne Zahl oder ohne nw")
    if fehler: raise SystemExit(f"{rid}: {', '.join(fehler)}")


def foto(url):
    raw = urllib.request.urlopen(url, timeout=30).read()
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width > 720:
        im = im.resize((720, round(im.height * 720 / im.width)), Image.LANCZOS)
    for q in (80, 70):
        buf = io.BytesIO(); im.save(buf, "JPEG", quality=q, optimize=True)
        if buf.tell() <= 150 * 1024: break
    path = f"{APP}/{uuid.uuid4()}.jpg"
    http("POST", "/storage/v1/object/bilder/" + path, buf.getvalue(), {"Content-Type": "image/jpeg"})
    return path, buf.tell() // 1024


def main():
    ordner = Path(sys.argv[1]); nur_bilder = "--nur-bilder" in sys.argv
    if not nur_bilder:
        rows = []
        for f in sorted(ordner.glob("*.json")):
            r = json.loads(f.read_text("utf-8")); r.pop("id", None)
            pruefen(f.stem, r); rows.append((f.stem, r))
        if rows:
            upsert("rezepte", rows)
            print("Rezepte:", ", ".join(i for i, _ in rows))
    tsv = ordner / "bilder.tsv"
    if not tsv.exists(): return
    vorhanden = {x["id"] for x in json.loads(http("GET", f"/rest/v1/docs?select=id&app=eq.{APP}&collection=eq.bilder"))}
    for zeile in tsv.read_text("utf-8").splitlines():
        if not zeile.strip(): continue
        rid, url, quelle = (zeile.split("\t") + ["", ""])[:3]
        if rid in vorhanden: print(f"Foto {rid}: schon vorhanden"); continue
        try:
            path, kb = foto(url)
        except (urllib.error.URLError, OSError) as e:
            print(f"Foto {rid}: FEHLT ({e})"); continue
        upsert("bilder", [(rid, {"asset": path, "quelle": quelle, "geaendert": datetime.now(timezone.utc).isoformat()})])
        print(f"Foto {rid}: {kb} KB")


main()
