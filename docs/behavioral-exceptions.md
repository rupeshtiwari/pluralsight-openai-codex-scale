# Behavioral exceptions

Differences between the source and target that are accepted deliberately, written down before the
work starts. Anything not listed here must behave identically after migration.

---

## 1. Rejected promises in async route handlers

### Legacy behavior — Express 4

An async handler whose promise rejects does **not** reach the error handler. Express 4 predates
promise-aware routing: it calls the handler, ignores the returned promise, and if nothing else
responds the request hangs until the client times out.

This service therefore catches its own errors explicitly:

```js
router.get('/tickets/:id', requireApiKey, function (req, res) {
  var ticket = service.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'ticket_not_found', id: req.params.id });
  }
  return res.status(200).json(ticket);
});
```

### Express 5 behavior

Express 5 forwards a rejected promise from an async handler to the error-handling middleware
automatically. A handler that throws no longer hangs; it produces an error response.

### SupportHub decision

**Accept the Express 5 behavior. Do not shim it away.**

Automatic forwarding is strictly safer than a hung request, and no caller depends on the hang.

**But the explicit error responses stay.** They are what produce the documented status codes —
`401` for a missing key, `403` for an invalid key, `404` for an unknown ticket, `409` for an illegal
transition. If those were removed in favour of letting errors propagate, every one of them would
become a generic `500`, which is a breaking change to the external contract.

So the exception is narrow: the *fallback* path changes, the *deliberate* paths do not.

### Preservation choice

| | Before | After |
|---|---|---|
| Handler returns a normal response | unchanged | unchanged |
| Handler responds with an explicit error status | unchanged | unchanged |
| Handler throws, or its promise rejects | request hangs | forwarded to the error handler |

No shim is added. The third row is the accepted difference.

### Validation

The route contract tests assert all four documented status codes. If a status code changes, they
fail — which is what makes this exception safe to accept rather than merely asserted.

```bash
npm run test:route --workspace=supporthub-api/migration
```

---

## Recording an exception

An exception is only complete when it states all five:

1. what the legacy behavior is
2. what the target behavior is
3. the decision, and why
4. the preservation or shim choice
5. the validation that proves the decision held
