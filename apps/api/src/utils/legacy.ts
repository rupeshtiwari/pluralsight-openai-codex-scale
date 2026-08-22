import type { TicketPriority } from '../models/ticket.js';

/**
 * Map a severity value from the retired paging system onto a ticket priority.
 *
 * Kept for compatibility with the 2019 pager bridge.
 */
export function normalizeLegacySeverity(severity: string): TicketPriority {
  switch (severity.toUpperCase()) {
    case 'SEV1':
      return 'urgent';
    case 'SEV2':
      return 'high';
    case 'SEV3':
      return 'normal';
    default:
      return 'low';
  }
}
