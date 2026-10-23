// Fortschritt liegt nur im Browser (localStorage) – kein Account, kein Server.
// Export/Import als Datei schützt vor Datenverlust beim Handywechsel.

const KEY = 'histories:v1';

const fresh = () => ({
  version: 1,
  done: {},      // einheitId -> { at, score, total }
  answers: {},   // frageId -> { right, at }
  liked: {},     // personId/einheitId -> true
  saved: {},     // personId/einheitId -> true
  seen: {},      // storyId -> true
  ferien: [],    // [{ von, bis|null }]
  vorschau: false,
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* privater Modus o. ä. – dann eben nur für diese Sitzung */ }
  return fresh();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignorieren */ }
}

export const get = () => state;

export function update(fn) {
  fn(state);
  save();
}

export function exportData() {
  return JSON.stringify({ app: 'histories', exportiert: new Date().toISOString(), ...state }, null, 2);
}

export function importData(text) {
  const data = JSON.parse(text);
  if (data.app !== 'histories' || data.version !== 1) throw new Error('Das ist keine Histories-Sicherung.');
  delete data.app;
  delete data.exportiert;
  state = { ...fresh(), ...data };
  save();
}

export function reset() {
  state = fresh();
  save();
}
