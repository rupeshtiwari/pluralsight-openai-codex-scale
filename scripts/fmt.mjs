#!/usr/bin/env node
/**
 * Deterministic terminal output for SupportHub demos.
 *
 * Node rather than Python: the course requires no Python prerequisite.
 *
 * Output standard:
 *   - section headers are plain uppercase text on their own line
 *   - values are prefixed with a plain ASCII ">" so they survive any recording
 *     font without depending on decorative glyphs
 *   - a blank line separates important values, so a single value can be
 *     highlighted cleanly during editing
 *   - long values wrap at word boundaries with a continuation indent; nothing
 *     is ever truncated
 *   - output depends only on its arguments, so a rerun produces identical bytes
 *
 * Usage from a shell script:
 *   node scripts/fmt.mjs section "TRIAGE DECISION"
 *   node scripts/fmt.mjs value   "Incident" "incident-2001"
 *   node scripts/fmt.mjs item    "ESLint: pass"
 *   node scripts/fmt.mjs verdict pass "All four gates passed"
 */

const WIDTH = 62;
const INDENT = '  ';

function wrap(text, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line === '') line = w;
    else if (line.length + 1 + w.length <= width) line += ' ' + w;
    else { lines.push(line); line = w; }
  }
  lines.push(line);
  return lines;
}

/** A section header. Uppercase, no prefix, blank line after. */
function section(name) {
  return `${String(name).toUpperCase()}\n\n`;
}

/** One labelled value, padded so it can be highlighted on its own. */
function value(label, val) {
  const head = `${INDENT}> ${label}: `;
  const chunks = wrap(val, Math.max(WIDTH - head.length, 20));
  const pad = ' '.repeat(head.length);
  return [head + chunks[0], ...chunks.slice(1).map((c) => pad + c)].join('\n') + '\n\n';
}

/** One bullet with no label. */
function item(text) {
  const head = `${INDENT}> `;
  const chunks = wrap(text, WIDTH - head.length);
  const pad = ' '.repeat(head.length);
  return [head + chunks[0], ...chunks.slice(1).map((c) => pad + c)].join('\n') + '\n\n';
}

/** A titled block: header plus optional explanatory lines. */
function title(text, ...subs) {
  let out = `${String(text).toUpperCase()}\n`;
  for (const s of subs) for (const l of wrap(s, WIDTH)) out += `${l}\n`;
  return out + '\n';
}

function rule() {
  return '-'.repeat(WIDTH) + '\n';
}

/** Final PASS or FAIL line. */
function verdict(ok, text) {
  const passed = ok === true || String(ok).toLowerCase() === 'pass';
  return `${INDENT}${passed ? 'PASS' : 'FAIL'}: ${text}\n`;
}

const COMMANDS = { section, value, item, title, rule, verdict };

const [, , cmd, ...args] = process.argv;
if (!cmd || !(cmd in COMMANDS)) {
  process.stderr.write('usage: fmt.mjs {section|value|item|title|rule|verdict} [args...]\n');
  process.exit(2);
}
process.stdout.write(COMMANDS[cmd](...args));
