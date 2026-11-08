import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { bareContext, sampleCustomer } from './helpers.js';
import { tickCustomers } from '../src/systems/customer/CustomerAI.js';
import { buyCafeItem } from '../src/systems/inventory/InventorySystem.js';
import { moveFurniture, placeFurniture, stashFurniture } from '../src/systems/business/FurnitureSystem.js';
import { unlockRoom } from '../src/systems/business/RoomSystem.js';
import { migrateSave } from '../src/systems/save/SaveSerializer.js';

describe('rooms and furniture', () => {
  it('keeps VIP shut until it is paid for, then lets a guest sit there', () => {
    const ctx = bareContext(() => 0.2);
    expect(existsSync('public/assets/audio/music/background.mp3')).toBe(true);
    const vip = ctx.state.cafe.computers.find((pc) => pc.id === 'vip1');
    expect(vip.status).toBe('locked');
    ctx.state.player.money = 1000;
    expect(unlockRoom(ctx, 'vip').reason).toBe('money');
    expect(ctx.state.cafe.rooms.vip).toBe(false);
    ctx.state.player.money = 5000000;
    const before = ctx.state.player.money;
    expect(unlockRoom(ctx, 'vip').ok).toBe(true);
    expect(ctx.state.player.money).toBe(before - 2200000);
    expect(vip.status).toBe('available');
    expect(unlockRoom(ctx, 'vip').reason).toBe('open');
    for (const pc of ctx.state.cafe.computers) {
      if (pc.room !== 'vip') pc.status = 'disabled';
    }
    ctx.state.cafe.customers.push(sampleCustomer({
      archetype: 'wealthy',
      preferredTiers: ['premium', 'highend'],
      state: 'searching',
      x: ctx.data.map.entrance.x,
      y: ctx.data.map.entrance.y,
      sessionMinutes: 0,
      plannedMinutes: 40,
      paid: false,
      ordered: false
    }));
    tickCustomers(ctx, 1);
    expect(ctx.state.cafe.customers[0].targetComputerId).toMatch(/^vip/);
    expect(ctx.state.cafe.customers[0].state).toBe('moving');
  });

  it('places, moves, and stashes furniture without blocking the door', () => {
    const ctx = bareContext();
    expect(placeFurniture(ctx, 'lamp', 0, 0).reason).toBe('tile');
    expect(placeFurniture(ctx, 'lamp', 10, 3).reason).toBe('tile');
    const before = ctx.state.player.money;
    const placed = placeFurniture(ctx, 'lamp', 10, 8);
    expect(placed.ok).toBe(true);
    expect(ctx.state.player.money).toBe(before - 70000);
    expect(placeFurniture(ctx, 'chair', 10, 8).reason).toBe('tile');
    expect(moveFurniture(ctx, placed.id, 11, 8).ok).toBe(true);
    expect(ctx.state.cafe.furniture.find((piece) => piece.id === placed.id)).toMatchObject({ x: 11, y: 8 });
    expect(stashFurniture(ctx, placed.id).ok).toBe(true);
    expect(ctx.state.cafe.furnitureBag.lamp).toBe(1);
    ctx.state.player.money = 0;
    expect(placeFurniture(ctx, 'lamp', 10, 9).ok).toBe(true);
    expect(ctx.state.player.money).toBe(0);
    expect(ctx.state.cafe.furnitureBag.lamp).toBe(0);
  });

  it('caps stock until the storeroom is open and migrates older saves', () => {
    const ctx = bareContext();
    ctx.state.cafe.inventory.drink = 10;
    expect(buyCafeItem(ctx, 'drink', 1).reason).toBe('full');
    expect(unlockRoom(ctx, 'storage').ok).toBe(true);
    expect(buyCafeItem(ctx, 'drink', 1).ok).toBe(true);
    expect(ctx.state.cafe.inventory.drink).toBe(11);

    const legacy = migrateSave({
      player: { money: 10 },
      meta: { currentDay: 2 },
      cafe: { computers: ctx.state.cafe.computers.filter((pc) => !pc.room) },
      economy: {},
      family: { members: ctx.state.family.members },
      narrative: {}
    });
    expect(legacy.cafe.rooms.vip).toBe(false);
    expect(legacy.cafe.computers.find((pc) => pc.id === 'vip1').status).toBe('locked');
    expect(legacy.cafe.furniture).toHaveLength(2);
    expect(legacy.cafe.furnitureBag.plant).toBe(0);
  });
});
