import Phaser from 'phaser';
import { generateAllAssets } from '../assets/generatePlaceholders.js';
import { PORTRAIT_IDS } from '../assets/layout.js';
import { fileTextures } from '../assets/AssetRegistry.js';
import { installGeneratedTextures, portraitDataUrls } from '../render/textureFactory.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    for (const asset of fileTextures()) {
      this.load.spritesheet(asset.key, asset.file, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight
      });
    }
  }

  create() {
    const session = this.game.registry.get('session');
    const generated = generateAllAssets();
    installGeneratedTextures(this, generated);
    if (session) {
      session.ui.portraits = portraitDataUrls(generated.textures.portraits, PORTRAIT_IDS);
      session.ui.assetsReady = true;
    }
    this.scene.start('Cafe');
  }
}
