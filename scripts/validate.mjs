#!/usr/bin/env node
// Prüft Redaktionsplan, Tageseinheiten und Bonus-Stories gegen die Regeln aus dem Konzept.
// Aufruf: node scripts/validate.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIMITS = { karte: 50, tag: 450, storyKarte: 35 };
const BEREICHE = ['macht', 'geist', 'entdeckung', 'kunst', 'wirtschaft', 'quiz', 'meta'];
const KARTENTYPEN = ['hook', 'steckbrief', 'passiert', 'wichtig', 'anekdote', 'mythos', 'heute', 'text', 'liste'];

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const words = (s) => (s || '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const readJSON = (p) => {
  try { return JSON.parse(readFileSync(join(root, p), 'utf8')); }
  catch (e) { err(p, `JSON nicht lesbar: ${e.message}`); return null; }
};

function cardWords(k) {
  switch (k.typ) {
    case 'steckbrief': return (k.fakten || []).reduce((n, [a, b]) => n + words(a) + words(b), 0);
    case 'mythos': return words(k.mythos) + words(k.wahrheit);
    case 'liste': return words(k.titel) + (k.punkte || []).reduce((n, p) => n + words(p), 0);
    default: return words(k.titel) + words(k.text);
  }
}

function checkQuiz(where, quiz) {
  quiz.forEach((q, i) => {
    const w = `${where} quiz[${i}]`;
    if (!q.frage) err(w, 'Frage fehlt');
    if (!Array.isArray(q.optionen) || q.optionen.length < 3 || q.optionen.length > 4) err(w, '3–4 Antwortoptionen erwartet');
    if (!Number.isInteger(q.richtig) || q.richtig < 0 || q.richtig >= (q.optionen || []).length) err(w, '"richtig" zeigt auf keine Option');
    if (!q.erklaerung) err(w, 'Erklärungssatz fehlt');
  });
}

const plan = readJSON('content/plan.json');
const stories = readJSON('content/stories.json');
const unitFiles = readdirSync(join(root, 'content/einheiten')).filter((f) => f.endsWith('.json'));
const units = {};

for (const f of unitFiles) {
  const where = `einheiten/${f}`;
  const u = readJSON(`content/einheiten/${f}`);
  if (!u) continue;
  if (u.id !== f.replace(/\.json$/, '')) err(where, `id "${u.id}" passt nicht zum Dateinamen`);
  units[u.id] = u;

  if (!['person', 'wiederholung', 'meta'].includes(u.variante)) err(where, `unbekannte Variante "${u.variante}"`);
  if (!u.hook) err(where, 'Hook für den Feed-Post fehlt');
  if (!u.teaser) warn(where, 'Teaser für morgen fehlt');
  const bereich = u.person ? u.person.bereich : u.bereich;
  if (!BEREICHE.includes(bereich)) err(where, `unbekannter Bereich "${bereich}"`);

  if (u.variante === 'person') {
    const p = u.person || {};
    for (const key of ['id', 'name', 'lebensdaten', 'rolle', 'bereich', 'epoche']) if (!p[key]) err(where, `person.${key} fehlt`);
    if (typeof p.jahr !== 'number') err(where, 'person.jahr (Zahl, für den Zeitstrahl) fehlt');
    const typen = (u.karten || []).map((k) => k.typ);
    const pflicht = ['hook', 'steckbrief', 'passiert', 'wichtig', 'anekdote', 'mythos', 'heute'];
    if (typen.join() !== pflicht.join()) err(where, `Kartenfolge muss ${pflicht.join(' · ')} sein (ist: ${typen.join(' · ')})`);
    if ((u.quiz || []).length < 3) err(where, 'Personentag braucht 3 Quizfragen (die dritte dient als Reserve, solange es noch keine Wiederholung gibt)');
  }
  if (u.variante === 'wiederholung') {
    if (!Array.isArray(u.einheiten) || !u.einheiten.length) err(where, 'Liste "einheiten" für das Wochen-Quiz fehlt');
  }

  let total = words(u.teaser);
  (u.karten || []).forEach((k, i) => {
    if (!KARTENTYPEN.includes(k.typ)) err(where, `karten[${i}]: unbekannter Typ "${k.typ}"`);
    const n = cardWords(k);
    total += n;
    if (n > LIMITS.karte) err(where, `karten[${i}] (${k.typ}) hat ${n} Wörter – erlaubt sind ${LIMITS.karte}`);
  });
  if (total > LIMITS.tag) err(where, `insgesamt ${total} Wörter – erlaubt sind ${LIMITS.tag}`);
  if (u.quiz) checkQuiz(where, u.quiz);
  u._words = total;
}

if (plan) {
  const seen = new Set();
  plan.tage.forEach((t, i) => {
    const where = `plan.json tage[${i}]`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.datum) || Number.isNaN(Date.parse(t.datum))) err(where, `ungültiges Datum "${t.datum}"`);
    if (seen.has(t.datum)) err(where, `Datum ${t.datum} doppelt`);
    seen.add(t.datum);
    if (!units[t.einheit]) err(where, `Einheit "${t.einheit}" nicht gefunden`);
    if (!['entwurf', 'redigiert', 'freigegeben'].includes(t.status)) err(where, `Status "${t.status}" unbekannt`);
  });
  for (const u of Object.values(units)) {
    if (u.variante === 'wiederholung') {
      for (const id of u.einheiten || []) if (!units[id]) err(`einheiten/${u.id}.json`, `verweist auf unbekannte Einheit "${id}"`);
    }
  }
  const used = new Set(plan.tage.map((t) => t.einheit));
  for (const id of Object.keys(units)) if (!used.has(id)) warn(`einheiten/${id}.json`, 'ist im Redaktionsplan nicht eingeplant');
}

if (stories) {
  const ids = new Set();
  stories.stories.forEach((s, i) => {
    const where = `stories.json [${s.id || i}]`;
    if (!s.id || ids.has(s.id)) err(where, 'id fehlt oder doppelt');
    ids.add(s.id);
    if (!['haupt', 'neben', 'thema'].includes(s.typ)) err(where, `unbekannter Typ "${s.typ}"`);
    if (!units[s.freischaltung]) err(where, `Freischaltung "${s.freischaltung}" ist keine bekannte Einheit`);
    if (!s.person || !s.person.name || !BEREICHE.includes(s.person.bereich)) err(where, 'person.name / person.bereich fehlt');
    if (!s.karten || s.karten.length < 2 || s.karten.length > 5) err(where, '2–5 Karten erwartet');
    const b = s.person && s.person.bild;
    if (b && !existsSync(join(root, 'content/bilder', b.datei))) err(where, `Bild ${b.datei} fehlt in content/bilder/`);
    if (b && !b.credit) err(where, 'Bild ohne Quellenangabe');
    (s.karten || []).forEach((k, j) => {
      const n = words(k.text);
      if (n > LIMITS.storyKarte) err(where, `karten[${j}] hat ${n} Wörter – erlaubt sind ${LIMITS.storyKarte}`);
    });
  });
}

for (const u of Object.values(units)) {
  if (u.bild && !existsSync(join(root, 'content/bilder', u.bild.datei))) err(`einheiten/${u.id}.json`, `Bild ${u.bild.datei} fehlt in content/bilder/`);
  if (u.bild && !u.bild.credit) err(`einheiten/${u.id}.json`, 'Bild ohne Quellenangabe');
}

console.log(`Einheiten: ${Object.keys(units).length} · Plan-Tage: ${plan ? plan.tage.length : 0} · Stories: ${stories ? stories.stories.length : 0}`);
for (const u of Object.values(units)) console.log(`  ${u.id.padEnd(24)} ${String(u._words).padStart(3)} Wörter`);
warnings.forEach((w) => console.warn(`WARNUNG ${w}`));
errors.forEach((e) => console.error(`FEHLER  ${e}`));
if (errors.length) { console.error(`\n${errors.length} Fehler.`); process.exit(1); }
console.log('\nAlles in Ordnung.');
