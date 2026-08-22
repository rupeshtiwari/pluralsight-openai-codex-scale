import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetStore } from '../../src/services/ticketService.js';

/**
 * Public contract for reading a ticket.
 *
 * Route path, status code, and the response field set are externally visible.
 * A refactor may reorganize the code behind them, but these must not change.
 */
describe('GET /tickets/:id', () => {
  beforeEach(() => resetStore());

  it('serves the route at GET /tickets/:id and returns 200', async () => {
    const res = await request(createApp()).get('/tickets/ticket-1001');
    expect(res.status).toBe(200);
  });

  it('returns every required response field', async () => {
    const res = await request(createApp()).get('/tickets/ticket-1001');
    expect(Object.keys(res.body).sort()).toEqual([
      'accountId',
      'assignee',
      'createdAt',
      'id',
      'incidentId',
      'priority',
      'status',
      'subject',
      'updatedAt',
    ]);
  });

  it('returns the seeded values unchanged', async () => {
    const res = await request(createApp()).get('/tickets/ticket-1001');
    expect(res.body.id).toBe('ticket-1001');
    expect(res.body.status).toBe('open');
    expect(res.body.priority).toBe('high');
    expect(res.body.incidentId).toBe('incident-2001');
  });

  it('returns 404 for an unknown ticket', async () => {
    const res = await request(createApp()).get('/tickets/ticket-9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ticket_not_found');
  });
});
