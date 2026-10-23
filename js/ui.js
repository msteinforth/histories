// Gemeinsame UI-Bausteine: Icons und Avatare (Porträt oder Initialen in der Farbe des Bereichs).
import { esc } from './util.js';

const svg = (path, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${path}</svg>`;

export const icons = {
  heart: svg('<path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.5 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/>'),
  bookmark: svg('<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>'),
  close: svg('<path d="M5 5l14 14M19 5L5 19"/>'),
  home: svg('<path d="M3.5 10.5L12 3.5l8.5 7V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z"/>'),
  stories: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>'),
  album: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  flame: svg('<path d="M12 21.5c-4 0-7-2.8-7-6.6 0-3.4 2.3-5.6 4-7.6.4 1.8 1.3 3 2.6 3.6-.3-3.3 1.2-6.4 3.7-8.4.2 3.4 1.6 5 3 6.9 1 1.4 1.7 3 1.7 5.1 0 4.2-3.4 7-8 7z"/>'),
  check: svg('<path d="M4.5 12.5l5 5 10-11"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  play: svg('<path d="M7 4.5v15l13-7.5z"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
};

// size: xs | sm | md | lg | xl
export function avatar(inf, size = 'md') {
  const inner = inf.bild
    ? `<img src="content/bilder/${esc(inf.bild.datei)}" alt="" loading="lazy">`
    : `<span>${esc(inf.kurz)}</span>`;
  return `<span class="avatar ${size}" data-bereich="${esc(inf.bereich)}">${inner}</span>`;
}

// Story-Kreis mit Gradient-Ring (ungesehen) oder grauem Ring (gesehen).
export function ring(inf, { seen = false, size = 'md' } = {}) {
  return `<span class="ring ${seen ? 'seen' : ''}">${avatar(inf, size)}</span>`;
}

// Erlaubt **fett** in Redaktionstexten, sonst wird alles escaped.
export const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
