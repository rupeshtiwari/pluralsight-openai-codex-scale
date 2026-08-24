import type { TicketPriority } from '../models/ticket.js';

/**
 * Normalize an inbound priority value to the four supported levels.
 *
 * Inbound integrations send a wide range of spellings: numeric severities from
 * the old paging system, "P1" style labels from the incident tracker, and free
 * text from the web form.
 */
export function normalizePriority(input: unknown): TicketPriority {
  if (typeof input === 'number') {
    if (input >= 4) return 'urgent';
    if (input === 3) return 'high';
    if (input === 2) return 'normal';
    return 'low';
  }

  const value = String(input ?? '').trim().toLowerCase();

  if (value === 'p0' || value === 'urgent' || value === 'critical') return 'urgent';
  if (value === 'p1' || value === 'high') return 'high';
  if (value === 'p2' || value === 'normal' || value === 'medium') return 'normal';
  if (value === 'p3' || value === 'low' || value === 'minor') return 'low';

  return 'normal';
}
