import { describe, expect, it } from 'vitest';
import { testSession } from './helpers.js';

describe('action feedback', () => {
  it('toasts a clear money message when a purchase cannot be afforded', () => {
    const session = testSession();
    session.foundCafe({ playerName: 'Lan', cafeName: 'Net Lan' });
    session.ui.notes = [];
    session.state.player.money = 0;

    const result = session.buyComputer();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('money');
    expect(session.ui.lastError).toBe('Không đủ tiền mua máy mới');
    expect(session.ui.notes[0]).toMatchObject({
      text: 'Không đủ tiền mua máy mới',
      kind: 'alert'
    });
  });

  it('explains other blocked conditions, not only money', () => {
    const session = testSession();
    session.foundCafe({ playerName: 'Lan', cafeName: 'Net Lan' });
    session.ui.notes = [];
    session.hireGuard();
    session.ui.notes = [];
    session.ui.lastError = '';

    const again = session.hireGuard();
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('hired');
    expect(session.ui.lastError).toBe('Đã có bảo vệ rồi');
    expect(session.ui.notes[0].text).toBe('Đã có bảo vệ rồi');
  });

  it('reports stock room full when buying more cafe items', () => {
    const session = testSession();
    session.foundCafe({ playerName: 'Lan', cafeName: 'Net Lan' });
    const itemId = session.data.items[0].id;
    session.state.cafe.inventory[itemId] = 99;
    session.ui.notes = [];

    const result = session.buyItem(itemId);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('full');
    expect(session.ui.lastError).toContain('Kho đầy');
    expect(session.ui.notes[0].kind).toBe('alert');
  });
});
