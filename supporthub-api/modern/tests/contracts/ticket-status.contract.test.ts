import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetStore } from '../../src/services/ticketService.js';

/** Status transition rules are part of the public workflow contract. */
describe('PATCH /tickets/:id/status', () => {
  beforeEach(() => resetStore());

  it('allows open -> in_progress', async () => {
    const res = await request(createApp())
      .patch('/tickets/ticket-1001/status')
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('refuses open -> resolved with 409 and lists the allowed targets', async () => {
    const res = await request(createApp())
      .patch('/tickets/ticket-1001/status')
      .send({ status: 'resolved' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('illegal_transition');
    expect(res.body.allowed).toEqual(['in_progress', 'closed']);
  });

  it('treats closed as terminal', async () => {
    const app = createApp();
    await request(app).patch('/tickets/ticket-1001/status').send({ status: 'closed' });

    const res = await request(app)
      .patch('/tickets/ticket-1001/status')
      .send({ status: 'open' });

    expect(res.status).toBe(409);
    expect(res.body.allowed).toEqual([]);
  });

  it('rejects an unrecognized status with 400', async () => {
    const res = await request(createApp())
      .patch('/tickets/ticket-1001/status')
      .send({ status: 'archived' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_status');
  });
});
