import Phaser from 'phaser';
import { TILE_ORDER, TILE_SIZE } from '../assets/layout.js';
import { tileNameGrid } from '../systems/movement/Pathfinding.js';
import { characterFrame, computerFrame } from '../render/frames.js';

export class CafeScene extends Phaser.Scene {
  constructor() {
    super('Cafe');
  }

  create() {
    this.session = this.game.registry.get('session');
    this.customerSprites = new Map();
    this.markers = new Map();
    this.buildMap();
    this.buildProps();
    this.guardSprite = this.add.sprite(0, 0, 'characters', 0).setVisible(false).setDepth(20);
    this.staffSprites = new Map();
    this.selection = this.add.graphics().setDepth(30);
    this.light = this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x0b1020, 0);
    this.light.setDepth(80);
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.setZoom(2);
    const lookY = Math.min(this.mapHeight / 2, this.cameras.main.displayHeight / 2);
    this.cameras.main.centerOn(this.mapWidth / 2, lookY);
    this.cameras.main.roundPixels = true;
    this.drag = null;
    this.input.on('pointerdown', (pointer) => {
      this.drag = { x: pointer.x, y: pointer.y, moved: false };
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.drag || !pointer.isDown) return;
      const dx = pointer.x - this.drag.x;
      const dy = pointer.y - this.drag.y;
      if (Math.hypot(dx, dy) > 6) {
        this.drag.moved = true;
        this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
        this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
        this.drag.x = pointer.x;
        this.drag.y = pointer.y;
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (this.drag && !this.drag.moved) this.handleClick(pointer);
      this.drag = null;
    });
    this.input.on('wheel', (_pointer, _objects, _dx, dy) => {
      const next = Phaser.Math.Clamp(this.cameras.main.zoom + (dy > 0 ? -1 : 1), 1, 3);
      this.cameras.main.setZoom(next);
    });
    this.resetListener = this.session.bus.on('session:reset', () => this.rebuildDynamic());
  }

  buildMap() {
    const map = this.session.data.map;
    const names = tileNameGrid(map);
    const grid = names.map((row) => row.map((name) => TILE_ORDER.indexOf(name)));
    this.tilemap = this.make.tilemap({ data: grid, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tiles = this.tilemap.addTilesetImage('tileset-cafe');
    this.ground = this.tilemap.createLayer(0, tiles, 0, 0);
    this.mapWidth = map.rows[0].length * TILE_SIZE;
    this.mapHeight = map.rows.length * TILE_SIZE;
    this.computerSprites = new Map();
    const chairFrames = [0, 3, 4, 5];
    this.session.state.cafe.computers.forEach((pc, index) => {
      const sprite = this.add.sprite(pc.x * TILE_SIZE + 16, pc.y * TILE_SIZE + 16, 'computers', 0);
      sprite.setDepth(10 + pc.y);
      this.computerSprites.set(pc.id, sprite);
      const chair = this.add.sprite(
        pc.seatX * TILE_SIZE + 16,
        pc.seatY * TILE_SIZE + 12,
        'furniture',
        chairFrames[index % chairFrames.length]
      );
      chair.setDepth(9 + pc.seatY);
    });
  }

  buildProps() {
    for (const prop of this.session.data.map.props) {
      const frame = prop.type === 'plant' ? 1 : 0;
      const sprite = this.add.sprite(prop.x * TILE_SIZE + 16, prop.y * TILE_SIZE + 16, 'furniture', frame);
      sprite.setDepth(12 + prop.y);
    }
  }

  rebuildDynamic() {
    for (const sprite of this.customerSprites.values()) sprite.destroy();
    for (const marker of this.markers.values()) marker.destroy();
    this.customerSprites.clear();
    this.markers.clear();
  }

  update(_time, delta) {
    this.session.update(delta);
    this.sync();
  }

  sync() {
    const state = this.session.state;
    const door = this.session.data.map.door;
    const doorIndex = TILE_ORDER.indexOf(state.cafe.open ? 'door' : 'doorClosed');
    this.ground.putTileAt(doorIndex, door.x, door.y);
    for (const pc of state.cafe.computers) {
      this.computerSprites.get(pc.id)?.setFrame(computerFrame(pc));
    }
    const alive = new Set(state.cafe.customers.map((customer) => customer.id));
    for (const [id, sprite] of this.customerSprites) {
      if (!alive.has(id)) {
        sprite.destroy();
        this.customerSprites.delete(id);
        this.markers.get(id)?.destroy();
        this.markers.delete(id);
      }
    }
    for (const customer of state.cafe.customers) {
      let sprite = this.customerSprites.get(customer.id);
      if (!sprite) {
        sprite = this.add.sprite(0, 0, 'characters', 0);
        this.customerSprites.set(customer.id, sprite);
      }
      sprite.setFrame(characterFrame(customer, this.time.now));
      sprite.x = customer.x * TILE_SIZE + 16;
      sprite.y = customer.y * TILE_SIZE + 16;
      sprite.setDepth(40 + sprite.y);
      this.syncMarker(customer, sprite);
    }
    const guard = state.cafe.employees.find((employee) => employee.role === 'guard');
    if (guard) {
      this.guardSprite.setVisible(true);
      this.guardSprite.setFrame(characterFrame({ archetype: 'guard', facing: 'down', state: 'searching' }, 0));
      this.guardSprite.x = guard.post.x * TILE_SIZE + 16;
      this.guardSprite.y = guard.post.y * TILE_SIZE + 16;
    } else {
      this.guardSprite.setVisible(false);
    }
    const floorStaff = state.cafe.employees.filter((employee) => employee.role !== 'guard' && employee.post);
    const roles = new Set(floorStaff.map((employee) => employee.role));
    for (const [role, sprite] of this.staffSprites) {
      if (!roles.has(role)) {
        sprite.destroy();
        this.staffSprites.delete(role);
      }
    }
    for (const employee of floorStaff) {
      let sprite = this.staffSprites.get(employee.role);
      if (!sprite) {
        sprite = this.add.sprite(0, 0, 'characters', 0).setDepth(20);
        this.staffSprites.set(employee.role, sprite);
      }
      sprite.setFrame(characterFrame({ archetype: employee.look || 'office', facing: 'down', state: 'searching' }, 0));
      sprite.x = employee.post.x * TILE_SIZE + 16;
      sprite.y = employee.post.y * TILE_SIZE + 16;
    }
    const covered = this.session.ui.screen === 'menu' || this.session.ui.screen === 'naming';
    const periodLight = covered ? 0.45 : getLight(this.session);
    this.light.setAlpha(periodLight);
    this.drawSelection();
  }

  syncMarker(customer, sprite) {
    const show = customer.state === 'incident';
    let marker = this.markers.get(customer.id);
    if (!show) {
      marker?.setVisible(false);
      return;
    }
    if (!marker) {
      marker = this.add.sprite(0, 0, 'effects', 0).setDepth(70);
      this.markers.set(customer.id, marker);
    }
    marker.setVisible(true);
    marker.x = sprite.x;
    marker.y = sprite.y - 22;
  }

  drawSelection() {
    this.selection.clear();
    const selection = this.session.ui.selection;
    if (!selection) return;
    this.selection.lineStyle(2, 0xf3e6c8, 1);
    if (selection.type === 'computer') {
      const pc = this.session.state.cafe.computers.find((item) => item.id === selection.id);
      if (!pc) return;
      this.selection.strokeRect(pc.x * TILE_SIZE + 1, pc.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    if (selection.type === 'customer') {
      const customer = this.session.state.cafe.customers.find((item) => item.id === selection.id);
      if (!customer) return;
      this.selection.strokeRect(customer.x * TILE_SIZE, customer.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  handleClick(pointer) {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(world.x / TILE_SIZE);
    const tileY = Math.floor(world.y / TILE_SIZE);
    const state = this.session.state;
    const customer = nearestCustomer(state.cafe.customers, world.x, world.y);
    if (customer) {
      this.session.select({ type: 'customer', id: customer.id });
      return;
    }
    const pc = state.cafe.computers.find((item) => (
      (item.x === tileX && item.y === tileY) || (item.seatX === tileX && item.seatY === tileY)
    ));
    if (pc) {
      this.session.select({ type: 'computer', id: pc.id });
      return;
    }
    const door = this.session.data.map.door;
    if (tileX === door.x && tileY === door.y) {
      this.session.toggleDoor();
      this.session.select({ type: 'door' });
      return;
    }
    const names = tileNameGrid(this.session.data.map);
    if (names[tileY]?.[tileX] === 'counter') {
      this.session.select({ type: 'counter' });
    }
  }
}

function nearestCustomer(customers, x, y) {
  let best = null;
  let bestDist = 22;
  for (const customer of customers) {
    const dist = Math.hypot(customer.x * TILE_SIZE + 16 - x, customer.y * TILE_SIZE + 16 - y);
    if (dist < bestDist) {
      best = customer;
      bestDist = dist;
    }
  }
  return best;
}

function getLight(session) {
  const periods = session.data.simulation.periods;
  const minute = session.state.meta.currentTime;
  return (periods.find((period) => minute >= period.start && minute < period.end) ?? periods.at(-1)).light;
}
