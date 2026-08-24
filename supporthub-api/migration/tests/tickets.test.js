'use strict';

var test = require('node:test');
var assert = require('node:assert');
var http = require('node:http');
var createApp = require('../app');
var service = require('../services/ticketService');

var KEY = 'demo-key-supporthub';

// Minimal request helper so the legacy suite needs no extra dependencies.
function call(method, path, body, headers, done) {
  var server = createApp().listen(0, function () {
    var payload = body ? JSON.stringify(body) : null;
    var options = {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: path,
      method: method,
      headers: Object.assign(
        payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {},
        headers || {}
      )
    };

    var req = http.request(options, function (res) {
      var chunks = '';
      res.on('data', function (c) { chunks += c; });
      res.on('end', function () {
        server.close();
        done({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : null });
      });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

test('GET /tickets/:id returns the ticket with an API key', function (t, done) {
  service.reset();
  call('GET', '/tickets/ticket-1001', null, { 'x-api-key': KEY }, function (res) {
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 'ticket-1001');
    assert.strictEqual(res.body.status, 'open');
    assert.strictEqual(res.body.priority, 'high');
    done();
  });
});

test('GET /tickets/:id without an API key is rejected', function (t, done) {
  service.reset();
  call('GET', '/tickets/ticket-1001', null, {}, function (res) {
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'missing_api_key');
    done();
  });
});

test('GET /tickets/:id with a bad API key is forbidden', function (t, done) {
  service.reset();
  call('GET', '/tickets/ticket-1001', null, { 'x-api-key': 'nope' }, function (res) {
    assert.strictEqual(res.status, 403);
    done();
  });
});

test('GET /tickets/:id returns 404 for an unknown ticket', function (t, done) {
  service.reset();
  call('GET', '/tickets/ticket-9999', null, { 'x-api-key': KEY }, function (res) {
    assert.strictEqual(res.status, 404);
    done();
  });
});

test('POST /tickets creates a ticket', function (t, done) {
  service.reset();
  call('POST', '/tickets', { subject: 'Legacy create', accountId: 'acct-4400' }, { 'x-api-key': KEY }, function (res) {
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'open');
    done();
  });
});

test('PATCH /tickets/:id/status refuses an illegal transition', function (t, done) {
  service.reset();
  call('PATCH', '/tickets/ticket-1001/status', { status: 'resolved' }, { 'x-api-key': KEY }, function (res) {
    assert.strictEqual(res.status, 409);
    assert.deepStrictEqual(res.body.allowed, ['in_progress', 'closed']);
    done();
  });
});

test('normalizePriority maps every accepted spelling', function () {
  assert.strictEqual(service.normalizePriority('P0'), 'urgent');
  assert.strictEqual(service.normalizePriority('critical'), 'urgent');
  assert.strictEqual(service.normalizePriority(4), 'urgent');
  assert.strictEqual(service.normalizePriority('P1'), 'high');
  assert.strictEqual(service.normalizePriority('P2'), 'normal');
  assert.strictEqual(service.normalizePriority('P3'), 'low');
  assert.strictEqual(service.normalizePriority('nonsense'), 'normal');
});

test('config is loaded relative to __dirname', function () {
  assert.strictEqual(service.LIMITS.maxSubjectLength, 200);
});
