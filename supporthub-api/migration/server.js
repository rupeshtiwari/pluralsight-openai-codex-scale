'use strict';

var createApp = require('./app');

var PORT = process.env.LEGACY_PORT || 3001;

createApp().listen(PORT, function () {
  console.log('legacy-ticket-api listening on http://localhost:' + PORT);
});
