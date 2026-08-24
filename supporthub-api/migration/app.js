'use strict';

var express = require('express');
var ticketsRouter = require('./routes/tickets');

function createApp() {
  var app = express();

  app.use(express.json());

  app.get('/health', function (req, res) {
    res.status(200).json({ status: 'ok', service: 'legacy-ticket-api' });
  });

  app.use(ticketsRouter);

  return app;
}

module.exports = createApp;
