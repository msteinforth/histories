# Redaktion: so entsteht eine Tageseinheit

Pro Einheit ca. 15 Minuten: Buchstelle lesen → KI-Entwurf → Faktencheck → Redaktion → Plan eintragen → `node scripts/validate.mjs`.

## 1. Datei anlegen

`content/einheiten/w02-1-aischylos.json` (Schema: `w<Woche>-<Tag>-<slug>`). Die `id` in der Datei muss dem Dateinamen entsprechen.

### Personentag (`"variante": "person"`)

```json
{
  "id": "w02-1-aischylos",
  "variante": "person",
  "person": {
    "id": "aischylos", "name": "Aischylos", "kurz": "Ai",
    "lebensdaten": "525–456 v. Chr.", "jahr": -490,
    "rolle": "griechischer Dramatiker", "bereich": "kunst",
    "epoche": "Antike", "region": "Griechenland", "geschlecht": "m"
  },
  "quelle": { "buch": "Kapitel 17, S. …" },
  "bild": null,
  "hook": "Ein Satz für den Feed-Post (Frage oder Paradox, Pointe nicht verraten).",
  "karten": [
    { "typ": "hook", "text": "…" },
    { "typ": "steckbrief", "fakten": [["Lebte", "…"], ["Stadt", "…"], ["Bekannt für", "…"]] },
    { "typ": "passiert", "text": "…" },
    { "typ": "wichtig", "text": "…" },
    { "typ": "anekdote", "text": "…" },
    { "typ": "mythos", "mythos": "Verbreitete Annahme …", "wahrheit": "Auflösung …" },
    { "typ": "heute", "text": "…" }
  ],
  "quiz": [
    { "frage": "Faktenfrage", "optionen": ["A", "B", "C", "D"], "richtig": 1, "erklaerung": "Ein Satz." },
    { "frage": "Verständnisfrage", "optionen": ["A", "B", "C"], "richtig": 2, "erklaerung": "Ein Satz." },
    { "frage": "Reservefrage (Pool für Wiederholungen)", "optionen": ["A", "B", "C", "D"], "richtig": 0, "erklaerung": "Ein Satz." }
  ],
  "teaser": "Morgen: …"
}
```

- `bereich`: `macht`, `geist` (Religion & Philosophie), `entdeckung`, `kunst`, `wirtschaft` – bestimmt die Farbwelt.
- `jahr`: ungefähres Wirkungsjahr als Zahl (v. Chr. negativ) – für den Epochen-Marker.
- `kurz`: Initialen für den Avatar, solange es kein Porträt gibt.
- Quiz: Die App zeigt Frage 1 und 2 und ersetzt Frage 3 durch eine **Wiederholungsfrage** aus einer früheren Einheit (zuerst falsch beantwortete, sonst ca. 1 Tag / 1 Woche / 1 Monat zurück). Frage 3 der Datei wird nur am allerersten Tag gezeigt und dient sonst als Pool. Die richtige Antwort nicht immer an dieselbe Stelle setzen.
- `**fett**` ist in Texten erlaubt.

### Weitere Varianten

- **Wochen-Quiz** (`"variante": "wiederholung"`): `titel`, `hook`, eine `hook`-Karte, `einheiten` (Liste der IDs der Woche), `anzahl` (Standard 10). Falsch beantwortete Fragen kommen zuerst.
- **Meta-Tag** (`"variante": "meta"`, `"bereich": "meta"`): `titel`, `hook`, Karten vom Typ `hook` und `text` (mit `titel`), 0–3 Quizfragen. Zählt nicht für den Streak.
- Kartentyp `liste` (`titel`, `punkte: [...]`) für Listen-Tage.

## 2. Bonus-Stories

In `content/stories.json`: `typ` `haupt` (3 Anekdoten zur Hauptperson) oder `neben` (Nebenfigur), `freischaltung` = ID der Einheit, mit deren Tag die Story erscheint. 2–5 Karten, höchstens **35 Wörter** pro Karte.

## 3. Redaktionsplan

`content/plan.json` ist die einzige Steuerungsdatei. Eine Zeile pro Tag:

```json
{ "datum": "2026-11-02", "woche": 2, "staffel": 1, "einheit": "w02-1-aischylos", "buchseite": "Kap. 17", "bildquelle": null, "status": "entwurf" }
```

Nur `"status": "freigegeben"` erscheint in der App. Verschieben = Datum ändern, die Einheit bleibt gleich.

## 4. Porträts

Bild nach `content/bilder/<datei>` legen (nur gemeinfrei/CC0, z. B. Wikimedia Commons) und in der Einheit eintragen:

```json
"bild": { "datei": "imhotep.jpg", "credit": "Wikimedia Commons, gemeinfrei" }
```

Für Stories: `"bild"` im `person`-Objekt der Story. Quadratisch, ca. 400×400 px reicht.

## 5. Prüfen

```bash
node scripts/validate.mjs
```

Prüft Kartenfolge, ≤ 50 Wörter pro Karte, ≤ 450 Wörter pro Tag, ≤ 35 Wörter pro Story-Karte, Quiz-Format, Plan-Verweise und Bildangaben. Läuft auch automatisch bei jedem Push.

## Qualitäts-Checkliste vor der Freigabe

- [ ] Du-Form, kurze Sätze, höchstens 450 Wörter
- [ ] Eigene Formulierung, kein Satz aus dem Buch übernommen
- [ ] Lebensdaten wie im Buch, inklusive „um“
- [ ] Hook stellt Frage oder Paradox, verrät die Pointe nicht
- [ ] Quiz: Faktenfrage, Verständnisfrage, Reservefrage – jede mit Erklärung
- [ ] Heute-Bezug ist echt und für eine 16-Jährige erkennbar
- [ ] Bei Diktatoren und Schurken: klare Einordnung, nichts verharmlost
- [ ] Bild gemeinfrei, Credit hinterlegt

## Prompt-Vorlage

```markdown
Du schreibst eine 10-Minuten-Lerneinheit für eine 16-Jährige für die App „Histories“.
Quelle: [Buchabschnitt einfügen]. Nutze nur Fakten aus der Quelle; Heute-Bezüge dürfen
allgemein bekannt sein, müssen aber stimmen.
Formuliere alles neu in eigenen Worten, Du-Form, kurze Sätze, kein Jugendslang, kein Zeigefinger.
Ton: eine gute Freundin, die etwas Spannendes erzählt.
Erzeuge genau diese Karten (max. 50 Wörter je Karte, zusammen max. 450 Wörter):
1 hook (Frage oder Paradox) · 2 steckbrief (3–5 Fakten) · 3 passiert · 4 wichtig
5 anekdote · 6 mythos (Annahme + Auflösung, nur aus Kästen/Text der Quelle) · 7 heute
Dazu: "hook" für den Feed (1 Satz), 3 Quizfragen (1 Fakt, 1 Verständnis, 1 Reserve;
3–4 Optionen, richtige Antwort an wechselnder Position, Erklärung in 1 Satz),
"teaser" für morgen: [nächste Person].
Außerdem eine Bonus-Story "3 Dinge über …" mit 3 Karten à max. 35 Wörter aus Anekdoten,
die nicht in die Einheit gepasst haben.
Ausgabe als JSON exakt nach diesem Schema: [Schema aus docs/redaktion.md einfügen].
```
