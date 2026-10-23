// Die drei Tabs (Heute, Stories, Album) plus Einstellungen.
import * as logic from './logic.js';
import * as store from './store.js';
import { esc, fmtDay, fmtLong, fmtWeekday, today } from './util.js';
import { avatar, icons, ring } from './ui.js';

const s = () => store.get();

function streakPill() {
  const st = logic.streak();
  return `<span class="pill" title="Tage in Folge">${icons.flame}${st.count}</span>`;
}

function header(title, extra = '') {
  return `<header class="top"><h1 class="logo">${title}</h1><div class="top-right">${extra}</div></header>`;
}

function storyBar() {
  const cur = logic.currentDay();
  const items = [];
  if (cur && logic.isUnlocked(cur)) {
    const inf = logic.info(cur.unit);
    items.push(`<a class="story-item" href="#/${cur.datum}">${ring(inf, { seen: logic.isDone(cur) })}<span>Heute</span></a>`);
  }
  for (const st of logic.storyQueue()) {
    // Die Bonus-Story der heutigen Person erst nach der Tageseinheit zeigen (Link auf der Abschluss-Karte).
    if (st.typ === 'haupt' && cur && st.freischaltung === cur.unit.id && !logic.isDone(cur)) continue;
    const inf = logic.storyInfo(st);
    items.push(`<a class="story-item ${st.typ}" href="#/story/${esc(st.id)}">${ring(inf, { seen: s().seen[st.id] })}<span>${esc(inf.name.split(' ')[0])}</span></a>`);
  }
  if (!items.length) return '';
  return `<nav class="storybar" aria-label="Stories">${items.join('')}</nav>`;
}

function likeButtons(id) {
  return `
    <button class="icon-btn like ${s().liked[id] ? 'on' : ''}" data-like="${esc(id)}" aria-label="Gefällt mir">${icons.heart}</button>
    <button class="icon-btn save ${s().saved[id] ? 'on' : ''}" data-save="${esc(id)}" aria-label="Merken">${icons.bookmark}</button>`;
}

function post(day) {
  const unit = day.unit;
  const inf = logic.info(unit);
  const unlocked = logic.isUnlocked(day);
  const done = logic.isDone(day);
  const meta = unit.variante === 'person'
    ? `${unit.person.epoche} · ${logic.BEREICHE[inf.bereich]}`
    : logic.BEREICHE[inf.bereich];
  const cta = !unlocked
    ? `<span class="btn ghost">${icons.lock} ab ${esc(fmtLong(day.datum))}</span>`
    : `<a class="btn primary" href="#/${day.datum}">${icons.play} ${done ? 'Nochmal ansehen' : 'Starten'}</a>`;
  const cardCount = (unit.karten?.length || 0) + 2;
  const caption = unit.variante === 'person'
    ? `${esc(unit.person.name)} (${esc(unit.person.lebensdaten)}), ${esc(unit.person.rolle)}.`
    : esc(unit.titel);
  return `
    <article class="post" data-bereich="${esc(inf.bereich)}">
      <div class="post-head">
        ${ring(inf, { seen: done || !unlocked, size: 'sm' })}
        <div><b>${esc(inf.name)}</b><small>${esc(fmtLong(day.datum))}</small></div>
        ${done ? `<span class="done-badge">${icons.check} erledigt</span>` : ''}
      </div>
      <div class="post-media">
        <div class="post-meta">Woche ${day.woche} · ${esc(meta)}</div>
        <p class="post-hook">${esc(unit.hook)}</p>
        <div class="post-foot"><span>${cardCount} Karten · ca. 10 Min.</span>${cta}</div>
      </div>
      <div class="post-actions">${likeButtons(inf.id)}</div>
      <p class="caption"><b>histories</b> ${caption}</p>
    </article>`;
}

function weekList(day) {
  const t = today();
  const rows = logic.weekOf(day).map((d) => {
    const inf = logic.info(d.unit);
    const done = logic.isDone(d);
    const unlocked = logic.isUnlocked(d);
    let status;
    if (done) status = `<span class="status ok">${icons.check}</span>`;
    else if (d.datum === t) status = '<span class="status today">Heute</span>';
    else if (d.datum < t) status = `<span class="status open">${d.unit.variante === 'meta' ? 'Bonus' : 'Nachholen'}</span>`;
    else if (unlocked) status = '<span class="status open">Vorschau</span>';
    else status = `<span class="status locked">${icons.lock}</span>`;
    const inner = `
      <span class="wk-day">${esc(fmtWeekday(d.datum))}<small>${esc(d.datum.slice(8))}.</small></span>
      ${avatar(inf, 'sm')}
      <span class="wk-name"><b>${esc(inf.name)}</b><small>${esc(inf.sub)}</small></span>
      ${status}`;
    return unlocked
      ? `<a class="wk-row ${d.datum === t ? 'is-today' : ''}" href="#/${d.datum}">${inner}</a>`
      : `<div class="wk-row locked">${inner}</div>`;
  });
  return `<section class="week"><h2>Woche ${day.woche}</h2>${rows.join('')}</section>`;
}

export function feed() {
  const day = logic.currentDay();
  if (!day) return `${header('Histories')}<p class="empty">Noch keine Inhalte freigegeben.</p>`;
  const st = logic.streak();
  const open = logic.openDays().filter((d) => logic.isUnlocked(d));
  const banners = [];
  if (logic.beforeStart() && !s().vorschau) {
    banners.push(`<div class="banner"><p><b>Woche 1 startet am ${esc(fmtLong(day.datum))}.</b> Du kannst schon vorher reinschauen.</p><button class="btn small" data-action="vorschau">Vorschau an</button></div>`);
  }
  if (logic.ferienAktiv()) banners.push('<div class="banner calm"><p><b>Ferienmodus:</b> Dein Streak pausiert. Inhalte kannst du trotzdem ansehen.</p></div>');
  if (open.length) banners.push(`<div class="banner calm"><p>${open.length === 1 ? 'Ein Tag wartet' : `${open.length} Tage warten`} aufs Nachholen – ganz ohne Stress. Joker diese Woche: ${st.jokerLeft}</p></div>`);
  return `
    ${header('Histories', streakPill())}
    ${storyBar()}
    ${banners.join('')}
    ${post(day)}
    ${weekList(day)}`;
}

export function stories() {
  const c = logic.getContent();
  const t = today();
  const row = (st) => {
    const inf = logic.storyInfo(st);
    const unlocked = logic.storyUnlocked(st);
    const seen = s().seen[st.id];
    const date = logic.storyUnlockDate(st);
    const status = unlocked ? (seen ? 'Gesehen' : '<b class="new">Neu</b>') : `ab ${esc(fmtDay(date))}`;
    const inner = `${unlocked ? ring(inf, { seen }) : `<span class="ring locked">${avatar(inf, 'md')}</span>`}
      <span class="st-text"><b>${esc(st.titel)}</b><small>${esc(inf.name)} · ${esc(inf.sub)}</small></span>
      <span class="st-status">${status}</span>`;
    return unlocked ? `<a class="st-row" href="#/story/${esc(st.id)}">${inner}</a>` : `<div class="st-row locked">${inner}</div>`;
  };
  const haupt = c.stories.filter((x) => x.typ === 'haupt');
  const neben = c.stories.filter((x) => x.typ === 'neben');
  const seenCount = c.stories.filter((x) => s().seen[x.id]).length;
  return `
    ${header('Stories', `<span class="pill">${seenCount}/${c.stories.length}</span>`)}
    <p class="intro">Bonus-Anekdoten in einer Minute. Freiwillig, ohne Quiz – reine Neugier.${t < (c.days[0]?.datum || t) && !s().vorschau ? ' Die ersten Stories erscheinen mit dem Start von Woche 1.' : ''}</p>
    <section class="st-list"><h2>Hauptpersonen</h2>${haupt.map(row).join('')}</section>
    <section class="st-list"><h2>Nebenfiguren</h2>${neben.map(row).join('')}</section>`;
}

export function album(filter = 'alle') {
  const persons = logic.albumPersons();
  const side = logic.albumSideFigures();
  const st = logic.streak();
  const rate = logic.quizRate();
  const shown = persons.filter((d) => {
    const id = logic.info(d.unit).id;
    return filter === 'alle' || (filter === 'gemerkt' && s().saved[id]) || (filter === 'herz' && s().liked[id]);
  }).sort((a, b) => a.unit.person.jahr - b.unit.person.jahr);
  const tiles = shown.map((d) => {
    const inf = logic.info(d.unit);
    return `
      <a class="tile" href="#/${d.datum}" data-bereich="${esc(inf.bereich)}">
        <span class="tile-kurz">${esc(inf.kurz)}</span>
        <span class="tile-name">${esc(inf.name)}<small>${esc(d.unit.person.lebensdaten)}</small></span>
        <span class="tile-icons">${s().liked[inf.id] ? icons.heart : ''}${s().saved[inf.id] ? icons.bookmark : ''}</span>
      </a>`;
  });
  const chip = (id, label) => `<button class="chip-btn ${filter === id ? 'on' : ''}" data-filter="${id}">${label}</button>`;
  return `
    ${header('Album', `<a class="icon-btn" href="#/einstellungen" aria-label="Einstellungen">${icons.gear}</a>`)}
    <section class="profile">
      <span class="ring big"><span class="avatar xl logo-avatar"><span>H</span></span></span>
      <div class="stats">
        <div><b>${persons.length}</b><small>Personen</small></div>
        <div><b>${side.length}</b><small>Neben&shy;figuren</small></div>
        <div><b>${st.count}</b><small>Streak</small></div>
        <div><b>${rate === null ? '–' : `${rate}%`}</b><small>Quiz</small></div>
      </div>
    </section>
    <div class="chips">${chip('alle', 'Alle')}${chip('herz', 'Gefällt mir')}${chip('gemerkt', 'Gemerkt')}</div>
    ${tiles.length ? `<div class="grid">${tiles.join('')}</div>` : `<p class="empty">${persons.length ? 'Hier ist noch nichts markiert.' : 'Noch leer. Jede abgeschlossene Tageseinheit landet hier als Sammelkarte.'}</p>`}
    ${side.length ? `
      <section class="side"><h2>Nebenfiguren</h2><div class="side-grid">
        ${side.map((x) => { const inf = logic.storyInfo(x); return `<a class="side-tile" href="#/story/${esc(x.id)}">${avatar(inf, 'md')}<span>${esc(inf.name)}</span></a>`; }).join('')}
      </div></section>` : ''}`;
}

export function settings() {
  const st = store.get();
  return `
    ${header(`<a class="icon-btn" href="#/album" aria-label="Zurück">${icons.back}</a> Einstellungen`)}
    <section class="settings">
      <label class="toggle"><span><b>Ferienmodus</b><small>Streak pausiert, Inhalte bleiben verfügbar.</small></span>
        <input type="checkbox" data-action="ferien" ${logic.ferienAktiv() ? 'checked' : ''}></label>
      <label class="toggle"><span><b>Vorschau</b><small>Alle Tage sofort freischalten (für den Testlauf).</small></span>
        <input type="checkbox" data-action="vorschau-toggle" ${st.vorschau ? 'checked' : ''}></label>
      <div class="set-group">
        <b>Fortschritt sichern</b>
        <small>Alles liegt nur auf diesem Gerät. Vor einem Handywechsel exportieren und auf dem neuen Gerät importieren.</small>
        <div class="actions row">
          <button class="btn" data-action="export">Exportieren</button>
          <label class="btn">Importieren<input type="file" accept="application/json,.json" data-action="import" hidden></label>
        </div>
      </div>
      <div class="set-group">
        <b>Zurücksetzen</b>
        <small>Löscht Streak, Album, Likes und Quiz-Antworten auf diesem Gerät.</small>
        <div class="actions row"><button class="btn danger" data-action="reset">Alles zurücksetzen</button></div>
      </div>
      <div class="set-group about">
        <b>Über Histories</b>
        <small>Eine Person pro Tag, 10 Minuten. Privates Familienprojekt, nicht öffentlich. Inhaltliche Grundlage: Christa Pöppelmann, „Allgemeinbildung Personen der Weltgeschichte für Dummies“ (Wiley-VCH 2018) – alle Texte in eigenen Worten neu geschrieben.</small>
      </div>
    </section>`;
}
