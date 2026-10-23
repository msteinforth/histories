// Homescreen-Installation: Hinweis beim ersten Öffnen (iOS: Anleitung, Android: Installieren-Knopf).
import * as store from './store.js';
import { icons } from './ui.js';

export const isStandalone = () =>
  window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let deferredPrompt = null;

export function initInstall() {
  // Android/Chrome: eigenen Installieren-Knopf statt Browser-Leiste anbieten.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener('appinstalled', () => {
    store.update((s) => { s.installHinweis = 'installiert'; });
    closeInstallSheet();
  });
}

export const canInstall = () => !isStandalone();

// Beim ersten Öffnen einmal zeigen; danach nur noch über die Einstellungen.
export function maybeShowInstallHint() {
  if (isStandalone() || store.get().installHinweis) return;
  setTimeout(() => {
    if (!document.body.classList.contains('viewer-open')) showInstallSheet();
  }, 900);
}

export function closeInstallSheet() {
  document.querySelector('.install-sheet')?.remove();
}

export function showInstallSheet() {
  closeInstallSheet();
  const shareIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 10.5H5.5v10h13v-10H17"/></svg>';
  const plusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  let steps;
  if (isIOS()) {
    steps = `
      <ol class="install-steps">
        <li><span class="step-icon">${shareIcon}</span><span>Tippe in Safari auf <b>Teilen</b> – je nach Version über <b>„…“</b> unten rechts.</span></li>
        <li><span class="step-icon">${plusIcon}</span><span>Wähle <b>„Zum Home-Bildschirm“</b> und tippe auf <b>Hinzufügen</b>.</span></li>
        <li><span class="step-icon">${icons.play}</span><span>Ab jetzt öffnet das Icon direkt die Person des Tages.</span></li>
      </ol>`;
  } else if (deferredPrompt) {
    steps = '<p class="install-text">Ein Tipp auf den Knopf legt Histories als App auf deinen Startbildschirm. Das Icon öffnet dann direkt die Person des Tages.</p>';
  } else {
    steps = `<p class="install-text">Öffne das Browser-Menü (<b>⋮</b>) und wähle <b>„App installieren“</b> oder <b>„Zum Startbildschirm hinzufügen“</b>.</p>`;
  }
  const el = document.createElement('div');
  el.className = 'install-sheet';
  el.innerHTML = `
    <div class="install-backdrop" data-install="later"></div>
    <div class="install-panel" role="dialog" aria-labelledby="install-title">
      <img src="icons/icon-192.png" alt="" class="install-icon">
      <h2 id="install-title">Histories als App</h2>
      <p class="install-text">Leg Histories auf deinen Homescreen – dann ist die Person des Tages nur einen Tipp entfernt, im Vollbild und ohne Browserleisten.</p>
      ${steps}
      <div class="actions">
        ${deferredPrompt && !isIOS() ? '<button class="btn primary" data-install="prompt">Installieren</button>' : ''}
        <button class="btn" data-install="later">${isIOS() ? 'Verstanden' : 'Später'}</button>
      </div>
    </div>`;
  document.body.append(el);
  el.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-install]')?.dataset.install;
    if (!action) return;
    if (action === 'prompt' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome !== 'accepted') return;
    }
    store.update((s) => { s.installHinweis = s.installHinweis || 'gesehen'; });
    closeInstallSheet();
  });
}
