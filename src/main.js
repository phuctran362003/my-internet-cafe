import './styles/main.css';
import { UI_PALETTE_VARS } from './assets/generatePlaceholders.js';
import { loadGameData } from './data/loadGameData.js';
import { createGameSession } from './core/GameSession.js';
import { createIndexedDbStorage } from './systems/save/indexedDb.js';
import { createGame } from './core/Game.js';
import { mountUi } from './ui/UiController.js';
import { attachCafeAudio } from './audio/CafeAudio.js';
import { fixMobileViewportHeight, disableDoubleTapZoom, initMobileUI } from './ui/mobile.js';

for (const [key, value] of Object.entries(UI_PALETTE_VARS)) {
  document.documentElement.style.setProperty(key, value);
}

// Setup mobile optimizations
fixMobileViewportHeight();
disableDoubleTapZoom();

const session = createGameSession({
  data: loadGameData(),
  storage: createIndexedDbStorage()
});

createGame(document.querySelector('#game-root'), session);
mountUi(session, document.querySelector('#ui-root'));
attachCafeAudio(session);

// Initialize mobile UI after UI is mounted
setTimeout(() => {
  initMobileUI();
}, 100);

window.__CAFE__ = session;
