import Phaser from 'phaser';
import { PORTRAIT_IDS } from '../assets/layout.js';
import { AssetRegistry, fileTextures } from '../assets/AssetRegistry.js';
import { generateAllAssets } from '../assets/generatePlaceholders.js';
import { installGeneratedTextures, portraitDataUrls, portraitUrlsFromTexture } from '../render/textureFactory.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const base = import.meta.env.BASE_URL;
    for (const asset of fileTextures()) {
      const url = `${base}${asset.file}`;
      if (asset.kind === 'image') {
        this.load.image(asset.key, url);
        continue;
      }
      this.load.spritesheet(asset.key, url, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight
      });
    }
  }

  create() {
    const session = this.game.registry.get('session');
    const map = session?.data.map;
    const missing = fileTextures().filter((asset) => !this.textures.exists(asset.key));
    let generated = null;
    if (missing.length) {
      generated = generateAllAssets({ map });
      const textures = Object.fromEntries(missing.map((asset) => [asset.key, generated.textures[asset.key]]));
      installGeneratedTextures(this, { textures });
    }
    for (const key of Object.keys(AssetRegistry.textures)) {
      this.textures.get(key)?.setFilter(1);
    }
    if (session) {
      if (this.textures.exists('portraits') && !missing.some((asset) => asset.key === 'portraits')) {
        session.ui.portraits = portraitUrlsFromTexture(this.textures.get('portraits'), PORTRAIT_IDS);
      } else {
        generated = generated ?? generateAllAssets({ map });
        session.ui.portraits = portraitDataUrls(generated.textures.portraits, PORTRAIT_IDS);
      }
      session.ui.assetsReady = true;
    }
    this.scene.start('Cafe');
  }
}
