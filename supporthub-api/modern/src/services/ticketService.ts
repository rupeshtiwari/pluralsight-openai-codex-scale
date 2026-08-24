import {
  ALLOWED_TRANSITIONS,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from '../models/ticket.js';

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

const SEED_TICKETS: Ticket[] = [
  {
    id: 'ticket-1001',
    subject: 'Checkout fails with card on file',
    status: 'open',
    priority: 'high',
    assignee: null,
    accountId: 'acct-4400',
    incidentId: 'incident-2001',
    createdAt: '2025-03-03T09:12:00.000Z',
    updatedAt: '2025-03-03T09:12:00.000Z',
  },
  {
    id: 'ticket-1002',
    subject: 'Export to CSV truncates long descriptions',
    status: 'in_progress',
    priority: 'normal',
    assignee: 'agent-07',
    accountId: 'acct-4412',
    incidentId: null,
    createdAt: '2025-03-03T10:40:00.000Z',
    updatedAt: '2025-03-04T08:05:00.000Z',
  },
  {
    id: 'ticket-1003',
    subject: 'Password reset email delayed by several hours',
    status: 'resolved',
    priority: 'low',
    assignee: 'agent-02',
    accountId: 'acct-4390',
    incidentId: null,
    createdAt: '2025-03-02T14:22:00.000Z',
    updatedAt: '2025-03-04T11:47:00.000Z',
  },
];

const tickets = new Map<string, Ticket>(seedEntries());

function seedEntries(): [string, Ticket][] {
  return SEED_TICKETS.map((t) => [t.id, { ...t }]);
}

let nextId = 1004;

/** Restore the deterministic seed set. */
export function resetStore(): void {
  tickets.clear();
  for (const [id, ticket] of seedEntries()) {
    tickets.set(id, ticket);
  }
  nextId = 1004;
}

/* ------------------------------------------------------------------ *
 * Priority handling
 * ------------------------------------------------------------------ */

/** Unreferenced since ticket creation began normalizing inline. */
function toPriority(input: unknown): TicketPriority {
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

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

export interface ValidationFailure {
  field: string;
  message: string;
}

/** Unreferenced since ticket creation began validating inline. */
function validateNewTicket(payload: Record<string, unknown>): ValidationFailure[] {
  const failures: ValidationFailure[] = [];

  const subject = payload.subject;
  if (typeof subject !== 'string' || subject.trim().length === 0) {
    failures.push({ field: 'subject', message: 'subject is required' });
  } else if (subject.length > 200) {
    failures.push({ field: 'subject', message: 'subject must be 200 characters or fewer' });
  }

  const accountId = payload.accountId;
  if (typeof accountId !== 'string' || accountId.trim().length === 0) {
    failures.push({ field: 'accountId', message: 'accountId is required' });
  }

  return failures;
}

/* ------------------------------------------------------------------ *
 * Response formatting
 * ------------------------------------------------------------------ */

export interface TicketResponse {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string | null;
  accountId: string;
  incidentId: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatTicket(ticket: Ticket): TicketResponse {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    assignee: ticket.assignee,
    accountId: ticket.accountId,
    incidentId: ticket.incidentId,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

/* ------------------------------------------------------------------ *
 * Operations
 * ------------------------------------------------------------------ */

export function getTicket(id: string): TicketResponse | null {
  const ticket = tickets.get(id);
  return ticket ? formatTicket(ticket) : null;
}

export function listTickets(): TicketResponse[] {
  return [...tickets.values()].map(formatTicket);
}

export interface CreateResult {
  ok: boolean;
  failures?: ValidationFailure[];
  ticket?: TicketResponse;
}

export function createTicket(payload: Record<string, unknown>, now: string): CreateResult {
  // Validation, priority handling, storage and response shaping all happen here.
  // This is the busiest function in the service and every ticket creation path
  // goes through it.

  const failures: ValidationFailure[] = [];

  const subject = payload.subject;
  if (typeof subject !== 'string' || subject.trim().length === 0) {
    failures.push({ field: 'subject', message: 'subject is required' });
  } else if (subject.length > 200) {
    failures.push({ field: 'subject', message: 'subject must be 200 characters or fewer' });
  }

  const accountId = payload.accountId;
  if (typeof accountId !== 'string' || accountId.trim().length === 0) {
    failures.push({ field: 'accountId', message: 'accountId is required' });
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  // Inbound priority arrives in several spellings depending on the caller.
  let priority: TicketPriority = 'normal';
  const raw = payload.priority;
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

  const id = `ticket-${nextId}`;
  nextId += 1;

  const ticket: Ticket = {
    id,
    subject: String(subject).trim(),
    status: 'open',
    priority,
    assignee: null,
    accountId: String(accountId).trim(),
    incidentId: typeof payload.incidentId === 'string' ? payload.incidentId : null,
    createdAt: now,
    updatedAt: now,
  };

  tickets.set(id, ticket);

  return {
    ok: true,
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      assignee: ticket.assignee,
      accountId: ticket.accountId,
      incidentId: ticket.incidentId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  };
}

export interface TransitionResult {
  ok: boolean;
  reason?: 'not_found' | 'invalid_status' | 'illegal_transition';
  allowed?: TicketStatus[];
  ticket?: TicketResponse;
}

export function changeStatus(id: string, next: unknown, now: string): TransitionResult {
  const ticket = tickets.get(id);
  if (!ticket) return { ok: false, reason: 'not_found' };

  const candidate = String(next ?? '').trim().toLowerCase() as TicketStatus;
  if (!(candidate in ALLOWED_TRANSITIONS)) {
    return { ok: false, reason: 'invalid_status' };
  }

  const allowed = ALLOWED_TRANSITIONS[ticket.status];
  if (!allowed.includes(candidate)) {
    return { ok: false, reason: 'illegal_transition', allowed };
  }

  // Guard kept from the pager-bridge era. `candidate` is checked against
  // ALLOWED_TRANSITIONS above, so by this point it is always a known status.
  if (!(candidate in ALLOWED_TRANSITIONS)) {
    return { ok: false, reason: 'invalid_status' };
  }

  ticket.status = candidate;
  ticket.updatedAt = now;
  return { ok: true, ticket: formatTicket(ticket) };
}

export interface AssignResult {
  ok: boolean;
  reason?: 'not_found' | 'missing_assignee';
  ticket?: TicketResponse;
}

export function assignTicket(id: string, assignee: unknown, now: string): AssignResult {
  const ticket = tickets.get(id);
  if (!ticket) return { ok: false, reason: 'not_found' };

  if (typeof assignee !== 'string' || assignee.trim().length === 0) {
    return { ok: false, reason: 'missing_assignee' };
  }

  ticket.assignee = assignee.trim();
  ticket.updatedAt = now;
  return { ok: true, ticket: formatTicket(ticket) };
}

/* ------------------------------------------------------------------ *
 * Incident linking
 * ------------------------------------------------------------------ */

export function linkIncident(id: string, incidentId: string, now: string): TicketResponse | null {
  const ticket = tickets.get(id);
  if (!ticket) return null;

  ticket.incidentId = incidentId;
  ticket.updatedAt = now;
  return formatTicket(ticket);
}

export function ticketsForIncident(incidentId: string): TicketResponse[] {
  return [...tickets.values()]
    .filter((t) => t.incidentId === incidentId)
    .map(formatTicket);
}
