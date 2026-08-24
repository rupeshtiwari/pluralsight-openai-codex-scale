import express from 'express';
import { requestId } from './middleware/requestId.js';
import { ticketsRouter } from './routes/tickets.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(requestId);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'supporthub-api' });
  });

  app.use(ticketsRouter);

  return app;
}
