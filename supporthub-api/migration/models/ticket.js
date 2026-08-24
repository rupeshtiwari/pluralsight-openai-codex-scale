'use strict';

var STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

var ALLOWED_TRANSITIONS = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'open'],
  resolved: ['closed', 'in_progress'],
  closed: []
};

function isStatus(value) {
  return STATUSES.indexOf(value) !== -1;
}

module.exports = {
  STATUSES: STATUSES,
  ALLOWED_TRANSITIONS: ALLOWED_TRANSITIONS,
  isStatus: isStatus
};
