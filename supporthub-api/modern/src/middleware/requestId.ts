import type { NextFunction, Request, Response } from 'express';

let counter = 0;

/** Attach a stable, monotonic request id so responses are traceable. */
export function requestId(_req: Request, res: Response, next: NextFunction): void {
  counter += 1;
  res.setHeader('x-request-id', `req-${String(counter).padStart(4, '0')}`);
  next();
}
