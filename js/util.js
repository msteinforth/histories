// Kleine Helfer: HTML-Escaping, Datumsrechnung (immer lokale Kalendertage als "YYYY-MM-DD").

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function mondayOf(s) {
  const d = parseISO(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

export const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// "Heute" lässt sich zum Testen per ?heute=2026-10-28 überschreiben.
export function today() {
  const override = new URLSearchParams(location.search).get('heute');
  return override && isISODate(override) ? override : iso(new Date());
}

export const fmtDay = (s) => parseISO(s).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtLong = (s) => parseISO(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtWeekday = (s) => parseISO(s).toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');

// Deterministischer Zufall, damit ein Quiz beim erneuten Öffnen gleich bleibt.
export function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}
