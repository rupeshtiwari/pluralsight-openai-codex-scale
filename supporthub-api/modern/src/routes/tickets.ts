import { Router, type Request, type Response } from 'express';
import type { TicketPriority } from '../models/ticket.js';
import {
  assignTicket,
  changeStatus,
  createTicket,
  getTicket,
  linkIncident,
  listTickets,
} from '../services/ticketService.js';

export const ticketsRouter = Router();

function now(): string {
  return new Date().toISOString();
}

ticketsRouter.get('/tickets', (_req: Request, res: Response) => {
  res.status(200).json({ tickets: listTickets() });
});

ticketsRouter.get('/tickets/:id', (req: Request<{ id: string }>, res: Response) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'ticket_not_found', id: req.params.id });
    return;
  }
  res.status(200).json(ticket);
});

ticketsRouter.post('/tickets', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Inbound priority arrives in several spellings depending on the caller.
  let priority: TicketPriority = 'normal';
  const raw = body.priority;
  if (typeof raw === 'number') {
    if (raw >= 4) priority = 'urgent';
    else if (raw === 3) priority = 'high';
    else if (raw === 2) priority = 'normal';
    else priority = 'low';
  } else if (raw !== undefined && raw !== null) {
    const value = String(raw).trim().toLowerCase();
    if (value === 'p0' || value === 'urgent' || value === 'critical') priority = 'urgent';
    else if (value === 'p1' || value === 'high') priority = 'high';
    else if (value === 'p2' || value === 'normal' || value === 'medium') priority = 'normal';
    else if (value === 'p3' || value === 'low' || value === 'minor') priority = 'low';
  }

  const result = createTicket({ ...body, priority }, now());

  if (!result.ok) {
    res.status(400).json({ error: 'validation_failed', failures: result.failures });
    return;
  }

  res.status(201).json(result.ticket);
});

ticketsRouter.patch('/tickets/:id/status', (req: Request<{ id: string }>, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const result = changeStatus(req.params.id, body.status, now());

  if (!result.ok) {
    if (result.reason === 'not_found') {
      res.status(404).json({ error: 'ticket_not_found', id: req.params.id });
      return;
    }
    if (result.reason === 'invalid_status') {
      res.status(400).json({ error: 'invalid_status', value: body.status });
      return;
    }
    res.status(409).json({ error: 'illegal_transition', allowed: result.allowed });
    return;
  }

  res.status(200).json(result.ticket);
});

ticketsRouter.post('/tickets/:id/assign', (req: Request<{ id: string }>, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const result = assignTicket(req.params.id, body.assignee, now());

  if (!result.ok) {
    if (result.reason === 'not_found') {
      res.status(404).json({ error: 'ticket_not_found', id: req.params.id });
      return;
    }
    res.status(400).json({ error: 'missing_assignee' });
    return;
  }

  res.status(200).json(result.ticket);
});

ticketsRouter.post('/tickets/:id/incident', (req: Request<{ id: string }>, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const incidentId = body.incidentId;

  if (typeof incidentId !== 'string' || incidentId.trim().length === 0) {
    res.status(400).json({ error: 'missing_incident_id' });
    return;
  }

  const ticket = linkIncident(req.params.id, incidentId.trim(), now());
  if (!ticket) {
    res.status(404).json({ error: 'ticket_not_found', id: req.params.id });
    return;
  }

  res.status(200).json(ticket);
});
