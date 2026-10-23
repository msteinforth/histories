// Vollbild-Story-Viewer wie bei Instagram: Segment-Fortschrittsbalken, Tippen rechts = weiter,
// links = zurück, Wischen, Pfeiltasten. Kein Autoplay, kein Zeitdruck.
//
// Eine Karte ist ein Objekt { render(el, api) }. Über api kann eine Karte das Weiterblättern
// sperren (Quiz), selbst weiterblättern oder den Viewer schließen.
import { esc } from './util.js';
import { avatar, icons } from './ui.js';

let active = null;

export function closeViewer() {
  if (!active) return;
  const v = active;
  active = null;
  v.destroy();
}

export const viewerOpen = () => Boolean(active);

export function openViewer({ cards, info, foot = '', onShow, onEnd, onClose }) {
  closeViewer();
  const overlay = document.getElementById('overlay');
  const el = document.createElement('div');
  el.className = 'viewer';
  el.dataset.bereich = info.bereich;
  el.innerHTML = `
    <div class="v-top">
      <div class="v-progress">${cards.map(() => '<span><i></i></span>').join('')}</div>
      <div class="v-head">
        ${avatar(info, 'sm')}
        <div class="v-title"><b>${esc(info.name)}</b><small>${esc(info.sub)}</small></div>
        <button class="icon-btn v-close" aria-label="Schließen">${icons.close}</button>
      </div>
    </div>
    <div class="v-stage" aria-live="polite"></div>
    <div class="v-foot">${foot}</div>`;
  overlay.append(el);
  document.body.classList.add('viewer-open');

  const stage = el.querySelector('.v-stage');
  const segments = [...el.querySelectorAll('.v-progress span')];
  let index = 0;
  let locked = false;

  const api = {
    next: () => go(index + 1),
    prev: () => go(index - 1),
    lock: () => { locked = true; },
    unlock: () => { locked = false; },
    close: () => onClose?.(),
    get index() { return index; },
  };

  function show(i) {
    index = i;
    locked = false;
    segments.forEach((s, k) => s.classList.toggle('on', k <= i));
    const card = document.createElement('div');
    card.className = 'v-card';
    stage.replaceChildren(card);
    onShow?.(i, api);
    cards[i].render(card, api);
    stage.scrollTop = 0;
  }

  function go(i) {
    if (i < 0) return;
    if (i >= cards.length) { onEnd ? onEnd(api) : api.close(); return; }
    show(i);
  }

  stage.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, label, select')) return;
    const r = stage.getBoundingClientRect();
    if (e.clientX - r.left < r.width * 0.3) go(index - 1);
    else if (!locked) go(index + 1);
  });

  let touch = null;
  stage.addEventListener('touchstart', (e) => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      e.preventDefault();
      if (dx < 0 && !locked) go(index + 1);
      else if (dx > 0) go(index - 1);
    } else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      api.close();
    }
  });

  const onKey = (e) => {
    if (e.key === 'ArrowRight' && !locked) go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'Escape') api.close();
  };
  document.addEventListener('keydown', onKey);
  el.querySelector('.v-close').addEventListener('click', () => api.close());

  active = {
    el,
    destroy() {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('viewer-open');
      el.remove();
    },
  };
  show(0);
  return active;
}
