import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetStore } from '../../src/services/ticketService.js';

describe('POST /tickets', () => {
  beforeEach(() => resetStore());

  it('creates a ticket and returns 201', async () => {
    const res = await request(createApp())
      .post('/tickets')
      .send({ subject: 'Billing page returns 500', accountId: 'acct-4400' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('ticket-1004');
    expect(res.body.status).toBe('open');
    expect(res.body.assignee).toBeNull();
  });

  it('rejects a missing subject with 400 and a field-level failure', async () => {
    const res = await request(createApp())
      .post('/tickets')
      .send({ accountId: 'acct-4400' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
    expect(res.body.failures).toContainEqual({
      field: 'subject',
      message: 'subject is required',
    });
  });

  it('rejects a missing accountId with 400', async () => {
    const res = await request(createApp())
      .post('/tickets')
      .send({ subject: 'No account supplied' });

    expect(res.status).toBe(400);
    expect(res.body.failures).toContainEqual({
      field: 'accountId',
      message: 'accountId is required',
    });
  });
});
