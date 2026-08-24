#!/usr/bin/env node
/**
 * Small JSON query helper so demo scripts need no Python.
 *
 *   node scripts/json.mjs valid <file>            exit 0 if the file parses
 *   node scripts/json.mjs count <file> <path>     print the length of an array
 *   node scripts/json.mjs get   <file> <path>     print a value
 *   node scripts/json.mjs rows  <file> <path> <fmt...>   print one line per element
 *
 * <path> is dot notation, e.g. issues or groups.0.id
 */
import { readFileSync } from 'node:fs';

const [, , cmd, file, path, ...rest] = process.argv;

function load(f) {
  return JSON.parse(readFileSync(f, 'utf8'));
}
function dig(obj, p) {
  if (!p) return obj;
  return p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

try {
  if (cmd === 'valid') { load(file); process.exit(0); }
  if (cmd === 'count') { process.stdout.write(String(dig(load(file), path).length) + '\n'); process.exit(0); }
  if (cmd === 'get')   { process.stdout.write(String(dig(load(file), path)) + '\n'); process.exit(0); }
  if (cmd === 'check') {
    // Named fixture invariants the preflight asserts. Each prints 1 or 0.
    const d = load(file);
    const checks = {
      // evt-1042 and evt-1043 must share a stack frame, or the merge has no evidence
      'shared-frame': () => {
        const by = Object.fromEntries(d.issues.map((x) => [x.id, x]));
        const a = new Set(by['evt-1042'].stack);
        return by['evt-1043'].stack.some((f) => a.has(f)) ? 1 : 0;
      },
      // the misleading commit must be NEWER than the genuine cause
      'misleading-newer': () => {
        const c = Object.fromEntries(d.commits.map((x) => [x.sha, x.committedAt]));
        return c['d4e5f6a'] > c['a1b2c3d'] ? 1 : 0;
      },
      // exactly one valid and one invalid hunk
      'one-of-each': () => {
        const v = d.hunks.map((h) => h.verdict).sort();
        return v.length === 2 && v[0] === 'invalid' && v[1] === 'valid' ? 1 : 0;
      },
      // at least one hunk worth preserving
      'has-valid-hunk': () => d.hunks.filter((h) => h.verdict === 'valid').length,
    };
    if (!(path in checks)) { process.stderr.write(`unknown check: ${path}\n`); process.exit(2); }
    process.stdout.write(String(checks[path]()) + '\n');
    process.exit(0);
  }
  if (cmd === 'rows') {
    const arr = dig(load(file), path);
    for (const row of arr) {
      process.stdout.write(rest.map((k) => `${k}=${dig(row, k)}`).join('  ') + '\n');
    }
    process.exit(0);
  }
  process.stderr.write('usage: json.mjs {valid|count|get|rows} <file> [path] [keys...]\n');
  process.exit(2);
} catch (err) {
  process.stderr.write(String(err.message) + '\n');
  process.exit(1);
}
