import Phaser from 'phaser';
import { GameEvents } from '../core/EventBus.js';
import { DOOR_FRAMES, EFFECT_FRAMES, TILE_SIZE } from '../assets/layout.js';
import { analyzeRoom, doorFrameName } from '../assets/roomLayout.js';
import { isRoomUnlocked } from '../systems/business/RoomSystem.js';
import { hasFloorStaff } from '../systems/staff/StaffSystem.js';
import { tileNameGrid } from '../systems/movement/Pathfinding.js';
import { characterFrame, computerFrame } from '../render/frames.js';

const LOCK_FRAME = EFFECT_FRAMES.indexOf('lock');

export class CafeScene extends Phaser.Scene {
  constructor() {
    super('Cafe');
  }

  create() {
    this.session = this.game.registry.get('session');
    this.customerSprites = new Map();
    this.markers = new Map();
    this.furnitureSprites = new Map();
    this.locks = new Map();
    this.buildMap();
    this.guardSprite = this.add.sprite(0, 0, 'characters', 0).setVisible(false).setDepth(20);
    this.staffSprites = new Map();
    this.selection = this.add.graphics().setDepth(30);
    this.sessionRings = this.add.graphics().setDepth(2001);
    this.roomShade = this.add.graphics().setDepth(58);
    this.light = this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x0b1020, 0);
    this.light.setDepth(80);
    this.cameras.main.roundPixels = true;
    this.fitCamera();
    this.scale.on('resize', () => this.fitCamera());
    this.session.bus.on(GameEvents.VIEW_SCALE_CHANGED, () => this.fitCamera());
    this.input.on('pointerup', (pointer) => this.handleClick(pointer));
    this.resetListener = this.session.bus.on('session:reset', () => this.rebuildDynamic());
  }

  fitCamera() {
    const cam = this.cameras.main;
    if (!this.mapWidth || !this.mapHeight) return;
    const fit = Math.min(cam.width / this.mapWidth, cam.height / this.mapHeight);
    const cover = Math.max(cam.width / this.mapWidth, cam.height / this.mapHeight);
    const userScale = this.session.ui.viewScale || 1;
    const zoom = Math.max(0.35, Math.min(cover, fit * 1.22) * userScale);
    cam.setZoom(zoom);
    const viewW = cam.width / zoom;
    const viewH = cam.height / zoom;
    const padX = Math.max(0, viewW - this.mapWidth) / 2;
    const padY = Math.max(0, viewH - this.mapHeight) / 2;
    const scrollX = padX > 0 ? -padX : Math.max(0, (this.mapWidth - viewW) / 2);
    const scrollY = padY > 0 ? -padY : Math.max(0, (this.mapHeight - viewH) / 2);
    cam.setBounds(-padX, -padY, this.mapWidth + padX * 2, this.mapHeight + padY * 2);
    cam.setScroll(scrollX, scrollY);
  }

  buildMap() {
    const map = this.session.data.map;
    this.add.image(0, 0, 'room-cafe').setOrigin(0).setDepth(0);
    this.layout = analyzeRoom(map);
    this.doorSprites = this.layout.doors.map((door) => ({
      door,
      sprite: this.add.sprite(door.x * TILE_SIZE, door.y * TILE_SIZE, 'doors', 0)
        .setOrigin(0)
        .setDepth(5)
        .setFlipX(door.flip)
    }));
    this.mapWidth = map.rows[0].length * TILE_SIZE;
    this.mapHeight = map.rows.length * TILE_SIZE;
    this.computerSprites = new Map();
    this.chairSprites = new Map();
    const chairFrames = [0, 3, 4, 5];
    this.session.state.cafe.computers.forEach((pc, index) => {
      const sprite = this.add.sprite(pc.x * TILE_SIZE + TILE_SIZE / 2, pc.y * TILE_SIZE + TILE_SIZE / 2, 'computers', 0);
      sprite.setDepth(10 + pc.y);
      this.computerSprites.set(pc.id, sprite);
      const chair = this.add.sprite(
        pc.seatX * TILE_SIZE + TILE_SIZE / 2,
        pc.seatY * TILE_SIZE + TILE_SIZE / 2,
        'furniture',
        chairFrames[index % chairFrames.length]
      );
      // The backrest hides a seated customer's body, so it sorts just above them.
      chair.setDepth(41 + pc.seatY * TILE_SIZE + TILE_SIZE / 2);
      this.chairSprites.set(pc.id, chair);
      const owned = pc.status !== 'disabled';
      sprite.setVisible(owned);
      chair.setVisible(owned);
    });
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
    for (const { door, sprite } of this.doorSprites) {
      const open = door.kind === 'main' ? state.cafe.open : isRoomUnlocked(state, door.roomId);
      sprite.setFrame(DOOR_FRAMES.indexOf(doorFrameName(door, open)));
    }
    for (const pc of state.cafe.computers) {
      const owned = pc.status !== 'disabled';
      const sprite = this.computerSprites.get(pc.id);
      const chair = this.chairSprites.get(pc.id);
      if (sprite) {
        sprite.setVisible(owned);
        if (owned) sprite.setFrame(computerFrame(pc));
      }
      chair?.setVisible(owned);
    }
    this.syncFurniture();
    this.syncRooms();
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
      sprite.x = customer.x * TILE_SIZE + TILE_SIZE / 2;
      sprite.y = customer.y * TILE_SIZE + TILE_SIZE / 2;
      sprite.setDepth(40 + sprite.y);
      this.syncMarker(customer);
    }
    this.drawSessionRings();
    const guard = state.cafe.employees.find((employee) => employee.role === 'guard');
    if (guard) {
      this.guardSprite.setVisible(true);
      this.guardSprite.setFrame(characterFrame({ archetype: 'guard', facing: 'down', state: 'searching' }, 0));
      this.guardSprite.x = guard.post.x * TILE_SIZE + TILE_SIZE / 2;
      this.guardSprite.y = guard.post.y * TILE_SIZE + TILE_SIZE / 2;
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
      sprite.x = employee.post.x * TILE_SIZE + TILE_SIZE / 2;
      sprite.y = employee.post.y * TILE_SIZE + TILE_SIZE / 2;
    }
    this.fitCamera();
    const covered = this.session.ui.screen === 'menu' || this.session.ui.screen === 'naming';
    const periodLight = covered ? 0.45 : getLight(this.session);
    this.light.setAlpha(periodLight);
    this.drawSelection();
  }

  syncFurniture() {
    const pieces = this.session.state.cafe.furniture ?? [];
    const alive = new Set(pieces.map((piece) => piece.id));
    for (const [id, sprite] of this.furnitureSprites) {
      if (!alive.has(id)) {
        sprite.destroy();
        this.furnitureSprites.delete(id);
      }
    }
    for (const piece of pieces) {
      let sprite = this.furnitureSprites.get(piece.id);
      if (!sprite) {
        sprite = this.add.sprite(0, 0, 'furniture', 0);
        this.furnitureSprites.set(piece.id, sprite);
      }
      const spec = this.session.data.furniture.find((item) => item.id === piece.type);
      sprite.setFrame(spec?.frame ?? 1);
      sprite.x = piece.x * TILE_SIZE + TILE_SIZE / 2;
      sprite.y = piece.y * TILE_SIZE + TILE_SIZE / 2;
      sprite.setDepth(12 + piece.y);
    }
  }

  syncRooms() {
    const map = this.session.data.map;
    const state = this.session.state;
    const locked = new Set();
    this.roomShade.clear();
    this.roomShade.fillStyle(0x2a3142, 0.62);
    for (const room of map.rooms ?? []) {
      if (isRoomUnlocked(state, room.id)) continue;
      locked.add(room.id);
      const area = room.area;
      const wallFace = Array.from({ length: area.w }, (_, i) => this.layout.cell(area.x + i, area.y - 1))
        .every((cell) => cell?.face);
      const top = area.y - (wallFace ? 1 : 0);
      this.roomShade.fillRect(area.x * TILE_SIZE, top * TILE_SIZE, area.w * TILE_SIZE, (area.y + area.h - top) * TILE_SIZE);
      if (room.gate) {
        this.roomShade.fillRect(room.gate.x * TILE_SIZE, room.gate.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
      let lock = this.locks.get(room.id);
      if (!lock) {
        lock = this.add.sprite(0, 0, 'effects', LOCK_FRAME).setDepth(72);
        this.locks.set(room.id, lock);
      }
      lock.setVisible(true);
      lock.x = (area.x + area.w / 2) * TILE_SIZE;
      lock.y = (area.y + area.h / 2) * TILE_SIZE + Math.sin(this.time.now / 380) * 3;
    }
    for (const [id, lock] of this.locks) {
      if (!locked.has(id)) lock.setVisible(false);
    }
  }

  syncMarker(customer) {
    this.markers.get(customer.id)?.setVisible(false);
  }

  drawSessionRings() {
    const rings = this.sessionRings;
    rings.clear();
    const bob = Math.sin(this.time.now / 180) * 3;
    for (const customer of this.session.state.cafe.customers) {
      const sprite = this.customerSprites.get(customer.id);
      if (!sprite) continue;
      const x = sprite.x;
      const y = sprite.y - 34 + (customer.state === 'playing' ? 0 : bob);
      const staffHandlesWaiting = customer.state === 'waiting' && hasFloorStaff(this.session.state);
      if ((customer.state === 'waiting' && !staffHandlesWaiting) || customer.state === 'incident') {
        rings.fillStyle(0xffe14a, 1);
        rings.fillCircle(x, y, 16);
        rings.lineStyle(2, 0x1b1420, 1);
        rings.strokeCircle(x, y, 16);
        rings.fillStyle(0xc23b32, 1);
        rings.fillRect(x - 3, y - 9, 6, 11);
        rings.fillRect(x - 3, y + 5, 6, 4);
        continue;
      }
      if (customer.state !== 'playing' || !(customer.plannedMinutes > 0)) continue;
      const progress = Math.max(0, Math.min(1, customer.sessionMinutes / customer.plannedMinutes));
      rings.fillStyle(0xffe14a, 1);
      rings.fillCircle(x, y, 16);
      rings.fillStyle(0x1b1420, 1);
      rings.fillCircle(x, y, 13);
      if (progress > 0) {
        rings.fillStyle(0x3ddc6a, 1);
        rings.beginPath();
        rings.moveTo(x, y);
        rings.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
        rings.closePath();
        rings.fillPath();
      }
      rings.fillStyle(0xfff8ea, 1);
      rings.fillCircle(x, y, 6);
    }
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
    if (selection.type === 'room') {
      const room = this.session.data.map.rooms.find((item) => item.id === selection.id);
      if (!room) return;
      const area = room.area;
      this.selection.strokeRect(area.x * TILE_SIZE + 2, area.y * TILE_SIZE + 2, area.w * TILE_SIZE - 4, area.h * TILE_SIZE - 4);
    }
    if (selection.type === 'furniture') {
      const piece = this.session.state.cafe.furniture.find((item) => item.id === selection.id);
      if (!piece) return;
      this.selection.strokeRect(piece.x * TILE_SIZE + 2, piece.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }

  handleClick(pointer) {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(world.x / TILE_SIZE);
    const tileY = Math.floor(world.y / TILE_SIZE);
    const names = tileNameGrid(this.session.data.map);
    if (tileY < 0 || tileX < 0 || tileY >= names.length || tileX >= names[0].length) return;
    const room = this.session.roomAt(tileX, tileY);
    if (room) {
      this.session.select({ type: 'room', id: room.id });
      return;
    }
    if (this.session.ui.build) {
      const piece = this.session.furnitureAt(tileX, tileY);
      if (piece) {
        this.session.select({ type: 'furniture', id: piece.id });
        return;
      }
      this.session.useTile(tileX, tileY);
      return;
    }
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
    if (names[tileY]?.[tileX] === 'counter') {
      this.session.select({ type: 'counter' });
    }
  }
}

function nearestCustomer(customers, x, y) {
  let best = null;
  let bestDist = TILE_SIZE * 0.85;
  for (const customer of customers) {
    const cx = customer.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = customer.y * TILE_SIZE + TILE_SIZE / 2;
    const marks = [[cx, cy]];
    if (customer.state === 'waiting' || customer.state === 'playing' || customer.state === 'incident') {
      marks.push([cx, cy - 34]);
    }
    for (const [px, py] of marks) {
      const dist = Math.hypot(px - x, py - y);
      if (dist < bestDist) {
        best = customer;
        bestDist = dist;
      }
    }
  }
  return best;
}

function getLight(session) {
  const periods = session.data.simulation.periods;
  const minute = session.state.meta.currentTime;
  return (periods.find((period) => minute >= period.start && minute < period.end) ?? periods.at(-1)).light;
}
