'use strict';

var fs = require('fs');
var path = require('path');
var model = require('../models/ticket');

// __dirname is a CommonJS-only global. Reading configuration relative to this
// file is one of the concrete things that must change when this module moves
// to ESM, where __dirname does not exist.
var LIMITS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'limits.json'), 'utf8')
);

var SEED = [
  {
    id: 'ticket-1001',
    subject: 'Checkout fails with card on file',
    status: 'open',
    priority: 'high',
    assignee: null,
    accountId: 'acct-4400',
    incidentId: 'incident-2001',
    createdAt: '2025-03-03T09:12:00.000Z',
    updatedAt: '2025-03-03T09:12:00.000Z'
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
    updatedAt: '2025-03-04T08:05:00.000Z'
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
    updatedAt: '2025-03-04T11:47:00.000Z'
  }
];

var store = {};
var nextId = 1004;

function reset() {
  store = {};
  SEED.forEach(function (ticket) {
    store[ticket.id] = JSON.parse(JSON.stringify(ticket));
  });
  nextId = 1004;
}

reset();

function normalizePriority(input) {
  if (typeof input === 'number') {
    if (input >= 4) return 'urgent';
    if (input === 3) return 'high';
    if (input === 2) return 'normal';
    return 'low';
  }

  var value = String(input === undefined || input === null ? '' : input)
    .trim()
    .toLowerCase();

  if (value === 'p0' || value === 'urgent' || value === 'critical') return 'urgent';
  if (value === 'p1' || value === 'high') return 'high';
  if (value === 'p2' || value === 'normal' || value === 'medium') return 'normal';
  if (value === 'p3' || value === 'low' || value === 'minor') return 'low';

  return LIMITS.defaultPriority;
}

function format(ticket) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    assignee: ticket.assignee,
    accountId: ticket.accountId,
    incidentId: ticket.incidentId,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
  };
}

function get(id) {
  var ticket = store[id];
  return ticket ? format(ticket) : null;
}

function create(payload, now) {
  var failures = [];

  if (typeof payload.subject !== 'string' || payload.subject.trim().length === 0) {
    failures.push({ field: 'subject', message: 'subject is required' });
  } else if (payload.subject.length > LIMITS.maxSubjectLength) {
    failures.push({
      field: 'subject',
      message: 'subject must be ' + LIMITS.maxSubjectLength + ' characters or fewer'
    });
  }

  if (typeof payload.accountId !== 'string' || payload.accountId.trim().length === 0) {
    failures.push({ field: 'accountId', message: 'accountId is required' });
  }

  if (failures.length > 0) {
    return { ok: false, failures: failures };
  }

  var id = 'ticket-' + nextId;
  nextId += 1;

  var ticket = {
    id: id,
    subject: payload.subject.trim(),
    status: 'open',
    priority: normalizePriority(payload.priority),
    assignee: null,
    accountId: payload.accountId.trim(),
    incidentId: typeof payload.incidentId === 'string' ? payload.incidentId : null,
    createdAt: now,
    updatedAt: now
  };

  store[id] = ticket;
  return { ok: true, ticket: format(ticket) };
}

function changeStatus(id, next, now) {
  var ticket = store[id];
  if (!ticket) return { ok: false, reason: 'not_found' };

  var candidate = String(next === undefined || next === null ? '' : next)
    .trim()
    .toLowerCase();

  if (!model.isStatus(candidate)) {
    return { ok: false, reason: 'invalid_status' };
  }

  var allowed = model.ALLOWED_TRANSITIONS[ticket.status];
  if (allowed.indexOf(candidate) === -1) {
    return { ok: false, reason: 'illegal_transition', allowed: allowed };
  }

  ticket.status = candidate;
  ticket.updatedAt = now;
  return { ok: true, ticket: format(ticket) };
}

module.exports = {
  reset: reset,
  get: get,
  create: create,
  changeStatus: changeStatus,
  normalizePriority: normalizePriority,
  LIMITS: LIMITS
};
