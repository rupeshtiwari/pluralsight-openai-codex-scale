'use strict';

// Support agents authenticate with a static API key issued per integration.
var VALID_KEYS = ['demo-key-supporthub', 'demo-key-pager-bridge'];

function requireApiKey(req, res, next) {
  var key = req.header('x-api-key');

  if (!key) {
    return res.status(401).json({ error: 'missing_api_key' });
  }

  if (VALID_KEYS.indexOf(key) === -1) {
    return res.status(403).json({ error: 'invalid_api_key' });
  }

  return next();
}

module.exports = requireApiKey;
