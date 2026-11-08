import { describe, expect, it } from 'vitest';
import { guestDrawerSignature } from '../src/ui/UiController.js';

describe('drawer guest signature', () => {
  it('ignores other customers playing when not on the customer panel', () => {
    const base = {
      panel: 'staff',
      selection: null,
      customers: [
        { id: 'a', state: 'playing', sessionMinutes: 10, satisfaction: 70, speech: 'hi' },
        { id: 'b', state: 'waiting', sessionMinutes: 0, satisfaction: 60, speech: '' }
      ]
    };
    const later = {
      ...base,
      customers: [
        { id: 'a', state: 'playing', sessionMinutes: 40.7, satisfaction: 71, speech: 'bye' },
        { id: 'b', state: 'waiting', sessionMinutes: 0, satisfaction: 60, speech: '' }
      ]
    };
    expect(guestDrawerSignature(base)).toBe(guestDrawerSignature(later));
  });

  it('tracks the selected customer clock in whole minutes only', () => {
    const first = {
      panel: 'customer',
      selection: { type: 'customer', id: 'a' },
      customers: [{ id: 'a', state: 'playing', sessionMinutes: 10.2, satisfaction: 70, speech: '' }]
    };
    const sameMinute = {
      ...first,
      customers: [{ id: 'a', state: 'playing', sessionMinutes: 10.9, satisfaction: 70, speech: '' }]
    };
    const nextMinute = {
      ...first,
      customers: [{ id: 'a', state: 'playing', sessionMinutes: 11.1, satisfaction: 70, speech: '' }]
    };
    expect(guestDrawerSignature(first)).toBe(guestDrawerSignature(sameMinute));
    expect(guestDrawerSignature(first)).not.toBe(guestDrawerSignature(nextMinute));
  });
});
