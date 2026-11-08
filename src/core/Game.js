import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { CafeScene } from '../scenes/CafeScene.js';

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
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    callbacks: {
      preBoot: (instance) => instance.registry.set('session', session)
    },
    scene: [BootScene, PreloadScene, CafeScene]
  });
  game.registry.set('session', session);
  return game;
}
