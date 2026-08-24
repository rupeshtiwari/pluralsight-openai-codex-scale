import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetStore } from '../../src/services/ticketService.js';

/**
 * Priority semantics are a public contract: the same inbound value must always
 * produce the same stored priority, whichever spelling a caller uses.
 *
 * These cases are the behavior any consolidation of priority handling has to
 * preserve exactly.
 */
describe('ticket priority semantics', () => {
  beforeEach(() => resetStore());

  const cases: Array<[unknown, string]> = [
    ['P0', 'urgent'],
    ['critical', 'urgent'],
    [4, 'urgent'],
    ['P1', 'high'],
    ['HIGH', 'high'],
    [3, 'high'],
    ['P2', 'normal'],
    ['medium', 'normal'],
    [2, 'normal'],
    ['P3', 'low'],
    ['minor', 'low'],
    [1, 'low'],
    ['nonsense', 'normal'],
    [undefined, 'normal'],
  ];

  for (const [input, expected] of cases) {
    it(`maps ${JSON.stringify(input)} to ${expected}`, async () => {
      const res = await request(createApp())
        .post('/tickets')
        .send({ subject: 'Priority check', accountId: 'acct-4400', priority: input });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(expected);
    });
  }
});
