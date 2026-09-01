import express, { type Request, type RequestHandler, type Response } from 'express';
import { requireFromEsm } from '../compat/legacyRequire.mjs';

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  assignee: string | null;
  accountId: string;
  incidentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type TicketService = {
  get(id: string): Ticket | null;
};

const legacyRequire = requireFromEsm(import.meta.url);
const service = legacyRequire('../services/ticketService') as TicketService;
const requireApiKey = legacyRequire('../auth/apiKey') as RequestHandler;

const router = express.Router();

router.get('/tickets/:id', requireApiKey, (req: Request<{ id: string }>, res: Response): void => {
  const { id } = req.params;
  const ticket = service.get(id);

  if (!ticket) {
    res.status(404).json({ error: 'ticket_not_found', id });
    return;
  }

  res.status(200).json(ticket);
});

export default router;
