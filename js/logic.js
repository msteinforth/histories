// Inhalte laden und alles ableiten, was vom Datum und vom Fortschritt abhängt:
// freigeschaltete Tage, Streak mit Jokern, Quiz-Zusammenstellung, Stories, Album.
import * as store from './store.js';
import { addDays, mondayOf, today, seededRandom, shuffle } from './util.js';

export const BEREICHE = {
  macht: 'Macht & Politik',
  geist: 'Religion & Philosophie',
  entdeckung: 'Entdeckung & Forschung',
  kunst: 'Kunst & Kultur',
  wirtschaft: 'Wirtschaft',
  quiz: 'Wochen-Quiz',
  meta: 'Bonus-Sonntag',
};

const JOKER_PRO_WOCHE = 2;

let content = null;

async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export async function loadContent() {
  const plan = await fetchJSON('content/plan.json');
  const tage = plan.tage.filter((t) => t.status === 'freigegeben').sort((a, b) => a.datum.localeCompare(b.datum));
  const ids = [...new Set(tage.map((t) => t.einheit))];
  const units = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await fetchJSON(`content/einheiten/${id}.json`)])));
  const { stories } = await fetchJSON('content/stories.json');
  const days = tage.map((t, index) => ({ ...t, index, unit: units[t.einheit] }));
  content = { days, units, stories };
  return content;
}

export const getContent = () => content;

// Anzeige-Infos für Avatar, Kopfzeile und Album – egal ob Person, Quiz oder Meta-Tag.
export function info(unit) {
  if (unit.person) {
    const p = unit.person;
    return { id: p.id, name: p.name, kurz: p.kurz || p.name.slice(0, 2), sub: `${p.lebensdaten} · ${p.rolle}`, bereich: p.bereich, bild: unit.bild, person: p };
  }
  return { id: unit.id, name: unit.titel, kurz: unit.kurz || '★', sub: BEREICHE[unit.bereich] || '', bereich: unit.bereich, bild: null };
}

export function storyInfo(story) {
  const p = story.person;
  return { id: p.id, name: p.name, kurz: p.kurz || p.name.slice(0, 2), sub: `${p.lebensdaten} · ${p.rolle}`, bereich: p.bereich, bild: p.bild || null };
}

export const isDone = (day) => Boolean(store.get().done[day.unit.id]);
export const isUnlocked = (day) => store.get().vorschau || day.datum <= today();
export const dayByDate = (datum) => content.days.find((d) => d.datum === datum);
export const dayOfUnit = (unitId) => content.days.find((d) => d.unit.id === unitId);
export const beforeStart = () => content.days.length > 0 && today() < content.days[0].datum;

// Der Tag, den der Feed als "Heute" zeigt.
export function currentDay() {
  const t = today();
  const exact = dayByDate(t);
  if (exact) return exact;
  if (beforeStart()) return content.days[0];
  return [...content.days].reverse().find((d) => d.datum <= t) || content.days[0];
}

export function nextDay(day) {
  return content.days[day.index + 1] || null;
}

export function weekOf(day) {
  const monday = mondayOf(day.datum);
  return content.days.filter((d) => mondayOf(d.datum) === monday);
}

export function inFerien(datum) {
  return store.get().ferien.some((f) => f.von <= datum && (!f.bis || datum <= f.bis));
}

export const ferienAktiv = () => inFerien(today());

// Streak: Tage in Folge, rückwärts ab heute. Verpasste Tage werden automatisch mit Jokern
// (2 pro Kalenderwoche) überbrückt; Sonntage (Meta) und Ferien zählen nicht. Nachgeholte
// Tage zählen mit – das Format soll motivieren, nicht bestrafen.
export function streak() {
  const t = today();
  const s = store.get();
  const jokerUsed = {};
  let count = 0;
  const relevant = content.days
    .filter((d) => d.unit.variante !== 'meta' && (d.datum <= t || s.done[d.unit.id]))
    .reverse();
  for (const d of relevant) {
    if (s.done[d.unit.id]) { count++; continue; }
    if (d.datum >= t || inFerien(d.datum)) continue;
    const week = mondayOf(d.datum);
    if ((jokerUsed[week] || 0) < JOKER_PRO_WOCHE) { jokerUsed[week] = (jokerUsed[week] || 0) + 1; continue; }
    break;
  }
  return { count, jokerLeft: JOKER_PRO_WOCHE - (jokerUsed[mondayOf(t)] || 0) };
}

// Offene Tage zum Nachholen (vergangen, freigeschaltet, nicht erledigt).
export function openDays() {
  const t = today();
  return content.days.filter((d) => d.datum < t && !isDone(d) && d.unit.variante !== 'meta');
}

function questionsOf(unit) {
  const name = info(unit).name;
  return (unit.quiz || []).map((q, i) => ({ ...q, id: `${unit.id}#${i}`, von: name }));
}

// Quizfrage 3 kommt aus früheren Einheiten: zuerst falsch beantwortete Fragen,
// sonst abwechselnd ca. 1 Tag, 1 Woche, 1 Monat zurück.
function repeatQuestion(day) {
  const answers = store.get().answers;
  const earlier = content.days.filter((d) => d.datum < day.datum && d.unit.variante === 'person');
  if (!earlier.length) return null;
  const wrong = earlier.flatMap((d) => questionsOf(d.unit)).find((q) => answers[q.id]?.right === false);
  if (wrong) return { ...wrong, wiederholung: true };
  const offset = [1, 7, 30][day.index % 3];
  const target = addDays(day.datum, -offset);
  const src = [...earlier].reverse().find((d) => d.datum <= target) || earlier[0];
  const qs = questionsOf(src.unit);
  const q = qs.find((x) => !answers[x.id]) || qs[day.index % qs.length];
  return { ...q, wiederholung: true };
}

function reviewQuestions(day) {
  const unit = day.unit;
  const answers = store.get().answers;
  const rand = seededRandom(day.datum);
  const pool = unit.einheiten.flatMap((id) => (content.units[id] ? questionsOf(content.units[id]) : []));
  const earlierWrong = content.days
    .filter((d) => d.datum < day.datum && d.unit.variante === 'person' && !unit.einheiten.includes(d.unit.id))
    .flatMap((d) => questionsOf(d.unit))
    .filter((q) => answers[q.id]?.right === false);
  const wrong = [...pool.filter((q) => answers[q.id]?.right === false), ...earlierWrong];
  const rest = shuffle(pool.filter((q) => !wrong.includes(q)), rand);
  const picked = [...wrong, ...rest].slice(0, unit.anzahl || 10);
  return shuffle(picked, rand).map((q) => ({ ...q, wiederholung: true }));
}

export function quizFor(day) {
  const unit = day.unit;
  if (unit.variante === 'wiederholung') return reviewQuestions(day);
  const own = questionsOf(unit);
  if (unit.variante !== 'person') return own;
  const rep = repeatQuestion(day);
  return rep ? [own[0], own[1], rep] : own.slice(0, 3);
}

export function recordAnswer(q, right) {
  store.update((s) => { s.answers[q.id] = { right, at: today() }; });
}

export function markDone(day, score, total) {
  store.update((s) => {
    const prev = s.done[day.unit.id];
    s.done[day.unit.id] = { at: prev?.at || today(), score, total };
  });
}

export function storyUnlocked(story) {
  const d = dayOfUnit(story.freischaltung);
  return Boolean(d && isUnlocked(d));
}

export function storyUnlockDate(story) {
  return dayOfUnit(story.freischaltung)?.datum;
}

// Reihenfolge für Story-Leiste und "Nächste Story": ungesehen zuerst, dann neueste zuerst.
export function storyQueue() {
  const seen = store.get().seen;
  return content.stories
    .filter(storyUnlocked)
    .sort((a, b) => (Boolean(seen[a.id]) - Boolean(seen[b.id])) || storyUnlockDate(b).localeCompare(storyUnlockDate(a)));
}

export const storyForUnit = (unitId) => content.stories.find((s) => s.typ === 'haupt' && s.freischaltung === unitId);

export function albumPersons() {
  return content.days.filter((d) => d.unit.variante === 'person' && isDone(d));
}

export function albumSideFigures() {
  const seen = store.get().seen;
  return content.stories.filter((s) => s.typ === 'neben' && seen[s.id]);
}

export function quizRate() {
  const all = Object.values(store.get().answers);
  if (!all.length) return null;
  return Math.round((all.filter((a) => a.right).length / all.length) * 100);
}
