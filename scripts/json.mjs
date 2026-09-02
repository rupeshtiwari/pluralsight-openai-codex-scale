#!/usr/bin/env node
/**
 * Small JSON query helper so demo scripts need no Python.
 *
 *   node scripts/json.mjs valid <file>            exit 0 if the file parses
 *   node scripts/json.mjs count <file> <path>     print the length of an array
 *   node scripts/json.mjs get   <file> <path>     print a value
 *   node scripts/json.mjs rows  <file> <path> <fmt...>   print one line per element
 *   node scripts/json.mjs table <file> <path> <spec...>  aligned columns, one row per element
 *   node scripts/json.mjs files <glob> <spec...>         aligned columns, one row per file
 *   node scripts/json.mjs fields <file> <label=path...>  aligned "label : value" lines
 *   node scripts/json.mjs require <file> <path> <key...>  name the keys that are missing
 *
 * <path> is dot notation, e.g. issues or groups.0.id
 *
 * A column <spec> is [label=]field[:width]. The value is padded to <width>, so
 * the label sits outside the padding exactly as it reads on screen. In a files
 * spec the field @dir means the name of the directory holding the file.
 *
 * A fields <label=path> may join several paths with '+', rendered as "a - b".
 */
import { readFileSync, globSync } from 'node:fs';
import { basename, dirname } from 'node:path';

const [, , cmd, file, path, ...rest] = process.argv;

function load(f) {
  return JSON.parse(readFileSync(f, 'utf8'));
}
function dig(obj, p) {
  if (!p) return obj;
  return p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

const INDENT = '  ';

/**
 * Render a JSON value as something readable on camera. Arrays and objects are
 * flattened rather than printed as JSON, because a wrapped brace-heavy line is
 * unreadable at recording resolution.
 */
function render(v) {
  // Absent and null are different answers and must not print the same. C2 step
  // 4 compares a report Codex wrote against the baseline; Codex stored the
  // routing decision under its own key, so `route` was missing entirely and the
  // table printed `route=none` for all four findings -- which reads as "not
  // routed" rather than "no such field", and sends the author looking for a
  // wrong decision instead of a differently named one.
  if (v === undefined) return 'absent';
  if (v === null) return 'none';
  if (Array.isArray(v)) return v.map(render).join(', ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}=${render(x)}`).join(' ');
  return String(v);
}

const SPEC = /^(?:([^=]+)=)?(@?[^:]+)(?::(\d+))?$/;

/** One aligned output row built from [label=]field[:width] specs. */
function line(specs, lookup) {
  const cells = specs.map((s) => {
    const m = SPEC.exec(s);
    if (!m) throw new Error(`bad column spec: ${s}`);
    const [, label, field, width] = m;
    const val = render(lookup(field));
    return (label ? label + '=' : '') + (width ? val.padEnd(Number(width)) : val);
  });
  return INDENT + cells.join(' ').replace(/\s+$/, '') + '\n';
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
      // The seeded runs used to declare a verdict per hunk, and the preflight
      // read it. That verdict is what C5 step 2 and C6 step 2 exist to reach, in
      // a file the agent also reads -- so it is gone, and the scenario shape is
      // derived from the patch and the baseline instead, by
      // seeded-run-hunks-trace-to-findings in scripts/check.mjs.
    };
    if (!(path in checks)) { process.stderr.write(`unknown check: ${path}\n`); process.exit(2); }
    process.stdout.write(String(checks[path]()) + '\n');
    process.exit(0);
  }
  // Which required keys the produced artifact actually carries.
  //
  // Naming keys in a prompt does not make an agent use them: three C2 walks
  // produced route, then routedNow with a nested routing.routed, then
  // routingDecision.shouldRoute -- and by the third, priority had moved too.
  // A table selecting absent keys prints a column of `absent` and leaves the
  // author guessing which keys DID land. This says so, and fails.
  if (cmd === 'require') {
    let doc;
    try { doc = load(file); } catch (e) {
      process.stderr.write(`  ${file} does not exist or does not parse: ${e.message}\n`);
      process.exit(1);
    }
    const at = path === '.' ? doc : dig(doc, path);
    if (at === undefined || at === null) {
      process.stderr.write(`  ${file} has no "${path}" -- the report was written in a different shape entirely\n`);
      process.exit(1);
    }
    const rows = Array.isArray(at) ? at : [at];
    const present = new Set();
    for (const r of rows) for (const k of Object.keys(r || {})) present.add(k);
    let missing = 0;
    for (const key of rest) {
      const n = rows.filter((r) => r && key in r).length;
      if (n === rows.length) {
        process.stdout.write(INDENT + `${key}: present in all ${rows.length}\n`);
      } else {
        missing += 1;
        process.stdout.write(INDENT + `${key}: MISSING from ${rows.length - n} of ${rows.length}\n`);
      }
    }
    if (missing) {
      process.stdout.write(INDENT + `keys actually present: ${[...present].sort().join(', ')}\n`);
      process.stdout.write(INDENT + 'Re-prompt with the missing key names rather than reading the table below.\n');
    }
    process.exit(missing ? 1 : 0);
  }

  if (cmd === 'table') {
    for (const row of dig(load(file), path)) process.stdout.write(line(rest, (f) => dig(row, f)));
    process.exit(0);
  }
  if (cmd === 'files') {
    const specs = [path, ...rest];
    // globSync does not promise an order, and a demo that prints its rows in a
    // different order on a different machine is not a comparison the viewer can
    // follow. Sort so two runs on two machines produce identical bytes.
    for (const f of globSync(file).sort()) {
      const doc = load(f);
      process.stdout.write(line(specs, (k) => (k === '@dir' ? basename(dirname(f)) : dig(doc, k))));
    }
    process.exit(0);
  }
  if (cmd === 'fields') {
    const doc = load(file);
    const specs = [path, ...rest].map((s) => {
      const i = s.indexOf('=');
      return { label: s.slice(0, i), paths: s.slice(i + 1).split('+') };
    });
    const w = Math.max(...specs.map((s) => s.label.length));
    for (const s of specs) {
      const v = s.paths.map((q) => render(dig(doc, q))).join(' - ');
      process.stdout.write(`${INDENT}${s.label.padEnd(w)}: ${v}\n`);
    }
    process.exit(0);
  }
  if (cmd === 'rows') {
    const arr = dig(load(file), path);
    for (const row of arr) {
      process.stdout.write(rest.map((k) => `${k}=${dig(row, k)}`).join('  ') + '\n');
    }
    process.exit(0);
  }
  process.stderr.write('usage: json.mjs {valid|count|get|check|rows|table|files|fields} <file> [path] [args...]\n');
  process.exit(2);
} catch (err) {
  process.stderr.write(String(err.message) + '\n');
  process.exit(1);
}
