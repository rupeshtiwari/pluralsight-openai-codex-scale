import express from 'express';
import { requestId } from './middleware/requestId.js';
import { ticketsRouter } from './routes/tickets.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(requestId);
  app.use(ticketsRouter);

  // Express 5 exposes the application's own router, and that is the only way to
  // read the layer stack the app actually mounted. The readiness probe reports
  // its size, so a deploy that dropped a parser or a route is visible from the
  // probe instead of from a caller's 404.
  const mountedLayers = app.router.stack.length;

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'supporthub-api', layers: mountedLayers });
  });

  return app;
}
