// Einstieg und Router. Routen (Hash, damit es ohne Server-Konfiguration auf jedem Hosting läuft):
//   #/              Feed (Heute)          #/stories     Stories-Tab
//   #/album         Album                 #/einstellungen
//   #/heute         öffnet die heutige Einheit (Homescreen-Icon, Tageslink)
//   #/2026-10-26    öffnet die Einheit dieses Tages (jeder Tageslink bleibt gültig)
//   #/story/<id>    öffnet eine Bonus-Story
import * as logic from './logic.js';
import * as store from './store.js';
import * as views from './views.js';
import { dayCards, storyCards } from './cards.js';
import { openViewer, closeViewer } from './viewer.js';
import { esc, isISODate, today, toast, fmtLong, addDays } from './util.js';
import { icons } from './ui.js';
import { initInstall, maybeShowInstallHint, showInstallSheet } from './install.js';

const app = document.getElementById('app');
let mainView = 'feed';
let albumFilter = 'alle';

const TABS = [
  ['feed', '#/', icons.home, 'Heute'],
  ['stories', '#/stories', icons.stories, 'Stories'],
  ['album', '#/album', icons.album, 'Album'],
];

function renderMain() {
  const body = {
    feed: views.feed,
    stories: views.stories,
    album: () => views.album(albumFilter),
    einstellungen: views.settings,
  }[mainView]();
  const activeTab = mainView === 'einstellungen' ? 'album' : mainView;
  app.innerHTML = `
    <main class="page"><div class="page-inner">${body}</div></main>
    <nav class="tabbar">${TABS.map(([id, href, icon, label]) => `<a href="${href}" class="${activeTab === id ? 'on' : ''}">${icon}<span>${label}</span></a>`).join('')}</nav>`;
}

function backToMain() {
  history.replaceState(null, '', mainView === 'feed' ? '#/' : `#/${mainView}`);
  closeViewer();
  renderMain();
}

function likeFoot(id) {
  const st = store.get();
  return `
    <button class="icon-btn like ${st.liked[id] ? 'on' : ''}" data-like="${esc(id)}" aria-label="Gefällt mir">${icons.heart}</button>
    <button class="icon-btn save ${st.saved[id] ? 'on' : ''}" data-save="${esc(id)}" aria-label="Merken">${icons.bookmark}</button>`;
}

function openDay(datum) {
  const day = logic.dayByDate(datum);
  if (!day) { toast('Für diesen Tag gibt es keine Einheit.'); backToMain(); return; }
  if (!logic.isUnlocked(day)) { toast(`Noch gesperrt – ab ${fmtLong(day.datum)}.`); backToMain(); return; }
  const inf = logic.info(day.unit);
  openViewer({
    cards: dayCards(day),
    info: inf,
    foot: likeFoot(inf.id),
    onEnd: backToMain,
    onClose: backToMain,
  });
}

function openStory(id) {
  const story = logic.getContent().stories.find((x) => x.id === id);
  if (!story || !logic.storyUnlocked(story)) { toast('Diese Story ist noch nicht freigeschaltet.'); backToMain(); return; }
  const next = logic.storyQueue().find((x) => x.id !== id && !store.get().seen[x.id]);
  const cards = storyCards(story, next);
  openViewer({
    cards,
    info: logic.storyInfo(story),
    onShow: (i) => {
      if (i === cards.length - 1) store.update((s) => { s.seen[id] = true; });
    },
    onEnd: () => (next ? (location.hash = `#/story/${next.id}`) : backToMain()),
    onClose: backToMain,
  });
}

function route() {
  const [a = '', b] = location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'heute') {
    const day = logic.dayByDate(today());
    if (day && logic.isUnlocked(day) && !logic.isDone(day)) {
      history.replaceState(null, '', `#/${day.datum}`);
      renderMain();
      openDay(day.datum);
    } else {
      history.replaceState(null, '', '#/');
      mainView = 'feed';
      closeViewer();
      renderMain();
    }
    return;
  }
  if (isISODate(a)) { renderMain(); openDay(a); return; }
  if (a === 'story' && b) { renderMain(); openStory(decodeURIComponent(b)); return; }
  closeViewer();
  mainView = ['stories', 'album', 'einstellungen'].includes(a) ? a : 'feed';
  renderMain();
}

// Ereignisse per Delegation – Views werden als HTML-Strings neu gerendert.
document.addEventListener('click', (e) => {
  const like = e.target.closest('[data-like]');
  const save = e.target.closest('[data-save]');
  if (like || save) {
    const btn = like || save;
    const key = like ? 'liked' : 'saved';
    const id = btn.dataset.like || btn.dataset.save;
    store.update((s) => { if (s[key][id]) delete s[key][id]; else s[key][id] = true; });
    document.querySelectorAll(`[data-${like ? 'like' : 'save'}="${CSS.escape(id)}"]`).forEach((b) => b.classList.toggle('on', Boolean(store.get()[key][id])));
    if (like && store.get().liked[id]) btn.classList.add('pop');
    setTimeout(() => btn.classList.remove('pop'), 400);
    return;
  }
  const filter = e.target.closest('[data-filter]');
  if (filter) { albumFilter = filter.dataset.filter; renderMain(); return; }
  const action = e.target.closest('button[data-action]')?.dataset.action;
  if (action === 'vorschau') { store.update((s) => { s.vorschau = true; }); toast('Vorschau an: alle Tage sind freigeschaltet.'); renderMain(); }
  if (action === 'export') downloadBackup();
  if (action === 'install') showInstallSheet();
  if (action === 'reset' && confirm('Wirklich alles zurücksetzen? Das lässt sich nicht rückgängig machen.')) {
    store.reset(); toast('Zurückgesetzt.'); renderMain();
  }
});

document.addEventListener('change', async (e) => {
  const action = e.target.dataset.action;
  if (action === 'ferien') {
    const t = today();
    store.update((s) => {
      if (e.target.checked) s.ferien.push({ von: t, bis: null });
      else {
        const open = s.ferien.find((f) => !f.bis);
        if (open) {
          open.bis = addDays(t, -1);
          if (open.bis < open.von) s.ferien = s.ferien.filter((f) => f !== open);
        }
      }
    });
    toast(e.target.checked ? 'Ferienmodus an – schöne Ferien!' : 'Ferienmodus aus.');
  }
  if (action === 'vorschau-toggle') store.update((s) => { s.vorschau = e.target.checked; });
  if (action === 'import' && e.target.files[0]) {
    try {
      store.importData(await e.target.files[0].text());
      toast('Fortschritt importiert.');
      renderMain();
    } catch (err) { toast(err.message || 'Import fehlgeschlagen.'); }
  }
});

function downloadBackup() {
  const blob = new Blob([store.exportData()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `histories-fortschritt-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function start() {
  try {
    await logic.loadContent();
  } catch (err) {
    app.innerHTML = `<p class="empty">Inhalte konnten nicht geladen werden.<br><small>${esc(err.message)}</small></p>`;
    return;
  }
  initInstall();
  window.addEventListener('hashchange', route);
  route();
  maybeShowInstallHint();
  if ('serviceWorker' in navigator && !new URLSearchParams(location.search).has('nosw')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
