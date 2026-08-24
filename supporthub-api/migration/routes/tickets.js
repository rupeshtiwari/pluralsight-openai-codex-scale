'use strict';

var express = require('express');
var service = require('../services/ticketService');
var requireApiKey = require('../auth/apiKey');

var router = express.Router();

function now() {
  return new Date().toISOString();
}

router.get('/tickets/:id', requireApiKey, function (req, res) {
  var ticket = service.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'ticket_not_found', id: req.params.id });
  }
  return res.status(200).json(ticket);
});

router.post('/tickets', requireApiKey, function (req, res) {
  var result = service.create(req.body || {}, now());
  if (!result.ok) {
    return res.status(400).json({ error: 'validation_failed', failures: result.failures });
  }
  return res.status(201).json(result.ticket);
});

router.patch('/tickets/:id/status', requireApiKey, function (req, res) {
  var body = req.body || {};
  var result = service.changeStatus(req.params.id, body.status, now());

  if (!result.ok) {
    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'ticket_not_found', id: req.params.id });
    }
    if (result.reason === 'invalid_status') {
      return res.status(400).json({ error: 'invalid_status', value: body.status });
    }
    return res.status(409).json({ error: 'illegal_transition', allowed: result.allowed });
  }

  return res.status(200).json(result.ticket);
});

module.exports = router;
