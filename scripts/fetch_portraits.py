#!/usr/bin/env python3
"""Lädt gemeinfreie Porträts von Wikimedia Commons, prüft die Lizenz und trägt sie ein.

Quelle der Wahrheit ist content/bilder/quellen.json:
  { "imhotep": { "kandidaten": ["File:…jpg", …], "suche": "Imhotep statue" }, … }

Für jede Person wird der erste Kandidat (sonst das erste Suchergebnis) genommen, dessen
Lizenz gemeinfrei oder CC0 ist. Das Bild wird quadratisch zugeschnitten (600 px, JPEG)
nach content/bilder/<id>.jpg gelegt; Einheiten und Stories bekommen "bild" mit Credit.

Aufruf:  python3 scripts/fetch_portraits.py [id …]      (ohne ids: alle)
         python3 scripts/fetch_portraits.py --nur-pruefen
Braucht Pillow (pip install pillow).
"""
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
BILDER = ROOT / "content" / "bilder"
API = "https://commons.wikimedia.org/w/api.php"
UA = "HistoriesFamilyApp/1.0 (private family project; portrait fetcher)"
FREI = re.compile(r"public domain|^pd\b|^pd-|cc0", re.I)
SIZE = 600


def get(url, versuche=5):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(versuche):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or i == versuche - 1:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 5 * (i + 1))


def api(**params):
    params.update(format="json", formatversion="2")
    return json.loads(get(f"{API}?{urllib.parse.urlencode(params)}"))


def strip_html(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()


def info(titles):
    data = api(action="query", prop="imageinfo", titles="|".join(titles),
               iiprop="url|extmetadata|size", iiurlwidth=str(SIZE * 2),
               iiextmetadatafilter="LicenseShortName|Artist|ObjectName")
    out = {}
    for p in data["query"]["pages"]:
        if p.get("missing") or not p.get("imageinfo"):
            continue
        ii = p["imageinfo"][0]
        meta = ii.get("extmetadata", {})
        out[p["title"]] = {
            "titel": p["title"],
            "lizenz": strip_html(meta.get("LicenseShortName", {}).get("value")),
            "kuenstler": strip_html(meta.get("Artist", {}).get("value")),
            "thumb": ii.get("thumburl") or ii["url"],
            "seite": ii.get("descriptionurl"),
        }
    return out


def search(query):
    data = api(action="query", list="search", srsearch=f"{query} filetype:bitmap",
               srnamespace="6", srlimit="15")
    return [r["title"] for r in data["query"]["search"]]


def choose(entry):
    titles = list(entry.get("kandidaten", []))
    suchen = entry.get("suche") or []
    for q in [suchen] if isinstance(suchen, str) else suchen:
        titles += [t for t in search(q) if t not in titles]
    found = info(titles[:50]) if titles else {}
    for t in titles:
        f = found.get(t) or found.get(t.replace("_", " "))
        if f and FREI.search(f["lizenz"]):
            return f, [found[x] for x in found]
    return None, list(found.values())


def save(img_bytes, target, fokus, zoom=1.0):
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(img_bytes))).convert("RGB")
    w, h = im.size
    side = int(min(w, h) * zoom)
    fx, fy = fokus
    left = int(min(max(fx * w - side / 2, 0), w - side))
    top = int(min(max(fy * h - side / 2, 0), h - side))
    im = im.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)
    im.save(target, "JPEG", quality=84, optimize=True, progressive=True)


def credit(f):
    who = f["kuenstler"] or "unbekannt"
    return f"{who} · Wikimedia Commons ({f['titel'].removeprefix('File:')}) · {f['lizenz']}"


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def eintragen(pid, bild):
    for f in (ROOT / "content" / "einheiten").glob("*.json"):
        u = json.loads(f.read_text(encoding="utf-8"))
        if u.get("person", {}).get("id") == pid:
            u["bild"] = bild
            write_json(f, u)
    sf = ROOT / "content" / "stories.json"
    stories = json.loads(sf.read_text(encoding="utf-8"))
    for s in stories["stories"]:
        if s["person"]["id"] == pid:
            s["person"]["bild"] = bild
    write_json(sf, stories)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    nur_pruefen = "--nur-pruefen" in sys.argv
    quellen = json.loads((BILDER / "quellen.json").read_text(encoding="utf-8"))
    fehler = 0
    for pid, entry in quellen.items():
        if pid.startswith("_") or (args and pid not in args):
            continue
        time.sleep(2)
        f, alle = choose(entry)
        if not f:
            fehler += 1
            print(f"✗ {pid}: kein gemeinfreies Bild gefunden. Geprüft:")
            for x in alle[:10]:
                print(f"    {x['lizenz'] or '?':28} {x['titel']}")
            continue
        print(f"✓ {pid}: {f['titel']} [{f['lizenz']}] {f['seite']}")
        if nur_pruefen:
            for x in alle[:45]:
                frei = "frei" if FREI.search(x["lizenz"]) else "    "
                print(f"    {frei} {x['lizenz'] or '?':28} {x['titel']}")
            continue
        save(get(f["thumb"]), BILDER / f"{pid}.jpg", entry.get("fokus", [0.5, 0.35]), entry.get("zoom", 1.0))
        eintragen(pid, {"datei": f"{pid}.jpg", "credit": credit(f), "quelle": f["seite"]})
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
