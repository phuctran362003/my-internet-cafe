import Phaser from 'phaser';
import cafeMap from '../data/maps/cafe.json';
import { BootScene } from '../scenes/BootScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { CafeScene } from '../scenes/CafeScene.js';

const ROOM_WIDTH = cafeMap.rows[0].length * cafeMap.tileSize;
const ROOM_HEIGHT = cafeMap.rows.length * cafeMap.tileSize;

export function createGame(parent, session) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#141820',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    banner: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      expandParent: false
    },
    callbacks: {
      preBoot: (instance) => instance.registry.set('session', session)
    },
    scene: [BootScene, PreloadScene, CafeScene]
  });
  game.registry.set('session', session);
  session.game = game;
  game.events.once(Phaser.Core.Events.READY, () => {
    const sync = () => syncSmoothing(game);
    sync();
    game.scale.on(Phaser.Scale.Events.RESIZE, sync);
  });
  return game;
}

/** Nearest-neighbour drops whole art pixels when the canvas is shown below 1:1, so smooth it there. */
function syncSmoothing(game) {
  if (!game.canvas) return;
  const shown = game.scale.displaySize.width * (window.devicePixelRatio || 1);
  game.canvas.style.imageRendering = shown < game.scale.width ? 'auto' : 'pixelated';
}
