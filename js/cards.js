// Kartenbausteine für Tageseinheiten und Bonus-Stories.
import * as logic from './logic.js';
import { esc, fmtLong } from './util.js';
import { avatar, icons, rich } from './ui.js';

const LABELS = {
  hook: 'Heute',
  steckbrief: 'Steckbrief',
  passiert: 'Was ist passiert?',
  wichtig: 'Warum wichtig?',
  anekdote: 'Anekdote',
  mythos: 'Mythos-Check',
  heute: 'Und heute?',
};

const html = (markup) => ({ render(el) { el.innerHTML = markup; } });

// Zeitstrahl von 3000 v. Chr. bis 2000 n. Chr. mit Punkt für die Person.
function epochMarker(p) {
  const pct = Math.max(0, Math.min(100, ((p.jahr + 3000) / 5000) * 100));
  return `
    <div class="epoch" aria-label="Zeitstrahl: ${esc(p.epoche)}">
      <div class="epoch-line"><i style="left:${pct}%"></i></div>
      <div class="epoch-ticks"><span>3000 v. Chr.</span><span>Chr. Geb.</span><span>2000</span></div>
      <div class="epoch-label" style="left:${pct}%">${esc(p.epoche)}</div>
    </div>`;
}

function unitCard(card, unit) {
  const label = card.typ === 'text' ? card.titel : LABELS[card.typ];
  const inf = logic.info(unit);
  switch (card.typ) {
    case 'hook':
      return html(`<div class="card card-hook"><div class="label">${esc(label)}</div><p class="display">${rich(card.text)}</p><div class="hint">Tippen zum Weiterlesen ${icons.arrow}</div></div>`);
    case 'steckbrief': {
      const p = unit.person;
      return html(`
        <div class="card card-steckbrief">
          <div class="label">${esc(label)}</div>
          ${avatar(inf, 'xl')}
          <h2 class="name">${esc(p.name)}</h2>
          <p class="role">${esc(p.rolle)}</p>
          ${epochMarker(p)}
          <dl class="facts">${card.fakten.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${rich(v)}</dd></div>`).join('')}</dl>
          ${unit.bild?.credit ? `<p class="credit">Bild: ${esc(unit.bild.credit)}</p>` : ''}
        </div>`);
    }
    case 'mythos':
      return {
        render(el) {
          el.innerHTML = `
            <div class="card card-mythos">
              <div class="label">${esc(label)}</div>
              <p class="claim">„${rich(card.mythos)}“</p>
              <button class="btn reveal">Stimmt das?</button>
              <p class="truth" hidden>${rich(card.wahrheit)}</p>
            </div>`;
          el.querySelector('.reveal').addEventListener('click', (e) => {
            e.currentTarget.hidden = true;
            el.querySelector('.truth').hidden = false;
          });
        },
      };
    case 'liste':
      return html(`<div class="card"><div class="label">${esc(card.titel)}</div><ol class="list">${card.punkte.map((x) => `<li>${rich(x)}</li>`).join('')}</ol></div>`);
    default:
      return html(`<div class="card card-${esc(card.typ)}"><div class="label">${esc(label)}</div><p class="body">${rich(card.text)}</p></div>`);
  }
}

function quizCard(questions, onFinish) {
  let answered = [];
  return {
    render(el, api) {
      let qi = answered.length;
      api.lock();
      const total = questions.length;
      const draw = () => {
        if (qi >= total) {
          const score = answered.filter(Boolean).length;
          onFinish(score, total);
          el.innerHTML = `
            <div class="card card-quiz done">
              <div class="label">Quiz</div>
              <p class="score"><b>${score}</b> von ${total}</p>
              <p class="body">${score === total ? 'Alles richtig. Stark!' : score >= total / 2 ? 'Gut gemacht! Was danebenging, kommt später nochmal.' : 'Kein Problem – die Fragen kommen wieder, dann sitzt es.'}</p>
              <button class="btn primary next">Weiter ${icons.arrow}</button>
            </div>`;
          el.querySelector('.next').addEventListener('click', () => { api.unlock(); api.next(); });
          api.unlock();
          return;
        }
        const q = questions[qi];
        el.innerHTML = `
          <div class="card card-quiz">
            <div class="label">Quiz · Frage ${qi + 1} von ${total}</div>
            ${q.wiederholung ? `<div class="chip">Wiederholung · ${esc(q.von)}</div>` : ''}
            <h2 class="question">${esc(q.frage)}</h2>
            <div class="options">${q.optionen.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
            <div class="explain" hidden></div>
          </div>`;
        el.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
          if (answered.length > qi) return;
          const k = Number(b.dataset.k);
          const right = k === q.richtig;
          answered.push(right);
          logic.recordAnswer(q, right);
          el.querySelectorAll('.opt').forEach((o, j) => {
            o.disabled = true;
            if (j === q.richtig) o.classList.add('right');
            else if (j === k) o.classList.add('wrong');
          });
          const ex = el.querySelector('.explain');
          ex.hidden = false;
          ex.innerHTML = `<p><b>${right ? 'Richtig!' : 'Nicht ganz.'}</b> ${esc(q.erklaerung)}</p>
            <button class="btn primary next">${qi + 1 < total ? 'Nächste Frage' : 'Auswertung'} ${icons.arrow}</button>`;
          ex.querySelector('.next').addEventListener('click', () => { qi++; draw(); });
        }));
      };
      draw();
    },
  };
}

function finishCard(day, getScore) {
  return {
    render(el) {
      const unit = day.unit;
      const { score, total } = getScore();
      logic.markDone(day, score, total);
      const st = logic.streak();
      const inf = logic.info(unit);
      const next = logic.nextDay(day);
      const story = logic.storyForUnit(unit.id);
      el.innerHTML = `
        <div class="card card-finish">
          <div class="label">Geschafft</div>
          <div class="streak-big">${icons.flame}<b>${st.count}</b><span>${st.count === 1 ? 'Tag' : 'Tage'} in Folge</span></div>
          ${unit.variante === 'person' ? `
            <div class="collect" data-bereich="${esc(inf.bereich)}">
              ${avatar(inf, 'lg')}
              <div><small>Neu im Album</small><b>${esc(inf.name)}</b><span>${esc(unit.person.lebensdaten)}</span></div>
            </div>` : ''}
          ${total ? `<p class="muted">Quiz: ${score} von ${total} richtig</p>` : ''}
          ${unit.teaser ? `<div class="teaser"><small>${next ? esc(fmtLong(next.datum)) : 'Demnächst'}</small><p>${esc(unit.teaser)}</p></div>` : ''}
          <div class="actions">
            ${story ? `<a class="btn primary" href="#/story/${esc(story.id)}">${esc(story.titel)} ${icons.arrow}</a>` : ''}
            <a class="btn" href="#/">Zum Feed</a>
          </div>
        </div>`;
    },
  };
}

export function dayCards(day) {
  const unit = day.unit;
  const questions = logic.quizFor(day);
  let result = { score: 0, total: 0 };
  const cards = (unit.karten || []).map((k) => unitCard(k, unit));
  if (questions.length) cards.push(quizCard(questions, (score, total) => { result = { score, total }; }));
  cards.push(finishCard(day, () => result));
  return cards;
}

export function storyCards(story, nextStory) {
  return story.karten.map((k, i) => html(`
    <div class="card card-story">
      <div class="label">${esc(story.titel)} · ${i + 1}/${story.karten.length}</div>
      <p class="display">${rich(k.text)}</p>
      ${i === story.karten.length - 1 ? `
        <div class="actions">
          ${nextStory ? `<a class="btn primary" href="#/story/${esc(nextStory.id)}">Nächste Story: ${esc(nextStory.person.name)} ${icons.arrow}</a>` : ''}
          <a class="btn" href="#/">Fertig</a>
        </div>` : ''}
    </div>`));
}
