# Histories – Eine Person pro Tag

Tägliches 10-Minuten-Ritual: 9 Karten zum Durchtippen (Hook, Steckbrief, Was ist passiert, Warum wichtig, Anekdote, Mythos-Check, Heute-Bezug, Quiz, Abschluss) – im Stil von Instagram-Stories. Grundlage ist *Allgemeinbildung Personen der Weltgeschichte für Dummies* (Christa Pöppelmann, Wiley-VCH 2018), alle Texte in eigenen Worten.

**Privates Familienprojekt** – nicht öffentlich verlinken (`noindex`, `robots.txt`).

## Stand: Prototyp (Stufe 0)

- Woche 1 (ab Mo, 26.10.2026): Imhotep, Nebukadnezar II., Siddhartha Gautama, Konfuzius, Platon, Wochen-Quiz, Meta-Sonntag „Wer wird berühmt?“
- 9 Bonus-Stories: 5 Hauptpersonen + Kyros II., Laotse, Dareios I., Diogenes
- Feed mit Story-Leiste, 4:5-Tages-Post und Wochenliste
- Story-Viewer (Tippen links/rechts, Wischen, Pfeiltasten), Mythos zum Aufdecken, Epochen-Marker
- Quiz mit sofortigem Feedback; Frage 3 ist eine Wiederholung aus früheren Tagen
- Streak mit 2 Jokern pro Woche, Ferienmodus, Nachholen (jeder Tageslink bleibt gültig)
- Like & Merken, Album (Sammelkarten, Filter, Nebenfiguren), Export/Import des Fortschritts
- PWA: Homescreen-Icon öffnet direkt die heutige Einheit, offline nutzbar
- Gemeinfreie Porträts (Wikimedia Commons, Public Domain/CC0) für alle 9 Personen der Woche 1, mit Quellenangabe

## Links

| Link | Wirkung |
| --- | --- |
| `…/#/heute` | heutige Einheit (oder Feed, wenn schon erledigt) – für Nachricht und Homescreen |
| `…/#/2026-10-26` | Einheit eines bestimmten Tages |
| `…/#/` · `#/stories` · `#/album` | Tabs |
| `…/?heute=2026-10-28` | Testen: „heute“ auf ein anderes Datum setzen |

Vor dem Start lässt sich in den Einstellungen (Album → Zahnrad) die **Vorschau** einschalten, dann sind alle Tage frei.

## Lokal starten

Keine Abhängigkeiten, kein Build. Irgendein statischer Server reicht:

```bash
npx http-server -c-1 .     # oder: python3 -m http.server
```

## Inhalte pflegen

Siehe [docs/redaktion.md](docs/redaktion.md) – Schema, Prompt-Vorlage, Checkliste. Kurz:

- `content/plan.json` – Redaktionsplan, einzige Steuerungsdatei (Datum → Einheit, Status)
- `content/einheiten/*.json` – eine Datei pro Einheit
- `content/stories.json` – Bonus-Stories
- `node scripts/validate.mjs` – prüft Wortbudget, Kartenfolge, Quiz und Verweise

## Porträts

`content/bilder/quellen.json` listet pro Person Commons-Dateien (oder einen Suchbegriff) plus Zuschnitt (`fokus`, `zoom`). Der Workflow **Porträts laden** (Actions → Run workflow) holt sie:

- `pruefen` zeigt Kandidaten mit Lizenz im Log
- `laden` übernimmt nur gemeinfreie/CC0-Bilder, schneidet auf 600×600 zu, trägt Credit und Quelle in Einheiten und Stories ein, committet und veröffentlicht

Lokal geht dasselbe mit `python3 scripts/fetch_portraits.py [id …]` (braucht Pillow und Zugriff auf commons.wikimedia.org).

## Veröffentlichen

`.github/workflows/pages.yml` prüft die Inhalte und veröffentlicht bei jedem Push auf `main` auf GitHub Pages (einmalig in den Repo-Einstellungen unter *Pages → Source: GitHub Actions* aktivieren). Achtung: Bei einem öffentlichen Repository ist die Seite unter der Pages-Adresse erreichbar, nur eben nicht verlinkt/indexiert.

## Aufbau

```
index.html, manifest.webmanifest, sw.js   App-Hülle, PWA, Offline-Cache
css/app.css                               Gestaltung (Dark Mode, Farbwelt je Bereich)
js/app.js        Router und Ereignisse    js/logic.js   Freischaltung, Streak, Quiz, Stories
js/views.js      Feed, Stories, Album     js/cards.js   Karten der Einheit und Stories
js/viewer.js     Story-Viewer             js/store.js   Fortschritt in localStorage
```

## Nächste Schritte (Konzept, Stufe 1)

- Woche 1 gemeinsam testen, Ton und Kartenlänge abstimmen
- Redaktionsplan Staffel 1 (90 Kernpersonen) anlegen und in Batches produzieren
- Automatischer Versand des Tageslinks (z. B. GitHub Action + E-Mail-Dienst)
