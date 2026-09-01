import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { requireFromEsm } from '../../compat/legacyRequire.mjs';
import ticketReadRouter from '../../routes/ticketRead.mjs';

type TicketService = {
  reset(): void;
};

const KEY = 'demo-key-supporthub';
const legacyRequire = requireFromEsm(import.meta.url);
const service = legacyRequire('../../services/ticketService') as TicketService;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(ticketReadRouter);
  return app;
}

describe('GET /tickets/:id migrated route', () => {
  beforeEach(() => {
    service.reset();
  });

  it('returns the ticket with an API key', async () => {
    const response = await request(createApp())
      .get('/tickets/ticket-1001')
      .set('x-api-key', KEY)
      .expect(200);

    expect(response.body).toEqual({
      id: 'ticket-1001',
      subject: 'Checkout fails with card on file',
      status: 'open',
      priority: 'high',
      assignee: null,
      accountId: 'acct-4400',
      incidentId: 'incident-2001',
      createdAt: '2025-03-03T09:12:00.000Z',
      updatedAt: '2025-03-03T09:12:00.000Z',
    });
    expect(Object.keys(response.body)).toEqual([
      'id',
      'subject',
      'status',
      'priority',
      'assignee',
      'accountId',
      'incidentId',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('returns 401 when the API key header is missing', async () => {
    const response = await request(createApp()).get('/tickets/ticket-1001').expect(401);

    expect(response.body).toEqual({ error: 'missing_api_key' });
  });

  it('returns 403 when the API key is invalid', async () => {
    const response = await request(createApp())
      .get('/tickets/ticket-1001')
      .set('x-api-key', 'nope')
      .expect(403);

    expect(response.body).toEqual({ error: 'invalid_api_key' });
  });

  it('returns 404 for an unknown ticket id', async () => {
    const response = await request(createApp())
      .get('/tickets/ticket-9999')
      .set('x-api-key', KEY)
      .expect(404);

    expect(response.body).toEqual({ error: 'ticket_not_found', id: 'ticket-9999' });
  });
});
