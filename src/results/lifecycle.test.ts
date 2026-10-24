import { describe, expect, test } from 'vitest';
import { TicketStatus } from '../catalogs/index';
import { Lifecycle } from './lifecycle';

describe('Lifecycle.define', () => {
  const Example = Lifecycle.define('example', {
    Waiting: { from: [], why: 'Nothing happened yet.' },
    Working: { from: [TicketStatus.InProgress], why: 'SUNAT is working.' },
  });

  test('states are frozen and keep their order', () => {
    expect(Example.all().map((state) => state.code)).toEqual(['waiting', 'working']);
    expect(Object.isFrozen(Example.Waiting)).toBe(true);
  });

  test('requires why for every state', () => {
    // @ts-expect-error why is required
    expect(() => Lifecycle.define('broken', { Waiting: { from: [] } })).toThrow();
  });

  test('accepts only Catalog entries in from', () => {
    // @ts-expect-error a raw code is not a Catalog entry
    expect(() => Lifecycle.define('broken', { Working: { from: ['98'], why: 'x' } })).toThrow();
  });
});
